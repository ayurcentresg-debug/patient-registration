import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/patient-packages/[id]/share - List shares for a package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const pkg = await db.patientPackage.findUnique({
      where: { id },
    });

    if (!pkg) {
      return NextResponse.json(
        { error: "Patient package not found" },
        { status: 404 }
      );
    }

    const shares = await db.packageShare.findMany({
      where: { patientPackageId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(shares);
  } catch (error) {
    console.error("Error fetching package shares:", error);
    return NextResponse.json(
      { error: "Failed to fetch package shares" },
      { status: 500 }
    );
  }
}

// POST /api/patient-packages/[id]/share - Add a share
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    if (!body.sharedWithPatientId) {
      return NextResponse.json(
        { error: "sharedWithPatientId is required" },
        { status: 400 }
      );
    }

    const pkg = await db.patientPackage.findUnique({
      where: { id },
      include: {
        shares: { where: { isActive: true } },
      },
    });

    if (!pkg) {
      return NextResponse.json(
        { error: "Patient package not found" },
        { status: 404 }
      );
    }

    if (pkg.maxSharedUsers <= 0) {
      return NextResponse.json(
        { error: "Sharing is not enabled for this package" },
        { status: 400 }
      );
    }

    // Check active shares count against limit
    const activeSharesCount = pkg.shares.length;
    if (activeSharesCount >= pkg.maxSharedUsers) {
      return NextResponse.json(
        { error: `Maximum shared users limit (${pkg.maxSharedUsers}) reached` },
        { status: 400 }
      );
    }

    // Check if already shared with this patient
    const alreadyShared = pkg.shares.some(
      (s) => s.sharedWithPatientId === body.sharedWithPatientId
    );
    if (alreadyShared) {
      return NextResponse.json(
        { error: "Package is already shared with this patient" },
        { status: 400 }
      );
    }

    // Verify the shared-with patient exists
    const sharedWithPatient = await db.patient.findUnique({
      where: { id: body.sharedWithPatientId },
    });
    if (!sharedWithPatient) {
      return NextResponse.json(
        { error: "Shared-with patient not found" },
        { status: 404 }
      );
    }

    const sharedWithName =
      body.sharedWithName ||
      `${sharedWithPatient.firstName} ${sharedWithPatient.lastName}`;

    const share = await db.packageShare.create({
      data: {
        patientPackageId: id,
        sharedWithPatientId: body.sharedWithPatientId,
        sharedByPatientId: pkg.patientId,
        sharedWithName,
        relation: body.relation || "other",
        isActive: true,
      },
    });

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    console.error("Error creating package share:", error);
    return NextResponse.json(
      { error: "Failed to create package share" },
      { status: 500 }
    );
  }
}

// DELETE /api/patient-packages/[id]/share - Remove a share
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    if (!body.shareId) {
      return NextResponse.json(
        { error: "shareId is required" },
        { status: 400 }
      );
    }

    const share = await db.packageShare.findUnique({
      where: { id: body.shareId },
    });

    if (!share || share.patientPackageId !== id) {
      return NextResponse.json(
        { error: "Share not found for this package" },
        { status: 404 }
      );
    }

    // Soft-deactivate the share
    const updated = await db.packageShare.update({
      where: { id: body.shareId },
      data: { isActive: false },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error removing package share:", error);
    return NextResponse.json(
      { error: "Failed to remove package share" },
      { status: 500 }
    );
  }
}
