import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/branches/stock?branchId=X
// Returns all BranchStock records for a branch with item details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json({ error: "branchId is required" }, { status: 400 });
    }

    const branchStock = await prisma.branchStock.findMany({
      where: { branchId },
      orderBy: { item: { name: "asc" } },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            packing: true,
            unit: true,
            category: true,
            status: true,
          },
        },
      },
    });

    // Transform to a flat structure for easier consumption
    const result = branchStock.map((bs) => ({
      itemId: bs.itemId,
      variantId: bs.variantId,
      quantity: bs.quantity,
      name: bs.item.name,
      sku: bs.item.sku,
      packing: bs.item.packing,
      unit: bs.item.unit,
      category: bs.item.category,
      status: bs.item.status,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching branch stock:", error);
    return NextResponse.json({ error: "Failed to fetch branch stock" }, { status: 500 });
  }
}
