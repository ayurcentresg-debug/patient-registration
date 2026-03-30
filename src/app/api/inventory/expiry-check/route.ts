import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// POST /api/inventory/expiry-check
// Check for expiring/expired items and create notifications.
// Avoids duplicates by checking if a notification with the same title exists within the last 7 days.
export async function POST() {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all active items with expiry dates
    const allItems = await prisma.inventoryItem.findMany({
      where: {
        status: { not: "discontinued" },
        expiryDate: { not: null },
      },
      select: {
        id: true,
        name: true,
        batchNumber: true,
        expiryDate: true,
        currentStock: true,
      },
    });

    // Get recent notification titles to avoid duplicates
    const recentNotifications = await prisma.notification.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        type: { in: ["expiry_warning", "expired"] },
      },
      select: { title: true },
    });
    const recentTitles = new Set(recentNotifications.map((n) => n.title));

    let warningCount = 0;
    let expiredCount = 0;

    // 1. Items expiring within 30 days (not yet expired)
    const expiringSoon = allItems.filter((item) => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      return expiry > now && expiry <= thirtyDaysFromNow && item.currentStock > 0;
    });

    for (const item of expiringSoon) {
      const title = `Expiring Soon: ${item.name}`;
      if (recentTitles.has(title)) continue; // skip duplicate

      const expiryDate = new Date(item.expiryDate!);
      const formattedDate = `${String(expiryDate.getDate()).padStart(2, "0")}/${String(expiryDate.getMonth() + 1).padStart(2, "0")}/${expiryDate.getFullYear()}`;

      await prisma.notification.create({
        data: {
          type: "expiry_warning",
          title,
          message: `${item.name} (Batch: ${item.batchNumber || "N/A"}) expires on ${formattedDate}. Current stock: ${item.currentStock}`,
          link: `/inventory/${item.id}`,
        },
      });

      warningCount++;
    }

    // 2. Items already expired with stock > 0
    const expiredItems = allItems.filter((item) => {
      if (!item.expiryDate) return false;
      return new Date(item.expiryDate) <= now && item.currentStock > 0;
    });

    for (const item of expiredItems) {
      const title = `EXPIRED: ${item.name}`;
      if (recentTitles.has(title)) continue; // skip duplicate

      const expiryDate = new Date(item.expiryDate!);
      const formattedDate = `${String(expiryDate.getDate()).padStart(2, "0")}/${String(expiryDate.getMonth() + 1).padStart(2, "0")}/${expiryDate.getFullYear()}`;

      await prisma.notification.create({
        data: {
          type: "expired",
          title,
          message: `${item.name} (Batch: ${item.batchNumber || "N/A"}) expired on ${formattedDate}. ${item.currentStock} units need write-off.`,
          link: `/inventory/alerts`,
        },
      });

      expiredCount++;
    }

    return NextResponse.json({
      warnings: warningCount,
      expired: expiredCount,
      message: `Created ${warningCount} expiry warning(s) and ${expiredCount} expired notification(s).`,
    });
  } catch (error) {
    console.error("Error running expiry check:", error);
    return NextResponse.json(
      { error: "Failed to run expiry check" },
      { status: 500 }
    );
  }
}
