/**
 * Super-admin only: reset ALL demo clinic staff passwords to Demo2026!
 *
 * POST /api/super-admin/reset-demo-passwords
 *
 * Use case: the demo clinic exists but logging in fails because someone
 * (or an earlier session) changed a password. This resets every user
 * (admin, doctor, therapist, receptionist) on the demo clinic back to
 * the canonical Demo2026! so the credentials panel works again.
 *
 * Idempotent — safe to run repeatedly.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin-auth";
import bcrypt from "bcryptjs";

const DEMO_CLINIC_EMAIL = "demo@ayurgate.com";
const DEMO_PASSWORD = "Demo2026!";

export async function POST() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clinic = await prisma.clinic.findFirst({
      where: { email: DEMO_CLINIC_EMAIL },
      select: { id: true, name: true },
    });

    if (!clinic) {
      return NextResponse.json(
        { error: "Demo clinic does not exist. Run /api/super-admin/seed-demo first." },
        { status: 404 }
      );
    }

    const users = await prisma.user.findMany({
      where: { clinicId: clinic.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Demo clinic has no users. Run /api/super-admin/seed-demo to repopulate staff." },
        { status: 404 }
      );
    }

    const pwHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    let resetCount = 0;
    const reset: { name: string; email: string; role: string }[] = [];

    for (const u of users) {
      await prisma.user.update({
        where: { id: u.id },
        data: { password: pwHash },
      });
      resetCount++;
      reset.push({ name: u.name, email: u.email || "(no email)", role: u.role });
    }

    return NextResponse.json({
      ok: true,
      clinicName: clinic.name,
      resetCount,
      reset,
      password: DEMO_PASSWORD,
      summary: `Reset ${resetCount} staff password(s) at "${clinic.name}" to ${DEMO_PASSWORD}.`,
    });
  } catch (err) {
    console.error("reset-demo-passwords error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reset passwords" },
      { status: 500 }
    );
  }
}
