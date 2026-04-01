import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const searchParams = request.nextUrl.searchParams;
    const channel = searchParams.get("channel");
    const category = searchParams.get("category");
    const active = searchParams.get("active");

    const where: Record<string, unknown> = {};
    if (channel) where.channel = channel;
    if (category) where.category = category;
    if (active !== null && active !== undefined) {
      where.isActive = active === "true";
    }

    const templates = await db.messageTemplate.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("[Templates GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { name, channel, subject, body: templateBody, category, isActive } = body;

    // Validate required fields
    if (!name || !channel || !templateBody || !category) {
      return NextResponse.json(
        { error: "name, channel, body, and category are required" },
        { status: 400 }
      );
    }

    // Validate channel
    if (!["whatsapp", "email", "sms"].includes(channel)) {
      return NextResponse.json(
        { error: "channel must be one of: whatsapp, email, sms" },
        { status: 400 }
      );
    }

    // Check name uniqueness within same channel
    const existing = await db.messageTemplate.findFirst({
      where: { name, channel },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A template with name "${name}" already exists for channel "${channel}"` },
        { status: 409 }
      );
    }

    const template = await db.messageTemplate.create({
      data: {
        name,
        channel,
        subject: subject || null,
        body: templateBody,
        category,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("[Templates POST] Error:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
