import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/transfers/[id]/submit - Move draft → in_transit
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    if (transfer.status !== "draft") {
      return NextResponse.json(
        { error: `Cannot submit a transfer with status "${transfer.status}". Only draft transfers can be submitted.` },
        { status: 400 }
      );
    }

    if (transfer.items.length === 0) {
      return NextResponse.json(
        { error: "Cannot submit a transfer with no items" },
        { status: 400 }
      );
    }

    // Validate stock availability at source branch for all items before transaction
    for (const item of transfer.items) {
      const branchStock = await prisma.branchStock.findFirst({
        where: {
          branchId: transfer.fromBranchId,
          itemId: item.itemId,
          variantId: item.variantId,
        },
      });

      const availableQty = branchStock?.quantity || 0;
      if (availableQty < item.quantitySent) {
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: item.itemId },
          select: { name: true },
        });
        return NextResponse.json(
          {
            error: `Insufficient stock for "${inventoryItem?.name || item.itemId}" at source branch. Available: ${availableQty}, Required: ${item.quantitySent}`,
          },
          { status: 400 }
        );
      }
    }

    // Execute all stock operations atomically
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      // Update transfer status to in_transit
      const result = await tx.stockTransfer.update({
        where: { id },
        data: {
          status: "in_transit",
          transferDate: new Date(),
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

      // For each item: decrement BranchStock at source branch and create stock transaction
      for (const item of transfer.items) {
        // Decrement BranchStock at source branch
        const branchStock = await tx.branchStock.findFirst({
          where: {
            branchId: transfer.fromBranchId,
            itemId: item.itemId,
            variantId: item.variantId,
          },
        });

        if (branchStock) {
          await tx.branchStock.update({
            where: { id: branchStock.id },
            data: { quantity: branchStock.quantity - item.quantitySent },
          });
        }

        // Decrement global InventoryItem.currentStock
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: item.itemId },
        });

        if (inventoryItem) {
          const previousStock = inventoryItem.currentStock;
          const newStock = previousStock - item.quantitySent;

          await tx.inventoryItem.update({
            where: { id: item.itemId },
            data: { currentStock: newStock },
          });

          // Create transfer_out stock transaction
          await tx.stockTransaction.create({
            data: {
              itemId: item.itemId,
              variantId: item.variantId,
              type: "transfer_out",
              quantity: -item.quantitySent,
              previousStock,
              newStock,
              reference: transfer.transferNumber,
              notes: `Transfer out to ${result.toBranch.name} (${transfer.transferNumber})`,
              performedBy: transfer.initiatedBy,
            },
          });
        }
      }

      return result;
    });

    // Create notification for the destination branch (outside transaction — non-blocking)
    try {
      const totalItems = transfer.items.reduce((sum, item) => sum + item.quantitySent, 0);
      await prisma.notification.create({
        data: {
          type: "transfer_incoming",
          title: "Incoming Transfer",
          message: `Transfer ${transfer.transferNumber} from ${updatedTransfer.fromBranch.name} is on its way. ${totalItems} item${totalItems !== 1 ? "s" : ""}.`,
          link: `/inventory/transfers/${transfer.id}`,
          branchId: transfer.toBranchId,
        },
      });
    } catch (notifError) {
      console.error("Failed to create transfer notification:", notifError);
    }

    return NextResponse.json(updatedTransfer);
  } catch (error) {
    console.error("Error submitting transfer:", error);
    return NextResponse.json(
      { error: "Failed to submit transfer" },
      { status: 500 }
    );
  }
}
