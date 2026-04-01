import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/patient-packages/active - Get active packages for a patient (booking UI dropdown)
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { error: "patientId is required" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Find packages where patient is the owner OR a shared user
    const ownedPackages = await db.patientPackage.findMany({
      where: {
        patientId,
        status: "active",
        remainingSessions: { gt: 0 },
        expiryDate: { gt: now },
      },
      select: {
        id: true,
        packageNumber: true,
        treatmentName: true,
        packageName: true,
        totalSessions: true,
        usedSessions: true,
        remainingSessions: true,
        pricePerSession: true,
        expiryDate: true,
        consultationFeePolicy: true,
        treatmentId: true,
      },
      orderBy: { expiryDate: "asc" },
    });

    // Also find packages shared with this patient
    const sharedPackageLinks = await db.packageShare.findMany({
      where: {
        sharedWithPatientId: patientId,
        isActive: true,
      },
      select: {
        patientPackageId: true,
      },
    });

    let sharedPackages: typeof ownedPackages = [];
    if (sharedPackageLinks.length > 0) {
      const sharedIds = sharedPackageLinks.map((s) => s.patientPackageId);
      sharedPackages = await db.patientPackage.findMany({
        where: {
          id: { in: sharedIds },
          status: "active",
          remainingSessions: { gt: 0 },
          expiryDate: { gt: now },
        },
        select: {
          id: true,
          packageNumber: true,
          treatmentName: true,
          packageName: true,
          totalSessions: true,
          usedSessions: true,
          remainingSessions: true,
          pricePerSession: true,
          expiryDate: true,
          consultationFeePolicy: true,
          treatmentId: true,
        },
        orderBy: { expiryDate: "asc" },
      });
    }

    // Combine and mark ownership
    const allPackages = [
      ...ownedPackages.map((p) => ({ ...p, isOwned: true, isShared: false })),
      ...sharedPackages.map((p) => ({ ...p, isOwned: false, isShared: true })),
    ];

    return NextResponse.json(allPackages);
  } catch (error) {
    console.error("Error fetching active packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch active packages" },
      { status: 500 }
    );
  }
}
