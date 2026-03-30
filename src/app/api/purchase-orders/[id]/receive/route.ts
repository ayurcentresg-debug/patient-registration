import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/purchase-orders/[id]/receive - Receive items against a PO
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    if (purchaseOrder.status !== "submitted" && purchaseOrder.status !== "partial") {
      return NextResponse.json(
        {
          error: `Cannot receive items for a ${purchaseOrder.status} purchase order`,
        },
        { status: 400 }
      );
    }

    if (
      !body.items ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        { error: "Items array is required with itemId and receivedQty" },
        { status: 400 }
      );
    }

    // Validate all items before starting transaction
    const receivedItems = body.items as {
      itemId: string;
      receivedQty: number;
    }[];

    for (const receivedItem of receivedItems) {
      const poItem = purchaseOrder.items.find(
        (item) => item.id === receivedItem.itemId
      );

      if (!poItem) {
        return NextResponse.json(
          { error: `Purchase order item not found: ${receivedItem.itemId}` },
          { status: 400 }
        );
      }

      if (!receivedItem.receivedQty || receivedItem.receivedQty <= 0) {
        return NextResponse.json(
          { error: `Invalid received quantity for item: ${poItem.itemName}` },
          { status: 400 }
        );
      }

      const newReceivedQty = poItem.receivedQty + receivedItem.receivedQty;

      if (newReceivedQty > poItem.quantity) {
        return NextResponse.json(
          {
            error: `Received quantity (${newReceivedQty}) exceeds ordered quantity (${poItem.quantity}) for item: ${poItem.itemName}`,
          },
          { status: 400 }
        );
      }
    }

    // Use prisma.$transaction for atomicity
    const updatedPO = await prisma.$transaction(async (tx) => {
      // Process each received item
      for (const receivedItem of receivedItems) {
        const poItem = purchaseOrder.items.find(
          (item) => item.id === receivedItem.itemId
        )!;

        const newReceivedQty = poItem.receivedQty + receivedItem.receivedQty;

        // Update PurchaseOrderItem receivedQty
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQty: newReceivedQty },
        });

        // If inventoryItemId exists, update inventory stock and create transaction
        if (poItem.inventoryItemId) {
          const inventoryItem = await tx.inventoryItem.findUnique({
            where: { id: poItem.inventoryItemId },
          });

          if (inventoryItem) {
            const previousStock = inventoryItem.currentStock;
            const newStock = previousStock + receivedItem.receivedQty;

            await tx.inventoryItem.update({
              where: { id: inventoryItem.id },
              data: {
                currentStock: newStock,
                status: newStock > 0 ? "active" : inventoryItem.status,
              },
            });

            await tx.stockTransaction.create({
              data: {
                itemId: inventoryItem.id,
                type: "purchase",
                quantity: receivedItem.receivedQty,
                unitPrice: poItem.unitPrice,
                totalAmount:
                  Math.round(
                    receivedItem.receivedQty * poItem.unitPrice * 100
                  ) / 100,
                previousStock,
                newStock,
                reference: purchaseOrder.poNumber,
                notes: `Received against PO ${purchaseOrder.poNumber}`,
                performedBy: body.receivedBy || null,
              },
            });
          }
        }
      }

      // Reload updated items to determine PO status
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });

      const allFullyReceived = updatedItems.every(
        (item) => item.receivedQty >= item.quantity
      );
      const someReceived = updatedItems.some((item) => item.receivedQty > 0);

      const poUpdateData: Record<string, unknown> = {};

      if (allFullyReceived) {
        poUpdateData.status = "received";
        poUpdateData.receivedDate = new Date();
      } else if (someReceived) {
        poUpdateData.status = "partial";
      }

      if (body.paidAmount !== undefined) {
        poUpdateData.paidAmount =
          Math.round((purchaseOrder.paidAmount + body.paidAmount) * 100) / 100;
      }

      const result = await tx.purchaseOrder.update({
        where: { id },
        data: poUpdateData,
        include: { items: true },
      });

      return result;
    });

    return NextResponse.json(updatedPO);
  } catch (error) {
    console.error("Error receiving purchase order items:", error);
    return NextResponse.json(
      { error: "Failed to receive purchase order items" },
      { status: 500 }
    );
  }
}
