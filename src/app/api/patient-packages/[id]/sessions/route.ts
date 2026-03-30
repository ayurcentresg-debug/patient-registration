import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/patient-packages/[id]/sessions - List sessions for a package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pkg = await prisma.patientPackage.findUnique({
      where: { id },
    });

    if (!pkg) {
      return NextResponse.json(
        { error: "Patient package not found" },
        { status: 404 }
      );
    }

    const sessions = await prisma.packageSession.findMany({
      where: { patientPackageId: id },
      orderBy: { sessionNumber: "asc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching package sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch package sessions" },
      { status: 500 }
    );
  }
}

// POST /api/patient-packages/[id]/sessions - Record a session usage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const pkg = await prisma.patientPackage.findUnique({
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

    if (pkg.status !== "active") {
      return NextResponse.json(
        { error: `Cannot record session on a ${pkg.status} package` },
        { status: 400 }
      );
    }

    if (pkg.remainingSessions <= 0) {
      return NextResponse.json(
        { error: "No remaining sessions in this package" },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(pkg.expiryDate) < new Date()) {
      return NextResponse.json(
        { error: "This package has expired" },
        { status: 400 }
      );
    }

    // Validate usedByPatientId if provided - must be owner or in shares list
    if (body.usedByPatientId && body.usedByPatientId !== pkg.patientId) {
      const isShared = pkg.shares.some(
        (s) => s.sharedWithPatientId === body.usedByPatientId && s.isActive
      );
      if (!isShared) {
        return NextResponse.json(
          { error: "This patient is not authorized to use this package" },
          { status: 403 }
        );
      }
    }

    // Auto-increment session number
    const sessionNumber = pkg.usedSessions + 1;

    // Determine new status
    const newRemaining = pkg.remainingSessions - 1;
    const newStatus = newRemaining === 0 ? "completed" : "active";

    // Build update data for the package
    const packageUpdateData: Record<string, unknown> = {
      usedSessions: pkg.usedSessions + 1,
      remainingSessions: newRemaining,
      status: newStatus,
    };

    // Set firstSessionDate if this is the first session
    if (!pkg.firstSessionDate) {
      packageUpdateData.firstSessionDate = body.date ? new Date(body.date) : new Date();
    }

    // Use a transaction to create session and update package atomically
    const [session, updatedPackage] = await prisma.$transaction([
      prisma.packageSession.create({
        data: {
          patientPackageId: id,
          sessionNumber,
          appointmentId: body.appointmentId || null,
          usedByPatientId: body.usedByPatientId || pkg.patientId,
          usedByName: body.usedByName || null,
          date: body.date ? new Date(body.date) : new Date(),
          doctorName: body.doctorName || null,
          branchId: body.branchId || null,
          status: body.status || "completed",
          notes: body.notes || null,
        },
      }),
      prisma.patientPackage.update({
        where: { id },
        data: packageUpdateData,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          sessions: {
            orderBy: { sessionNumber: "asc" },
          },
          shares: true,
        },
      }),
    ]);

    return NextResponse.json(
      { session, package: updatedPackage },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error recording package session:", error);
    return NextResponse.json(
      { error: "Failed to record package session" },
      { status: 500 }
    );
  }
}
