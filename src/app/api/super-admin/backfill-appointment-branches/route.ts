/**
 * Super-admin only: tag all legacy appointments (branchId=null) with their
 * clinic's main branch.
 *
 * POST /api/super-admin/backfill-appointment-branches
 *
 * Strategy: for each clinic, find its main branch (isMainBranch=true,
 * fallback to first active branch). Update all appointments where
 * branchId IS NULL to that branch's id. Idempotent — only touches
 * untagged rows. Same logic also runs on doctors so floating staff
 * default to main when nothing else is set.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin-auth";

export async function POST() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clinics = await prisma.clinic.findMany({ select: { id: true, name: true } });

    let totalApptUpdated = 0;
    let totalDocUpdated = 0;
    const perClinic: { name: string; mainBranch: string | null; appts: number; doctors: number }[] = [];

    for (const c of clinics) {
      // Pick main branch — explicit isMainBranch=true, else first active
      const main = await prisma.branch.findFirst({
        where: { clinicId: c.id, isMainBranch: true, isActive: true },
        select: { id: true, name: true },
      }) ?? await prisma.branch.findFirst({
        where: { clinicId: c.id, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      });

      if (!main) {
        perClinic.push({ name: c.name, mainBranch: null, appts: 0, doctors: 0 });
        continue;
      }

      const apptResult = await prisma.appointment.updateMany({
        where: { clinicId: c.id, branchId: null },
        data: { branchId: main.id },
      });
      const docResult = await prisma.user.updateMany({
        where: { clinicId: c.id, branchId: null, role: { in: ["doctor", "therapist"] } },
        data: { branchId: main.id },
      });

      totalApptUpdated += apptResult.count;
      totalDocUpdated += docResult.count;
      perClinic.push({
        name: c.name,
        mainBranch: main.name,
        appts: apptResult.count,
        doctors: docResult.count,
      });
    }

    return NextResponse.json({
      ok: true,
      clinicsScanned: clinics.length,
      totalApptUpdated,
      totalDocUpdated,
      perClinic,
      summary: `Tagged ${totalApptUpdated} appointment(s) and ${totalDocUpdated} doctor/therapist(s) across ${clinics.length} clinic(s) with their main branch.`,
    });
  } catch (err) {
    console.error("backfill-appointment-branches error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backfill failed" },
      { status: 500 }
    );
  }
}
