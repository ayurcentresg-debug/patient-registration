import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";

// PUT /api/staff/[id]/leave/[leaveId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leaveId: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const { leaveId } = await params;
    const body = await request.json();

    // Verify leave exists
    const existing = await db.staffLeave.findUnique({ where: { id: leaveId } });
    if (!existing) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    // Build update data — only include fields that were provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.type !== undefined) data.type = body.type;
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) data.endDate = new Date(body.endDate);
    if (body.allDay !== undefined) {
      data.allDay = body.allDay;
      if (body.allDay) {
        data.startTime = null;
        data.endTime = null;
      }
    }
    if (body.startTime !== undefined) data.startTime = body.startTime;
    if (body.endTime !== undefined) data.endTime = body.endTime;
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.recurring !== undefined) data.recurring = body.recurring;

    const updated = await db.staffLeave.update({
      where: { id: leaveId },
      data,
    });

    await logAudit({
      action: "update",
      entity: "staffLeave",
      entityId: leaveId,
      details: data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update leave:", error);
    return NextResponse.json(
      { error: "Failed to update leave" },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/[id]/leave/[leaveId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leaveId: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const { leaveId } = await params;

    const existing = await db.staffLeave.findUnique({ where: { id: leaveId } });
    if (!existing) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    await db.staffLeave.delete({ where: { id: leaveId } });

    await logAudit({
      action: "delete",
      entity: "staffLeave",
      entityId: leaveId,
      details: { title: existing.title, type: existing.type, userId: existing.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete leave:", error);
    return NextResponse.json(
      { error: "Failed to delete leave" },
      { status: 500 }
    );
  }
}
