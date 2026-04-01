import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await props.params;

    const reminder = await db.reminder.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            whatsapp: true,
          },
        },
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("[Reminders GET by ID] Error:", error);
    return NextResponse.json({ error: "Failed to fetch reminder" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await props.params;
    const body = await request.json();

    const existing = await db.reminder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending reminders can be updated" },
        { status: 400 }
      );
    }

    const { scheduledAt, message, channel } = body;
    const data: Record<string, unknown> = {};
    if (scheduledAt !== undefined) data.scheduledAt = new Date(scheduledAt);
    if (message !== undefined) data.message = message;
    if (channel !== undefined) data.channel = channel;

    const reminder = await db.reminder.update({
      where: { id },
      data,
      include: {
        patient: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("[Reminders PUT] Error:", error);
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await props.params;

    const existing = await db.reminder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    const reminder = await db.reminder.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("[Reminders DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to cancel reminder" }, { status: 500 });
  }
}
