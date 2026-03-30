import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// POST /api/inventory/write-off-expired - Bulk write off all expired stock
export async function POST() {
  try {
    const now = new Date();

    // Find all items where expiryDate < now AND currentStock > 0
    const expiredItems = await prisma.inventoryItem.findMany({
      where: {
        expiryDate: {
          lt: now,
        },
        currentStock: {
          gt: 0,
        },
      },
      select: {
        id: true,
        name: true,
        currentStock: true,
        unitPrice: true,
      },
    });

    if (expiredItems.length === 0) {
      return NextResponse.json({
        writtenOff: 0,
        items: [],
      });
    }

    // For each expired item: create a StockTransaction and set stock to 0
    const results: Array<{ name: string; previousStock: number }> = [];

    for (const item of expiredItems) {
      await prisma.$transaction([
        // Create the expired stock transaction
        prisma.stockTransaction.create({
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
        // Set the item's current stock to 0
        prisma.inventoryItem.update({
          where: { id: item.id },
          data: { currentStock: 0 },
        }),
      ]);

      results.push({
        name: item.name,
        previousStock: item.currentStock,
      });
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
