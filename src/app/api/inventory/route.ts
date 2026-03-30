import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/inventory - List items with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");
    const status = searchParams.get("status");
    const lowStock = searchParams.get("lowStock");
    const expiringSoon = searchParams.get("expiringSoon");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { subcategory: { contains: search } },
        { manufacturer: { contains: search } },
        { manufacturerCode: { contains: search } },
        { packing: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (subcategory) {
      where.subcategory = subcategory;
    }

    if (status) {
      where.status = status;
    }

    if (lowStock === "true") {
      // Items where currentStock <= reorderLevel
      // Prisma doesn't support field-to-field comparison directly,
      // so we use raw filtering after fetch or a workaround.
      // We'll use a raw query approach via Prisma's built-in filtering.
      // Since Prisma doesn't support lte with another field, we fetch and filter.
    }

    if (expiringSoon === "true") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.expiryDate = {
        not: null,
        lte: thirtyDaysFromNow,
      };
    }

    const includeVariants = searchParams.get("includeVariants") === "true";

    let items = await prisma.inventoryItem.findMany({
      where,
      include: {
        _count: {
          select: { transactions: true, variants: true },
        },
        ...(includeVariants ? { variants: { orderBy: { packing: "asc" } } } : {}),
      },
      orderBy: { name: "asc" },
    });

    // Post-filter for lowStock since Prisma can't compare two fields
    if (lowStock === "true") {
      items = items.filter((item) => item.currentStock <= item.reorderLevel);
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Create a new item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    const validCategories = ["medicine", "herb", "oil", "consumable", "equipment"];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Auto-generate SKU based on category
    const categoryPrefix: Record<string, string> = {
      medicine: "M",
      herb: "H",
      oil: "O",
      consumable: "C",
      equipment: "E",
    };

    const prefix = categoryPrefix[body.category];

    // Count existing items in this category to generate sequence number
    const count = await prisma.inventoryItem.count({
      where: { category: body.category },
    });

    const sequenceNumber = String(count + 1).padStart(4, "0");
    const sku = `AYU-${prefix}${sequenceNumber}`;

    const item = await prisma.inventoryItem.create({
      data: {
        sku,
        name: body.name,
        category: body.category,
        subcategory: body.subcategory || null,
        unit: body.unit || "nos",
        packing: body.packing || null,
        manufacturerCode: body.manufacturerCode || null,
        unitPrice: body.unitPrice ?? 0,
        costPrice: body.costPrice ?? 0,
        currentStock: body.currentStock ?? 0,
        reorderLevel: body.reorderLevel ?? 10,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        batchNumber: body.batchNumber || null,
        manufacturer: body.manufacturer || null,
        supplier: body.supplier || null,
        location: body.location || null,
        hsnCode: body.hsnCode || null,
        gstPercent: body.gstPercent ?? 0,
        description: body.description || null,
        status: body.status || "active",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 }
    );
  }
}
