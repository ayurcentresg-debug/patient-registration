import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/inventory/stock-audit - Bulk stock audit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required and must not be empty" },
        { status: 400 }
      );
    }

    let adjusted = 0;
    let matched = 0;
    const errors: string[] = [];

    for (const entry of body.items) {
      const { itemId, physicalCount } = entry as { itemId: string; physicalCount: number };

      if (!itemId || physicalCount === undefined || physicalCount === null) {
        errors.push(`Invalid entry: missing itemId or physicalCount`);
        continue;
      }

      try {
        const item = await prisma.inventoryItem.findUnique({
          where: { id: itemId },
        });

        if (!item) {
          errors.push(`Item ${itemId} not found`);
          continue;
        }

        const previousStock = item.currentStock;
        const newStock = physicalCount;

        if (previousStock === newStock) {
          matched++;
          continue;
        }

        // Determine new status
        let newStatus = item.status;
        if (newStock === 0) {
          newStatus = "out_of_stock";
        } else if (item.status === "out_of_stock" && newStock > 0) {
          newStatus = "active";
        }

        // Create adjustment transaction and update item in a single transaction
        await prisma.$transaction([
          prisma.stockTransaction.create({
            data: {
              itemId,
              type: "adjustment",
              quantity: newStock - previousStock,
              unitPrice: 0,
              totalAmount: 0,
              previousStock,
              newStock,
              reference: `AUDIT-${new Date().toISOString().slice(0, 10)}`,
              notes: "Monthly stock audit",
              performedBy: body.performedBy || null,
              date: new Date(),
            },
          }),
          prisma.inventoryItem.update({
            where: { id: itemId },
            data: {
              currentStock: newStock,
              status: newStatus,
            },
          }),
        ]);

        adjusted++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Error processing item ${itemId}: ${msg}`);
      }
    }

    return NextResponse.json({
      adjusted,
      matched,
      total: body.items.length,
      errors,
    });
  } catch (error) {
    console.error("Error processing stock audit:", error);
    return NextResponse.json(
      { error: "Failed to process stock audit" },
      { status: 500 }
    );
  }
}
