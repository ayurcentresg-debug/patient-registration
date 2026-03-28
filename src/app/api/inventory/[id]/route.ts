import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/inventory/[id] - Get single item with transactions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 20,
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}

// PUT /api/inventory/[id] - Update item fields
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if item exists
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    // Check if currentStock is being changed
    const stockChanged =
      body.currentStock !== undefined &&
      body.currentStock !== existingItem.currentStock;

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "name",
      "category",
      "subcategory",
      "unit",
      "unitPrice",
      "costPrice",
      "currentStock",
      "reorderLevel",
      "expiryDate",
      "batchNumber",
      "manufacturer",
      "supplier",
      "location",
      "hsnCode",
      "gstPercent",
      "description",
      "status",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "expiryDate") {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: updateData,
    });

    // If stock changed, auto-create an adjustment transaction
    if (stockChanged) {
      await prisma.stockTransaction.create({
        data: {
          itemId: id,
          type: "adjustment",
          quantity: body.currentStock - existingItem.currentStock,
          previousStock: existingItem.currentStock,
          newStock: body.currentStock,
          notes: "Stock adjusted via item update",
        },
      });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/[id] - Delete item only if no transactions exist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    if (item._count.transactions > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete item with existing transactions. Consider marking it as discontinued instead.",
        },
        { status: 409 }
      );
    }

    await prisma.inventoryItem.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
