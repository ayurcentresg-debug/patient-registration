import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/staff/[id]/check-availability?date=YYYY-MM-DD
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json(
        { error: "date query parameter is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const dayStart = new Date(dateStr + "T00:00:00");
    const dayEnd = new Date(dateStr + "T23:59:59.999");

    // Check for approved leaves for this staff member on this date
    const staffLeaves = await db.staffLeave.findMany({
      where: {
        userId: id,
        status: { in: ["approved", "pending"] },
        type: { in: ["leave", "block"] },
        startDate: { lte: dayEnd },
        endDate: { gte: dayStart },
      },
      select: { type: true, title: true, allDay: true, startTime: true, endTime: true, status: true },
    });

    // Check for clinic holidays
    const clinicHolidays = await db.staffLeave.findMany({
      where: {
        userId: "clinic",
        status: "approved",
        type: "holiday",
        startDate: { lte: dayEnd },
        endDate: { gte: dayStart },
      },
      select: { title: true },
    });

    if (clinicHolidays.length > 0) {
      return NextResponse.json({
        available: false,
        reason: `Clinic holiday: ${clinicHolidays[0].title}`,
      });
    }

    const approvedLeaves = staffLeaves.filter((l) => l.status === "approved" && l.allDay);
    const pendingLeaves = staffLeaves.filter((l) => l.status === "pending" && l.allDay);

    if (approvedLeaves.length > 0) {
      return NextResponse.json({
        available: false,
        reason: `On approved leave: ${approvedLeaves[0].title}`,
      });
    }

    if (pendingLeaves.length > 0) {
      return NextResponse.json({
        available: true,
        reason: `Has pending leave request: ${pendingLeaves[0].title}`,
        warning: true,
      });
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error("Check availability error:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}
