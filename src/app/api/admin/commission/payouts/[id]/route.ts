import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";

// PUT /api/admin/commission/payouts/[id] — update payout (adjust, approve, mark paid)
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

    const existing = await db.commissionPayout.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    }

    const body = await request.json();
    const { adjustments, status, notes } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (adjustments !== undefined) {
      data.adjustments = adjustments;
      data.finalAmount = Math.round((existing.commissionAmount + adjustments) * 100) / 100;
    }

    if (status && ["pending", "approved", "paid"].includes(status)) {
      data.status = status;
      if (status === "paid") {
        data.paidAt = new Date();
      }
    }

    if (notes !== undefined) {
      data.notes = notes;
    }

    const updated = await db.commissionPayout.update({
      where: { id },
      data,
    });

    if (status && status !== existing.status) {
      await logAudit({
        action: "update",
        entity: "commissionPayout",
        entityId: id,
        details: {
          previousStatus: existing.status,
          newStatus: status,
          adjustments: data.adjustments,
          finalAmount: data.finalAmount ?? existing.finalAmount,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Commission payout PUT error:", e);
    return NextResponse.json({ error: "Failed to update payout" }, { status: 500 });
  }
}
