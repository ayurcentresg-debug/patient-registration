import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/inventory/branch-comparison?category=all&search=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all";
    const search = searchParams.get("search") || "";

    // 1. Fetch all active branches
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    });

    // 2. Build item filter
    const itemWhere: Record<string, unknown> = { status: "active" };
    if (category && category !== "all") {
      itemWhere.category = category;
    }
    if (search) {
      itemWhere.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    // 3. Fetch all active inventory items
    const items = await prisma.inventoryItem.findMany({
      where: itemWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        packing: true,
        unit: true,
        reorderLevel: true,
      },
    });

    // 4. Fetch all BranchStock records for active branches
    const branchIds = branches.map((b) => b.id);
    const allBranchStock = await prisma.branchStock.findMany({
      where: {
        branchId: { in: branchIds },
        variantId: null, // only main item stock, not variants
      },
      select: {
        branchId: true,
        itemId: true,
        quantity: true,
      },
    });

    // 5. Build a lookup map: itemId -> { branchId -> quantity }
    const stockMap: Record<string, Record<string, number>> = {};
    for (const bs of allBranchStock) {
      if (!stockMap[bs.itemId]) stockMap[bs.itemId] = {};
      stockMap[bs.itemId][bs.branchId] = bs.quantity;
    }

    // 6. Build comparison items
    const branchCount = branches.length;
    let itemsInAllBranches = 0;
    let itemsInOneBranchOnly = 0;
    let imbalancedItems = 0;

    const comparisonItems = items.map((item) => {
      const branchStock: Record<string, number> = {};
      let totalStock = 0;
      let branchesWithStock = 0;
      let maxQty = 0;
      let minQtyWithStock = Infinity;

      for (const branch of branches) {
        const qty = stockMap[item.id]?.[branch.id] ?? 0;
        branchStock[branch.id] = qty;
        totalStock += qty;
        if (qty > 0) {
          branchesWithStock++;
          maxQty = Math.max(maxQty, qty);
          minQtyWithStock = Math.min(minQtyWithStock, qty);
        }
      }

      // Track summary stats
      if (branchesWithStock === branchCount && branchCount > 0) {
        itemsInAllBranches++;
      }
      if (branchesWithStock === 1) {
        itemsInOneBranchOnly++;
      }
      // Imbalanced: one branch has >3x stock of another (both must have stock)
      if (branchesWithStock >= 2 && maxQty > 3 * minQtyWithStock) {
        imbalancedItems++;
      }

      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        packing: item.packing,
        unit: item.unit,
        reorderLevel: item.reorderLevel,
        totalStock,
        branchStock,
      };
    });

    return NextResponse.json({
      branches,
      items: comparisonItems,
      summary: {
        totalItems: comparisonItems.length,
        itemsInAllBranches,
        itemsInOneBranchOnly,
        imbalancedItems,
      },
    });
  } catch (error) {
    console.error("Error fetching branch comparison:", error);
    return NextResponse.json(
      { error: "Failed to fetch branch comparison data" },
      { status: 500 }
    );
  }
}
