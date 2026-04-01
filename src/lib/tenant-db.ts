/**
 * Multi-Tenant Prisma Client Extension
 *
 * Provides automatic clinicId injection for all queries.
 * Usage:
 *   const tenantDb = getTenantPrisma(clinicId);
 *   const patients = await tenantDb.patient.findMany(); // auto-filtered by clinicId
 *   await tenantDb.patient.create({ data: { ... } });   // auto-injects clinicId
 */

import { prisma } from "./db";

// Models that should NOT have clinicId filtering (global models)
const GLOBAL_MODELS = new Set(["Clinic", "ClinicSubscription"]);

/**
 * Returns a Prisma client extended with automatic tenant scoping.
 * All read queries are filtered by clinicId.
 * All create operations auto-inject clinicId.
 */
export function getTenantPrisma(clinicId: string) {
  return prisma.$extends({
    query: {
      $allOperations({ model, operation, args, query }) {
        // Skip global models
        if (model && GLOBAL_MODELS.has(model)) {
          return query(args);
        }

        // For read operations, inject clinicId into where clause
        if (
          operation === "findMany" ||
          operation === "findFirst" ||
          operation === "findUnique" ||
          operation === "count" ||
          operation === "aggregate" ||
          operation === "groupBy"
        ) {
          if (!args.where) args.where = {};
          // Don't override if clinicId is explicitly set (e.g., for cross-tenant admin queries)
          if (args.where.clinicId === undefined) {
            args.where.clinicId = clinicId;
          }
          return query(args);
        }

        // For create operations, inject clinicId into data
        if (operation === "create") {
          if (args.data && args.data.clinicId === undefined) {
            args.data.clinicId = clinicId;
          }
          return query(args);
        }

        // For createMany, inject clinicId into each record
        if (operation === "createMany") {
          if (args.data) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d: Record<string, unknown>) =>
                d.clinicId === undefined ? { ...d, clinicId } : d
              );
            } else if (args.data.clinicId === undefined) {
              args.data.clinicId = clinicId;
            }
          }
          return query(args);
        }

        // For update/delete operations, scope to clinicId
        if (
          operation === "update" ||
          operation === "updateMany" ||
          operation === "delete" ||
          operation === "deleteMany"
        ) {
          if (!args.where) args.where = {};
          if (args.where.clinicId === undefined) {
            args.where.clinicId = clinicId;
          }
          return query(args);
        }

        // For upsert, scope both where and create
        if (operation === "upsert") {
          if (!args.where) args.where = {};
          if (args.where.clinicId === undefined) {
            args.where.clinicId = clinicId;
          }
          if (args.create && args.create.clinicId === undefined) {
            args.create.clinicId = clinicId;
          }
          return query(args);
        }

        // Default: pass through
        return query(args);
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof getTenantPrisma>;
