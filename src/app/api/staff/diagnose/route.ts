/**
 * GET /api/staff/diagnose
 *
 * Admin-only diagnostic. Lists ALL staff for the logged-in clinic with
 * their role, status, and whether they'd show in the appointments dropdown.
 *
 * Use this when staff is created but doesn't appear in /appointments/new.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";

export async function GET() {
  try {
    await requireRole(ADMIN_ROLES);

    const clinicId = await getClinicId();
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic" }, { status: 400 });
    }

    const all = await prisma.user.findMany({
      where: { clinicId },
      select: {
        id: true, name: true, email: true, role: true, status: true,
        isActive: true, schedule: true, staffIdNumber: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const diagnosis = all.map((s) => {
      const reasons: string[] = [];
      const isClinical = s.role === "doctor" || s.role === "therapist";
      if (!isClinical) reasons.push(`Role is "${s.role}" — not doctor/therapist`);
      if (s.status !== "active") reasons.push(`Status is "${s.status}" — must be "active"`);
      if (!s.isActive) reasons.push(`isActive=false — must be true`);

      const scheduleEmpty = !s.schedule || s.schedule === "{}" || s.schedule === "";
      if (isClinical && scheduleEmpty) {
        reasons.push(`Schedule is empty — will show in dropdown but NO bookable slots`);
      }

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        status: s.status,
        isActive: s.isActive,
        scheduleSet: !scheduleEmpty,
        staffId: s.staffIdNumber,
        createdAt: s.createdAt,
        willAppearInAppointments: isClinical && s.status === "active" && s.isActive,
        issues: reasons,
      };
    });

    const summary = {
      totalStaff: all.length,
      willAppear: diagnosis.filter((d) => d.willAppearInAppointments).length,
      doctors: diagnosis.filter((d) => d.role === "doctor").length,
      therapists: diagnosis.filter((d) => d.role === "therapist").length,
      clinicId,
    };

    return NextResponse.json({ summary, staff: diagnosis });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
