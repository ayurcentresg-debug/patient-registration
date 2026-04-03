import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";

// GET /api/staff/[id]/leave?from=2026-04-01&to=2026-04-30
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const { id } = await params;
    const { searchParams } = request.nextUrl;

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Show leaves for this staff member AND clinic-wide holidays
    where.OR = [{ userId: id }, { userId: "clinic" }];

    if (from && to) {
      where.startDate = { lte: new Date(to + "T23:59:59") };
      where.endDate = { gte: new Date(from + "T00:00:00") };
    }

    const leaves = await db.staffLeave.findMany({
      where,
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(leaves);
  } catch (error) {
    console.error("Failed to fetch leaves:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaves" },
      { status: 500 }
    );
  }
}

// POST /api/staff/[id]/leave
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const { id } = await params;
    const body = await request.json();

    const {
      type,
      title,
      startDate,
      endDate,
      startTime,
      endTime,
      allDay,
      notes,
      recurring,
      status,
    } = body;

    // Validate required fields
    if (!type || !title || !startDate || !endDate) {
      return NextResponse.json(
        { error: "type, title, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    // Validate type
    if (!["leave", "block", "holiday"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'leave', 'block', or 'holiday'" },
        { status: 400 }
      );
    }

    const userId = type === "holiday" ? "clinic" : id;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json(
        { error: "endDate must be after startDate" },
        { status: 400 }
      );
    }

    // Check for overlapping leaves (same user, overlapping date range)
    // For time-specific blocks, only check overlap if times overlap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overlapWhere: any = {
      userId,
      status: { not: "rejected" },
      startDate: { lte: end },
      endDate: { gte: start },
    };

    const overlapping = await db.staffLeave.findMany({ where: overlapWhere });

    // Check actual overlap considering time blocks
    const isAllDay = allDay !== false;
    for (const existing of overlapping) {
      if (isAllDay && existing.allDay) {
        return NextResponse.json(
          { error: `Overlapping leave already exists: "${existing.title}"` },
          { status: 409 }
        );
      }
      if (!isAllDay && !existing.allDay && startTime && endTime && existing.startTime && existing.endTime) {
        // Both are time-specific — check time overlap
        if (startTime < existing.endTime && endTime > existing.startTime) {
          return NextResponse.json(
            { error: `Overlapping time block exists: "${existing.title}" (${existing.startTime}-${existing.endTime})` },
            { status: 409 }
          );
        }
      }
      if (isAllDay && !existing.allDay) {
        // New is all-day, existing is time block — overlaps
        return NextResponse.json(
          { error: `Overlapping time block exists: "${existing.title}"` },
          { status: 409 }
        );
      }
      if (!isAllDay && existing.allDay) {
        // New is time block, existing is all-day — overlaps
        return NextResponse.json(
          { error: `Overlapping full-day leave exists: "${existing.title}"` },
          { status: 409 }
        );
      }
    }

    const leave = await db.staffLeave.create({
      data: {
        userId,
        type,
        title,
        startDate: start,
        endDate: end,
        startTime: isAllDay ? null : (startTime || null),
        endTime: isAllDay ? null : (endTime || null),
        allDay: isAllDay,
        status: status || "approved",
        notes: notes || null,
        recurring: recurring || false,
      },
    });

    await logAudit({
      action: "create",
      entity: "staffLeave",
      entityId: leave.id,
      details: { userId, type, title, startDate, endDate },
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (error) {
    console.error("Failed to create leave:", error);
    return NextResponse.json(
      { error: "Failed to create leave" },
      { status: 500 }
    );
  }
}
