import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

export async function GET() {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // First day of current month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    // First day of last month
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    // Last day of last month (= first of current month)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);
    // 7 days ago
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // include today = 7 days
    // 6 months ago (first day of that month)
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

    // ISO date strings for raw queries
    const todayISO = today.toISOString();
    const tomorrowISO = tomorrow.toISOString();
    const monthStartISO = monthStart.toISOString();
    const lastMonthStartISO = lastMonthStart.toISOString();
    const lastMonthEndISO = lastMonthEnd.toISOString();
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();
    const sixMonthsAgoISO = sixMonthsAgo.toISOString();

    const [
      totalPatients,
      activePatients,
      totalAppointments,
      totalCommunications,
      totalDoctors,
      totalTherapists,
      todaysAppointments,
      upcomingAppointments,
      recentPatients,
      recentCommunications,
      todaysAppointmentsList,
      // New: Revenue stats
      todayRevenueResult,
      monthRevenueResult,
      lastMonthRevenueResult,
      // New: Weekly revenue (raw query)
      weeklyRevenueRaw,
      // New: Appointment status breakdown (today)
      appointmentStatusBreakdown,
      // New: Monthly appointment trend (raw query)
      monthlyAppointmentTrendRaw,
      // New: Top treatments this month
      topTreatmentsRaw,
      // New: Revenue by payment method this month
      revenueByPaymentMethodRaw,
      // New: Recent activity feed data
      recentActivityAppointments,
      recentActivityInvoices,
      // New: Upcoming appointments today (remaining)
      upcomingTodayAppointments,
    ] = await Promise.all([
      // ── Existing queries ──────────────────────────────────────────────
      db.patient.count(),
      db.patient.count({ where: { status: "active" } }),
      db.appointment.count(),
      db.communication.count(),
      db.user.count({ where: { status: "active", role: "doctor" } }),
      db.user.count({ where: { status: "active", role: "therapist" } }),
      db.appointment.count({
        where: {
          date: { gte: today, lt: tomorrow },
          status: { notIn: ["cancelled"] },
        },
      }),
      db.appointment.count({
        where: {
          date: { gte: today },
          status: { in: ["scheduled", "confirmed"] },
        },
      }),
      db.patient.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
      db.communication.findMany({
        take: 5,
        orderBy: { sentAt: "desc" },
        include: { patient: { select: { firstName: true, lastName: true } } },
      }),
      db.appointment.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
          status: { notIn: ["cancelled"] },
        },
        orderBy: { time: "asc" },
        take: 10,
        include: {
          patient: { select: { firstName: true, lastName: true, patientIdNumber: true } },
          doctorRef: { select: { name: true, specialization: true } },
        },
      }),

      // ── Revenue stats ─────────────────────────────────────────────────
      // Today's revenue
      db.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          date: { gte: today, lt: tomorrow },
          status: { notIn: ["cancelled", "draft"] },
        },
      }),
      // This month's revenue
      db.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          date: { gte: monthStart, lt: tomorrow },
          status: { notIn: ["cancelled", "draft"] },
        },
      }),
      // Last month's revenue
      db.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          date: { gte: lastMonthStart, lt: lastMonthEnd },
          status: { notIn: ["cancelled", "draft"] },
        },
      }),

      // ── Weekly revenue (last 7 days) ──────────────────────────────────
      prisma.$queryRawUnsafe<{ date: string; revenue: number }[]>(
        `SELECT strftime('%Y-%m-%d', date) as date, COALESCE(SUM(totalAmount), 0) as revenue
         FROM Invoice
         WHERE date >= ? AND date < ?
           AND status NOT IN ('cancelled', 'draft')
         GROUP BY strftime('%Y-%m-%d', date)
         ORDER BY date ASC`,
        sevenDaysAgoISO,
        tomorrowISO
      ),

      // ── Appointment status breakdown (today) ──────────────────────────
      prisma.$queryRawUnsafe<{ status: string; count: number }[]>(
        `SELECT status, COUNT(*) as count
         FROM Appointment
         WHERE date >= ? AND date < ?
         GROUP BY status`,
        todayISO,
        tomorrowISO
      ),

      // ── Monthly appointment trend (last 6 months) ─────────────────────
      prisma.$queryRawUnsafe<{ month: string; count: number }[]>(
        `SELECT strftime('%Y-%m', date) as month, COUNT(*) as count
         FROM Appointment
         WHERE date >= ?
         GROUP BY strftime('%Y-%m', date)
         ORDER BY month ASC`,
        sixMonthsAgoISO
      ),

      // ── Top treatments this month ─────────────────────────────────────
      prisma.$queryRawUnsafe<{ name: string; count: number }[]>(
        `SELECT treatmentName as name, COUNT(*) as count
         FROM Appointment
         WHERE date >= ? AND date < ?
           AND treatmentName IS NOT NULL AND treatmentName != ''
         GROUP BY treatmentName
         ORDER BY count DESC
         LIMIT 10`,
        monthStartISO,
        tomorrowISO
      ),

      // ── Revenue by payment method this month ──────────────────────────
      prisma.$queryRawUnsafe<{ paymentMethod: string; revenue: number }[]>(
        `SELECT p.method as paymentMethod, COALESCE(SUM(p.amount), 0) as revenue
         FROM Payment p
         JOIN Invoice i ON p.invoiceId = i.id
         WHERE i.date >= ? AND i.date < ?
           AND i.status NOT IN ('cancelled', 'draft')
         GROUP BY p.method
         ORDER BY revenue DESC`,
        monthStartISO,
        tomorrowISO
      ),

      // ── Recent appointments (for activity feed) ─────────────────────
      db.appointment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          doctorRef: { select: { name: true, specialization: true } },
        },
      }),

      // ── Recent invoices (for activity feed) ─────────────────────────
      db.invoice.findMany({
        take: 5,
        orderBy: { date: "desc" },
        where: { status: { notIn: ["draft"] } },
        select: {
          id: true,
          invoiceNumber: true,
          patientName: true,
          totalAmount: true,
          status: true,
          date: true,
          paymentMethod: true,
          patientId: true,
        },
      }),

      // ── Upcoming appointments today (remaining, not completed/cancelled) ──
      db.appointment.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
          status: { in: ["scheduled", "confirmed", "in-progress"] },
        },
        orderBy: { time: "asc" },
        take: 10,
        include: {
          patient: { select: { firstName: true, lastName: true } },
          doctorRef: { select: { name: true, specialization: true } },
        },
      }),
    ]);

    // Extract scalar revenue values
    const todayRevenue = todayRevenueResult._sum.totalAmount ?? 0;
    const monthRevenue = monthRevenueResult._sum.totalAmount ?? 0;
    const lastMonthRevenue = lastMonthRevenueResult._sum.totalAmount ?? 0;

    // Fill in missing days for weekly revenue (ensure all 7 days are present)
    const weeklyRevenueMap = new Map<string, number>();
    for (const row of weeklyRevenueRaw) {
      weeklyRevenueMap.set(row.date, Number(row.revenue));
    }
    const weeklyRevenue: { date: string; revenue: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      weeklyRevenue.push({ date: key, revenue: weeklyRevenueMap.get(key) ?? 0 });
    }

    // Normalize appointment status breakdown to ensure all statuses are present
    const allStatuses = ["scheduled", "confirmed", "in-progress", "completed", "cancelled", "no-show"];
    const statusMap = new Map<string, number>();
    for (const row of appointmentStatusBreakdown) {
      statusMap.set(row.status, Number(row.count));
    }
    const appointmentStatusCounts: Record<string, number> = {};
    for (const s of allStatuses) {
      appointmentStatusCounts[s] = statusMap.get(s) ?? 0;
    }

    // Normalize raw query results (BigInt -> number for JSON serialization)
    const monthlyAppointmentTrend = monthlyAppointmentTrendRaw.map((r) => ({
      month: r.month,
      count: Number(r.count),
    }));

    const topTreatments = topTreatmentsRaw.map((r) => ({
      name: r.name,
      count: Number(r.count),
    }));

    const revenueByPaymentMethod = revenueByPaymentMethodRaw.map((r) => ({
      paymentMethod: r.paymentMethod,
      revenue: Number(r.revenue),
    }));

    return NextResponse.json({
      totalPatients,
      activePatients,
      totalAppointments,
      totalCommunications,
      totalDoctors,
      totalTherapists,
      todaysAppointments,
      upcomingAppointments,
      recentPatients,
      recentCommunications,
      todaysAppointmentsList,
      // Revenue
      todayRevenue,
      monthRevenue,
      lastMonthRevenue,
      // Analytics
      weeklyRevenue,
      appointmentStatusCounts,
      monthlyAppointmentTrend,
      topTreatments,
      revenueByPaymentMethod,
      // Activity feed & upcoming today
      recentActivityAppointments,
      recentActivityInvoices,
      upcomingTodayAppointments,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
