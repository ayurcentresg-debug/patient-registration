import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/insurance/providers - List all insurance providers
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const providers = await db.insuranceProvider.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(providers);
  } catch (error) {
    console.error("Error fetching insurance providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch insurance providers" },
      { status: 500 }
    );
  }
}

// POST /api/insurance/providers - Create a new insurance provider
export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();

    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Check for duplicate code
    const existing = await db.insuranceProvider.findFirst({
      where: { code: body.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Provider with code "${body.code}" already exists` },
        { status: 409 }
      );
    }

    const provider = await db.insuranceProvider.create({
      data: {
        name: body.name,
        code: body.code,
        contactPerson: body.contactPerson || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        panelType: body.panelType || "private",
      },
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    console.error("Error creating insurance provider:", error);
    return NextResponse.json(
      { error: "Failed to create insurance provider" },
      { status: 500 }
    );
  }
}
