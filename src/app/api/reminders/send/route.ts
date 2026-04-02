import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { sendSMS } from "@/lib/sms";

export async function POST() {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const now = new Date();

    // Find all pending reminders that are due
    const dueReminders = await db.reminder.findMany({
      where: {
        status: "pending",
        scheduledAt: { lte: now },
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

    let sent = 0;
    let failed = 0;

    for (const reminder of dueReminders) {
      let success = false;

      try {
        if (reminder.channel === "email" && reminder.patient.email) {
          await sendEmail({
            to: reminder.patient.email,
            subject: "Reminder from Ayurveda Clinic",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <p>Dear ${reminder.patient.firstName},</p>
                <p>${reminder.message}</p>
                <hr style="border-color: #e5e7eb;" />
                <p style="color: #6b7280; font-size: 12px;">Sent via AYUR GATE</p>
              </div>
            `,
          });
          success = true;
        } else if (reminder.channel === "whatsapp" && reminder.patient.whatsapp) {
          await sendWhatsApp({
            to: reminder.patient.whatsapp,
            message: reminder.message,
          });
          success = true;
        } else if (reminder.channel === "sms" && reminder.patient.phone) {
          const result = await sendSMS(reminder.patient.phone, reminder.message);
          success = result.success;
        } else {
          console.error(`[Reminders Send] No ${reminder.channel} contact for patient ${reminder.patient.id}`);
          success = false;
        }
      } catch (error) {
        console.error(`[Reminders Send] Failed for reminder ${reminder.id}:`, error);
        success = false;
      }

      // Update reminder status
      await db.reminder.update({
        where: { id: reminder.id },
        data: {
          status: success ? "sent" : "failed",
          sentAt: success ? now : null,
        },
      });

      // Create Communication record for sent reminders
      if (success) {
        await db.communication.create({
          data: {
            patientId: reminder.patient.id,
            type: reminder.channel,
            subject: reminder.channel === "email" ? "Reminder from Ayurveda Clinic" : null,
            message: reminder.message,
            status: "sent",
          },
        });
        sent++;
      } else {
        failed++;
      }
    }

    return NextResponse.json({ sent, failed });
  } catch (error) {
    console.error("[Reminders Send] Error:", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
