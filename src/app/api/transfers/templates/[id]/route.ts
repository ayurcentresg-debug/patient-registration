import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET — Get single template with full details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const template = await db.transferTemplate.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!template || !template.isActive) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Enrich with branch names and item details
    const branchIds = [template.fromBranchId, template.toBranchId];
    const itemIds = template.items.map((ti) => ti.itemId);

    const [branches, items] = await Promise.all([
      db.branch.findMany({
        where: { id: { in: branchIds } },
        select: { id: true, name: true, code: true },
      }),
      db.inventoryItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, name: true, sku: true, packing: true, unit: true, category: true },
      }),
    ]);

    const branchMap = Object.fromEntries(branches.map((b) => [b.id, b]));
    const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));

    const enriched = {
      ...template,
      fromBranch: branchMap[template.fromBranchId] || { id: template.fromBranchId, name: "Unknown", code: "?" },
      toBranch: branchMap[template.toBranchId] || { id: template.toBranchId, name: "Unknown", code: "?" },
      items: template.items.map((ti) => ({
        ...ti,
        item: itemMap[ti.itemId] || { id: ti.itemId, name: "Unknown", sku: "", packing: null, unit: "nos", category: "medicine" },
      })),
    };

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Failed to fetch transfer template:", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

// PUT — Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();
    const { name, description, fromBranchId, toBranchId, items } = body;

    const existing = await db.transferTemplate.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || null;
    if (fromBranchId !== undefined) updateData.fromBranchId = fromBranchId;
    if (toBranchId !== undefined) updateData.toBranchId = toBranchId;

    // Validate branches if changed
    if (fromBranchId) {
      const branch = await db.branch.findUnique({ where: { id: fromBranchId } });
      if (!branch) return NextResponse.json({ error: "Source branch not found" }, { status: 400 });
    }
    if (toBranchId) {
      const branch = await db.branch.findUnique({ where: { id: toBranchId } });
      if (!branch) return NextResponse.json({ error: "Destination branch not found" }, { status: 400 });
    }

    // If items are provided, replace all items
    if (items && Array.isArray(items)) {
      // Validate items exist
      const itemIds = items.map((i: { itemId: string }) => i.itemId);
      const existingItems = await db.inventoryItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true },
      });
      const existingItemIds = new Set(existingItems.map((i) => i.id));
      for (const item of items) {
        if (!existingItemIds.has(item.itemId)) {
          return NextResponse.json({ error: `Inventory item not found: ${item.itemId}` }, { status: 400 });
        }
      }

      // Delete existing items and create new ones in a transaction
      await prisma.$transaction([
        db.transferTemplateItem.deleteMany({ where: { templateId: id } }),
        db.transferTemplate.update({
          where: { id },
          data: {
            ...updateData,
            items: {
              create: items.map((i: { itemId: string; variantId?: string; quantity?: number }) => ({
                itemId: i.itemId,
                variantId: i.variantId || null,
                quantity: i.quantity || 1,
              })),
            },
          },
        }),
      ]);
    } else if (Object.keys(updateData).length > 0) {
      await db.transferTemplate.update({
        where: { id },
        data: updateData,
      });
    }

    // Fetch updated template
    const updated = await db.transferTemplate.findUnique({
      where: { id },
      include: { items: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update transfer template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

// DELETE — Soft delete (set isActive = false)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const existing = await db.transferTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await db.transferTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Template deleted" });
  } catch (error) {
    console.error("Failed to delete transfer template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
