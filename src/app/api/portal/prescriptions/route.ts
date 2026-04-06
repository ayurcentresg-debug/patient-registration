import { prisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";
import { getPatientAuth } from "@/lib/patient-auth";
import { NextResponse } from "next/server";

/**
 * GET /api/portal/prescriptions — List patient's prescriptions
 */
export async function GET() {
  try {
    const auth = await getPatientAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = auth.clinicId ? getTenantPrisma(auth.clinicId) : prisma;

    const prescriptions = await db.prescription.findMany({
      where: { patientId: auth.patientId },
      orderBy: { date: "desc" },
      take: 30,
      include: {
        items: { orderBy: { sequence: "asc" } },
      },
    });

    return NextResponse.json(prescriptions);
  } catch (error) {
    console.error("Portal prescriptions error:", error);
    return NextResponse.json({ error: "Failed to load prescriptions" }, { status: 500 });
  }
}
