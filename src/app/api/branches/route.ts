import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/branches - List branches with optional active filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active");

    const where: Record<string, unknown> = {};

    if (active === "true") {
      where.isActive = true;
    } else if (active === "false") {
      where.isActive = false;
    }

    const branches = await prisma.branch.findMany({
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
    const existingBranch = await prisma.branch.findUnique({
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
      await prisma.branch.updateMany({
        where: { isMainBranch: true },
        data: { isMainBranch: false },
      });
    }

    const branch = await prisma.branch.create({
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
