import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/doctors/[id] — backward-compat wrapper
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

    if (!user || !["doctor", "therapist"].includes(user.role)) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      doctorIdNumber: user.staffIdNumber || "",
      name: user.name,
      role: user.role,
      gender: user.gender,
      specialization: user.specialization || "",
      department: user.department || "",
      phone: user.phone,
      email: user.email,
      consultationFee: user.consultationFee ?? 0,
      schedule: user.schedule,
      slotDuration: user.slotDuration,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      appointmentCount: user._count.appointments,
    });
  } catch (error) {
    console.error("Failed to fetch doctor:", error);
    return NextResponse.json({ error: "Failed to fetch doctor" }, { status: 500 });
  }
}

// PUT /api/doctors/[id] — backward-compat wrapper
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.specialization !== undefined) updateData.specialization = body.specialization;
    if (body.department !== undefined) updateData.department = body.department;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.gender !== undefined) updateData.gender = body.gender || null;
    if (body.consultationFee !== undefined) updateData.consultationFee = Number(body.consultationFee);
    if (body.schedule !== undefined) updateData.schedule = body.schedule;
    if (body.slotDuration !== undefined) updateData.slotDuration = Number(body.slotDuration);
    if (body.status !== undefined) updateData.status = body.status;

    const user = await db.user.update({ where: { id }, data: updateData });

    return NextResponse.json({
      id: user.id,
      doctorIdNumber: user.staffIdNumber || "",
      name: user.name,
      role: user.role,
      gender: user.gender,
      specialization: user.specialization,
      department: user.department,
      phone: user.phone,
      email: user.email,
      consultationFee: user.consultationFee,
      schedule: user.schedule,
      slotDuration: user.slotDuration,
      status: user.status,
    });
  } catch (error) {
    console.error("Failed to update doctor:", error);
    return NextResponse.json({ error: "Failed to update doctor" }, { status: 500 });
  }
}

// DELETE /api/doctors/[id] — backward-compat wrapper
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const futureAppointments = await db.appointment.count({
      where: { doctorId: id, date: { gte: now }, status: { notIn: ["cancelled", "completed"] } },
    });

    if (futureAppointments > 0) {
      return NextResponse.json({ error: "Cannot delete doctor with future appointments", futureAppointments }, { status: 409 });
    }

    await db.user.update({ where: { id }, data: { isActive: false, status: "inactive" } });
    return NextResponse.json({ message: "Doctor deleted successfully" });
  } catch (error) {
    console.error("Failed to delete doctor:", error);
    return NextResponse.json({ error: "Failed to delete doctor" }, { status: 500 });
  }
}
