import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

interface TimeBlock {
  start: string;
  end: string;
}

type Schedule = Record<string, TimeBlock[]>;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[date.getDay()];
}

// GET /api/doctors/available?date=YYYY-MM-DD&time=HH:MM&excludeDoctorId=xxx&specialization=xxx
export async function GET(request: NextRequest) {
  try {
    const payload = await requireRole(["admin", "doctor", "therapist", "receptionist"]);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date");
    const time = searchParams.get("time");
    const excludeDoctorId = searchParams.get("excludeDoctorId");
    const specialization = searchParams.get("specialization");

    if (!date || !time) {
      return NextResponse.json(
        { error: "date and time query parameters are required" },
        { status: 400 }
      );
    }

    // Find all active clinical staff
    const clinicalRoles = ["doctor", "therapist"];
    const doctors = await db.user.findMany({
      where: {
        role: { in: clinicalRoles },
        isActive: true,
        status: "active",
        ...(excludeDoctorId ? { id: { not: excludeDoctorId } } : {}),
      },
    });

    const requestedDate = new Date(date + "T00:00:00");
    const requestedDateEnd = new Date(date + "T23:59:59");
    const dayOfWeek = getDayOfWeek(date);
    const requestedMinutes = timeToMinutes(time);

    const results = [];

    for (const doc of doctors) {
      // 1. Parse schedule and check if doctor works on this day/time
      let schedule: Schedule;
      try {
        schedule = JSON.parse(doc.schedule);
      } catch {
        continue; // skip doctors with invalid schedule
      }

      const blocks: TimeBlock[] = schedule[dayOfWeek] || [];
      if (blocks.length === 0) continue;

      // Check if the requested time falls within any schedule block
      const inSchedule = blocks.some((block) => {
        const start = timeToMinutes(block.start);
        const end = timeToMinutes(block.end);
        return requestedMinutes >= start && requestedMinutes + doc.slotDuration <= end;
      });
      if (!inSchedule) continue;

      // 2. Check leaves for this day
      const leaves = await db.staffLeave.findMany({
        where: {
          OR: [{ userId: doc.id }, { userId: "clinic" }],
          status: "approved",
          startDate: { lte: requestedDateEnd },
          endDate: { gte: requestedDate },
        },
      });

      const fullDayLeave = leaves.find((l) => l.allDay);
      if (fullDayLeave) continue;

      // Check time-specific blocks
      const blockedByTime = leaves.some((l) => {
        if (l.allDay || !l.startTime || !l.endTime) return false;
        const blockStart = timeToMinutes(l.startTime);
        const blockEnd = timeToMinutes(l.endTime);
        return requestedMinutes < blockEnd && requestedMinutes + doc.slotDuration > blockStart;
      });
      if (blockedByTime) continue;

      // 3. Check if the slot is already booked
      const startOfDay = new Date(date + "T00:00:00");
      const endOfDay = new Date(date + "T23:59:59");

      const existingAppointment = await db.appointment.findFirst({
        where: {
          doctorId: doc.id,
          date: { gte: startOfDay, lte: endOfDay },
          time,
          status: { notIn: ["cancelled"] },
        },
      });

      const available = !existingAppointment;

      results.push({
        id: doc.id,
        name: doc.name,
        role: doc.role,
        specialization: doc.specialization,
        department: doc.department,
        slotDuration: doc.slotDuration,
        available,
      });
    }

    // Sort: prioritize by specialization match, then by role match, then available
    if (specialization) {
      results.sort((a, b) => {
        const aSpecMatch = a.specialization === specialization ? 0 : 1;
        const bSpecMatch = b.specialization === specialization ? 0 : 1;
        if (aSpecMatch !== bSpecMatch) return aSpecMatch - bSpecMatch;

        const aAvail = a.available ? 0 : 1;
        const bAvail = b.available ? 0 : 1;
        return aAvail - bAvail;
      });
    } else {
      results.sort((a, b) => {
        const aAvail = a.available ? 0 : 1;
        const bAvail = b.available ? 0 : 1;
        return aAvail - bAvail;
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to fetch available doctors:", error);
    return NextResponse.json(
      { error: "Failed to fetch available doctors" },
      { status: 500 }
    );
  }
}
