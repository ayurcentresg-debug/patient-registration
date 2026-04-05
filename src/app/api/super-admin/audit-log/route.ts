import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin-auth";

/**
 * GET /api/super-admin/audit-log
 * Returns paginated audit log entries with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get("limit") || "50")));
    const action = url.searchParams.get("action") || undefined;
    const entity = url.searchParams.get("entity") || undefined;
    const search = url.searchParams.get("search") || undefined;

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (search) {
      where.OR = [
        { entityName: { contains: search } },
        { action: { contains: search } },
        { details: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.superAdminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.superAdminAuditLog.count({ where }),
    ]);

    // Get distinct actions and entities for filters
    const allLogs = await prisma.superAdminAuditLog.findMany({
      select: { action: true, entity: true },
      distinct: ["action"],
    });
    const actions = [...new Set(allLogs.map((l) => l.action))].sort();
    const entities = [...new Set(allLogs.map((l) => l.entity))].sort();

    return NextResponse.json({
      logs: logs.map((l) => ({
        ...l,
        details: l.details ? JSON.parse(l.details) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: { actions, entities },
    });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json(
      { error: "Failed to load audit log" },
      { status: 500 }
    );
  }
}
