import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

interface AuditEntry {
  action: "create" | "update" | "delete" | "merge";
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * Write an audit log entry for the current authenticated user.
 * Fails silently — audit logging should never break the main operation.
 */
export async function logAudit(entry: AuditEntry) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return;

    const db = payload.clinicId
      ? getTenantPrisma(payload.clinicId)
      : prisma;

    await db.auditLog.create({
      data: {
        userId: payload.userId,
        userName: payload.name || payload.email,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        details: entry.details ? JSON.stringify(entry.details) : null,
      },
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}
