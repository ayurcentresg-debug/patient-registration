import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/inventory/alerts - Returns all inventory alerts
// Optional query params: branchId (filter by branch stock)
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    // Get all active inventory items with branch stock if needed
    const allItems = await db.inventoryItem.findMany({
      where: { status: { not: "discontinued" } },
      orderBy: { name: "asc" },
      include: branchId
        ? {
            branchStock: {
              where: { branchId },
            },
          }
        : undefined,
    });

    // Helper: get effective stock (branch-specific or global)
    function getEffectiveStock(item: (typeof allItems)[0]): number {
      if (branchId && "branchStock" in item) {
        const bs = (item as typeof allItems[0] & { branchStock: { quantity: number }[] }).branchStock;
        if (bs && bs.length > 0) return bs[0].quantity;
        return 0; // no branch stock record means 0 at this branch
      }
      return item.currentStock;
    }

    // Attach branchQuantity to items for response
    type ItemWithBranch = (typeof allItems)[0] & { branchQuantity?: number };
    const enrichedItems: ItemWithBranch[] = allItems.map((item) => ({
      ...item,
      branchQuantity: branchId ? getEffectiveStock(item) : undefined,
    }));

    // Low stock: currentStock > 0 but <= reorderLevel
    const lowStock = enrichedItems
      .filter(
        (item) => item.currentStock > 0 && item.currentStock <= item.reorderLevel
      )
      .sort((a, b) => {
        const urgencyA =
          a.reorderLevel > 0 ? a.currentStock / a.reorderLevel : 1;
        const urgencyB =
          b.reorderLevel > 0 ? b.currentStock / b.reorderLevel : 1;
        return urgencyA - urgencyB;
      });

    // Out of stock: currentStock = 0
    const outOfStock = enrichedItems.filter((item) => item.currentStock === 0);

    // Expired: items with expiryDate in the past AND stock > 0
    const expired = enrichedItems
      .filter((item) => {
        if (!item.expiryDate) return false;
        const hasStock = branchId
          ? getEffectiveStock(item) > 0
          : item.currentStock > 0;
        return new Date(item.expiryDate) <= now && hasStock;
      })
      .map((item) => {
        const expiry = new Date(item.expiryDate!);
        const daysPast = Math.ceil(
          (now.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { ...item, daysPast };
      });

    // Expiring in 30 days: items expiring within 30 days (but not yet expired)
    const expiringSoon = enrichedItems
      .filter((item) => {
        if (!item.expiryDate) return false;
        const expiry = new Date(item.expiryDate);
        return expiry > now && expiry <= thirtyDaysFromNow;
      })
      .map((item) => {
        const expiry = new Date(item.expiryDate!);
        const daysLeft = Math.ceil(
          (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { ...item, daysLeft };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    // Expiring in 90 days: items expiring between 30 and 90 days
    const expiring90 = enrichedItems
      .filter((item) => {
        if (!item.expiryDate) return false;
        const expiry = new Date(item.expiryDate);
        return expiry > thirtyDaysFromNow && expiry <= ninetyDaysFromNow;
      })
      .map((item) => {
        const expiry = new Date(item.expiryDate!);
        const daysLeft = Math.ceil(
          (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { ...item, daysLeft };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    // Reorder suggestions: items where currentStock <= reorderLevel
    const reorderSuggestions = enrichedItems
      .filter((item) => item.currentStock <= item.reorderLevel)
      .map((item) => {
        const suggestedQuantity = Math.max(
          0,
          item.reorderLevel * 2 - item.currentStock
        );
        return {
          ...item,
          suggestedQuantity,
        };
      })
      .sort((a, b) => b.suggestedQuantity - a.suggestedQuantity);

    return NextResponse.json({
      lowStock,
      expiringSoon,
      expiring90,
      expired,
      outOfStock,
      reorderSuggestions,
      summary: {
        lowStockCount: lowStock.length,
        expiringSoonCount: expiringSoon.length,
        expiring90Count: expiring90.length,
        expiredCount: expired.length,
        outOfStockCount: outOfStock.length,
        reorderCount: reorderSuggestions.length,
      },
    });
  } catch (error) {
    console.error("Error fetching inventory alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory alerts" },
      { status: 500 }
    );
  }
}
