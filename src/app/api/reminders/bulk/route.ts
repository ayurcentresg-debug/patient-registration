import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function substituteVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientIds, type, channel, scheduledAt, templateId, message } = body;

    if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
      return NextResponse.json({ error: "patientIds array is required" }, { status: 400 });
    }

    if (!type || !channel || !scheduledAt) {
      return NextResponse.json(
        { error: "type, channel, and scheduledAt are required" },
        { status: 400 }
      );
    }

    // Fetch template if provided
    let template = null;
    if (templateId) {
      template = await prisma.messageTemplate.findUnique({ where: { id: templateId } });
    }

    // Fetch all patients
    const patients = await prisma.patient.findMany({
      where: { id: { in: patientIds } },
    });

    let created = 0;

    for (const patient of patients) {
      let finalMessage = message || "";

      if (template) {
        const variables: Record<string, string> = {
          patientName: `${patient.firstName} ${patient.lastName}`,
          appointmentDate: new Date(scheduledAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          doctorName: "Dr. Smith",
          clinicName: "Ayurveda Clinic",
          amount: "S$100.00",
          time: "10:00 AM",
        };
        finalMessage = substituteVariables(template.body, variables);
      } else if (message) {
        const variables: Record<string, string> = {
          patientName: `${patient.firstName} ${patient.lastName}`,
        };
        finalMessage = substituteVariables(message, variables);
      }

      if (!finalMessage) continue;

      await prisma.reminder.create({
        data: {
          patientId: patient.id,
          type,
          channel,
          scheduledAt: new Date(scheduledAt),
          message: finalMessage,
          templateId: templateId || null,
        },
      });

      created++;
    }

    return NextResponse.json({ created });
  } catch (error) {
    console.error("[Reminders Bulk] Error:", error);
    return NextResponse.json({ error: "Failed to create bulk reminders" }, { status: 500 });
  }
}
