import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/transfers/[id]/receive - Mark transfer as received
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        items: true,
        toBranch: { select: { id: true, name: true, code: true } },
        fromBranch: { select: { id: true, name: true, code: true } },
      },
    });

    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    if (transfer.status !== "in_transit") {
      return NextResponse.json(
        { error: `Cannot receive a transfer with status "${transfer.status}". Only in_transit transfers can be received.` },
        { status: 400 }
      );
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required with itemId and quantityReceived" },
        { status: 400 }
      );
    }

    const receivedItems = body.items as {
      itemId: string;
      quantityReceived: number;
    }[];

    // Validate all received items
    for (const receivedItem of receivedItems) {
      const transferItem = transfer.items.find(
        (item) => item.itemId === receivedItem.itemId
      );

      if (!transferItem) {
        return NextResponse.json(
          { error: `Item not found in transfer: ${receivedItem.itemId}` },
          { status: 400 }
        );
      }

      if (receivedItem.quantityReceived === undefined || receivedItem.quantityReceived < 0) {
        return NextResponse.json(
          { error: `Invalid received quantity for item: ${receivedItem.itemId}` },
          { status: 400 }
        );
      }

      if (receivedItem.quantityReceived > transferItem.quantitySent) {
        return NextResponse.json(
          {
            error: `Received quantity (${receivedItem.quantityReceived}) exceeds sent quantity (${transferItem.quantitySent}) for item: ${receivedItem.itemId}`,
          },
          { status: 400 }
        );
      }
    }

    // Execute all stock operations atomically
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      // Update transfer status to received
      const result = await tx.stockTransfer.update({
        where: { id },
        data: {
          status: "received",
          receivedDate: new Date(),
          receivedBy: body.receivedBy || null,
        },
        include: {
          fromBranch: { select: { id: true, name: true, code: true } },
          toBranch: { select: { id: true, name: true, code: true } },
          items: {
            include: {
              item: {
                select: { id: true, name: true, sku: true, packing: true, unit: true },
              },
            },
          },
        },
      });

      for (const receivedItem of receivedItems) {
        const transferItem = transfer.items.find(
          (item) => item.itemId === receivedItem.itemId
        )!;

        // Update StockTransferItem.quantityReceived
        await tx.stockTransferItem.update({
          where: { id: transferItem.id },
          data: { quantityReceived: receivedItem.quantityReceived },
        });

        // Increment BranchStock at destination branch (upsert)
        const existingBranchStock = await tx.branchStock.findFirst({
          where: {
            branchId: transfer.toBranchId,
            itemId: receivedItem.itemId,
            variantId: transferItem.variantId,
          },
        });

        if (existingBranchStock) {
          await tx.branchStock.update({
            where: { id: existingBranchStock.id },
            data: {
              quantity: existingBranchStock.quantity + receivedItem.quantityReceived,
            },
          });
        } else {
          await tx.branchStock.create({
            data: {
              branchId: transfer.toBranchId,
              itemId: receivedItem.itemId,
              variantId: transferItem.variantId,
              quantity: receivedItem.quantityReceived,
            },
          });
        }

        // Increment global InventoryItem.currentStock for received qty
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: receivedItem.itemId },
        });

        if (inventoryItem) {
          const previousStock = inventoryItem.currentStock;
          const newStock = previousStock + receivedItem.quantityReceived;

          await tx.inventoryItem.update({
            where: { id: receivedItem.itemId },
            data: { currentStock: newStock },
          });

          // Create transfer_in stock transaction
          await tx.stockTransaction.create({
            data: {
              itemId: receivedItem.itemId,
              variantId: transferItem.variantId,
              type: "transfer_in",
              quantity: receivedItem.quantityReceived,
              previousStock,
              newStock,
              reference: transfer.transferNumber,
              notes: `Transfer in from ${transfer.fromBranch.name} (${transfer.transferNumber})`,
              performedBy: body.receivedBy || null,
            },
          });

          // If quantityReceived < quantitySent, create a damaged transaction for the difference
          const damagedQty = transferItem.quantitySent - receivedItem.quantityReceived;
          if (damagedQty > 0) {
            await tx.stockTransaction.create({
              data: {
                itemId: receivedItem.itemId,
                variantId: transferItem.variantId,
                type: "damaged",
                quantity: -damagedQty,
                previousStock: newStock,
                newStock: newStock, // global stock not further decremented — already out from submit
                reference: transfer.transferNumber,
                notes: `Damaged/lost in transit: ${damagedQty} units (${transfer.transferNumber})`,
                performedBy: body.receivedBy || null,
              },
            });
          }
        }
      }

      return result;
    });

    // Create notification for the sender branch (outside transaction — non-blocking)
    try {
      await prisma.notification.create({
        data: {
          type: "transfer_received",
          title: "Transfer Received",
          message: `Transfer ${transfer.transferNumber} has been received at ${transfer.toBranch.name}.`,
          link: `/inventory/transfers/${transfer.id}`,
          branchId: transfer.fromBranchId,
        },
      });
    } catch (notifError) {
      console.error("Failed to create transfer received notification:", notifError);
    }

    return NextResponse.json(updatedTransfer);
  } catch (error) {
    console.error("Error receiving transfer:", error);
    return NextResponse.json(
      { error: "Failed to receive transfer" },
      { status: 500 }
    );
  }
}
