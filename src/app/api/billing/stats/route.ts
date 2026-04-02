import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/billing/stats - Billing dashboard stats
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const now = new Date();

    // Today boundaries
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Current month boundaries
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Today's revenue (aggregate instead of full row fetch)
    const todayAgg = await db.invoice.aggregate({
      _sum: { paidAmount: true },
      where: {
        date: { gte: todayStart, lte: todayEnd },
        status: { not: "cancelled" },
      },
    });
    const todayRevenue = todayAgg._sum.paidAmount || 0;

    // Month revenue
    const monthAgg = await db.invoice.aggregate({
      _sum: { paidAmount: true },
      where: {
        date: { gte: monthStart, lte: monthEnd },
        status: { not: "cancelled" },
      },
    });
    const monthRevenue = monthAgg._sum.paidAmount || 0;

    // Pending amount
    const pendingAgg = await db.invoice.aggregate({
      _sum: { balanceAmount: true },
      where: {
        status: { in: ["pending", "partially_paid"] },
      },
    });
    const pendingAmount = pendingAgg._sum.balanceAmount || 0;

    // Counts
    const totalInvoices = await db.invoice.count();
    const paidCount = await db.invoice.count({ where: { status: "paid" } });
    const pendingCount = await db.invoice.count({
      where: { status: { in: ["pending", "partially_paid"] } },
    });
    const cancelledCount = await db.invoice.count({ where: { status: "cancelled" } });

    // Recent invoices
    const recentInvoices = await db.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        patientName: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        date: true,
        paymentMethod: true,
      },
      orderBy: { date: "desc" },
      take: 10,
    });

    // Payment method breakdown for current month
    const monthPayments = await db.payment.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
      },
      select: {
        method: true,
        amount: true,
      },
    });

    const methodMap = new Map<string, number>();
    for (const payment of monthPayments) {
      const current = methodMap.get(payment.method) || 0;
      methodMap.set(payment.method, Math.round((current + payment.amount) * 100) / 100);
    }

    const paymentMethodBreakdown = Array.from(methodMap.entries()).map(
      ([method, total]) => ({ method, total })
    );

    return NextResponse.json({
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      monthRevenue: Math.round(monthRevenue * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      totalInvoices,
      paidCount,
      pendingCount,
      cancelledCount,
      recentInvoices,
      paymentMethodBreakdown,
    });
  } catch (error) {
    console.error("Error fetching billing stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing stats" },
      { status: 500 }
    );
  }
}
