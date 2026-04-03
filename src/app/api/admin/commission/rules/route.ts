import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";

// GET /api/admin/commission/rules — list all commission rules
export async function GET() {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const rules = await db.commissionRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    // Resolve user names for user-specific rules
    const userIds = rules.filter((r) => r.userId).map((r) => r.userId!);
    const users = userIds.length
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    // Sort: user-specific first, then role-specific, then default
    const sorted = [...rules].sort((a, b) => {
      const priorityA = a.userId ? 0 : a.role ? 1 : 2;
      const priorityB = b.userId ? 0 : b.role ? 1 : 2;
      return priorityA - priorityB;
    });

    const enriched = sorted.map((r) => ({
      ...r,
      userName: r.userId ? userMap[r.userId]?.name || "Unknown" : null,
      userRole: r.userId ? userMap[r.userId]?.role || null : null,
    }));

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("Commission rules GET error:", e);
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

// POST /api/admin/commission/rules — create a new rule
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { userId, role, type, value, minRevenue, maxCommission } = body;

    if (!type || value == null) {
      return NextResponse.json({ error: "type and value are required" }, { status: 400 });
    }

    if (!["percentage", "fixed"].includes(type)) {
      return NextResponse.json({ error: "type must be 'percentage' or 'fixed'" }, { status: 400 });
    }

    if (typeof value !== "number" || value < 0) {
      return NextResponse.json({ error: "value must be a non-negative number" }, { status: 400 });
    }

    const rule = await db.commissionRule.create({
      data: {
        userId: userId || null,
        role: userId ? null : role || null,
        type,
        value,
        minRevenue: minRevenue ?? null,
        maxCommission: maxCommission ?? null,
      },
    });

    await logAudit({
      action: "create",
      entity: "commissionRule",
      entityId: rule.id,
      details: { userId, role, type, value },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (e) {
    console.error("Commission rules POST error:", e);
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}
