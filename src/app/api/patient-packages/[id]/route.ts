import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/patient-packages/[id] - Get single package with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pkg = await prisma.patientPackage.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            patientIdNumber: true,
            phone: true,
          },
        },
        treatment: {
          select: {
            id: true,
            name: true,
            category: true,
            duration: true,
          },
        },
        treatmentPackage: true,
        sessions: {
          orderBy: { sessionNumber: "asc" },
        },
        shares: {
          orderBy: { createdAt: "desc" },
        },
        refunds: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json(
        { error: "Patient package not found" },
        { status: 404 }
      );
    }

    // Add computed fields
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (new Date(pkg.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      ...pkg,
      daysUntilExpiry,
      isExpiringSoon: daysUntilExpiry > 0 && daysUntilExpiry <= 30,
    });
  } catch (error) {
    console.error("Error fetching patient package:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient package" },
      { status: 500 }
    );
  }
}

// PUT /api/patient-packages/[id] - Update package
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.patientPackage.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Patient package not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.expiryDate !== undefined) updateData.expiryDate = new Date(body.expiryDate);
    if (body.maxSharedUsers !== undefined) updateData.maxSharedUsers = Number(body.maxSharedUsers);
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.consultationFeePolicy !== undefined) updateData.consultationFeePolicy = body.consultationFeePolicy;
    if (body.paidAmount !== undefined) {
      const paidAmount = Number(body.paidAmount);
      updateData.paidAmount = Math.round(paidAmount * 100) / 100;
      updateData.balanceAmount = Math.round((existing.totalPrice - paidAmount) * 100) / 100;
    }

    const updated = await prisma.patientPackage.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            patientIdNumber: true,
          },
        },
        sessions: {
          orderBy: { sessionNumber: "asc" },
        },
        shares: true,
        refunds: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating patient package:", error);
    return NextResponse.json(
      { error: "Failed to update patient package" },
      { status: 500 }
    );
  }
}

// DELETE /api/patient-packages/[id] - Soft delete (cancel) only if no sessions used
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.patientPackage.findUnique({
      where: { id },
      include: {
        sessions: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Patient package not found" },
        { status: 404 }
      );
    }

    if (existing.usedSessions > 0) {
      return NextResponse.json(
        { error: "Cannot cancel package with used sessions. Use refund instead." },
        { status: 400 }
      );
    }

    const cancelled = await prisma.patientPackage.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return NextResponse.json(cancelled);
  } catch (error) {
    console.error("Error cancelling patient package:", error);
    return NextResponse.json(
      { error: "Failed to cancel patient package" },
      { status: 500 }
    );
  }
}
