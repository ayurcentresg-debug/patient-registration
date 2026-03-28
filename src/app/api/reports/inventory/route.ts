import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/reports/inventory?period=month&from=2026-03-01&to=2026-03-31
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");

    const now = new Date();
    let fromDate: Date;
    let toDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (period) {
      case "week": {
        const day = now.getDay();
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1));
        break;
      }
      case "month":
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter": {
        const q = Math.floor(now.getMonth() / 3) * 3;
        fromDate = new Date(now.getFullYear(), q, 1);
        break;
      }
      case "year":
        fromDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "custom":
        fromDate = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
        toDate = customTo ? new Date(new Date(customTo).setHours(23, 59, 59, 999)) : toDate;
        break;
      default:
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);

    const [
      allItems,
      lowStockItems,
      expiringSoonItems,
      expiredItems,
      saleTransactions,
      recentTransactions,
      purchaseTransactions,
    ] = await Promise.all([
      // All active inventory items
      prisma.inventoryItem.findMany({
        where: { status: { not: "discontinued" } },
        select: { id: true, name: true, sku: true, category: true, currentStock: true, reorderLevel: true, unit: true, unitPrice: true, batchNumber: true, expiryDate: true },
      }),
      // Low stock items
      prisma.$queryRawUnsafe<Array<{ id: string; name: string; sku: string; currentStock: number; reorderLevel: number; unit: string; category: string }>>(
        `SELECT id, name, sku, currentStock, reorderLevel, unit, category FROM InventoryItem WHERE currentStock <= reorderLevel AND status != 'discontinued'`
      ),
      // Expiring within 30 days
      prisma.inventoryItem.findMany({
        where: {
          expiryDate: { gt: now, lte: thirtyDaysFromNow },
          status: { not: "discontinued" },
        },
        select: { id: true, name: true, sku: true, batchNumber: true, expiryDate: true, currentStock: true, unit: true },
      }),
      // Already expired
      prisma.inventoryItem.findMany({
        where: {
          expiryDate: { lte: now },
          status: { not: "discontinued" },
        },
        select: { id: true },
      }),
      // Sale transactions in period
      prisma.stockTransaction.findMany({
        where: { type: "sale", date: { gte: fromDate, lte: toDate } },
        select: { itemId: true, quantity: true, totalAmount: true },
        orderBy: { date: "desc" },
      }),
      // Recent 20 transactions
      prisma.stockTransaction.findMany({
        take: 20,
        orderBy: { date: "desc" },
        select: { id: true, itemId: true, type: true, quantity: true, date: true, notes: true, item: { select: { name: true } } },
      }),
      // Purchase transactions in period
      prisma.stockTransaction.findMany({
        where: { type: "purchase", date: { gte: fromDate, lte: toDate } },
        select: { itemId: true, quantity: true, totalAmount: true, item: { select: { supplier: true } } },
      }),
    ]);

    // Summary
    const totalItems = allItems.length;
    const lowStockCount = lowStockItems.length;
    const expiringCount = expiringSoonItems.length;
    const expiredCount = expiredItems.length;
    const totalStockValue = Math.round(allItems.reduce((s, i) => s + i.currentStock * i.unitPrice, 0) * 100) / 100;

    // Expiring soon with daysUntilExpiry
    const expiringSoon = expiringSoonItems.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : null,
      currentStock: item.currentStock,
      unit: item.unit,
      daysUntilExpiry: item.expiryDate ? Math.ceil((new Date(item.expiryDate).getTime() - now.getTime()) / 86400000) : null,
    }));

    // Top selling - aggregate sale transactions by item
    const saleMap = new Map<string, { totalSold: number; revenue: number }>();
    for (const txn of saleTransactions) {
      const entry = saleMap.get(txn.itemId) || { totalSold: 0, revenue: 0 };
      entry.totalSold += Math.abs(txn.quantity);
      entry.revenue += Math.abs(txn.totalAmount);
      saleMap.set(txn.itemId, entry);
    }
    const itemLookup = new Map(allItems.map((i) => [i.id, i]));
    const topSelling = Array.from(saleMap.entries())
      .map(([itemId, data]) => {
        const item = itemLookup.get(itemId);
        return {
          name: item?.name || "Unknown",
          category: item?.category || "unknown",
          totalSold: data.totalSold,
          revenue: Math.round(data.revenue * 100) / 100,
        };
      })
      .sort((a, b) => b.totalSold - a.totalSold);

    // Category breakdown
    const categoryMap = new Map<string, { itemCount: number; totalValue: number; totalSold: number }>();
    for (const item of allItems) {
      const entry = categoryMap.get(item.category) || { itemCount: 0, totalValue: 0, totalSold: 0 };
      entry.itemCount++;
      entry.totalValue += item.currentStock * item.unitPrice;
      categoryMap.set(item.category, entry);
    }
    // Add totalSold from sale transactions
    for (const [itemId, data] of saleMap.entries()) {
      const item = itemLookup.get(itemId);
      if (item) {
        const entry = categoryMap.get(item.category);
        if (entry) entry.totalSold += data.totalSold;
      }
    }
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        itemCount: data.itemCount,
        totalValue: Math.round(data.totalValue * 100) / 100,
        totalSold: data.totalSold,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    // Recent transactions formatted
    const formattedTransactions = recentTransactions.map((txn) => ({
      id: txn.id,
      itemName: txn.item.name,
      type: txn.type,
      quantity: txn.quantity,
      date: new Date(txn.date).toISOString(),
      notes: txn.notes,
    }));

    // Supplier summary from purchase transactions
    const supplierMap = new Map<string, { name: string; totalPurchases: number; totalValue: number }>();
    for (const txn of purchaseTransactions) {
      const supplierName = txn.item.supplier || "Unknown";
      const entry = supplierMap.get(supplierName) || { name: supplierName, totalPurchases: 0, totalValue: 0 };
      entry.totalPurchases++;
      entry.totalValue += Math.abs(txn.totalAmount);
      supplierMap.set(supplierName, entry);
    }
    const supplierSummary = Array.from(supplierMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalPurchases: data.totalPurchases,
        totalValue: Math.round(data.totalValue * 100) / 100,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    return NextResponse.json({
      summary: {
        totalItems,
        lowStockItems: lowStockCount,
        expiringItems: expiringCount,
        expiredItems: expiredCount,
        totalStockValue,
      },
      lowStock: lowStockItems,
      expiringSoon,
      topSelling,
      categoryBreakdown,
      recentTransactions: formattedTransactions,
      supplierSummary,
    });
  } catch (error) {
    console.error("Error fetching inventory reports:", error);
    return NextResponse.json({ error: "Failed to fetch inventory reports" }, { status: 500 });
  }
}
