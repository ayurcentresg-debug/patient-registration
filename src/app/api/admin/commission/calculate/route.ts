import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";

// POST /api/admin/commission/calculate — calculate commissions for a period
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { period } = body; // e.g. "2026-04"

    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json({ error: "Period must be in YYYY-MM format" }, { status: 400 });
    }

    const [yearStr, monthStr] = period.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed
    const fromDate = new Date(year, month, 1);
    const toDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // 1. Get all clinical staff
    const staff = await db.user.findMany({
      where: { role: { in: ["doctor", "therapist"] }, status: "active" },
      select: { id: true, name: true, role: true },
    });

    // 2. Get all active commission rules
    const rules = await db.commissionRule.findMany({
      where: { isActive: true },
    });

    // 3. Get completed appointments in that month
    const appointments = await db.appointment.findMany({
      where: {
        status: "completed",
        date: { gte: fromDate, lte: toDate },
        doctorId: { not: null },
      },
      select: { id: true, doctorId: true, sessionPrice: true },
    });

    // 4. Get invoices for the period to match revenue to appointments
    const invoices = await db.invoice.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        status: { in: ["paid", "partially_paid"] },
      },
      select: { id: true, appointmentId: true, totalAmount: true, paidAmount: true },
    });

    // Build a map of appointmentId -> revenue
    const appointmentRevenueMap: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.appointmentId) {
        appointmentRevenueMap[inv.appointmentId] = (appointmentRevenueMap[inv.appointmentId] || 0) + inv.paidAmount;
      }
    }

    // Helper: find best matching rule for a staff member
    function findRule(userId: string, role: string) {
      // Priority 1: user-specific rule
      const userRule = rules.find((r) => r.userId === userId);
      if (userRule) return userRule;
      // Priority 2: role-specific rule
      const roleRule = rules.find((r) => !r.userId && r.role === role);
      if (roleRule) return roleRule;
      // Priority 3: default rule (no userId, no role)
      return rules.find((r) => !r.userId && !r.role) || null;
    }

    // 5. Calculate for each staff member
    const payouts = [];

    for (const member of staff) {
      // Find their appointments
      const memberAppointments = appointments.filter((a) => a.doctorId === member.id);
      const appointmentCount = memberAppointments.length;

      // Sum revenue from invoices linked to their appointments, or fallback to sessionPrice
      let totalRevenue = 0;
      for (const apt of memberAppointments) {
        if (appointmentRevenueMap[apt.id]) {
          totalRevenue += appointmentRevenueMap[apt.id];
        } else if (apt.sessionPrice) {
          totalRevenue += apt.sessionPrice;
        }
      }

      // Find applicable rule
      const rule = findRule(member.id, member.role);

      if (!rule) {
        // No rule — skip or create zero payout
        continue;
      }

      // Apply minRevenue filter
      if (rule.minRevenue && totalRevenue < rule.minRevenue) {
        continue;
      }

      // Calculate commission
      let commissionAmount = 0;
      if (rule.type === "percentage") {
        commissionAmount = totalRevenue * (rule.value / 100);
      } else {
        // fixed per appointment
        commissionAmount = appointmentCount * rule.value;
      }

      // Apply maxCommission cap
      if (rule.maxCommission && commissionAmount > rule.maxCommission) {
        commissionAmount = rule.maxCommission;
      }

      commissionAmount = Math.round(commissionAmount * 100) / 100;

      // Check for existing payout for this user+period
      const existing = await db.commissionPayout.findFirst({
        where: { userId: member.id, period },
      });

      if (existing) {
        // Update existing payout (preserve adjustments)
        const finalAmount = Math.round((commissionAmount + existing.adjustments) * 100) / 100;
        await db.commissionPayout.update({
          where: { id: existing.id },
          data: {
            appointments: appointmentCount,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            commissionRate: rule.value,
            commissionType: rule.type,
            commissionAmount,
            finalAmount,
            status: existing.status === "paid" ? "paid" : "pending", // don't reset paid
          },
        });
        payouts.push({
          userId: member.id,
          name: member.name,
          role: member.role,
          appointments: appointmentCount,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          commissionRate: rule.value,
          commissionType: rule.type,
          commissionAmount,
          adjustments: existing.adjustments,
          finalAmount,
          status: existing.status === "paid" ? "paid" : "pending",
          updated: true,
        });
      } else {
        // Create new payout
        const payout = await db.commissionPayout.create({
          data: {
            userId: member.id,
            period,
            appointments: appointmentCount,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            commissionRate: rule.value,
            commissionType: rule.type,
            commissionAmount,
            finalAmount: commissionAmount,
            status: "pending",
          },
        });
        payouts.push({
          ...payout,
          name: member.name,
          role: member.role,
          created: true,
        });
      }
    }

    await logAudit({
      action: "create",
      entity: "commissionCalculation",
      details: { period, staffCount: staff.length, payoutsGenerated: payouts.length },
    });

    return NextResponse.json({
      period,
      staffProcessed: staff.length,
      payouts,
    });
  } catch (e) {
    console.error("Commission calculate error:", e);
    return NextResponse.json({ error: "Failed to calculate commissions" }, { status: 500 });
  }
}
