import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "path";

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  // Check if BranchStock already has data
  const existing = await prisma.branchStock.count();
  if (existing > 0) {
    console.log(`✅ BranchStock already has ${existing} records. Skipping seed.`);
    return;
  }

  // Find the main branch (or first active branch)
  let mainBranch = await prisma.branch.findFirst({
    where: { isMainBranch: true },
  });

  if (!mainBranch) {
    mainBranch = await prisma.branch.findFirst({
      where: { isActive: true },
    });
  }

  if (!mainBranch) {
    // Create default main branch
    mainBranch = await prisma.branch.create({
      data: {
        name: "Ayur Centre Jurong",
        code: "JRG",
        address: "Jurong East",
        city: "Singapore",
        isActive: true,
        isMainBranch: true,
      },
    });
    console.log(`📍 Created main branch: ${mainBranch.name} (${mainBranch.code})`);
  }

  // Get all inventory items with stock > 0
  const items = await prisma.inventoryItem.findMany({
    where: { currentStock: { gt: 0 } },
    select: { id: true, currentStock: true, name: true },
  });

  if (items.length === 0) {
    console.log("⚠️  No inventory items with stock found. Skipping.");
    return;
  }

  // Seed all current stock to main branch
  const data = items.map((item) => ({
    branchId: mainBranch!.id,
    itemId: item.id,
    variantId: null as string | null,
    quantity: item.currentStock,
  }));

  // Batch create
  let created = 0;
  for (const record of data) {
    try {
      await prisma.branchStock.create({ data: record });
      created++;
    } catch {
      // Skip duplicates
    }
  }

  // Also seed variants
  const variants = await prisma.inventoryVariant.findMany({
    where: { currentStock: { gt: 0 } },
    select: { id: true, itemId: true, currentStock: true },
  });

  for (const v of variants) {
    try {
      await prisma.branchStock.create({
        data: {
          branchId: mainBranch.id,
          itemId: v.itemId,
          variantId: v.id,
          quantity: v.currentStock,
        },
      });
      created++;
    } catch {
      // Skip duplicates
    }
  }

  console.log(`✅ Seeded ${created} BranchStock records to "${mainBranch.name}" (${mainBranch.code})`);
}

main()
  .catch((e) => {
    console.error("Error seeding branch stock:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
