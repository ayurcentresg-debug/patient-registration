import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/inventory/write-off-expired - Bulk write off expired stock
// Body: { branchId?: string, itemIds?: string[] }
// - If branchId: only write off BranchStock for that branch
// - If itemIds: only write off those specific items
// - If neither: write off all expired globally (original behavior)
export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const now = new Date();
    let branchId: string | undefined;
    let itemIds: string[] | undefined;

    try {
      const body = await request.json();
      branchId = body.branchId;
      itemIds = body.itemIds;
    } catch {
      // No body provided — use default behavior (all expired)
    }

    // Build the where clause
    const where: Record<string, unknown> = {
      expiryDate: { lt: now },
      currentStock: { gt: 0 },
    };

    if (itemIds && itemIds.length > 0) {
      where.id = { in: itemIds };
    }

    // Find expired items
    const expiredItems = await db.inventoryItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        currentStock: true,
        unitPrice: true,
        batchNumber: true,
        branchStock: branchId
          ? {
              where: { branchId },
              select: { id: true, quantity: true },
            }
          : undefined,
      },
    });

    if (expiredItems.length === 0) {
      return NextResponse.json({
        writtenOff: 0,
        items: [],
      });
    }

    // Get branch name if branchId provided
    let branchName: string | undefined;
    if (branchId) {
      const branch = await db.branch.findUnique({
        where: { id: branchId },
        select: { name: true },
      });
      branchName = branch?.name;
    }

    const results: Array<{
      name: string;
      previousStock: number;
      branchName?: string;
      branchPreviousStock?: number;
    }> = [];

    for (const item of expiredItems) {
      if (branchId) {
        // Branch-specific write-off
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bs = (item as any).branchStock as { id: string; quantity: number }[] | undefined;
        const branchStock = bs && bs.length > 0 ? bs[0] : null;
        const branchQty = branchStock ? branchStock.quantity : 0;

        if (branchQty <= 0) continue; // skip if no branch stock

        if (branchStock) {
          await prisma.$transaction([
            db.stockTransaction.create({
              data: {
                itemId: item.id,
                type: "expired",
                quantity: -branchQty,
                unitPrice: item.unitPrice,
                totalAmount: branchQty * item.unitPrice,
                previousStock: item.currentStock,
                newStock: Math.max(0, item.currentStock - branchQty),
                notes: `Branch write-off (${branchName || branchId}) on ${now.toISOString().slice(0, 10)}`,
                date: now,
              },
            }),
            db.inventoryItem.update({
              where: { id: item.id },
              data: { currentStock: Math.max(0, item.currentStock - branchQty) },
            }),
            db.branchStock.update({
              where: { id: branchStock.id },
              data: { quantity: 0 },
            }),
          ]);
        }

        results.push({
          name: item.name,
          previousStock: item.currentStock,
          branchName,
          branchPreviousStock: branchQty,
        });
      } else {
        // Global write-off (original behavior)
        await prisma.$transaction([
          db.stockTransaction.create({
            data: {
              itemId: item.id,
              type: "expired",
              quantity: -item.currentStock,
              unitPrice: item.unitPrice,
              totalAmount: item.currentStock * item.unitPrice,
              previousStock: item.currentStock,
              newStock: 0,
              notes: `Bulk expired stock write-off on ${now.toISOString().slice(0, 10)}`,
              date: now,
            },
          }),
          db.inventoryItem.update({
            where: { id: item.id },
            data: { currentStock: 0 },
          }),
          db.branchStock.updateMany({
            where: { itemId: item.id },
            data: { quantity: 0 },
          }),
        ]);

        results.push({
          name: item.name,
          previousStock: item.currentStock,
        });
      }
    }

    return NextResponse.json({
      writtenOff: results.length,
      items: results,
    });
  } catch (error) {
    console.error("Error writing off expired stock:", error);
    return NextResponse.json(
      { error: "Failed to write off expired stock" },
      { status: 500 }
    );
  }
}
