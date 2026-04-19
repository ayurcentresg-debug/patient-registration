/**
 * POST /api/staff/fix-schedules
 *
 * For all clinical staff (doctor/therapist) with an empty schedule ("{}"),
 * apply a default Mon–Sat 9am–6pm schedule so they can be booked in calendar.
 *
 * Admin-only. Safe to run multiple times (only patches truly-empty schedules).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";

const DEFAULT_SCHEDULE = JSON.stringify({
  monday:    [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
  tuesday:   [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
  wednesday: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
  thursday:  [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
  friday:    [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
  saturday:  [{ start: "09:00", end: "13:00" }],
});

export async function POST() {
  try {
    await requireRole(ADMIN_ROLES);

    const clinicId = await getClinicId();
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic" }, { status: 400 });
    }

    // Find all doctors/therapists with empty schedule
    const empties = await prisma.user.findMany({
      where: {
        clinicId,
        role: { in: ["doctor", "therapist"] },
        OR: [{ schedule: "{}" }, { schedule: null }, { schedule: "" }],
      },
      select: { id: true, name: true, role: true },
    });

    if (empties.length === 0) {
      return NextResponse.json({
        ok: true,
        fixed: 0,
        message: "All clinical staff already have schedules set — no changes needed.",
      });
    }

    // Apply default schedule
    const result = await prisma.user.updateMany({
      where: { id: { in: empties.map((e) => e.id) } },
      data: { schedule: DEFAULT_SCHEDULE },
    });

    return NextResponse.json({
      ok: true,
      fixed: result.count,
      staff: empties.map((e) => `${e.name} (${e.role})`),
      message: `Applied default Mon–Sat 9am–6pm schedule to ${result.count} staff. They're now bookable in the calendar.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[fix-schedules] Failed:", error);
    return NextResponse.json({ error: "Failed", details: msg }, { status: 500 });
  }
}
