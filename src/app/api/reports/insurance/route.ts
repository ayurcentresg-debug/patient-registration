import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/reports/insurance?period=month&from=2026-03-01&to=2026-03-31
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");

    const now = new Date();
    let fromDate: Date;
    let toDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (period) {
      case "week": {
        const day = now.getDay();
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1));
        break;
      }
      case "month":
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter": {
        const q = Math.floor(now.getMonth() / 3) * 3;
        fromDate = new Date(now.getFullYear(), q, 1);
        break;
      }
      case "year":
        fromDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "custom":
        fromDate = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
        toDate = customTo ? new Date(new Date(customTo).setHours(23, 59, 59, 999)) : toDate;
        break;
      default:
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [
      periodClaims,
      allProviders,
      recentClaims,
    ] = await Promise.all([
      // Claims in the selected period
      prisma.insuranceClaim.findMany({
        where: { submittedDate: { gte: fromDate, lte: toDate } },
        select: {
          id: true,
          claimNumber: true,
          patientName: true,
          claimAmount: true,
          approvedAmount: true,
          settledAmount: true,
          status: true,
          submittedDate: true,
          settledDate: true,
          rejectionReason: true,
          notes: true,
          providerId: true,
          provider: { select: { id: true, name: true, panelType: true } },
          invoice: { select: { id: true } },
        },
      }),
      // All providers
      prisma.insuranceProvider.findMany({
        where: { isActive: true },
        select: { id: true, name: true, panelType: true },
      }),
      // Recent claims (last 20)
      prisma.insuranceClaim.findMany({
        take: 20,
        orderBy: { submittedDate: "desc" },
        select: {
          id: true,
          claimNumber: true,
          patientName: true,
          claimAmount: true,
          status: true,
          submittedDate: true,
          provider: { select: { name: true } },
        },
      }),
    ]);

    // Claims trend - last 6 months using raw SQL
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const claimsTrend = await prisma.$queryRawUnsafe<
      Array<{ month: string; submitted: number; approved: number; settled: number; rejected: number }>
    >(
      `SELECT
        strftime('%Y-%m', submittedDate) as month,
        COUNT(*) as submitted,
        SUM(CASE WHEN status IN ('approved', 'partially_approved', 'settled') THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'settled' THEN 1 ELSE 0 END) as settled,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM InsuranceClaim
      WHERE submittedDate >= ?
      GROUP BY strftime('%Y-%m', submittedDate)
      ORDER BY month ASC`,
      sixMonthsAgo.toISOString()
    );

    // Ensure trend numbers are actual numbers (SQLite returns BigInt)
    const formattedTrend = claimsTrend.map((row) => ({
      month: row.month,
      submitted: Number(row.submitted),
      approved: Number(row.approved),
      settled: Number(row.settled),
      rejected: Number(row.rejected),
    }));

    // ═══ SUMMARY ═══
    const totalClaims = periodClaims.length;
    const totalClaimAmount = Math.round(periodClaims.reduce((s, c) => s + c.claimAmount, 0) * 100) / 100;
    const approvedAmount = Math.round(periodClaims.reduce((s, c) => s + (c.approvedAmount || 0), 0) * 100) / 100;
    const settledAmount = Math.round(periodClaims.reduce((s, c) => s + (c.settledAmount || 0), 0) * 100) / 100;

    const pendingClaims = periodClaims.filter((c) => ["submitted", "under_review"].includes(c.status));
    const pendingAmount = Math.round(pendingClaims.reduce((s, c) => s + c.claimAmount, 0) * 100) / 100;

    const rejectedClaims = periodClaims.filter((c) => c.status === "rejected");
    const rejectedAmount = Math.round(rejectedClaims.reduce((s, c) => s + c.claimAmount, 0) * 100) / 100;

    // Average settlement days
    const settledClaimsWithDates = periodClaims.filter((c) => c.status === "settled" && c.settledDate && c.submittedDate);
    const avgSettlementDays = settledClaimsWithDates.length > 0
      ? Math.round(
          settledClaimsWithDates.reduce((s, c) => {
            const days = (new Date(c.settledDate!).getTime() - new Date(c.submittedDate).getTime()) / 86400000;
            return s + days;
          }, 0) / settledClaimsWithDates.length * 100
        ) / 100
      : 0;

    // Approval rate
    const decidedClaims = periodClaims.filter((c) => ["approved", "partially_approved", "settled", "rejected"].includes(c.status));
    const approvedClaims = decidedClaims.filter((c) => ["approved", "partially_approved", "settled"].includes(c.status));
    const approvalRate = decidedClaims.length > 0
      ? Math.round((approvedClaims.length / decidedClaims.length) * 10000) / 100
      : 0;

    // ═══ CLAIMS BY STATUS ═══
    const statusMap = new Map<string, { count: number; totalAmount: number }>();
    for (const claim of periodClaims) {
      const entry = statusMap.get(claim.status) || { count: 0, totalAmount: 0 };
      entry.count++;
      entry.totalAmount += claim.claimAmount;
      statusMap.set(claim.status, entry);
    }
    const claimsByStatus = Array.from(statusMap.entries())
      .map(([status, data]) => ({
        status,
        count: data.count,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);

    // ═══ PROVIDER PERFORMANCE ═══
    const providerMap = new Map<string, {
      name: string;
      panelType: string;
      totalClaims: number;
      approvedClaims: number;
      settledAmount: number;
      settlementDaysTotal: number;
      settledCount: number;
    }>();
    for (const provider of allProviders) {
      providerMap.set(provider.id, {
        name: provider.name,
        panelType: provider.panelType,
        totalClaims: 0,
        approvedClaims: 0,
        settledAmount: 0,
        settlementDaysTotal: 0,
        settledCount: 0,
      });
    }
    for (const claim of periodClaims) {
      let entry = providerMap.get(claim.providerId);
      if (!entry) {
        entry = {
          name: claim.provider.name,
          panelType: claim.provider.panelType,
          totalClaims: 0,
          approvedClaims: 0,
          settledAmount: 0,
          settlementDaysTotal: 0,
          settledCount: 0,
        };
        providerMap.set(claim.providerId, entry);
      }
      entry.totalClaims++;
      if (["approved", "partially_approved", "settled"].includes(claim.status)) {
        entry.approvedClaims++;
      }
      if (claim.status === "settled") {
        entry.settledAmount += claim.settledAmount || 0;
        if (claim.settledDate && claim.submittedDate) {
          entry.settlementDaysTotal += (new Date(claim.settledDate).getTime() - new Date(claim.submittedDate).getTime()) / 86400000;
          entry.settledCount++;
        }
      }
    }
    const providerPerformance = Array.from(providerMap.entries())
      .filter(([, data]) => data.totalClaims > 0)
      .map(([id, data]) => ({
        id,
        name: data.name,
        panelType: data.panelType,
        totalClaims: data.totalClaims,
        approvedClaims: data.approvedClaims,
        settledAmount: Math.round(data.settledAmount * 100) / 100,
        avgSettlementDays: data.settledCount > 0 ? Math.round((data.settlementDaysTotal / data.settledCount) * 100) / 100 : 0,
        approvalRate: data.totalClaims > 0 ? Math.round((data.approvedClaims / data.totalClaims) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.totalClaims - a.totalClaims);

    // ═══ TOP CLAIM REASONS ═══
    // Use notes field as reason since there's no dedicated diagnosis field on InsuranceClaim
    const reasonMap = new Map<string, { count: number; totalAmount: number }>();
    for (const claim of periodClaims) {
      const reason = claim.notes || "Unspecified";
      const entry = reasonMap.get(reason) || { count: 0, totalAmount: 0 };
      entry.count++;
      entry.totalAmount += claim.claimAmount;
      reasonMap.set(reason, entry);
    }
    const topClaimReasons = Array.from(reasonMap.entries())
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count);

    // ═══ RECENT CLAIMS ═══
    const formattedRecentClaims = recentClaims.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      patientName: c.patientName,
      providerName: c.provider.name,
      amount: c.claimAmount,
      status: c.status,
      submittedDate: new Date(c.submittedDate).toISOString(),
    }));

    return NextResponse.json({
      summary: {
        totalClaims,
        totalClaimAmount,
        approvedAmount,
        settledAmount,
        pendingAmount,
        rejectedAmount,
        avgSettlementDays,
        approvalRate,
      },
      claimsByStatus,
      claimsTrend: formattedTrend,
      providerPerformance,
      topClaimReasons,
      recentClaims: formattedRecentClaims,
    });
  } catch (error) {
    console.error("Error fetching insurance reports:", error);
    return NextResponse.json({ error: "Failed to fetch insurance reports" }, { status: 500 });
  }
}
