import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/branches/[id] - Get a single branch
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    return NextResponse.json(branch);
  } catch (error) {
    console.error("GET /api/branches/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch branch" },
      { status: 500 }
    );
  }
}

// PUT /api/branches/[id] - Update a branch
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check branch exists
    const existing = await prisma.branch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // If updating code, check uniqueness
    if (body.code !== undefined) {
      if (!body.code || !body.code.trim()) {
        return NextResponse.json(
          { error: "Branch code is required" },
          { status: 400 }
        );
      }
      const codeTaken = await prisma.branch.findFirst({
        where: { code: body.code.trim().toUpperCase(), id: { not: id } },
      });
      if (codeTaken) {
        return NextResponse.json(
          { error: "A branch with this code already exists" },
          { status: 409 }
        );
      }
    }

    // If setting as main branch, unset all others
    if (body.isMainBranch === true) {
      await prisma.branch.updateMany({
        where: { isMainBranch: true, id: { not: id } },
        data: { isMainBranch: false },
      });
    }

    const allowedFields = [
      "name",
      "code",
      "address",
      "city",
      "state",
      "zipCode",
      "phone",
      "email",
      "isActive",
      "isMainBranch",
      "operatingHours",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "code") {
          updateData[field] = body[field].trim().toUpperCase();
        } else if (typeof body[field] === "string") {
          updateData[field] = body[field].trim();
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(branch);
  } catch (error) {
    console.error("PUT /api/branches/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update branch" },
      { status: 500 }
    );
  }
}

// DELETE /api/branches/[id] - Soft delete (set isActive=false)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.branch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(branch);
  } catch (error) {
    console.error("DELETE /api/branches/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete branch" },
      { status: 500 }
    );
  }
}
