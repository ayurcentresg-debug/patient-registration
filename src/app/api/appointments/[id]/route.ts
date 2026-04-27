import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, assertBranchAccess } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

const includeRelations = {
  patient: { select: { firstName: true, lastName: true, email: true, whatsapp: true, phone: true } },
  doctorRef: true,
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const appointment = await db.appointment.findUnique({
      where: { id },
      include: includeRelations,
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    // RBAC (#I): branch-restricted users can only access their branch's records
    const denied = await assertBranchAccess(appointment.branchId);
    if (denied) return denied;

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
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.appointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    // RBAC (#I): branch-restricted users can only mutate their branch's records
    const denied = await assertBranchAccess(existing.branchId);
    if (denied) return denied;
    // Also block them from re-tagging the appointment to another branch
    if (body.branchId !== undefined && body.branchId !== existing.branchId) {
      const deniedNew = await assertBranchAccess(body.branchId);
      if (deniedNew) return deniedNew;
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

      const conflict = await db.appointment.findFirst({
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

    const appointment = await db.appointment.update({
      where: { id },
      data: {
        ...(body.patientId !== undefined && { patientId: body.patientId }),
        ...(body.doctorId !== undefined && { doctorId: body.doctorId || null }),
        ...(body.branchId !== undefined && { branchId: body.branchId || null }),
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
        ...(body.patientPackageId !== undefined && { patientPackageId: body.patientPackageId || null }),
      },
      include: includeRelations,
    });

    // ─── Auto-deduct package session on completion ─────────────────────────
    if (
      body.status === "completed" &&
      existing.status !== "completed" &&
      (appointment.patientPackageId || existing.patientPackageId)
    ) {
      const ppId = appointment.patientPackageId || existing.patientPackageId;
      try {
        const pkg = await db.patientPackage.findUnique({ where: { id: ppId! } });
        if (pkg && pkg.status === "active" && pkg.remainingSessions > 0) {
          // Check if a session was already recorded for this appointment
          const existingSession = await db.packageSession.findFirst({
            where: { patientPackageId: ppId!, appointmentId: id },
          });
          if (!existingSession) {
            const sessionNumber = pkg.usedSessions + 1;
            const newRemaining = pkg.remainingSessions - 1;
            const newStatus = newRemaining <= 0 ? "completed" : "active";

            await db.packageSession.create({
              data: {
                patientPackageId: ppId!,
                sessionNumber,
                appointmentId: id,
                usedByPatientId: appointment.patientId || existing.patientId || pkg.patientId,
                date: new Date(),
                doctorName: appointment.doctor || existing.doctor || null,
                status: "completed",
                notes: "Auto-recorded on appointment completion",
              },
            });

            const updateData: Record<string, unknown> = {
              usedSessions: sessionNumber,
              remainingSessions: newRemaining,
              status: newStatus,
            };
            if (!pkg.firstSessionDate) {
              updateData.firstSessionDate = new Date();
            }

            await db.patientPackage.update({
              where: { id: ppId! },
              data: updateData,
            });
          }
        }
      } catch (pkgErr) {
        // Don't fail the appointment update if package deduction fails
        console.error("Package auto-deduction error:", pkgErr);
      }
    }

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
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const existing = await db.appointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    // RBAC (#I): branch-restricted users can only delete their branch's records
    const denied = await assertBranchAccess(existing.branchId);
    if (denied) return denied;

    await db.appointment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/appointments/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
}
