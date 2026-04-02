import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES, STAFF_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/branches - List branches with optional active filter
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");

    const where: Record<string, unknown> = {};

    if (active === "true") {
      where.isActive = true;
    } else if (active === "false") {
      where.isActive = false;
    }

    const branches = await db.branch.findMany({
      where,
      orderBy: [{ isMainBranch: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(branches);
  } catch (error) {
    console.error("GET /api/branches error:", error);
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    );
  }
}

// POST /api/branches - Create a new branch
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Branch name is required" },
        { status: 400 }
      );
    }

    if (!body.code || !body.code.trim()) {
      return NextResponse.json(
        { error: "Branch code is required" },
        { status: 400 }
      );
    }

    // Check unique code
    const existingBranch = await db.branch.findFirst({
      where: { code: body.code.trim().toUpperCase() },
    });

    if (existingBranch) {
      return NextResponse.json(
        { error: "A branch with this code already exists" },
        { status: 409 }
      );
    }

    // If setting as main branch, unset all others
    if (body.isMainBranch) {
      await db.branch.updateMany({
        where: { isMainBranch: true },
        data: { isMainBranch: false },
      });
    }

    const branch = await db.branch.create({
      data: {
        name: body.name.trim(),
        code: body.code.trim().toUpperCase(),
        address: body.address?.trim() || null,
        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        zipCode: body.zipCode?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
        isMainBranch: body.isMainBranch || false,
        operatingHours: body.operatingHours || "{}",
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    console.error("POST /api/branches error:", error);
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
  }
}
