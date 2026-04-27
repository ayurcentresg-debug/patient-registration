/**
 * Booking-flow availability check: is this branch open + is this doctor
 * available at this time on this date?
 *
 * GET /api/booking/availability?branchId=X&doctorId=Y&date=YYYY-MM-DD&time=HH:MM
 *
 * Returns:
 *   {
 *     ok: true | false,
 *     warnings: [
 *       { type: "holiday",  message: "Branch closed for Diwali on this date" },
 *       { type: "out_of_hours", message: "Doctor not scheduled at this branch on Tuesday" },
 *     ]
 *   }
 *
 * UI uses this to warn (not hard-block) when a user picks a slot outside
 * the branch's hours / on a holiday — admin can still confirm the booking.
 */

import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

interface ScheduleBlock { start: string; end: string }
type WeeklySchedule = Record<string, ScheduleBlock[]>;

function timeInBlocks(time: string, blocks: ScheduleBlock[] | undefined): boolean {
  if (!blocks || blocks.length === 0) return false;
  const [h, m] = time.split(":").map(Number);
  const tMin = h * 60 + (m || 0);
  for (const b of blocks) {
    const [bh, bm] = b.start.split(":").map(Number);
    const [eh, em] = b.end.split(":").map(Number);
    const startMin = bh * 60 + (bm || 0);
    const endMin = eh * 60 + (em || 0);
    if (tMin >= startMin && tMin < endMin) return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getTenantPrisma(clinicId);

    const { searchParams } = request.nextUrl;
    const branchId = searchParams.get("branchId");
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");
    const time = searchParams.get("time");

    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

    const warnings: { type: string; message: string }[] = [];
    const target = new Date(date);
    if (isNaN(target.getTime())) return NextResponse.json({ error: "invalid date" }, { status: 400 });
    const dayOfWeek = DAYS[target.getDay()];

    // Holiday check (branchId required)
    if (branchId) {
      const mmDD = `${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
      const holidays = await db.branchHoliday.findMany({ where: { branchId } });
      const matching = holidays.find(h => {
        const hDate = new Date(h.date);
        if (h.recurring) {
          const hMmDD = `${String(hDate.getMonth() + 1).padStart(2, "0")}-${String(hDate.getDate()).padStart(2, "0")}`;
          return hMmDD === mmDD;
        }
        return hDate.toISOString().slice(0, 10) === target.toISOString().slice(0, 10);
      });
      if (matching) {
        warnings.push({ type: "holiday", message: `${matching.name} — branch is closed on this date` });
      }
    }

    // Doctor schedule check (doctorId + time required)
    if (doctorId && time) {
      const user = await db.user.findUnique({
        where: { id: doctorId },
        select: { name: true, schedule: true, branchSchedules: true },
      });
      if (user) {
        // Try per-branch schedule first
        let weekly: WeeklySchedule | null = null;
        if (branchId && user.branchSchedules) {
          try {
            const map = JSON.parse(user.branchSchedules) as Record<string, WeeklySchedule>;
            if (map[branchId]) weekly = map[branchId];
          } catch { /* ignore */ }
        }
        // Fall back to clinic-wide schedule
        if (!weekly && user.schedule) {
          try { weekly = JSON.parse(user.schedule) as WeeklySchedule; } catch { /* ignore */ }
        }
        if (weekly) {
          const dayBlocks = weekly[dayOfWeek];
          if (!dayBlocks || dayBlocks.length === 0) {
            warnings.push({ type: "out_of_hours", message: `${user.name} is not scheduled on ${dayOfWeek}` });
          } else if (!timeInBlocks(time, dayBlocks)) {
            const blocksStr = dayBlocks.map(b => `${b.start}–${b.end}`).join(", ");
            warnings.push({ type: "out_of_hours", message: `${user.name}'s ${dayOfWeek} hours are ${blocksStr}` });
          }
        }
      }
    }

    return NextResponse.json({ ok: warnings.length === 0, warnings });
  } catch (err) {
    console.error("availability check error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "check failed" }, { status: 500 });
  }
}
