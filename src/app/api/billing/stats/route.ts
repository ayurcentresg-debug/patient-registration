import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/billing/stats - Billing dashboard stats
export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    // Today boundaries
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Current month boundaries
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Today's revenue
    const todayInvoices = await prisma.invoice.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        status: { not: "cancelled" },
      },
      select: { paidAmount: true },
    });
    const todayRevenue = todayInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

    // Month revenue
    const monthInvoices = await prisma.invoice.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        status: { not: "cancelled" },
      },
      select: { paidAmount: true },
    });
    const monthRevenue = monthInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

    // Pending amount
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["pending", "partially_paid"] },
      },
      select: { balanceAmount: true },
    });
    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

    // Counts
    const totalInvoices = await prisma.invoice.count();
    const paidCount = await prisma.invoice.count({ where: { status: "paid" } });
    const pendingCount = await prisma.invoice.count({
      where: { status: { in: ["pending", "partially_paid"] } },
    });
    const cancelledCount = await prisma.invoice.count({ where: { status: "cancelled" } });

    // Recent invoices
    const recentInvoices = await prisma.invoice.findMany({
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
    const monthPayments = await prisma.payment.findMany({
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
