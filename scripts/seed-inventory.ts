import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "path";
import fs from "fs";

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "dev.db");

interface ItemData {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string | null;
  unit: string;
  packing: string | null;
  manufacturerCode: string | null;
  unitPrice: number;
  costPrice: number;
  currentStock: number;
  reorderLevel: number;
  expiryDate: string | null;
  batchNumber: string | null;
  manufacturer: string | null;
  supplier: string | null;
  location: string | null;
  hsnCode: string | null;
  gstPercent: number;
  description: string | null;
  status: string;
}

interface VariantData {
  id: string;
  itemId: string;
  manufacturerCode: string | null;
  packing: string;
  unitPrice: number;
  costPrice: number;
  currentStock: number;
  gstPercent: number;
  status: string;
}

async function main() {
  console.log(`📦 Seeding inventory from data file...`);

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter });

  const dataPath = path.join(process.cwd(), "scripts", "inventory-data.json");
  if (!fs.existsSync(dataPath)) {
    console.log("⏭️  No inventory-data.json found, skipping inventory seed");
    await prisma.$disconnect();
    return;
  }

  const raw = fs.readFileSync(dataPath, "utf-8");
  const data: { items: ItemData[]; variants: VariantData[] } = JSON.parse(raw);

  // Check if inventory already seeded
  const existingCount = await prisma.inventoryItem.count();
  if (existingCount >= data.items.length) {
    console.log(`⏭️  Inventory already has ${existingCount} items, skipping seed`);
    await prisma.$disconnect();
    return;
  }

  console.log(`  Found ${data.items.length} items and ${data.variants.length} variants to seed`);

  let created = 0;
  let skipped = 0;

  for (const item of data.items) {
    try {
      const existing = await prisma.inventoryItem.findUnique({ where: { sku: item.sku } });
      if (existing) {
        // Update existing item with correct data
        await prisma.inventoryItem.update({
          where: { sku: item.sku },
          data: {
            name: item.name,
            category: item.category,
            subcategory: item.subcategory,
            unit: item.unit,
            packing: item.packing,
            manufacturerCode: item.manufacturerCode,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            currentStock: item.currentStock,
            reorderLevel: item.reorderLevel,
            manufacturer: item.manufacturer || "Kottakkal Arya Vaidya Sala",
            gstPercent: item.gstPercent,
            description: item.description,
            status: item.status,
          },
        });
        skipped++;
      } else {
        await prisma.inventoryItem.create({
          data: {
            id: item.id,
            sku: item.sku,
            name: item.name,
            category: item.category,
            subcategory: item.subcategory,
            unit: item.unit,
            packing: item.packing,
            manufacturerCode: item.manufacturerCode,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            currentStock: item.currentStock,
            reorderLevel: item.reorderLevel,
            manufacturer: item.manufacturer || "Kottakkal Arya Vaidya Sala",
            gstPercent: item.gstPercent,
            description: item.description,
            status: item.status,
          },
        });
        created++;
      }
    } catch (e) {
      console.error(`  ❌ Failed to seed: ${item.name} (${item.sku})`, e);
    }
  }

  console.log(`  ✅ Items: ${created} created, ${skipped} updated`);

  // Seed variants
  let varCreated = 0;
  for (const v of data.variants) {
    try {
      // Find parent item by ID
      const parent = await prisma.inventoryItem.findUnique({ where: { id: v.itemId } });
      if (!parent) {
        // Try to find by manufacturer code relationship
        continue;
      }

      const existing = await prisma.inventoryVariant.findFirst({
        where: { itemId: v.itemId, packing: v.packing },
      });

      if (!existing) {
        await prisma.inventoryVariant.create({
          data: {
            id: v.id,
            itemId: v.itemId,
            manufacturerCode: v.manufacturerCode,
            packing: v.packing,
            unitPrice: v.unitPrice,
            costPrice: v.costPrice,
            currentStock: v.currentStock,
            gstPercent: v.gstPercent,
            status: v.status,
          },
        });
        varCreated++;
      }
    } catch {
      // Skip duplicates
    }
  }

  console.log(`  ✅ Variants: ${varCreated} created`);
  console.log(`📦 Inventory seed complete!`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Inventory seed error:", e);
  process.exit(1);
});
