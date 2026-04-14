import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ADMIN_ROLES, getClinicId, requireRole } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/treatments/[id] - Get single treatment with packages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const treatment = await db.treatment.findUnique({
      where: { id },
      include: {
        packages: { orderBy: { sessionCount: "asc" } },
      },
    });

    if (!treatment) {
      return NextResponse.json({ error: "Treatment not found" }, { status: 404 });
    }

    return NextResponse.json(treatment);
  } catch (error) {
    console.error("GET /api/treatments/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch treatment" }, { status: 500 });
  }
}

// PUT /api/treatments/[id] - Update treatment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await requireRole(ADMIN_ROLES);
    if (!payload) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.treatment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Treatment not found" }, { status: 404 });
    }

    const treatment = await db.treatment.update({
      where: { id },
      data: {
        name: body.name?.trim() ?? existing.name,
        description: body.description !== undefined ? (body.description?.trim() || null) : existing.description,
        category: body.category ?? existing.category,
        duration: body.duration ?? existing.duration,
        basePrice: body.basePrice != null ? parseFloat(body.basePrice) : existing.basePrice,
        isActive: body.isActive != null ? body.isActive : existing.isActive,
        sortOrder: body.sortOrder ?? existing.sortOrder,
      },
      include: { packages: { orderBy: { sessionCount: "asc" } } },
    });

    // If basePrice changed, recalculate all package prices
    if (body.basePrice != null && parseFloat(body.basePrice) !== existing.basePrice) {
      const packages = await db.treatmentPackage.findMany({ where: { treatmentId: id } });
      for (const pkg of packages) {
        const totalPrice = Math.round(treatment.basePrice * pkg.sessionCount * (1 - pkg.discountPercent / 100) * 100) / 100;
        const pricePerSession = Math.round((totalPrice / pkg.sessionCount) * 100) / 100;
        await db.treatmentPackage.update({
          where: { id: pkg.id },
          data: { totalPrice, pricePerSession },
        });
      }
    }

    // Re-fetch with updated packages
    const updated = await db.treatment.findUnique({
      where: { id },
      include: { packages: { orderBy: { sessionCount: "asc" } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/treatments/[id] error:", error);
    return NextResponse.json({ error: "Failed to update treatment" }, { status: 500 });
  }
}

// DELETE /api/treatments/[id] - Delete treatment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await requireRole(ADMIN_ROLES);
    if (!payload) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const existing = await db.treatment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Treatment not found" }, { status: 404 });
    }

    // Check if any appointments reference this treatment
    const appointmentCount = await db.appointment.count({ where: { treatmentId: id } });
    if (appointmentCount > 0) {
      // Soft-deactivate instead of hard delete
      await db.treatment.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ message: "Treatment deactivated (has linked appointments)", deactivated: true });
    }

    await db.treatment.delete({ where: { id } });
    return NextResponse.json({ message: "Treatment deleted" });
  } catch (error) {
    console.error("DELETE /api/treatments/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete treatment" }, { status: 500 });
  }
}
