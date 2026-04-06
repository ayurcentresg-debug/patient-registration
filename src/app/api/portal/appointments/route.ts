import { prisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";
import { getPatientAuth } from "@/lib/patient-auth";
import { NextResponse } from "next/server";

/**
 * GET /api/portal/appointments — List patient's appointments
 */
export async function GET() {
  try {
    const auth = await getPatientAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = auth.clinicId ? getTenantPrisma(auth.clinicId) : prisma;

    const appointments = await db.appointment.findMany({
      where: { patientId: auth.patientId },
      orderBy: { date: "desc" },
      take: 50,
      select: {
        id: true,
        date: true,
        time: true,
        status: true,
        type: true,
        reason: true,
        notes: true,
        doctor: true,
        department: true,
        treatmentName: true,
        packageName: true,
        sessionPrice: true,
      },
    });

    // Split into upcoming and past
    const now = new Date();
    const upcoming = appointments.filter(a => {
      const apptDate = new Date(a.date);
      return apptDate >= new Date(now.toDateString()) && a.status !== "completed" && a.status !== "cancelled";
    });
    const past = appointments.filter(a => !upcoming.includes(a));

    return NextResponse.json({ upcoming, past, total: appointments.length });
  } catch (error) {
    console.error("Portal appointments error:", error);
    return NextResponse.json({ error: "Failed to load appointments" }, { status: 500 });
  }
}
