import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { sendSMS } from "@/lib/sms";

function substituteVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { patientIds, channel, subject, message, templateId } = body;

    if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
      return NextResponse.json({ error: "patientIds array is required" }, { status: 400 });
    }

    if (!channel || !["whatsapp", "email", "sms"].includes(channel)) {
      return NextResponse.json({ error: "channel must be one of: whatsapp, email, sms" }, { status: 400 });
    }

    if (!message && !templateId) {
      return NextResponse.json({ error: "message or templateId is required" }, { status: 400 });
    }

    // Fetch template if provided
    let template = null;
    if (templateId) {
      template = await db.messageTemplate.findUnique({ where: { id: templateId } });
    }

    // Fetch all patients
    const patients = await db.patient.findMany({
      where: { id: { in: patientIds } },
    });

    let sent = 0;
    let failed = 0;
    const total = patients.length;

    for (const patient of patients) {
      const variables: Record<string, string> = {
        patientName: `${patient.firstName} ${patient.lastName}`,
        appointmentDate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        doctorName: "Dr. Smith",
        clinicName: "Ayurveda Clinic",
        amount: "S$100.00",
        time: "10:00 AM",
      };

      const finalMessage = template
        ? substituteVariables(template.body, variables)
        : substituteVariables(message, variables);

      const finalSubject = subject
        ? substituteVariables(subject, variables)
        : "Message from Ayurveda Clinic";

      let status = "sent";

      try {
        if (channel === "email" && patient.email) {
          await sendEmail({
            to: patient.email,
            subject: finalSubject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2d6a4f;">${finalSubject}</h2>
                <p>Dear ${patient.firstName},</p>
                <p>${finalMessage}</p>
                <hr style="border-color: #e5e7eb;" />
                <p style="color: #6b7280; font-size: 12px;">Sent via AYUR GATE</p>
              </div>
            `,
          });
        } else if (channel === "whatsapp" && patient.whatsapp) {
          await sendWhatsApp({ to: patient.whatsapp, message: finalMessage });
        } else if (channel === "sms" && patient.phone) {
          const result = await sendSMS(patient.phone, finalMessage);
          if (!result.success) status = "failed";
        } else {
          status = "failed";
        }
      } catch (error) {
        console.error(`[Bulk Send] Failed for patient ${patient.id}:`, error);
        status = "failed";
      }

      // Create Communication record
      await db.communication.create({
        data: {
          patientId: patient.id,
          type: channel,
          subject: channel === "email" ? finalSubject : null,
          message: finalMessage,
          status,
        },
      });

      if (status === "sent") {
        sent++;
      } else {
        failed++;
      }
    }

    return NextResponse.json({ sent, failed, total });
  } catch (error) {
    console.error("[Communications Bulk] Error:", error);
    return NextResponse.json({ error: "Failed to send bulk messages" }, { status: 500 });
  }
}
