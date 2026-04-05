import { prisma } from "@/lib/db";
import { headers } from "next/headers";

interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
}

/**
 * Log a super admin action to the audit trail.
 * Call this from any super admin API route after performing an action.
 */
export async function logSuperAdminAction(entry: AuditEntry) {
  try {
    let ipAddress: string | null = null;
    try {
      const hdrs = await headers();
      ipAddress =
        hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        hdrs.get("x-real-ip") ||
        null;
    } catch {
      // headers() may fail outside request context
    }

    await prisma.superAdminAuditLog.create({
      data: {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || null,
        entityName: entry.entityName || null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress,
      },
    });
  } catch (error) {
    // Don't let audit logging failures break the main operation
    console.error("Audit log error:", error);
  }
}
