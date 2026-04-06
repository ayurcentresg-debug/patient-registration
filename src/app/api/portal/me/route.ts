import { prisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";
import { getPatientAuth } from "@/lib/patient-auth";
import { NextResponse } from "next/server";

/**
 * GET /api/portal/me — Get patient profile
 */
export async function GET() {
  try {
    const auth = await getPatientAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = auth.clinicId ? getTenantPrisma(auth.clinicId) : prisma;

    const patient = await db.patient.findUnique({
      where: { id: auth.patientId },
      select: {
        id: true,
        patientIdNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        age: true,
        gender: true,
        bloodGroup: true,
        allergies: true,
        medicalNotes: true,
        address: true,
        city: true,
        photoUrl: true,
        createdAt: true,
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Get summary stats
    const [appointmentCount, prescriptionCount, invoiceCount] = await Promise.all([
      db.appointment.count({ where: { patientId: auth.patientId } }),
      db.prescription.count({ where: { patientId: auth.patientId } }),
      db.invoice.count({ where: { patientId: auth.patientId } }),
    ]);

    return NextResponse.json({
      ...patient,
      stats: {
        appointments: appointmentCount,
        prescriptions: prescriptionCount,
        invoices: invoiceCount,
      },
    });
  } catch (error) {
    console.error("Portal me error:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
