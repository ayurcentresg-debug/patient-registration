import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/doctors/[id] — single doctor with appointment count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
    });

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...doctor,
      appointmentCount: doctor._count.appointments,
      _count: undefined,
    });
  } catch (error) {
    console.error("Failed to fetch doctor:", error);
    return NextResponse.json(
      { error: "Failed to fetch doctor" },
      { status: 500 }
    );
  }
}

// PUT /api/doctors/[id] — update doctor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.specialization !== undefined) updateData.specialization = body.specialization;
    if (body.department !== undefined) updateData.department = body.department;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.consultationFee !== undefined) updateData.consultationFee = Number(body.consultationFee);
    if (body.schedule !== undefined) updateData.schedule = body.schedule;
    if (body.slotDuration !== undefined) updateData.slotDuration = Number(body.slotDuration);
    if (body.status !== undefined) updateData.status = body.status;

    const doctor = await prisma.doctor.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(doctor);
  } catch (error) {
    console.error("Failed to update doctor:", error);
    return NextResponse.json(
      { error: "Failed to update doctor" },
      { status: 500 }
    );
  }
}

// DELETE /api/doctors/[id] — delete only if no future appointments
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Doctor not found" },
        { status: 404 }
      );
    }

    // Check for future appointments (date >= today and not cancelled/completed)
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const futureAppointments = await prisma.appointment.count({
      where: {
        doctorId: id,
        date: { gte: now },
        status: {
          notIn: ["cancelled", "completed"],
        },
      },
    });

    if (futureAppointments > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete doctor with future appointments",
          futureAppointments,
        },
        { status: 409 }
      );
    }

    await prisma.doctor.delete({ where: { id } });

    return NextResponse.json({ message: "Doctor deleted successfully" });
  } catch (error) {
    console.error("Failed to delete doctor:", error);
    return NextResponse.json(
      { error: "Failed to delete doctor" },
      { status: 500 }
    );
  }
}
