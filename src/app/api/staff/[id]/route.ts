import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES, STAFF_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";
import { MODULES, ACCESS_LEVELS } from "@/lib/permissions";

const VALID_MODULES: string[] = [...MODULES];
const VALID_ACCESS_LEVELS: string[] = [...ACCESS_LEVELS];

// GET /api/staff/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      include: { _count: { select: { appointments: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const { password: _, totpSecret: __, ...safe } = user as Record<string, unknown>;
    return NextResponse.json({ ...safe, appointmentCount: (user._count as { appointments: number }).appointments });
  } catch (error) {
    console.error("Failed to fetch staff member:", error);
    return NextResponse.json({ error: "Failed to fetch staff member" }, { status: 500 });
  }
}

// PUT /api/staff/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) {
      // Check uniqueness
      const dup = await db.user.findFirst({ where: { email: body.email, NOT: { id } } });
      if (dup) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      updateData.email = body.email;
    }
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.gender !== undefined) updateData.gender = body.gender || null;
    if (body.dateOfBirth !== undefined) updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    if (body.ethnicity !== undefined) updateData.ethnicity = body.ethnicity || null;
    if (body.residencyStatus !== undefined) updateData.residencyStatus = body.residencyStatus || null;
    if (body.prStartDate !== undefined) updateData.prStartDate = body.prStartDate ? new Date(body.prStartDate) : null;
    if (body.specialization !== undefined) updateData.specialization = body.specialization || null;
    if (body.department !== undefined) updateData.department = body.department || null;
    if (body.consultationFee !== undefined) updateData.consultationFee = body.consultationFee !== null ? Number(body.consultationFee) : null;
    if (body.schedule !== undefined) updateData.schedule = body.schedule;
    if (body.slotDuration !== undefined) updateData.slotDuration = Number(body.slotDuration);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.permissionOverrides !== undefined) {
      // Accept either a parsed object or a stringified JSON
      if (body.permissionOverrides === null || body.permissionOverrides === "") {
        updateData.permissionOverrides = null;
      } else if (typeof body.permissionOverrides === "string") {
        try {
          JSON.parse(body.permissionOverrides); // validate
          updateData.permissionOverrides = body.permissionOverrides;
        } catch {
          return NextResponse.json({ error: "permissionOverrides: invalid JSON" }, { status: 400 });
        }
      } else if (typeof body.permissionOverrides === "object") {
        // Basic shape validation
        const cleaned: Record<string, string> = {};
        for (const [mod, lvl] of Object.entries(body.permissionOverrides)) {
          if (!VALID_MODULES.includes(mod)) continue;
          if (typeof lvl !== "string" || !VALID_ACCESS_LEVELS.includes(lvl)) continue;
          cleaned[mod] = lvl;
        }
        updateData.permissionOverrides = Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
      }
    }
    if (body.dateOfJoining !== undefined) updateData.dateOfJoining = body.dateOfJoining ? new Date(body.dateOfJoining) : null;
    if (body.lastWorkingDate !== undefined) updateData.lastWorkingDate = body.lastWorkingDate ? new Date(body.lastWorkingDate) : null;
    if (body.resignationDate !== undefined) updateData.resignationDate = body.resignationDate ? new Date(body.resignationDate) : null;
    if (body.resignationReason !== undefined) updateData.resignationReason = body.resignationReason || null;
    if (body.nricFin !== undefined) updateData.nricFin = body.nricFin || null;
    if (body.jobTitle !== undefined) updateData.jobTitle = body.jobTitle || null;
    if (body.mainDuties !== undefined) updateData.mainDuties = body.mainDuties || null;
    if (body.employmentType !== undefined) updateData.employmentType = body.employmentType || "full_time";
    if (body.isWorkman !== undefined) updateData.isWorkman = body.isWorkman;
    if (body.weeklyContractedHours !== undefined) updateData.weeklyContractedHours = parseFloat(body.weeklyContractedHours) || 44;
    if (body.workingDaysPerWeek !== undefined) updateData.workingDaysPerWeek = parseFloat(body.workingDaysPerWeek) || 5.5;

    // ── HR / MOM KET fields ──
    if (body.dailyStartTime !== undefined) updateData.dailyStartTime = body.dailyStartTime || null;
    if (body.dailyEndTime !== undefined) updateData.dailyEndTime = body.dailyEndTime || null;
    if (body.breakDurationMin !== undefined) {
      updateData.breakDurationMin = body.breakDurationMin === null || body.breakDurationMin === "" ? null : Number(body.breakDurationMin);
    }
    if (body.restDay !== undefined) updateData.restDay = body.restDay || null;
    if (body.overtimeEligible !== undefined) updateData.overtimeEligible = Boolean(body.overtimeEligible);
    if (body.annualLeaveDays !== undefined) {
      updateData.annualLeaveDays = body.annualLeaveDays === null || body.annualLeaveDays === "" ? null : Number(body.annualLeaveDays);
    }
    if (body.sickLeaveDays !== undefined) {
      updateData.sickLeaveDays = body.sickLeaveDays === null || body.sickLeaveDays === "" ? null : Number(body.sickLeaveDays);
    }
    if (body.hospitalisationLeaveDays !== undefined) {
      updateData.hospitalisationLeaveDays = body.hospitalisationLeaveDays === null || body.hospitalisationLeaveDays === "" ? null : Number(body.hospitalisationLeaveDays);
    }
    if (body.probationMonths !== undefined) {
      updateData.probationMonths = body.probationMonths === null || body.probationMonths === "" ? null : Number(body.probationMonths);
    }
    if (body.probationStartDate !== undefined) updateData.probationStartDate = body.probationStartDate ? new Date(body.probationStartDate) : null;
    if (body.probationEndDate !== undefined) updateData.probationEndDate = body.probationEndDate ? new Date(body.probationEndDate) : null;
    if (body.noticeDaysProbation !== undefined) {
      updateData.noticeDaysProbation = body.noticeDaysProbation === null || body.noticeDaysProbation === "" ? null : Number(body.noticeDaysProbation);
    }
    if (body.noticeDaysConfirmed !== undefined) {
      updateData.noticeDaysConfirmed = body.noticeDaysConfirmed === null || body.noticeDaysConfirmed === "" ? null : Number(body.noticeDaysConfirmed);
    }
    if (body.employmentEndDate !== undefined) updateData.employmentEndDate = body.employmentEndDate ? new Date(body.employmentEndDate) : null;

    if (body.password && typeof body.password === "string" && body.password.length >= 12) {
      updateData.password = await bcrypt.hash(body.password, 12);
    }

    const user = await db.user.update({ where: { id }, data: updateData });

    await logAudit({
      action: "update",
      entity: "staff",
      entityId: id,
    });

    const { password: _, totpSecret: __, ...safe } = user as Record<string, unknown>;
    return NextResponse.json(safe);
  } catch (error) {
    console.error("Failed to update staff member:", error);
    return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 });
  }
}

// DELETE /api/staff/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Check for future appointments (clinical roles)
    if (existing.role === "doctor" || existing.role === "therapist") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const futureAppointments = await db.appointment.count({
        where: { doctorId: id, date: { gte: now }, status: { notIn: ["cancelled", "completed"] } },
      });
      if (futureAppointments > 0) {
        return NextResponse.json(
          { error: "Cannot delete staff member with future appointments", futureAppointments },
          { status: 409 }
        );
      }
    }

    // Soft delete — set inactive
    await db.user.update({ where: { id }, data: { isActive: false, status: "inactive" } });

    await logAudit({
      action: "delete",
      entity: "staff",
      entityId: id,
      details: { name: existing.name },
    });

    return NextResponse.json({ message: "Staff member deactivated successfully" });
  } catch (error) {
    console.error("Failed to delete staff member:", error);
    return NextResponse.json({ error: "Failed to delete staff member" }, { status: 500 });
  }
}
