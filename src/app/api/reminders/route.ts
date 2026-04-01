import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const patientId = searchParams.get("patientId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (patientId) where.patientId = patientId;
    if (from || to) {
      where.scheduledAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [reminders, total] = await Promise.all([
      db.reminder.findMany({
        where,
        orderBy: {
          scheduledAt: status === "sent" ? "desc" : "asc",
        },
        include: {
          patient: {
            select: { firstName: true, lastName: true, phone: true, email: true, whatsapp: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.reminder.count({ where }),
    ]);

    return NextResponse.json({
      data: reminders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[Reminders GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { patientId, appointmentId, type, channel, scheduledAt, message, templateId, notes } = body;

    if (!patientId || !type || !channel || !scheduledAt) {
      return NextResponse.json(
        { error: "patientId, type, channel, and scheduledAt are required" },
        { status: 400 }
      );
    }

    // Validate patient exists
    const patient = await db.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    let finalMessage = message || "";

    // If templateId provided, fetch template and substitute variables
    if (templateId) {
      const template = await db.messageTemplate.findUnique({ where: { id: templateId } });
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
      }
    }

    if (!finalMessage) {
      return NextResponse.json({ error: "message or templateId is required" }, { status: 400 });
    }

    const reminder = await db.reminder.create({
      data: {
        patientId,
        appointmentId: appointmentId || null,
        type,
        channel,
        scheduledAt: new Date(scheduledAt),
        message: finalMessage,
        templateId: templateId || null,
        notes: notes || null,
      },
      include: {
        patient: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error("[Reminders POST] Error:", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}
