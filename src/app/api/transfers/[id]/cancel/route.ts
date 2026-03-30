import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/transfers/[id]/cancel - Cancel a transfer
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        items: true,
        fromBranch: { select: { id: true, name: true, code: true } },
        toBranch: { select: { id: true, name: true, code: true } },
      },
    });

    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    if (transfer.status === "received") {
      return NextResponse.json(
        { error: "Cannot cancel a transfer that has already been received" },
        { status: 400 }
      );
    }

    if (transfer.status === "cancelled") {
      return NextResponse.json(
        { error: "Transfer is already cancelled" },
        { status: 400 }
      );
    }

    if (transfer.status === "draft") {
      // Draft: simply set status to cancelled, no stock reversal needed
      const updatedTransfer = await prisma.stockTransfer.update({
        where: { id },
        data: { status: "cancelled" },
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

      return NextResponse.json(updatedTransfer);
    }

    // Status is "in_transit": reverse stock deductions
    const wasInTransit = true; // flag to create notification after transaction
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      // Update transfer status to cancelled
      const result = await tx.stockTransfer.update({
        where: { id },
        data: { status: "cancelled" },
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

      // Reverse stock deductions for each item
      for (const item of transfer.items) {
        // Increment BranchStock at source branch (reverse the decrement from submit)
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
            data: { quantity: branchStock.quantity + item.quantitySent },
          });
        } else {
          // BranchStock record may have been deleted; recreate it
          await tx.branchStock.create({
            data: {
              branchId: transfer.fromBranchId,
              itemId: item.itemId,
              variantId: item.variantId,
              quantity: item.quantitySent,
            },
          });
        }

        // Increment global InventoryItem.currentStock
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: item.itemId },
        });

        if (inventoryItem) {
          const previousStock = inventoryItem.currentStock;
          const newStock = previousStock + item.quantitySent;

          await tx.inventoryItem.update({
            where: { id: item.itemId },
            data: { currentStock: newStock },
          });

          // Create transfer_reversal stock transaction
          await tx.stockTransaction.create({
            data: {
              itemId: item.itemId,
              variantId: item.variantId,
              type: "transfer_reversal",
              quantity: item.quantitySent,
              previousStock,
              newStock,
              reference: transfer.transferNumber,
              notes: `Transfer cancelled — stock returned to ${transfer.fromBranch.name} (${transfer.transferNumber})`,
              performedBy: null,
            },
          });
        }
      }

      return result;
    });

    // Notify destination branch that an in_transit transfer was cancelled (outside transaction)
    if (wasInTransit) {
      try {
        await prisma.notification.create({
          data: {
            type: "transfer_cancelled",
            title: "Transfer Cancelled",
            message: `Transfer ${transfer.transferNumber} from ${transfer.fromBranch.name} has been cancelled.`,
            link: `/inventory/transfers/${transfer.id}`,
            branchId: transfer.toBranchId,
          },
        });
      } catch (notifError) {
        console.error("Failed to create transfer cancelled notification:", notifError);
      }
    }

    return NextResponse.json(updatedTransfer);
  } catch (error) {
    console.error("Error cancelling transfer:", error);
    return NextResponse.json(
      { error: "Failed to cancel transfer" },
      { status: 500 }
    );
  }
}
