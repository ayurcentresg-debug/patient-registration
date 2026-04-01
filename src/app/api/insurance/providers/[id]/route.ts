import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/insurance/providers/[id] - Get single provider with claim count
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const provider = await db.insuranceProvider.findUnique({
      where: { id },
      include: {
        _count: {
          select: { claims: true },
        },
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Insurance provider not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(provider);
  } catch (error) {
    console.error("Error fetching insurance provider:", error);
    return NextResponse.json(
      { error: "Failed to fetch insurance provider" },
      { status: 500 }
    );
  }
}

// PUT /api/insurance/providers/[id] - Update provider fields
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.insuranceProvider.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Insurance provider not found" },
        { status: 404 }
      );
    }

    const allowedFields = [
      "name",
      "code",
      "contactPerson",
      "phone",
      "email",
      "address",
      "panelType",
      "isActive",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // If code is being changed, check for duplicates
    if (updateData.code && updateData.code !== existing.code) {
      const duplicate = await db.insuranceProvider.findFirst({
        where: { code: updateData.code as string },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Provider with code "${updateData.code}" already exists` },
          { status: 409 }
        );
      }
    }

    const provider = await db.insuranceProvider.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(provider);
  } catch (error) {
    console.error("Error updating insurance provider:", error);
    return NextResponse.json(
      { error: "Failed to update insurance provider" },
      { status: 500 }
    );
  }
}

// DELETE /api/insurance/providers/[id] - Soft delete (set isActive=false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const existing = await db.insuranceProvider.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Insurance provider not found" },
        { status: 404 }
      );
    }

    const provider = await db.insuranceProvider.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(provider);
  } catch (error) {
    console.error("Error deactivating insurance provider:", error);
    return NextResponse.json(
      { error: "Failed to deactivate insurance provider" },
      { status: 500 }
    );
  }
}
