import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

interface ImportItem {
  name: string;
  category: string;
  subcategory?: string | null;
  unit?: string | null;
  packing?: string | null;
  manufacturerCode?: string | null;
  costPrice?: number | null;
  unitPrice?: number | null;
  gstPercent?: number | null;
  currentStock?: number | null;
  reorderLevel?: number | null;
  manufacturer?: string | null;
  batchNumber?: string | null;
}

interface FailedItem {
  name: string;
  error: string;
}

const VALID_CATEGORIES = ["medicine", "herb", "oil", "consumable", "equipment"];
const CATEGORY_PREFIX: Record<string, string> = {
  medicine: "M",
  herb: "H",
  oil: "O",
  consumable: "C",
  equipment: "E",
};

export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const items: ImportItem[] = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Get current counts per category for SKU generation
    const categoryCounts: Record<string, number> = {};
    for (const cat of VALID_CATEGORIES) {
      categoryCounts[cat] = await db.inventoryItem.count({
        where: { category: cat },
      });
    }

    const created: number[] = [];
    const failed: FailedItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowLabel = item.name?.trim() || `Row ${i + 1}`;

      // Validate required fields
      if (!item.name || !item.name.trim()) {
        failed.push({ name: rowLabel, error: "Name is required" });
        continue;
      }

      const category = item.category?.trim().toLowerCase() || "";
      if (!category) {
        failed.push({ name: rowLabel, error: "Category is required" });
        continue;
      }

      if (!VALID_CATEGORIES.includes(category)) {
        failed.push({
          name: rowLabel,
          error: `Invalid category "${item.category}". Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        });
        continue;
      }

      try {
        // Generate SKU
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        const prefix = CATEGORY_PREFIX[category];
        const sequenceNumber = String(categoryCounts[category]).padStart(4, "0");
        const sku = `AYU-${prefix}${sequenceNumber}`;

        await db.inventoryItem.create({
          data: {
            sku,
            name: item.name.trim(),
            category,
            subcategory: item.subcategory?.trim() || null,
            unit: item.unit?.trim() || "nos",
            packing: item.packing?.trim() || null,
            manufacturerCode: item.manufacturerCode?.trim() || null,
            costPrice: item.costPrice != null && !isNaN(Number(item.costPrice)) ? Number(item.costPrice) : 0,
            unitPrice: item.unitPrice != null && !isNaN(Number(item.unitPrice)) ? Number(item.unitPrice) : 0,
            gstPercent: item.gstPercent != null && !isNaN(Number(item.gstPercent)) ? Number(item.gstPercent) : 0,
            currentStock: item.currentStock != null && !isNaN(Number(item.currentStock)) ? Math.floor(Number(item.currentStock)) : 0,
            reorderLevel: item.reorderLevel != null && !isNaN(Number(item.reorderLevel)) ? Math.floor(Number(item.reorderLevel)) : 10,
            manufacturer: item.manufacturer?.trim() || null,
            batchNumber: item.batchNumber?.trim() || null,
            status: "active",
          },
        });

        created.push(i);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Database error";
        failed.push({ name: rowLabel, error: message });
      }
    }

    return NextResponse.json({
      created: created.length,
      failed,
      total: items.length,
    });
  } catch (error) {
    console.error("Error importing inventory items:", error);
    return NextResponse.json(
      { error: "Failed to import inventory items" },
      { status: 500 }
    );
  }
}
