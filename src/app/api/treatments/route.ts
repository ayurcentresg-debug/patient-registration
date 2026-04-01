import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/treatments - List all treatments with optional filters
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const active = searchParams.get("active");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (active === "true") where.isActive = true;
    if (active === "false") where.isActive = false;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const treatments = await db.treatment.findMany({
      where,
      include: {
        packages: {
          where: { isActive: true },
          orderBy: { sessionCount: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(treatments);
  } catch (error) {
    console.error("GET /api/treatments error:", error);
    return NextResponse.json({ error: "Failed to fetch treatments" }, { status: 500 });
  }
}

// POST /api/treatments - Create a new treatment
export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Treatment name is required" }, { status: 400 });
    }
    if (body.basePrice == null || body.basePrice < 0) {
      return NextResponse.json({ error: "Valid base price is required" }, { status: 400 });
    }

    const treatment = await db.treatment.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        category: body.category || "therapy",
        duration: body.duration || 50,
        basePrice: parseFloat(body.basePrice) || 0,
        isActive: body.isActive !== false,
        sortOrder: body.sortOrder || 0,
      },
      include: { packages: true },
    });

    return NextResponse.json(treatment, { status: 201 });
  } catch (error) {
    console.error("POST /api/treatments error:", error);
    return NextResponse.json({ error: "Failed to create treatment" }, { status: 500 });
  }
}
