import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/admin/payroll — list payroll records with filters
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = request.nextUrl;
    const period = searchParams.get("period");
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (period) where.period = period;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const payrolls = await db.payroll.findMany({
      where,
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
    });

    // Resolve user names
    const userIds = [...new Set(payrolls.map((p) => p.userId))];
    const users = userIds.length
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = payrolls.map((p) => ({
      ...p,
      userName: userMap[p.userId]?.name || "Unknown",
      userRole: userMap[p.userId]?.role || "unknown",
    }));

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("Payroll GET error:", e);
    return NextResponse.json({ error: "Failed to fetch payroll" }, { status: 500 });
  }
}
