import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/inventory/stats - Inventory dashboard stats
export async function GET(_request: NextRequest) {
  try {
    // Total active items
    const totalItems = await prisma.inventoryItem.count({
      where: { status: "active" },
    });

    // Total value of active inventory (currentStock * unitPrice)
    const activeItems = await prisma.inventoryItem.findMany({
      where: { status: "active" },
      select: {
        currentStock: true,
        unitPrice: true,
        category: true,
      },
    });

    const totalValue = activeItems.reduce(
      (sum, item) => sum + item.currentStock * item.unitPrice,
      0
    );

    // Low stock count (active items where currentStock <= reorderLevel)
    const allActiveItems = await prisma.inventoryItem.findMany({
      where: { status: "active" },
      select: {
        currentStock: true,
        reorderLevel: true,
      },
    });

    const lowStockCount = allActiveItems.filter(
      (item) => item.currentStock <= item.reorderLevel
    ).length;

    // Expiring soon count (items expiring within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoonCount = await prisma.inventoryItem.count({
      where: {
        expiryDate: {
          not: null,
          lte: thirtyDaysFromNow,
        },
        status: { not: "discontinued" },
      },
    });

    // Out of stock count
    const outOfStockCount = await prisma.inventoryItem.count({
      where: { status: "out_of_stock" },
    });

    // Category breakdown
    const allItemsForBreakdown = await prisma.inventoryItem.findMany({
      where: { status: "active" },
      select: {
        category: true,
        currentStock: true,
        unitPrice: true,
      },
    });

    const categoryMap = new Map<
      string,
      { count: number; value: number }
    >();

    for (const item of allItemsForBreakdown) {
      const existing = categoryMap.get(item.category) || {
        count: 0,
        value: 0,
      };
      existing.count += 1;
      existing.value += item.currentStock * item.unitPrice;
      categoryMap.set(item.category, existing);
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        count: data.count,
        value: data.value,
      })
    );

    // Recent transactions (last 10 with item name)
    const recentTransactions = await prisma.stockTransaction.findMany({
      orderBy: { date: "desc" },
      take: 10,
      include: {
        item: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      totalItems,
      totalValue,
      lowStockCount,
      expiringSoonCount,
      outOfStockCount,
      categoryBreakdown,
      recentTransactions,
    });
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory stats" },
      { status: 500 }
    );
  }
}
