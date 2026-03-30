import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET — List all active templates with item details
export async function GET() {
  try {
    const templates = await prisma.transferTemplate.findMany({
      where: { isActive: true },
      include: {
        items: {
          include: {
            // No relation defined on TransferTemplateItem to InventoryItem,
            // so we'll do a manual join below
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Enrich with branch names and item details
    const branchIds = new Set<string>();
    const itemIds = new Set<string>();
    for (const t of templates) {
      branchIds.add(t.fromBranchId);
      branchIds.add(t.toBranchId);
      for (const ti of t.items) {
        itemIds.add(ti.itemId);
      }
    }

    const [branches, items] = await Promise.all([
      prisma.branch.findMany({
        where: { id: { in: Array.from(branchIds) } },
        select: { id: true, name: true, code: true },
      }),
      prisma.inventoryItem.findMany({
        where: { id: { in: Array.from(itemIds) } },
        select: { id: true, name: true, sku: true, packing: true },
      }),
    ]);

    const branchMap = Object.fromEntries(branches.map((b) => [b.id, b]));
    const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));

    const enriched = templates.map((t) => ({
      ...t,
      fromBranch: branchMap[t.fromBranchId] || { id: t.fromBranchId, name: "Unknown", code: "?" },
      toBranch: branchMap[t.toBranchId] || { id: t.toBranchId, name: "Unknown", code: "?" },
      items: t.items.map((ti) => ({
        ...ti,
        item: itemMap[ti.itemId] || { id: ti.itemId, name: "Unknown", sku: "", packing: null },
      })),
      itemCount: t.items.length,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Failed to fetch transfer templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST — Create a new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, fromBranchId, toBranchId, items, createdBy } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }
    if (!fromBranchId) {
      return NextResponse.json({ error: "Source branch is required" }, { status: 400 });
    }
    if (!toBranchId) {
      return NextResponse.json({ error: "Destination branch is required" }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    // Validate branches exist
    const [fromBranch, toBranch] = await Promise.all([
      prisma.branch.findUnique({ where: { id: fromBranchId } }),
      prisma.branch.findUnique({ where: { id: toBranchId } }),
    ]);
    if (!fromBranch) {
      return NextResponse.json({ error: "Source branch not found" }, { status: 400 });
    }
    if (!toBranch) {
      return NextResponse.json({ error: "Destination branch not found" }, { status: 400 });
    }

    // Validate items exist
    const itemIds = items.map((i: { itemId: string }) => i.itemId);
    const existingItems = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true },
    });
    const existingItemIds = new Set(existingItems.map((i) => i.id));
    for (const item of items) {
      if (!existingItemIds.has(item.itemId)) {
        return NextResponse.json({ error: `Inventory item not found: ${item.itemId}` }, { status: 400 });
      }
    }

    const template = await prisma.transferTemplate.create({
      data: {
        name: name.trim(),
        description: description || null,
        fromBranchId,
        toBranchId,
        createdBy: createdBy || null,
        items: {
          create: items.map((i: { itemId: string; variantId?: string; quantity?: number }) => ({
            itemId: i.itemId,
            variantId: i.variantId || null,
            quantity: i.quantity || 1,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Failed to create transfer template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
