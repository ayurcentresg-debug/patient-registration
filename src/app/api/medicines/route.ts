import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/medicines
 * Returns medicine names from inventory grouped by subcategory (Ayurvedic categories).
 * Used by doctors for prescription — shows names only, not stock/pricing.
 *
 * Query params:
 *   search - filter by name (min 1 char)
 *   subcategory - filter by specific subcategory
 *   grouped - if "true", returns { subcategory: medicines[] } grouped format
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const subcategory = searchParams.get("subcategory");
    const grouped = searchParams.get("grouped");

    const where: Record<string, unknown> = {
      status: "active",
      category: { in: ["medicine", "herb"] },
    };

    if (search && search.length >= 1) {
      where.name = { contains: search };
    }
    if (subcategory) {
      where.subcategory = subcategory;
    }

    const medicines = await prisma.inventoryItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        subcategory: true,
        unit: true,
        packing: true,
      },
      orderBy: [{ subcategory: "asc" }, { name: "asc" }],
      take: 200,
    });

    if (grouped === "true") {
      // Group by subcategory
      const groups: Record<string, Array<{ id: string; name: string; unit: string; packing: string | null }>> = {};
      for (const m of medicines) {
        const cat = m.subcategory || "Other";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push({ id: m.id, name: m.name, unit: m.unit, packing: m.packing });
      }
      return NextResponse.json(groups);
    }

    return NextResponse.json(medicines);
  } catch (error) {
    console.error("GET /api/medicines error:", error);
    return NextResponse.json({ error: "Failed to fetch medicines" }, { status: 500 });
  }
}
