import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { sendSMS } from "@/lib/sms";
import { isFeatureEnabled, getBranding } from "@/lib/plan-enforcement";

/**
 * POST /api/cron/reminders
 *
 * Unified cron endpoint — runs for ALL clinics:
 *  1. Auto-schedules 24h and 1h reminders for upcoming appointments
 *  2. Sends all pending reminders that are due
 *
 * Should be called every 15-30 minutes by an external cron service.
 * Protected by CRON_SECRET header or super_admin_token.
 */

function substituteVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export async function POST(req: NextRequest) {
  // Auth: accept CRON_SECRET header or no auth if secret not set (dev mode)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const results = { scheduled24h: 0, scheduled1h: 0, skipped: 0, sent: 0, failed: 0, clinics: 0 };

  try {
    const branding = await getBranding();
    const whatsAppEnabled = await isFeatureEnabled("enableWhatsApp");
    const smsEnabled = await isFeatureEnabled("enableSMS");

    // Get all active clinics
    const clinics = await prisma.clinic.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    results.clinics = clinics.length;

    for (const clinic of clinics) {
      // ═══════ PHASE 1: Auto-Schedule Reminders ═══════

      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Find upcoming appointments for this clinic
      const appointments = await prisma.appointment.findMany({
        where: {
          clinicId: clinic.id,
          date: { gte: now, lte: in48Hours },
          status: { in: ["scheduled", "confirmed"] },
          patientId: { not: null },
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true, whatsapp: true },
          },
        },
      });

      // Get existing reminders for these appointments
      const appointmentIds = appointments.map((a) => a.id);
      const existingReminders = await prisma.reminder.findMany({
        where: {
          appointmentId: { in: appointmentIds },
          status: { in: ["pending", "sent"] },
        },
        select: { appointmentId: true, notes: true },
      });

      // Track by appointmentId + type (24h vs 1h)
      const existingKeys = new Set(
        existingReminders.map((r) => `${r.appointmentId}:${r.notes || "24h"}`)
      );

      // Get default template for this clinic
      const defaultTemplate = await prisma.messageTemplate.findFirst({
        where: { clinicId: clinic.id, category: "appointment_reminder", isActive: true },
      });

      for (const appt of appointments) {
        if (!appt.patient || !appt.patientId) { results.skipped++; continue; }

        const patient = appt.patient;

        // Determine channel
        let channel = "email"; // fallback
        if (patient.whatsapp && whatsAppEnabled) channel = "whatsapp";
        else if (patient.phone && smsEnabled) channel = "sms";
        else if (patient.email) channel = "email";
        else { results.skipped++; continue; }

        const appointmentTime = new Date(appt.date);
        const appointmentDateStr = appointmentTime.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });

        const variables: Record<string, string> = {
          patientName: `${patient.firstName} ${patient.lastName}`,
          appointmentDate: appointmentDateStr,
          doctorName: appt.doctor || "your doctor",
          clinicName: clinic.name || branding.platformName,
          amount: appt.sessionPrice ? `$${appt.sessionPrice.toFixed(2)}` : "",
          time: appt.time || "",
        };

        // ── 24-hour reminder ─────────────────────────────────
        const key24h = `${appt.id}:24h`;
        if (!existingKeys.has(key24h)) {
          const reminderTime24 = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
          const scheduledAt24 = reminderTime24 < now ? now : reminderTime24;

          // Only schedule if appointment is >2 hours away (otherwise just do 1h)
          const hoursAway = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursAway > 2) {
            let message: string;
            if (defaultTemplate) {
              message = substituteVariables(defaultTemplate.body, variables);
            } else {
              message = `Dear ${patient.firstName}, this is a reminder for your appointment tomorrow (${appointmentDateStr}) at ${appt.time || "the scheduled time"} with ${appt.doctor || "your doctor"}. Please arrive 10 minutes early. - ${clinic.name || branding.platformName}`;
            }

            await prisma.reminder.create({
              data: {
                clinicId: clinic.id,
                patientId: appt.patientId,
                appointmentId: appt.id,
                type: "appointment",
                channel,
                scheduledAt: scheduledAt24,
                message,
                templateId: defaultTemplate?.id || null,
                notes: "24h",
              },
            });
            results.scheduled24h++;
          }
        }

        // ── 1-hour reminder ──────────────────────────────────
        const key1h = `${appt.id}:1h`;
        if (!existingKeys.has(key1h)) {
          const reminderTime1 = new Date(appointmentTime.getTime() - 60 * 60 * 1000);
          const hoursAway = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

          // Only schedule 1h reminder if appointment is within next 2 hours but >15min away
          if (hoursAway <= 2 && hoursAway > 0.25) {
            const scheduledAt1 = reminderTime1 < now ? now : reminderTime1;

            const message1h = `Hi ${patient.firstName}, your appointment is in about 1 hour at ${appt.time || "the scheduled time"} with ${appt.doctor || "your doctor"}. See you soon! - ${clinic.name || branding.platformName}`;

            await prisma.reminder.create({
              data: {
                clinicId: clinic.id,
                patientId: appt.patientId,
                appointmentId: appt.id,
                type: "appointment",
                channel,
                scheduledAt: scheduledAt1,
                message: message1h,
                notes: "1h",
              },
            });
            results.scheduled1h++;
          }
        }
      }

      // ═══════ PHASE 2: Send Due Reminders for this clinic ═══════

      const dueReminders = await prisma.reminder.findMany({
        where: {
          clinicId: clinic.id,
          status: "pending",
          scheduledAt: { lte: now },
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true, whatsapp: true },
          },
        },
        take: 100, // Process max 100 per clinic per run
      });

      for (const reminder of dueReminders) {
        let success = false;

        try {
          if (reminder.channel === "email" && reminder.patient.email) {
            await sendEmail({
              to: reminder.patient.email,
              subject: `Appointment Reminder — ${clinic.name || branding.platformName}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: #14532d; padding: 16px 24px; border-radius: 12px 12px 0 0;">
                    <h2 style="color: #fff; margin: 0; font-size: 16px;">${clinic.name || branding.platformName}</h2>
                  </div>
                  <div style="padding: 20px 24px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="color: #374151; font-size: 15px; line-height: 1.6;">Dear ${reminder.patient.firstName},</p>
                    <p style="color: #374151; font-size: 15px; line-height: 1.6;">${reminder.message}</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">Sent via ${branding.platformName}${branding.supportEmail ? ` | ${branding.supportEmail}` : ""}</p>
                  </div>
                </div>
              `,
            });
            success = true;
          } else if (reminder.channel === "whatsapp" && whatsAppEnabled && reminder.patient.whatsapp) {
            await sendWhatsApp({ to: reminder.patient.whatsapp, message: reminder.message });
            success = true;
          } else if (reminder.channel === "sms" && smsEnabled && reminder.patient.phone) {
            const result = await sendSMS(reminder.patient.phone, reminder.message);
            success = result.success;
          } else {
            // Channel not available or disabled
            success = false;
          }
        } catch (err) {
          console.error(`[Cron Reminders] Send failed for ${reminder.id}:`, err);
          success = false;
        }

        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: success ? "sent" : "failed", sentAt: success ? now : null },
        });

        if (success) {
          try {
            await prisma.communication.create({
              data: {
                clinicId: clinic.id,
                patientId: reminder.patient.id,
                type: reminder.channel,
                subject: reminder.channel === "email" ? `Appointment Reminder — ${clinic.name}` : null,
                message: reminder.message,
                status: "sent",
              },
            });
          } catch { /* non-blocking */ }
          results.sent++;
        } else {
          results.failed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (error) {
    console.error("[Cron Reminders] Error:", error);
    return NextResponse.json({ error: "Reminder cron failed" }, { status: 500 });
  }
}
