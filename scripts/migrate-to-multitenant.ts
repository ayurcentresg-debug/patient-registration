/**
 * migrate-to-multitenant.ts
 *
 * ONE-TIME MANUAL migration script.
 * Purpose: Backfill multitenant defaults for any Clinic records that existed
 *          before the multitenant schema fields were added.
 *
 * SAFETY RULES:
 *   - Idempotent: safe to run multiple times (skips already-migrated records)
 *   - Non-destructive: only sets missing/null fields to their schema defaults
 *   - Dry-run: set DRY_RUN=true to preview without writing
 *   - NEVER auto-runs at startup. Must be triggered manually:
 *       npx tsx scripts/migrate-to-multitenant.ts
 *       DRY_RUN=true npx tsx scripts/migrate-to-multitenant.ts
 *
 * Fields backfilled (only if currently at schema default or null):
 *   - onboardingComplete  → false (if somehow null)
 *   - emailVerified       → false (if somehow null)
 *   - country             → "Singapore" (if null or empty)
 *   - currency            → "SGD" (if null or empty)
 *   - timezone            → "Asia/Singapore" (if null or empty)
 *   - isActive            → true (if somehow null)
 *   - slug                → auto-generated from name (if missing)
 */

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "true";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function log(msg: string) {
  console.log(`[migrate-to-multitenant] ${msg}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log(`Starting migration. DRY_RUN=${DRY_RUN}`);

  const clinics = await prisma.clinic.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      country: true,
      currency: true,
      timezone: true,
      isActive: true,
      onboardingComplete: true,
      emailVerified: true,
    },
  });

  log(`Found ${clinics.length} clinic(s) to inspect.`);

  let migrated = 0;
  let skipped = 0;

  for (const clinic of clinics) {
    const updates: Record<string, unknown> = {};

    // Slug: auto-generate if missing or empty
    if (!clinic.slug || clinic.slug.trim() === "") {
      const base = slugify(clinic.name || clinic.id);
      // Ensure uniqueness by appending id suffix if base already taken
      const existing = await prisma.clinic.findFirst({
        where: { slug: base, NOT: { id: clinic.id } },
      });
      updates.slug = existing ? `${base}-${clinic.id.slice(-6)}` : base;
      log(`  Clinic "${clinic.name}" [${clinic.id}]: slug will be set to "${updates.slug}"`);
    }

    // Boolean fields: only patch if somehow null (Prisma default should handle these)
    if (clinic.onboardingComplete === null || clinic.onboardingComplete === undefined) {
      updates.onboardingComplete = false;
    }
    if (clinic.emailVerified === null || clinic.emailVerified === undefined) {
      updates.emailVerified = false;
    }
    if (clinic.isActive === null || clinic.isActive === undefined) {
      updates.isActive = true;
    }

    // String defaults: patch if missing
    if (!clinic.country || clinic.country.trim() === "") {
      updates.country = "Singapore";
    }
    if (!clinic.currency || clinic.currency.trim() === "") {
      updates.currency = "SGD";
    }
    if (!clinic.timezone || clinic.timezone.trim() === "") {
      updates.timezone = "Asia/Singapore";
    }

    if (Object.keys(updates).length === 0) {
      skipped++;
      continue;
    }

    log(`  Patching clinic "${clinic.name}" [${clinic.id}]: ${JSON.stringify(updates)}`);

    if (!DRY_RUN) {
      await prisma.clinic.update({
        where: { id: clinic.id },
        data: updates,
      });
    }

    migrated++;
  }

  log(
    `Migration complete. Patched: ${migrated}, Already OK: ${skipped}.${
      DRY_RUN ? " (DRY RUN — no changes written)" : ""
    }`
  );
}

main()
  .catch((e) => {
    console.error("[migrate-to-multitenant] ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
