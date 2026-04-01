import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/reports/transfers?period=month&from=2026-03-01&to=2026-03-31
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

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

    // Fetch all transfers in the period with related data
    const transfers = await db.stockTransfer.findMany({
      where: {
        transferDate: { gte: fromDate, lte: toDate },
      },
      include: {
        fromBranch: { select: { id: true, name: true, code: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            item: { select: { name: true, costPrice: true } },
          },
        },
      },
      orderBy: { transferDate: "desc" },
    });

    // ─── Summary ───────────────────────────────────────────────────────────
    const totalTransfers = transfers.length;
    const inTransit = transfers.filter((t) => t.status === "in_transit").length;
    const received = transfers.filter((t) => t.status === "received").length;
    const cancelled = transfers.filter((t) => t.status === "cancelled").length;

    let totalItemsMoved = 0;
    let totalValueMoved = 0;

    for (const transfer of transfers) {
      if (transfer.status === "cancelled") continue;
      for (const ti of transfer.items) {
        totalItemsMoved += ti.quantitySent;
        if (transfer.status === "received") {
          totalValueMoved += ti.quantitySent * (ti.item.costPrice || 0);
        }
      }
    }

    totalValueMoved = Math.round(totalValueMoved * 100) / 100;

    // ─── Transfer list ─────────────────────────────────────────────────────
    const transferList = transfers.map((t) => {
      let totalQty = 0;
      let totalValue = 0;
      for (const ti of t.items) {
        totalQty += ti.quantitySent;
        totalValue += ti.quantitySent * (ti.item.costPrice || 0);
      }
      return {
        id: t.id,
        transferNumber: t.transferNumber,
        fromBranch: { name: t.fromBranch.name, code: t.fromBranch.code },
        toBranch: { name: t.toBranch.name, code: t.toBranch.code },
        status: t.status,
        itemCount: t.items.length,
        totalQty,
        totalValue: Math.round(totalValue * 100) / 100,
        transferDate: t.transferDate.toISOString(),
        receivedDate: t.receivedDate ? t.receivedDate.toISOString() : null,
      };
    });

    // ─── Branch Summary ────────────────────────────────────────────────────
    const branchMap = new Map<
      string,
      {
        branchName: string;
        branchCode: string;
        sentCount: number;
        sentQty: number;
        receivedCount: number;
        receivedQty: number;
      }
    >();

    const ensureBranch = (id: string, name: string, code: string) => {
      if (!branchMap.has(id)) {
        branchMap.set(id, {
          branchName: name,
          branchCode: code,
          sentCount: 0,
          sentQty: 0,
          receivedCount: 0,
          receivedQty: 0,
        });
      }
      return branchMap.get(id)!;
    };

    for (const t of transfers) {
      if (t.status === "cancelled") continue;
      const totalQty = t.items.reduce((s, ti) => s + ti.quantitySent, 0);

      const fromEntry = ensureBranch(t.fromBranch.id, t.fromBranch.name, t.fromBranch.code);
      fromEntry.sentCount++;
      fromEntry.sentQty += totalQty;

      const toEntry = ensureBranch(t.toBranch.id, t.toBranch.name, t.toBranch.code);
      toEntry.receivedCount++;
      toEntry.receivedQty += totalQty;
    }

    const branchSummary = Array.from(branchMap.values()).map((b) => ({
      ...b,
      netQty: b.receivedQty - b.sentQty,
    }));

    // ─── Top Transferred Items ─────────────────────────────────────────────
    const itemMap = new Map<string, { name: string; totalQty: number; transferCount: number }>();

    for (const t of transfers) {
      if (t.status === "cancelled") continue;
      for (const ti of t.items) {
        const entry = itemMap.get(ti.itemId) || {
          name: ti.item.name,
          totalQty: 0,
          transferCount: 0,
        };
        entry.totalQty += ti.quantitySent;
        entry.transferCount++;
        itemMap.set(ti.itemId, entry);
      }
    }

    const topTransferredItems = Array.from(itemMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 10);

    return NextResponse.json({
      summary: {
        totalTransfers,
        inTransit,
        received,
        cancelled,
        totalItemsMoved,
        totalValueMoved,
      },
      transfers: transferList,
      branchSummary,
      topTransferredItems,
    });
  } catch (error) {
    console.error("Error fetching transfer reports:", error);
    return NextResponse.json({ error: "Failed to fetch transfer reports" }, { status: 500 });
  }
}
