import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { sendSMS } from "@/lib/sms";

export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = {};
    if (patientId) where.patientId = patientId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (from || to) {
      where.sentAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    if (search) {
      where.OR = [
        { message: { contains: search } },
        { patient: { firstName: { contains: search } } },
        { patient: { lastName: { contains: search } } },
      ];
    }

    const [communications, total] = await Promise.all([
      db.communication.findMany({
        where,
        orderBy: { sentAt: "desc" },
        include: {
          patient: {
            select: { firstName: true, lastName: true, email: true, whatsapp: true, phone: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.communication.count({ where }),
    ]);

    return NextResponse.json({
      data: communications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[Communications GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch communications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { patientId, type, subject, message } = body;

    const patient = await db.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    let status = "sent";

    try {
      if (type === "email" && patient.email) {
        await sendEmail({
          to: patient.email,
          subject: subject || "Message from your clinic",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">${subject || "Message from your clinic"}</h2>
              <p>Dear ${patient.firstName},</p>
              <p>${message}</p>
              <hr style="border-color: #e5e7eb;" />
              <p style="color: #6b7280; font-size: 12px;">Ayur Centre Pte. Ltd.</p>
            </div>
          `,
        });
      } else if (type === "whatsapp" && patient.whatsapp) {
        await sendWhatsApp({ to: patient.whatsapp, message });
      } else if (type === "sms" && patient.phone) {
        const result = await sendSMS(patient.phone, message);
        if (!result.success) {
          status = "failed";
        }
      } else {
        return NextResponse.json(
          { error: `Patient has no ${type} contact on file` },
          { status: 400 }
        );
      }
    } catch (e) {
      console.error(`${type} send failed:`, e);
      status = "failed";
    }

    const communication = await db.communication.create({
      data: { patientId, type, subject, message, status },
    });

    return NextResponse.json(communication, { status: 201 });
  } catch (error) {
    console.error("[Communications POST] Error:", error);
    return NextResponse.json({ error: "Failed to send communication" }, { status: 500 });
  }
}
