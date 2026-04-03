import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";

// PUT /api/admin/commission/rules/[id] — update a rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { userId, role, type, value, minRevenue, maxCommission } = body;

    const existing = await db.commissionRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const updated = await db.commissionRule.update({
      where: { id },
      data: {
        userId: userId !== undefined ? userId || null : undefined,
        role: userId ? null : role !== undefined ? role || null : undefined,
        type: type || undefined,
        value: value !== undefined ? value : undefined,
        minRevenue: minRevenue !== undefined ? minRevenue : undefined,
        maxCommission: maxCommission !== undefined ? maxCommission : undefined,
      },
    });

    await logAudit({
      action: "update",
      entity: "commissionRule",
      entityId: id,
      details: body,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Commission rule PUT error:", e);
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }
}

// DELETE /api/admin/commission/rules/[id] — soft-delete (deactivate)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const existing = await db.commissionRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    await db.commissionRule.update({
      where: { id },
      data: { isActive: false },
    });

    await logAudit({
      action: "delete",
      entity: "commissionRule",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Commission rule DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
