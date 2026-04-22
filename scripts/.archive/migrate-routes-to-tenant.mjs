/**
 * Bulk Migration Script: Convert all API routes to use tenant-scoped Prisma
 *
 * Pattern:
 * - import { prisma } from "@/lib/db"  →  keep + add tenant imports
 * - At start of each handler's try block: add clinicId + db setup
 * - Replace prisma.xxx calls with db.xxx (except in imports and special patterns)
 *
 * Run: node scripts/migrate-routes-to-tenant.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(__dirname, "..", "src", "app", "api");

// Routes that should NOT be tenant-scoped (cross-tenant access needed)
const SKIP_FILES = new Set([
  "auth/login/route.ts",
  "auth/forgot-password/route.ts",
  "auth/reset-password/route.ts",
  "auth/totp-setup/route.ts",
  "auth/totp-verify/route.ts",
  "auth/totp-disable/route.ts",
  "auth/totp-status/route.ts",
  "auth/me/route.ts",
  "auth/logout/route.ts",
  "clinic/register/route.ts",
  "invite/[token]/route.ts",
  "settings/route.ts", // already migrated
]);

function getAllRouteFiles(dir, base = "") {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllRouteFiles(path.join(dir, entry.name), rel));
    } else if (entry.name === "route.ts") {
      files.push({ full: path.join(dir, entry.name), rel });
    }
  }
  return files;
}

let migrated = 0;
let skipped = 0;
let errors = 0;

const routeFiles = getAllRouteFiles(API_DIR);

for (const { full, rel } of routeFiles) {
  const relKey = rel.replace(/\\/g, "/");

  // Skip special routes
  if (SKIP_FILES.has(relKey)) {
    console.log(`⏭️  SKIP: ${relKey}`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(full, "utf-8");

  // Skip if already migrated
  if (content.includes("getTenantPrisma") || content.includes("@/lib/tenant-db")) {
    console.log(`⏭️  ALREADY: ${relKey}`);
    skipped++;
    continue;
  }

  // Skip if doesn't use prisma
  if (!content.includes('from "@/lib/db"') && !content.includes("from '@/lib/db'")) {
    console.log(`⏭️  NO-PRISMA: ${relKey}`);
    skipped++;
    continue;
  }

  try {
    // Step 1: Add tenant imports after the prisma import
    // Keep the prisma import (needed for $transaction fallback), add tenant imports
    const importLine = 'import { prisma } from "@/lib/db";';
    if (content.includes(importLine)) {
      content = content.replace(
        importLine,
        `${importLine}\nimport { getClinicId } from "@/lib/get-clinic-id";\nimport { getTenantPrisma } from "@/lib/tenant-db";`
      );
    }

    // Step 2: Add tenant setup at the start of each handler's try block
    // Match: try {\n and insert tenant code after it
    // We need to be careful to only add once per try block at the function level

    // Find all exported async functions
    const funcPattern = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;
    let match;
    const insertions = [];

    while ((match = funcPattern.exec(content)) !== null) {
      // Find the first "try {" after this function declaration
      const afterFunc = content.indexOf("try {", match.index);
      if (afterFunc !== -1 && afterFunc < match.index + 2000) { // within reasonable range
        const insertPos = afterFunc + "try {".length;
        insertions.push(insertPos);
      }
    }

    // Insert tenant setup code at each position (reverse order to preserve positions)
    const tenantSetup = `\n    const clinicId = await getClinicId();\n    const db = clinicId ? getTenantPrisma(clinicId) : prisma;\n`;

    for (const pos of insertions.reverse()) {
      // Check if tenant setup already exists nearby
      const nearby = content.substring(pos, pos + 200);
      if (!nearby.includes("getClinicId") && !nearby.includes("getTenantPrisma")) {
        content = content.substring(0, pos) + tenantSetup + content.substring(pos);
      }
    }

    // Step 3: Replace prisma.xxx calls with db.xxx
    // But NOT in import statements, NOT prisma.$transaction (keep as prisma for raw transactions)
    // Replace: prisma.modelName with db.modelName

    // Common model names
    const models = [
      "patient", "familyMember", "appointment", "communication", "clinicalNote",
      "document", "vital", "treatment", "treatmentPackage", "inventoryItem",
      "inventoryVariant", "stockTransaction", "supplier", "clinicSettings",
      "invoice", "invoiceItem", "payment", "insuranceProvider", "insuranceClaim",
      "creditNote", "purchaseOrder", "purchaseOrderItem", "messageTemplate",
      "reminder", "prescription", "prescriptionItem", "treatmentPlan",
      "treatmentPlanItem", "treatmentMilestone", "user", "branch", "branchStock",
      "stockTransfer", "stockTransferItem", "transferTemplate", "transferTemplateItem",
      "patientPackage", "packageSession", "packageShare", "packageRefund",
      "notification", "auditLog"
    ];

    for (const model of models) {
      // Replace prisma.model with db.model (but not in strings/imports)
      const regex = new RegExp(`\\bprisma\\.${model}\\b`, "g");
      content = content.replace(regex, `db.${model}`);
    }

    // Also replace prisma.$transaction with db.$transaction
    content = content.replace(/\bprisma\.\$transaction\b/g, "db.$transaction");
    // Replace prisma.$executeRawUnsafe
    content = content.replace(/\bprisma\.\$executeRawUnsafe\b/g, "db.$executeRawUnsafe");
    content = content.replace(/\bprisma\.\$queryRawUnsafe\b/g, "db.$queryRawUnsafe");

    fs.writeFileSync(full, content, "utf-8");
    console.log(`✅ MIGRATED: ${relKey}`);
    migrated++;
  } catch (e) {
    console.error(`❌ ERROR: ${relKey} — ${e.message}`);
    errors++;
  }
}

console.log(`\n${"═".repeat(50)}`);
console.log(`✅ Migrated: ${migrated}`);
console.log(`⏭️  Skipped: ${skipped}`);
console.log(`❌ Errors: ${errors}`);
console.log(`📁 Total: ${routeFiles.length}`);
