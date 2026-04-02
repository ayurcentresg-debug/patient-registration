import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES, STAFF_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import bcrypt from "bcryptjs";

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
    if (body.specialization !== undefined) updateData.specialization = body.specialization || null;
    if (body.department !== undefined) updateData.department = body.department || null;
    if (body.consultationFee !== undefined) updateData.consultationFee = body.consultationFee !== null ? Number(body.consultationFee) : null;
    if (body.schedule !== undefined) updateData.schedule = body.schedule;
    if (body.slotDuration !== undefined) updateData.slotDuration = Number(body.slotDuration);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.password && typeof body.password === "string" && body.password.length >= 6) {
      updateData.password = await bcrypt.hash(body.password, 12);
    }

    const user = await db.user.update({ where: { id }, data: updateData });
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
    return NextResponse.json({ message: "Staff member deactivated successfully" });
  } catch (error) {
    console.error("Failed to delete staff member:", error);
    return NextResponse.json({ error: "Failed to delete staff member" }, { status: 500 });
  }
}
