import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/purchase-orders/[id] - Get single PO with all items
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order" },
      { status: 500 }
    );
  }
}

// PUT /api/purchase-orders/[id] - Update PO (only if status is "draft")
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingPO) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    if (existingPO.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft purchase orders can be updated" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.supplierName !== undefined) {
      updateData.supplierName = body.supplierName;
    }
    if (body.expectedDate !== undefined) {
      updateData.expectedDate = body.expectedDate
        ? new Date(body.expectedDate)
        : null;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    // If items are provided, replace all items and recalculate totals
    if (body.items && Array.isArray(body.items)) {
      const items = body.items.map(
        (item: {
          inventoryItemId?: string;
          itemName: string;
          sku?: string;
          quantity: number;
          unitPrice: number;
          gstPercent?: number;
          notes?: string;
        }) => {
          const gstPercent = item.gstPercent || 0;
          const totalAmount =
            Math.round(
              item.quantity * item.unitPrice * (1 + gstPercent / 100) * 100
            ) / 100;
          return {
            inventoryItemId: item.inventoryItemId || null,
            itemName: item.itemName,
            sku: item.sku || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            gstPercent,
            totalAmount,
            notes: item.notes || null,
          };
        }
      );

      const subtotal =
        Math.round(
          items.reduce(
            (sum: number, item: { quantity: number; unitPrice: number }) =>
              sum + item.quantity * item.unitPrice,
            0
          ) * 100
        ) / 100;

      const gstAmount =
        Math.round(
          items.reduce(
            (
              sum: number,
              item: {
                totalAmount: number;
                quantity: number;
                unitPrice: number;
              }
            ) => sum + (item.totalAmount - item.quantity * item.unitPrice),
            0
          ) * 100
        ) / 100;

      const totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;

      updateData.subtotal = subtotal;
      updateData.gstAmount = gstAmount;
      updateData.totalAmount = totalAmount;

      // Delete existing items and create new ones
      await prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });

      updateData.items = {
        create: items,
      };
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
      },
    });

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order" },
      { status: 500 }
    );
  }
}

// DELETE /api/purchase-orders/[id] - Delete PO (only if status is "draft")
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!existingPO) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    if (existingPO.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft purchase orders can be deleted" },
        { status: 400 }
      );
    }

    await prisma.purchaseOrder.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Purchase order deleted successfully" });
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    return NextResponse.json(
      { error: "Failed to delete purchase order" },
      { status: 500 }
    );
  }
}
