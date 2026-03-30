import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/purchase-orders/suggestions - Smart purchase order suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // 1. Get all active inventory items
    const allItems = await prisma.inventoryItem.findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        sku: true,
        manufacturerCode: true,
        packing: true,
        category: true,
        currentStock: true,
        reorderLevel: true,
        costPrice: true,
        unitPrice: true,
      },
    });

    // If branchId provided, fetch BranchStock quantities to use instead of global currentStock
    let branchStockMap: Map<string, number> | null = null;
    if (branchId) {
      const branchStocks = await prisma.branchStock.findMany({
        where: { branchId },
        select: { itemId: true, quantity: true },
      });
      branchStockMap = new Map<string, number>();
      for (const bs of branchStocks) {
        const existing = branchStockMap.get(bs.itemId) || 0;
        branchStockMap.set(bs.itemId, existing + bs.quantity);
      }
    }

    // 2. Get stock transactions from last 90 days (sales / negative qty = consumption)
    const stockTransactions = await prisma.stockTransaction.findMany({
      where: {
        date: { gte: ninetyDaysAgo },
        OR: [
          { type: { in: ["sale", "invoice_deduction"] } },
          { quantity: { lt: 0 } },
        ],
      },
      select: {
        itemId: true,
        quantity: true,
      },
    });

    // 3. Get invoice items from last 90 days (medicine dispensing)
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        inventoryItemId: { not: null },
        invoice: {
          date: { gte: ninetyDaysAgo },
          status: { not: "cancelled" },
        },
      },
      select: {
        inventoryItemId: true,
        quantity: true,
      },
    });

    // 4. Build usage map: itemId -> total units consumed in 90 days
    const usageMap = new Map<string, number>();

    for (const txn of stockTransactions) {
      const consumed = Math.abs(txn.quantity); // negative qty = consumption
      usageMap.set(txn.itemId, (usageMap.get(txn.itemId) || 0) + consumed);
    }

    for (const inv of invoiceItems) {
      if (inv.inventoryItemId) {
        usageMap.set(
          inv.inventoryItemId,
          (usageMap.get(inv.inventoryItemId) || 0) + inv.quantity
        );
      }
    }

    // 5. Get last supplier for each item from most recent PO
    const recentPOItems = await prisma.purchaseOrderItem.findMany({
      where: {
        inventoryItemId: { not: null },
      },
      select: {
        inventoryItemId: true,
        purchaseOrder: {
          select: {
            supplierId: true,
            supplierName: true,
            orderDate: true,
          },
        },
      },
      orderBy: {
        purchaseOrder: { orderDate: "desc" },
      },
    });

    // Keep only the most recent supplier per item
    const supplierMap = new Map<
      string,
      { supplierId: string; supplierName: string }
    >();
    for (const poi of recentPOItems) {
      if (poi.inventoryItemId && !supplierMap.has(poi.inventoryItemId)) {
        supplierMap.set(poi.inventoryItemId, {
          supplierId: poi.purchaseOrder.supplierId,
          supplierName: poi.purchaseOrder.supplierName,
        });
      }
    }

    // 6. Build suggestions for low-stock items (currentStock <= reorderLevel)
    // When branchId is provided, use branch-specific stock levels
    const getEffectiveStock = (item: { id: string; currentStock: number }) => {
      if (branchStockMap) {
        return branchStockMap.get(item.id) ?? 0;
      }
      return item.currentStock;
    };

    const lowStockItems = allItems.filter(
      (item) => getEffectiveStock(item) <= item.reorderLevel
    );

    const suggestions = lowStockItems.map((item) => {
      const effectiveStock = getEffectiveStock(item);
      const totalUsed = usageMap.get(item.id) || 0;
      const avgMonthlyUsage = Math.round((totalUsed / 3) * 100) / 100; // 90 days = 3 months
      const avgDailyUsage = totalUsed / 90;
      const daysRemaining = Math.round(
        effectiveStock / (avgDailyUsage || 0.1)
      );

      // Order enough for 2 months minus current stock, minimum = reorderLevel
      const rawSuggestedQty = Math.ceil(avgMonthlyUsage * 2) - effectiveStock;
      const suggestedQty = Math.max(rawSuggestedQty, item.reorderLevel);

      const estimatedCost = Math.round(suggestedQty * item.costPrice * 100) / 100;

      const supplier = supplierMap.get(item.id);

      return {
        itemId: item.id,
        name: item.name,
        sku: item.sku,
        manufacturerCode: item.manufacturerCode,
        packing: item.packing,
        category: item.category,
        currentStock: effectiveStock,
        reorderLevel: item.reorderLevel,
        avgMonthlyUsage,
        daysRemaining,
        suggestedQty,
        costPrice: item.costPrice,
        unitPrice: item.unitPrice,
        estimatedCost,
        supplierId: supplier?.supplierId || null,
        supplierName: supplier?.supplierName || null,
      };
    });

    // Sort by days remaining (most urgent first)
    suggestions.sort((a, b) => a.daysRemaining - b.daysRemaining);

    const totalEstimatedCost = Math.round(
      suggestions.reduce((sum, s) => sum + s.estimatedCost, 0) * 100
    ) / 100;

    const urgentCount = suggestions.filter((s) => s.daysRemaining < 14).length;

    // 7. Fast-moving items: top 10 by avgMonthlyUsage regardless of stock level
    const allItemUsage = allItems.map((item) => {
      const effectiveStock = getEffectiveStock(item);
      const totalUsed = usageMap.get(item.id) || 0;
      const avgMonthlyUsage = Math.round((totalUsed / 3) * 100) / 100;
      const avgDailyUsage = totalUsed / 90;
      const daysRemaining = Math.round(
        effectiveStock / (avgDailyUsage || 0.1)
      );

      return {
        itemId: item.id,
        name: item.name,
        currentStock: effectiveStock,
        avgMonthlyUsage,
        daysRemaining,
      };
    });

    const fastMovingItems = allItemUsage
      .sort((a, b) => b.avgMonthlyUsage - a.avgMonthlyUsage)
      .slice(0, 10);

    return NextResponse.json({
      suggestions,
      totalEstimatedCost,
      urgentCount,
      fastMovingItems,
    });
  } catch (error) {
    console.error("Error generating PO suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate purchase order suggestions" },
      { status: 500 }
    );
  }
}
