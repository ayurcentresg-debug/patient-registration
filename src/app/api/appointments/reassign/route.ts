import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";

interface ReassignRequest {
  appointmentIds: string[];
  newDoctorId: string;
  reason?: string;
}

// POST /api/appointments/reassign
export async function POST(request: NextRequest) {
  try {
    const payload = await requireRole(["admin"]);
    if (!payload) {
      return NextResponse.json({ error: "Admin role required" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body: ReassignRequest = await request.json();
    const { appointmentIds, newDoctorId, reason } = body;

    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return NextResponse.json({ error: "appointmentIds array is required" }, { status: 400 });
    }
    if (!newDoctorId) {
      return NextResponse.json({ error: "newDoctorId is required" }, { status: 400 });
    }

    // Verify new doctor exists and is active
    const newDoctor = await db.user.findUnique({ where: { id: newDoctorId } });
    if (!newDoctor || !newDoctor.isActive) {
      return NextResponse.json({ error: "Target doctor not found or inactive" }, { status: 404 });
    }

    const reassignable = ["scheduled", "confirmed"];
    let reassigned = 0;
    let failed = 0;
    const errors: Array<{ appointmentId: string; error: string }> = [];

    for (const appointmentId of appointmentIds) {
      try {
        // 1. Verify appointment exists and is reassignable
        const appointment = await db.appointment.findUnique({ where: { id: appointmentId } });
        if (!appointment) {
          errors.push({ appointmentId, error: "Appointment not found" });
          failed++;
          continue;
        }

        if (!reassignable.includes(appointment.status)) {
          errors.push({ appointmentId, error: `Cannot reassign appointment with status: ${appointment.status}` });
          failed++;
          continue;
        }

        if (appointment.doctorId === newDoctorId) {
          errors.push({ appointmentId, error: "Appointment already assigned to this doctor" });
          failed++;
          continue;
        }

        // 2. Verify new doctor has available slot at the same date/time
        const appointmentDate = appointment.date;
        const startOfDay = new Date(appointmentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(appointmentDate);
        endOfDay.setHours(23, 59, 59, 999);

        const conflicting = await db.appointment.findFirst({
          where: {
            doctorId: newDoctorId,
            date: { gte: startOfDay, lte: endOfDay },
            time: appointment.time,
            status: { notIn: ["cancelled"] },
          },
        });

        if (conflicting) {
          errors.push({ appointmentId, error: `${newDoctor.name} already has an appointment at ${appointment.time}` });
          failed++;
          continue;
        }

        // 3. Update appointment
        const oldDoctor = appointment.doctor;
        const oldDoctorId = appointment.doctorId;

        const existingNotes = appointment.notes || "";
        const reassignNote = `[Reassigned from ${oldDoctor} to ${newDoctor.name}${reason ? ` - ${reason}` : ""}]`;
        const updatedNotes = existingNotes
          ? `${existingNotes}\n${reassignNote}`
          : reassignNote;

        await db.appointment.update({
          where: { id: appointmentId },
          data: {
            doctorId: newDoctorId,
            doctor: newDoctor.name,
            notes: updatedNotes,
          },
        });

        // 4. Audit log
        await logAudit({
          action: "update",
          entity: "appointment",
          entityId: appointmentId,
          details: {
            type: "reassignment",
            oldDoctorId,
            oldDoctorName: oldDoctor,
            newDoctorId,
            newDoctorName: newDoctor.name,
            reason: reason || null,
            appointmentDate: appointmentDate.toISOString().split("T")[0],
            appointmentTime: appointment.time,
          },
        });

        reassigned++;
      } catch (err) {
        console.error(`Failed to reassign appointment ${appointmentId}:`, err);
        errors.push({ appointmentId, error: "Internal error during reassignment" });
        failed++;
      }
    }

    return NextResponse.json({ reassigned, failed, errors });
  } catch (error) {
    console.error("Failed to reassign appointments:", error);
    return NextResponse.json(
      { error: "Failed to reassign appointments" },
      { status: 500 }
    );
  }
}
