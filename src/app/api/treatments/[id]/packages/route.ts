import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/treatments/[id]/packages - List packages for a treatment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const packages = await db.treatmentPackage.findMany({
      where: { treatmentId: id },
      orderBy: { sessionCount: "asc" },
    });
    return NextResponse.json(packages);
  } catch (error) {
    console.error("GET /api/treatments/[id]/packages error:", error);
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}

// POST /api/treatments/[id]/packages - Create a package for a treatment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    const treatment = await db.treatment.findUnique({ where: { id } });
    if (!treatment) {
      return NextResponse.json({ error: "Treatment not found" }, { status: 404 });
    }

    if (!body.sessionCount || body.sessionCount < 2) {
      return NextResponse.json({ error: "Session count must be at least 2" }, { status: 400 });
    }
    if (body.discountPercent == null || body.discountPercent < 0 || body.discountPercent > 100) {
      return NextResponse.json({ error: "Discount percent must be between 0 and 100" }, { status: 400 });
    }

    const sessionCount = parseInt(body.sessionCount);
    const discountPercent = parseFloat(body.discountPercent);
    const totalPrice = Math.round(treatment.basePrice * sessionCount * (1 - discountPercent / 100) * 100) / 100;
    const pricePerSession = Math.round((totalPrice / sessionCount) * 100) / 100;

    const pkg = await db.treatmentPackage.create({
      data: {
        treatmentId: id,
        name: body.name?.trim() || `${sessionCount}-Session Package`,
        sessionCount,
        discountPercent,
        totalPrice,
        pricePerSession,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json(pkg, { status: 201 });
  } catch (error) {
    console.error("POST /api/treatments/[id]/packages error:", error);
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 });
  }
}

// PUT /api/treatments/[id]/packages - Update a package (pass packageId in body)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    if (!body.packageId) {
      return NextResponse.json({ error: "packageId is required" }, { status: 400 });
    }

    const treatment = await db.treatment.findUnique({ where: { id } });
    if (!treatment) {
      return NextResponse.json({ error: "Treatment not found" }, { status: 404 });
    }

    const existing = await db.treatmentPackage.findUnique({ where: { id: body.packageId } });
    if (!existing || existing.treatmentId !== id) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const sessionCount = body.sessionCount ? parseInt(body.sessionCount) : existing.sessionCount;
    const discountPercent = body.discountPercent != null ? parseFloat(body.discountPercent) : existing.discountPercent;
    const totalPrice = Math.round(treatment.basePrice * sessionCount * (1 - discountPercent / 100) * 100) / 100;
    const pricePerSession = Math.round((totalPrice / sessionCount) * 100) / 100;

    const pkg = await db.treatmentPackage.update({
      where: { id: body.packageId },
      data: {
        name: body.name?.trim() ?? existing.name,
        sessionCount,
        discountPercent,
        totalPrice,
        pricePerSession,
        isActive: body.isActive != null ? body.isActive : existing.isActive,
      },
    });

    return NextResponse.json(pkg);
  } catch (error) {
    console.error("PUT /api/treatments/[id]/packages error:", error);
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}

// DELETE /api/treatments/[id]/packages - Delete a package (pass packageId in query)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const packageId = request.nextUrl.searchParams.get("packageId");

    if (!packageId) {
      return NextResponse.json({ error: "packageId query param is required" }, { status: 400 });
    }

    const existing = await db.treatmentPackage.findUnique({ where: { id: packageId } });
    if (!existing || existing.treatmentId !== id) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Check if any appointments reference this package
    const aptCount = await db.appointment.count({ where: { packageId } });
    if (aptCount > 0) {
      await db.treatmentPackage.update({ where: { id: packageId }, data: { isActive: false } });
      return NextResponse.json({ message: "Package deactivated (has linked appointments)", deactivated: true });
    }

    await db.treatmentPackage.delete({ where: { id: packageId } });
    return NextResponse.json({ message: "Package deleted" });
  } catch (error) {
    console.error("DELETE /api/treatments/[id]/packages error:", error);
    return NextResponse.json({ error: "Failed to delete package" }, { status: 500 });
  }
}
