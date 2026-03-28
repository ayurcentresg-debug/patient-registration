import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/suppliers/[id] - Get single supplier with purchase history
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Get recent purchase orders for this supplier
    const recentPOs = await prisma.purchaseOrder.findMany({
      where: { supplierId: id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Purchase stats
    const allPOs = await prisma.purchaseOrder.findMany({
      where: { supplierId: id },
      select: { totalAmount: true },
    });

    return NextResponse.json({
      ...supplier,
      purchaseStats: {
        totalOrders: allPOs.length,
        totalValue: Math.round(
          allPOs.reduce((sum, po) => sum + po.totalAmount, 0) * 100
        ) / 100,
      },
      recentPurchaseOrders: recentPOs,
    });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 }
    );
  }
}

// PUT /api/suppliers/[id] - Update supplier details
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "name",
      "contactPerson",
      "phone",
      "email",
      "address",
      "gstNumber",
      "status",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // If updating name, validate uniqueness
    if (body.name && body.name !== existingSupplier.name) {
      const duplicateName = await prisma.supplier.findFirst({
        where: { name: body.name, id: { not: id } },
      });
      if (duplicateName) {
        return NextResponse.json(
          { error: "A supplier with this name already exists" },
          { status: 409 }
        );
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
  }
}

// DELETE /api/suppliers/[id] - Soft-delete supplier (set status to "inactive")
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Check for active POs (not cancelled or received)
    const activePOs = await prisma.purchaseOrder.count({
      where: {
        supplierId: id,
        status: { in: ["draft", "submitted", "partial"] },
      },
    });

    if (activePOs > 0) {
      return NextResponse.json(
        {
          error: `Cannot deactivate supplier with ${activePOs} active purchase order(s). Cancel or complete them first.`,
        },
        { status: 400 }
      );
    }

    // Soft-delete: set status to inactive
    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: { status: "inactive" },
    });

    return NextResponse.json({
      message: "Supplier deactivated successfully",
      supplier: updatedSupplier,
    });
  } catch (error) {
    console.error("Error deactivating supplier:", error);
    return NextResponse.json(
      { error: "Failed to deactivate supplier" },
      { status: 500 }
    );
  }
}
