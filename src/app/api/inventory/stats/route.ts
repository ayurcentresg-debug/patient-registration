import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/inventory/stats - Inventory dashboard stats
// Optional: ?branchId=xxx for branch-specific stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    if (branchId) {
      return handleBranchStats(branchId);
    }

    // ─── Global stats (existing behavior) ─────────────────────────────

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

// ─── Branch-specific stats ──────────────────────────────────────────────────

async function handleBranchStats(branchId: string) {
  // Get all BranchStock for this branch with item details
  const branchStockRecords = await prisma.branchStock.findMany({
    where: { branchId },
    include: {
      item: {
        select: {
          id: true,
          unitPrice: true,
          reorderLevel: true,
          category: true,
          status: true,
          expiryDate: true,
        },
      },
    },
  });

  // Total items: count distinct items in BranchStock with quantity > 0
  const totalItems = branchStockRecords.filter((bs) => bs.quantity > 0).length;

  // Total value: sum of (BranchStock.quantity * InventoryItem.unitPrice)
  const totalValue = branchStockRecords.reduce(
    (sum, bs) => sum + bs.quantity * bs.item.unitPrice,
    0
  );

  // Low stock: items where BranchStock.quantity <= reorderLevel AND quantity > 0
  const lowStockCount = branchStockRecords.filter(
    (bs) => bs.quantity > 0 && bs.quantity <= bs.item.reorderLevel
  ).length;

  // Out of stock: items where BranchStock.quantity === 0
  const outOfStockCount = branchStockRecords.filter(
    (bs) => bs.quantity === 0
  ).length;

  // Expiring soon: keep same (expiry is item-level, not branch-level)
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

  // Category breakdown using BranchStock quantities
  const categoryMap = new Map<string, { count: number; value: number }>();

  for (const bs of branchStockRecords) {
    if (bs.quantity <= 0) continue;
    const cat = bs.item.category;
    const existing = categoryMap.get(cat) || { count: 0, value: 0 };
    existing.count += 1;
    existing.value += bs.quantity * bs.item.unitPrice;
    categoryMap.set(cat, existing);
  }

  const categoryBreakdown = Array.from(categoryMap.entries()).map(
    ([category, data]) => ({
      category,
      count: data.count,
      value: data.value,
    })
  );

  // Recent transactions (last 10 — global, since StockTransaction doesn't have branchId)
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
    branchId,
  });
}
