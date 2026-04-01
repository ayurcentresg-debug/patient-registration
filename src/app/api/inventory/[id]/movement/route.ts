import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// Types that contribute to stock IN vs stock OUT
const STOCK_IN_TYPES = ["purchase", "return", "transfer_in"];
const STOCK_OUT_TYPES = ["sale", "issue", "transfer_out", "expired", "damaged"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const url = new URL(request.url);
    const periodParam = url.searchParams.get("period");
    const period = [7, 30, 60, 90].includes(Number(periodParam))
      ? Number(periodParam)
      : 30;

    // Fetch the item to get current stock and reorder level
    const item = await db.inventoryItem.findUnique({
      where: { id },
      select: { id: true, name: true, currentStock: true, reorderLevel: true },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    startDate.setHours(0, 0, 0, 0);

    // Fetch all transactions in the date range
    const transactions = await db.stockTransaction.findMany({
      where: {
        itemId: id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
      select: {
        type: true,
        quantity: true,
        date: true,
        newStock: true,
      },
    });

    // Group transactions by date (YYYY-MM-DD)
    const dailyMap = new Map<
      string,
      { stockIn: number; stockOut: number; lastNewStock: number | null }
    >();

    for (const txn of transactions) {
      const dateKey = txn.date.toISOString().split("T")[0];
      const existing = dailyMap.get(dateKey) || {
        stockIn: 0,
        stockOut: 0,
        lastNewStock: null,
      };

      const absQty = Math.abs(txn.quantity);

      if (
        STOCK_IN_TYPES.includes(txn.type) ||
        (txn.type === "adjustment" && txn.quantity > 0)
      ) {
        existing.stockIn += absQty;
      } else if (
        STOCK_OUT_TYPES.includes(txn.type) ||
        (txn.type === "adjustment" && txn.quantity < 0)
      ) {
        existing.stockOut += absQty;
      }

      // Track the last newStock value for this day
      existing.lastNewStock = txn.newStock;
      dailyMap.set(dateKey, existing);
    }

    // Build movements array with all days filled in
    const movements: Array<{
      date: string;
      stockIn: number;
      stockOut: number;
      netChange: number;
      closingStock: number;
    }> = [];

    // Work backward from currentStock to determine the closing stock for previous days
    // Start by finding the closing stock at the end of the period
    let runningStock = item.currentStock;

    // First, collect all days in the period
    const allDays: string[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      allDays.push(cursor.toISOString().split("T")[0]);
      cursor.setDate(cursor.getDate() + 1);
    }

    // Work backward from today to reconstruct closing stock for each day
    // currentStock is the stock right now (end of today)
    // For each day going backward, subtract that day's net change to get previous day's closing
    const closingStocks = new Map<string, number>();
    let stock = item.currentStock;

    for (let i = allDays.length - 1; i >= 0; i--) {
      const day = allDays[i];
      const data = dailyMap.get(day);
      closingStocks.set(day, stock);
      if (data) {
        // Undo this day's net change to get the previous day's closing stock
        const netChange = data.stockIn - data.stockOut;
        stock = stock - netChange;
      }
    }

    // Build the movements array
    let totalIn = 0;
    let totalOut = 0;
    let peakStock = 0;
    let lowestStock = Infinity;

    for (const day of allDays) {
      const data = dailyMap.get(day) || { stockIn: 0, stockOut: 0 };
      const closing = closingStocks.get(day) ?? item.currentStock;
      const netChange = data.stockIn - data.stockOut;

      movements.push({
        date: day,
        stockIn: data.stockIn,
        stockOut: data.stockOut,
        netChange,
        closingStock: closing,
      });

      totalIn += data.stockIn;
      totalOut += data.stockOut;
      if (closing > peakStock) peakStock = closing;
      if (closing < lowestStock) lowestStock = closing;
    }

    if (lowestStock === Infinity) lowestStock = item.currentStock;

    const avgDailyOut = period > 0 ? totalOut / period : 0;
    const daysOfStock =
      avgDailyOut > 0 ? Math.round(item.currentStock / avgDailyOut) : 999;

    return NextResponse.json({
      itemName: item.name,
      period,
      reorderLevel: item.reorderLevel,
      currentStock: item.currentStock,
      movements,
      summary: {
        totalIn,
        totalOut,
        netChange: totalIn - totalOut,
        avgDailyOut: Math.round(avgDailyOut * 10) / 10,
        daysOfStock,
        peakStock,
        lowestStock,
      },
    });
  } catch (error) {
    console.error("Error fetching stock movement:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock movement data" },
      { status: 500 }
    );
  }
}
