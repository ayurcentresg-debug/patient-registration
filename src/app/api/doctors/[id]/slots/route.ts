import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface TimeBlock {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

type Schedule = Record<string, TimeBlock[]>;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function generateSlots(blocks: TimeBlock[], slotDuration: number): string[] {
  const slots: string[] = [];

  for (const block of blocks) {
    const startMin = timeToMinutes(block.start);
    const endMin = timeToMinutes(block.end);

    for (let min = startMin; min + slotDuration <= endMin; min += slotDuration) {
      slots.push(minutesToTime(min));
    }
  }

  return slots;
}

function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[date.getDay()];
}

// GET /api/doctors/[id]/slots?date=2026-03-26
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json(
        { error: "date query parameter is required (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const doctor = await prisma.doctor.findUnique({ where: { id } });

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    // Parse the doctor's schedule JSON
    let schedule: Schedule;
    try {
      schedule = JSON.parse(doctor.schedule);
    } catch {
      return NextResponse.json(
        { error: "Doctor schedule is not configured properly" },
        { status: 500 }
      );
    }

    // Determine day of week for the requested date
    const dayOfWeek = getDayOfWeek(dateStr);
    const blocks: TimeBlock[] = schedule[dayOfWeek] || [];

    if (blocks.length === 0) {
      return NextResponse.json({
        doctorId: id,
        date: dateStr,
        dayOfWeek,
        slots: [],
      });
    }

    // Generate all possible slots from the schedule blocks
    const allSlotTimes = generateSlots(blocks, doctor.slotDuration);

    // Query existing appointments for this doctor on the given date
    const startOfDay = new Date(dateStr + "T00:00:00");
    const endOfDay = new Date(dateStr + "T23:59:59");

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: id,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          notIn: ["cancelled"],
        },
      },
      select: {
        time: true,
      },
    });

    const bookedTimes = new Set(existingAppointments.map((a) => a.time));

    // Build the response with availability info
    const slots = allSlotTimes.map((time) => ({
      time,
      available: !bookedTimes.has(time),
    }));

    return NextResponse.json({
      doctorId: id,
      date: dateStr,
      dayOfWeek,
      slotDuration: doctor.slotDuration,
      slots,
    });
  } catch (error) {
    console.error("Failed to fetch doctor slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    );
  }
}
