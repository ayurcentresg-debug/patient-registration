import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: DB_PATH });
const prisma = new PrismaClient({ adapter });

interface InventoryRow {
  "Item Code": string;
  "Item Name": string;
  "Sub Category": string;
  "Unit": string;
  "Batch Number": string;
  "Manufacturer": string;
  "Supplier": string;
  "Storage Location": string;
  "HSN Code": string;
  "Description": string;
  "Cost Price (S$)": number;
  "Selling Price (S$)": number;
  "Current Stock": number;
  "Reorder Level": number;
}

async function main() {
  const rows: InventoryRow[] = JSON.parse(fs.readFileSync("/tmp/kottakkal_inventory.json", "utf-8"));
  console.log(`📦 Found ${rows.length} items to import`);
  console.log(`💾 Database: ${DB_PATH}\n`);

  let imported = 0, skipped = 0;

  for (const row of rows) {
    const sku = row["Item Code"];
    const name = row["Item Name"];
    if (!sku || !name) { skipped++; continue; }

    const existing = await prisma.inventoryItem.findUnique({ where: { sku } });
    if (existing) { skipped++; continue; }

    const unitLower = (row["Unit"] || "").toString().toLowerCase();
    let unit = "nos";
    if (unitLower.includes("ml")) unit = "ml";
    else if (unitLower.includes("gm") || unitLower.includes("g")) unit = "gm";

    await prisma.inventoryItem.create({
      data: {
        sku, name, category: "medicine",
        subcategory: row["Sub Category"] || null,
        unit,
        unitPrice: Number(row["Selling Price (S$)"]) || 0,
        costPrice: Number(row["Cost Price (S$)"]) || 0,
        currentStock: Number(row["Current Stock"]) || 50,
        reorderLevel: Number(row["Reorder Level"]) || 30,
        expiryDate: new Date("2026-01-31"),
        batchNumber: row["Batch Number"] || "BATCH-2026-001",
        manufacturer: row["Manufacturer"] || "Kottakkal Arya Vaidya Sala",
        supplier: row["Supplier"] || "AYURKART Chennai",
        location: row["Storage Location"] || null,
        hsnCode: row["HSN Code"]?.toString() || null,
        gstPercent: 0,
        description: row["Description"] || null,
        status: "active",
      },
    });
    imported++;
    if (imported % 100 === 0) console.log(`  ✅ ${imported} items imported...`);
  }

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`✅ IMPORT COMPLETE — ${imported} items imported, ${skipped} skipped`);
  console.log(`═══════════════════════════════════════════════════`);

  const total = await prisma.inventoryItem.count();
  console.log(`📦 Total inventory items in database: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
