import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/appointments/affected?doctorId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const payload = await requireRole(["admin", "doctor", "therapist", "receptionist"]);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = request.nextUrl;
    const doctorId = searchParams.get("doctorId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!doctorId || !from || !to) {
      return NextResponse.json(
        { error: "doctorId, from, and to query parameters are required" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from + "T00:00:00");
    const toDate = new Date(to + "T23:59:59");

    const appointments = await db.appointment.findMany({
      where: {
        doctorId,
        date: { gte: fromDate, lte: toDate },
        status: { in: ["scheduled", "confirmed"] },
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });

    const result = appointments.map((a) => ({
      id: a.id,
      date: a.date.toISOString().split("T")[0],
      time: a.time,
      endTime: a.endTime,
      duration: a.duration,
      status: a.status,
      doctor: a.doctor,
      doctorId: a.doctorId,
      type: a.type,
      reason: a.reason,
      patientName: a.patient
        ? `${a.patient.firstName} ${a.patient.lastName}`
        : a.walkinName || "Walk-in",
      patientId: a.patientId,
      patientPhone: a.patient?.phone || a.walkinPhone || null,
      treatmentName: a.treatmentName,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch affected appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch affected appointments" },
      { status: 500 }
    );
  }
}
