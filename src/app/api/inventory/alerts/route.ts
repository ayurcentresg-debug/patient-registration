import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/inventory/alerts - Returns all inventory alerts
export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get all active inventory items
    const allItems = await prisma.inventoryItem.findMany({
      where: { status: { not: "discontinued" } },
      orderBy: { name: "asc" },
    });

    // Low stock: currentStock > 0 but <= reorderLevel
    const lowStock = allItems
      .filter(
        (item) => item.currentStock > 0 && item.currentStock <= item.reorderLevel
      )
      .sort((a, b) => {
        // Sort by urgency: ratio of currentStock to reorderLevel (lower = more urgent)
        const urgencyA =
          a.reorderLevel > 0 ? a.currentStock / a.reorderLevel : 1;
        const urgencyB =
          b.reorderLevel > 0 ? b.currentStock / b.reorderLevel : 1;
        return urgencyA - urgencyB;
      });

    // Out of stock: currentStock = 0
    const outOfStock = allItems.filter((item) => item.currentStock === 0);

    // Expiring soon: items with expiryDate within 30 days from now (but not yet expired)
    const expiringSoon = allItems
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

    // Expired: items with expiryDate in the past
    const expired = allItems
      .filter((item) => {
        if (!item.expiryDate) return false;
        return new Date(item.expiryDate) <= now;
      })
      .map((item) => {
        const expiry = new Date(item.expiryDate!);
        const daysPast = Math.ceil(
          (now.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { ...item, daysPast };
      });

    // Reorder suggestions: items where currentStock <= reorderLevel
    const reorderSuggestions = allItems
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
      expired,
      outOfStock,
      reorderSuggestions,
      summary: {
        lowStockCount: lowStock.length,
        expiringSoonCount: expiringSoon.length,
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
