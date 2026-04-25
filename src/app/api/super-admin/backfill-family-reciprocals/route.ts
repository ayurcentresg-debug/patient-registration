/**
 * Super-admin only: heal one-way family links across ALL clinics by creating
 * the missing reverse rows.
 *
 * POST /api/super-admin/backfill-family-reciprocals
 *
 * Scans every FamilyMember row that has a linkedPatientId set, checks
 * whether the reverse row (linkedPatientId → patientId) exists, and
 * creates it if missing. Idempotent — safe to run repeatedly.
 *
 * Free-text family members (no linkedPatientId) are untouched.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin-auth";
import { createReciprocalLink } from "@/lib/family-reciprocal";

export async function POST() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // All forward links (with linkedPatientId) — bypass tenant scoping by using base prisma
    const allLinks = await prisma.familyMember.findMany({
      where: { linkedPatientId: { not: null } },
      select: {
        id: true, clinicId: true, patientId: true, linkedPatientId: true, relation: true,
      },
    });

    const totalScanned = allLinks.length;
    let createdReverse = 0;
    let alreadyComplete = 0;
    let skipped = 0;
    const perClinic: Record<string, { scanned: number; created: number }> = {};

    for (const link of allLinks) {
      if (!link.linkedPatientId) { skipped++; continue; }

      const reverse = await createReciprocalLink(prisma, link);
      const cKey = link.clinicId || "unscoped";
      if (!perClinic[cKey]) perClinic[cKey] = { scanned: 0, created: 0 };
      perClinic[cKey].scanned++;
      if (reverse) {
        createdReverse++;
        perClinic[cKey].created++;
      } else {
        alreadyComplete++;
      }
    }

    return NextResponse.json({
      ok: true,
      totalScanned,
      createdReverse,
      alreadyComplete,
      skipped,
      perClinic,
      summary: `Scanned ${totalScanned} forward link(s). Created ${createdReverse} missing reverse link(s). ${alreadyComplete} already had reverses.`,
    });
  } catch (err) {
    console.error("backfill-family-reciprocals error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backfill failed" },
      { status: 500 }
    );
  }
}
