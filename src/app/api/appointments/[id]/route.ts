import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const includeRelations = {
  patient: { select: { firstName: true, lastName: true, email: true, whatsapp: true, phone: true } },
  doctorRef: true,
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: includeRelations,
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("GET /api/appointments/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // If rescheduling (date or time changed), check for conflicts
    const newDate = body.date ? new Date(body.date) : existing.date;
    const newTime = body.time || existing.time;
    const doctorName = body.doctor || existing.doctor;

    const isRescheduling =
      (body.date && new Date(body.date).toDateString() !== existing.date.toDateString()) ||
      (body.time && body.time !== existing.time);

    if (isRescheduling) {
      const dayStart = new Date(newDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(newDate);
      dayEnd.setHours(23, 59, 59, 999);

      const conflict = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          doctor: doctorName,
          date: { gte: dayStart, lte: dayEnd },
          time: newTime,
          status: { notIn: ["cancelled", "no-show"] },
        },
      });

      if (conflict) {
        return NextResponse.json(
          { error: "Doctor already has an appointment at this date and time" },
          { status: 409 }
        );
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(body.patientId !== undefined && { patientId: body.patientId }),
        ...(body.doctorId !== undefined && { doctorId: body.doctorId || null }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.time !== undefined && { time: body.time }),
        ...(body.endTime !== undefined && { endTime: body.endTime || null }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.doctor !== undefined && { doctor: body.doctor }),
        ...(body.department !== undefined && { department: body.department || null }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.reason !== undefined && { reason: body.reason || null }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        ...(body.status !== undefined && { status: body.status }),
      },
      include: includeRelations,
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("PUT /api/appointments/[id] error:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    await prisma.appointment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/appointments/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
}
