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

/**
 * Map a free-text category/subcategory (e.g. "Kashayam Tablet",
 * "Arishtas & Asavas", "Tailam", "Choornam") to the schema enum.
 * Returns null when no match — caller should treat as invalid.
 *
 * Rationale: clinics export master lists from suppliers (Kottakkal,
 * AVN, Vaidyaratnam) where the "category" column uses Ayurvedic
 * subcategory names rather than our 5-bucket enum. Without this
 * normalization the user has to manually rewrite the column before
 * upload, which they often skip — and 600+ rows fail.
 */
function autoMapCategory(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (VALID_CATEGORIES.includes(s)) return s;

  // Oil family
  if (/(tailam|thailam|tailum|thylum|oil|kuzhambu|coozhambu)/.test(s)) return "oil";

  // Consumable
  if (/(cotton|gauze|bandage|consumable|disposable|swab|syringe|gloves)/.test(s)) return "consumable";

  // Equipment
  if (/(equipment|machine|table|nasyam table|dhara pot|dhara stand|massage table|steam box)/.test(s)) return "equipment";

  // Herb / powder / raw
  if (/(churnam|choornam|powder|herb|bhasma|kashayam churnam|raw|granule)/.test(s)) {
    // But Kashayam (without "churnam") is liquid → medicine
    if (/kashayam$|kashayam\s/.test(s) && !/churnam/.test(s)) return "medicine";
    return "herb";
  }

  // Everything else (Arishtam, Asavam, Kashayam liquid, Lehyam, Gulika,
  // Tablet, Capsule, Ghritham, Rasakriya, Avaleha, Vati, etc.) → medicine
  return "medicine";
}

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

      const rawCategory = item.category?.trim() || "";
      if (!rawCategory) {
        failed.push({ name: rowLabel, error: "Category is required" });
        continue;
      }

      // Auto-map free-text Ayurvedic subcategory names to the 5-bucket enum.
      // Falls through unchanged for valid enum values. Stash the original
      // value in subcategory if mapping changed it AND subcategory is empty.
      const category = autoMapCategory(rawCategory);
      if (!category) {
        failed.push({
          name: rowLabel,
          error: `Invalid category "${item.category}". Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        });
        continue;
      }
      if (
        rawCategory.toLowerCase() !== category &&
        (!item.subcategory || !item.subcategory.trim())
      ) {
        item.subcategory = rawCategory;
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
