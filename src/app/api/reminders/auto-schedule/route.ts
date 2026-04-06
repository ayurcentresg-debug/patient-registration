import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

function substituteVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export async function POST() {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Find all appointments in the next 48 hours
    const appointments = await db.appointment.findMany({
      where: {
        date: {
          gte: now,
          lte: in48Hours,
        },
        status: { in: ["scheduled", "confirmed"] },
        patientId: { not: null },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            whatsapp: true,
          },
        },
      },
    });

    // Find existing reminders for these appointments
    const appointmentIds = appointments.map((a) => a.id);
    const existingReminders = await db.reminder.findMany({
      where: {
        appointmentId: { in: appointmentIds },
        status: { in: ["pending", "sent"] },
      },
      select: { appointmentId: true },
    });
    const remindedAppointmentIds = new Set(
      existingReminders.map((r) => r.appointmentId).filter(Boolean)
    );

    // Fetch default template
    const defaultTemplate = await db.messageTemplate.findFirst({
      where: {
        category: "appointment_reminder",
        isActive: true,
      },
    });

    let scheduled = 0;
    let skipped = 0;

    for (const appointment of appointments) {
      if (!appointment.patient || !appointment.patientId) {
        skipped++;
        continue;
      }

      if (remindedAppointmentIds.has(appointment.id)) {
        skipped++;
        continue;
      }

      const patient = appointment.patient;

      // Determine channel: prefer whatsapp, then sms, then email
      let channel = "whatsapp";
      if (!patient.whatsapp) {
        if (patient.phone) {
          channel = "sms";
        } else if (patient.email) {
          channel = "email";
        } else {
          skipped++;
          continue;
        }
      }

      // Schedule reminder 24 hours before appointment
      const appointmentTime = new Date(appointment.date);
      const reminderTime = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);

      // If reminder time is in the past, schedule for now
      const scheduledAt = reminderTime < now ? now : reminderTime;

      // Build message
      const appointmentDateStr = appointmentTime.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const variables: Record<string, string> = {
        patientName: `${patient.firstName} ${patient.lastName}`,
        appointmentDate: appointmentDateStr,
        doctorName: appointment.doctor || "your doctor",
        clinicName: "Ayurveda Clinic",
        amount: appointment.sessionPrice ? `S$${appointment.sessionPrice.toFixed(2)}` : "",
        time: appointment.time || "",
      };

      let message: string;
      if (defaultTemplate) {
        message = substituteVariables(defaultTemplate.body, variables);
      } else {
        message = `Dear ${patient.firstName}, this is a reminder for your appointment on ${appointmentDateStr} at ${appointment.time || "the scheduled time"} with ${appointment.doctor || "your doctor"}. Please arrive 10 minutes early. - Ayurveda Clinic`;
      }

      // Create 24h reminder
      await db.reminder.create({
        data: {
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          type: "appointment",
          channel,
          scheduledAt,
          message,
          templateId: defaultTemplate?.id || null,
          notes: "24h",
        },
      });
      scheduled++;

      // Create 1h reminder if appointment is within 2 hours
      const hoursAway = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursAway <= 2 && hoursAway > 0.25) {
        const reminderTime1h = new Date(appointmentTime.getTime() - 60 * 60 * 1000);
        const scheduledAt1h = reminderTime1h < now ? now : reminderTime1h;
        const msg1h = `Hi ${patient.firstName}, your appointment is in about 1 hour at ${appointment.time || "the scheduled time"} with ${appointment.doctor || "your doctor"}. See you soon!`;

        const existing1h = await db.reminder.findFirst({
          where: { appointmentId: appointment.id, notes: "1h", status: { in: ["pending", "sent"] } },
        });

        if (!existing1h) {
          await db.reminder.create({
            data: {
              patientId: appointment.patientId,
              appointmentId: appointment.id,
              type: "appointment",
              channel,
              scheduledAt: scheduledAt1h,
              message: msg1h,
              notes: "1h",
            },
          });
          scheduled++;
        }
      }
    }

    return NextResponse.json({ scheduled, skipped });
  } catch (error) {
    console.error("[Reminders Auto-Schedule] Error:", error);
    return NextResponse.json({ error: "Failed to auto-schedule reminders" }, { status: 500 });
  }
}
