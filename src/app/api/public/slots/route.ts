import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";

/**
 * GET /api/public/slots?clinicId=xxx&doctorId=xxx&date=YYYY-MM-DD
 * Returns available time slots for a doctor on a given date.
 */
export async function GET(req: NextRequest) {
  try {
    const clinicId = req.nextUrl.searchParams.get("clinicId");
    const doctorId = req.nextUrl.searchParams.get("doctorId");
    const dateStr = req.nextUrl.searchParams.get("date");

    if (!clinicId || !doctorId || !dateStr) {
      return NextResponse.json({ error: "clinicId, doctorId, and date are required" }, { status: 400 });
    }

    const db = getTenantPrisma(clinicId);

    // Get doctor info
    const doctor = await db.user.findFirst({
      where: { id: doctorId, status: "active" },
      select: { id: true, name: true, schedule: true, slotDuration: true },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const date = new Date(dateStr + "T00:00:00");
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayOfWeek = dayNames[date.getDay()];

    // Parse schedule
    let schedule: Record<string, { start: string; end: string }[]> = {};
    try {
      schedule = JSON.parse(doctor.schedule || "{}");
    } catch {
      schedule = {};
    }

    const daySchedule = schedule[dayOfWeek] || [];
    if (daySchedule.length === 0) {
      return NextResponse.json({ slots: [], dayOfWeek, message: "Doctor not available on this day" });
    }

    // Check for leaves
    const startOfDay = new Date(dateStr + "T00:00:00");
    const endOfDay = new Date(dateStr + "T23:59:59");

    const leaves = await db.staffLeave.findMany({
      where: {
        userId: doctorId,
        status: "approved",
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
      },
    });

    // Check for full-day leave
    const fullDayLeave = leaves.find((l) => l.allDay);
    if (fullDayLeave) {
      return NextResponse.json({ slots: [], dayOfWeek, message: "Doctor is on leave" });
    }

    // Generate slots
    const slotDuration = doctor.slotDuration || 30;
    const allSlots: string[] = [];

    for (const block of daySchedule) {
      const startMin = timeToMinutes(block.start);
      const endMin = timeToMinutes(block.end);
      for (let min = startMin; min + slotDuration <= endMin; min += slotDuration) {
        allSlots.push(minutesToTime(min));
      }
    }

    // Remove slots blocked by partial leaves
    const partialLeaves = leaves.filter((l) => !l.allDay && l.startTime && l.endTime);
    const filteredSlots = allSlots.filter((slot) => {
      const slotMin = timeToMinutes(slot);
      return !partialLeaves.some((l) => {
        const leaveStart = timeToMinutes(l.startTime!);
        const leaveEnd = timeToMinutes(l.endTime!);
        return slotMin >= leaveStart && slotMin < leaveEnd;
      });
    });

    // Check existing appointments
    const existingAppts = await db.appointment.findMany({
      where: {
        doctorId,
        date: { gte: startOfDay, lt: new Date(endOfDay.getTime() + 1) },
        status: { notIn: ["cancelled"] },
      },
      select: { time: true },
    });

    const bookedTimes = new Set(existingAppts.map((a) => a.time));

    // Filter out past slots if booking for today
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const slots = filteredSlots.map((time) => {
      let available = !bookedTimes.has(time);
      if (isToday) {
        const slotMin = timeToMinutes(time);
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (slotMin <= nowMin) available = false;
      }
      return { time, available };
    });

    return NextResponse.json({ slots, dayOfWeek, slotDuration });
  } catch (error) {
    console.error("[Public Slots] Error:", error);
    return NextResponse.json({ error: "Failed to load slots" }, { status: 500 });
  }
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
