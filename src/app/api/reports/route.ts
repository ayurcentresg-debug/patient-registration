import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/reports?period=month&from=2026-03-01&to=2026-03-31
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // week | month | quarter | year | custom
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

    // Previous period for comparison
    const periodMs = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - periodMs - 86400000);
    const prevTo = new Date(fromDate.getTime() - 1);

    const [
      // Revenue data
      currentInvoices,
      previousInvoices,
      currentPayments,
      previousPayments,
      // Appointments
      currentAppointments,
      previousAppointments,
      // Patients
      newPatients,
      prevNewPatients,
      totalPatients,
      // Outstanding
      outstandingInvoices,
      // Doctors
      allDoctors,
      // Treatments
      allTreatments,
      // All appointments with details for doctor performance
      detailedAppointments,
      // Invoice items for treatment breakdown
      invoiceItems,
    ] = await Promise.all([
      // Current period invoices
      prisma.invoice.findMany({
        where: { date: { gte: fromDate, lte: toDate }, status: { not: "cancelled" } },
        select: { id: true, totalAmount: true, paidAmount: true, balanceAmount: true, discountAmount: true, gstAmount: true, status: true, date: true, paymentMethod: true, patientName: true },
      }),
      // Previous period invoices
      prisma.invoice.findMany({
        where: { date: { gte: prevFrom, lte: prevTo }, status: { not: "cancelled" } },
        select: { totalAmount: true, paidAmount: true },
      }),
      // Current period payments
      prisma.payment.findMany({
        where: { date: { gte: fromDate, lte: toDate } },
        select: { amount: true, method: true, date: true },
      }),
      // Previous period payments
      prisma.payment.findMany({
        where: { date: { gte: prevFrom, lte: prevTo } },
        select: { amount: true },
      }),
      // Current appointments
      prisma.appointment.findMany({
        where: { date: { gte: fromDate, lte: toDate } },
        select: { id: true, status: true, type: true, date: true, doctorId: true, doctor: true, patientId: true, treatmentId: true, treatmentName: true, sessionPrice: true, isWalkin: true },
      }),
      // Previous appointments
      prisma.appointment.findMany({
        where: { date: { gte: prevFrom, lte: prevTo } },
        select: { id: true, status: true },
      }),
      // New patients this period
      prisma.patient.count({ where: { createdAt: { gte: fromDate, lte: toDate } } }),
      // New patients previous period
      prisma.patient.count({ where: { createdAt: { gte: prevFrom, lte: prevTo } } }),
      // Total patients
      prisma.patient.count(),
      // Outstanding invoices
      prisma.invoice.findMany({
        where: { status: { in: ["pending", "partially_paid"] } },
        select: { id: true, invoiceNumber: true, patientName: true, totalAmount: true, paidAmount: true, balanceAmount: true, date: true, dueDate: true, status: true },
        orderBy: { date: "asc" },
      }),
      // All doctors
      prisma.user.findMany({
        where: { status: "active", role: { in: ["doctor", "therapist"] } },
        select: { id: true, name: true, role: true, specialization: true, consultationFee: true },
      }),
      // All treatments
      prisma.treatment.findMany({
        where: { isActive: true },
        select: { id: true, name: true, category: true, basePrice: true },
      }),
      // Detailed appointments for doctor performance
      prisma.appointment.findMany({
        where: { date: { gte: fromDate, lte: toDate } },
        select: { doctorId: true, doctor: true, status: true, sessionPrice: true, type: true, treatmentName: true, patientId: true, isWalkin: true },
      }),
      // Invoice items for treatment revenue
      prisma.invoiceItem.findMany({
        where: { invoice: { date: { gte: fromDate, lte: toDate }, status: { not: "cancelled" } } },
        select: { type: true, description: true, amount: true, quantity: true },
      }),
    ]);

    // Raw SQL queries for peak hours and hourly distribution
    const [peakHoursRaw, hourlyDistributionRaw] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ hour: number; dayOfWeek: number; count: number }>>(
        `SELECT
          CAST(strftime('%H', date) AS INTEGER) as hour,
          CAST(strftime('%w', date) AS INTEGER) as dayOfWeek,
          COUNT(*) as count
        FROM Appointment
        WHERE date >= ? AND date <= ?
        GROUP BY strftime('%H', date), strftime('%w', date)
        ORDER BY count DESC`,
        fromDate.toISOString(),
        toDate.toISOString()
      ),
      prisma.$queryRawUnsafe<Array<{ hour: number; count: number }>>(
        `SELECT
          CAST(strftime('%H', date) AS INTEGER) as hour,
          COUNT(*) as count
        FROM Appointment
        WHERE date >= ? AND date <= ?
        GROUP BY strftime('%H', date)
        ORDER BY hour ASC`,
        fromDate.toISOString(),
        toDate.toISOString()
      ),
    ]);

    const peakHours = peakHoursRaw.map((r) => ({
      hour: Number(r.hour),
      dayOfWeek: Number(r.dayOfWeek),
      count: Number(r.count),
    }));

    const hourlyDistribution = hourlyDistributionRaw.map((r) => ({
      hour: Number(r.hour),
      count: Number(r.count),
    }));

    // ═══ 1. REVENUE OVERVIEW ═══
    const totalRevenue = currentPayments.reduce((s, p) => s + p.amount, 0);
    const prevRevenue = previousPayments.reduce((s, p) => s + p.amount, 0);
    const totalBilled = currentInvoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalDiscount = currentInvoices.reduce((s, i) => s + i.discountAmount, 0);
    const totalGst = currentInvoices.reduce((s, i) => s + i.gstAmount, 0);
    const totalOutstanding = outstandingInvoices.reduce((s, i) => s + i.balanceAmount, 0);

    // Daily revenue trend
    const dailyRevenue: Record<string, number> = {};
    for (const p of currentPayments) {
      const day = new Date(p.date).toISOString().split("T")[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + p.amount;
    }
    const revenueTrend = Object.entries(dailyRevenue)
      .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Payment method breakdown
    const methodMap = new Map<string, number>();
    for (const p of currentPayments) {
      methodMap.set(p.method, (methodMap.get(p.method) || 0) + p.amount);
    }
    const paymentMethods = Array.from(methodMap.entries())
      .map(([method, total]) => ({ method, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    // ═══ 2. DOCTOR PERFORMANCE ═══
    const doctorPerf = new Map<string, { name: string; role: string; spec: string; total: number; completed: number; cancelled: number; noShow: number; revenue: number; patients: Set<string> }>();
    for (const doc of allDoctors) {
      doctorPerf.set(doc.id, { name: doc.name, role: doc.role, spec: doc.specialization || "", total: 0, completed: 0, cancelled: 0, noShow: 0, revenue: 0, patients: new Set() });
    }
    for (const apt of detailedAppointments) {
      if (!apt.doctorId) continue;
      let entry = doctorPerf.get(apt.doctorId);
      if (!entry) { entry = { name: apt.doctor, role: "unknown", spec: "", total: 0, completed: 0, cancelled: 0, noShow: 0, revenue: 0, patients: new Set() }; doctorPerf.set(apt.doctorId, entry); }
      entry.total++;
      if (apt.status === "completed") { entry.completed++; entry.revenue += apt.sessionPrice || 0; }
      if (apt.status === "cancelled") entry.cancelled++;
      if (apt.status === "no-show") entry.noShow++;
      if (apt.patientId) entry.patients.add(apt.patientId);
    }
    const doctorPerformance = Array.from(doctorPerf.entries())
      .map(([id, d]) => ({ id, name: d.name, role: d.role, specialization: d.spec, totalAppointments: d.total, completed: d.completed, cancelled: d.cancelled, noShow: d.noShow, revenue: Math.round(d.revenue * 100) / 100, uniquePatients: d.patients.size }))
      .filter(d => d.totalAppointments > 0)
      .sort((a, b) => b.revenue - a.revenue);

    // ═══ 3. PATIENT STATISTICS ═══
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const patientGrowth = prevNewPatients > 0 ? ((newPatients - prevNewPatients) / prevNewPatients) * 100 : 0;

    // ═══ 4. TREATMENT POPULARITY ═══
    const treatmentMap = new Map<string, { name: string; category: string; count: number; revenue: number }>();
    for (const apt of currentAppointments) {
      if (!apt.treatmentName) continue;
      const key = apt.treatmentName;
      const entry = treatmentMap.get(key) || { name: key, category: "", count: 0, revenue: 0 };
      entry.count++;
      if (apt.status === "completed") entry.revenue += apt.sessionPrice || 0;
      treatmentMap.set(key, entry);
    }
    // Augment from treatments table
    for (const t of allTreatments) {
      if (treatmentMap.has(t.name)) {
        treatmentMap.get(t.name)!.category = t.category;
      }
    }
    const treatmentPopularity = Array.from(treatmentMap.values())
      .sort((a, b) => b.count - a.count);

    // Invoice item type breakdown (consultation, therapy, medicine, etc.)
    const itemTypeMap = new Map<string, { count: number; revenue: number }>();
    for (const item of invoiceItems) {
      const entry = itemTypeMap.get(item.type) || { count: 0, revenue: 0 };
      entry.count += item.quantity;
      entry.revenue += item.amount;
      itemTypeMap.set(item.type, entry);
    }
    const revenueByCategory = Array.from(itemTypeMap.entries())
      .map(([type, d]) => ({ type, count: d.count, revenue: Math.round(d.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue);

    // ═══ 5. OUTSTANDING / AGING ═══
    const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    const agingInvoices: Array<{ id: string; invoiceNumber: string; patientName: string; totalAmount: number; balanceAmount: number; date: string; daysOverdue: number; bucket: string }> = [];
    for (const inv of outstandingInvoices) {
      const daysDiff = Math.floor((now.getTime() - new Date(inv.date).getTime()) / 86400000);
      let bucket = "current";
      if (daysDiff <= 30) { aging.current += inv.balanceAmount; bucket = "0-30 days"; }
      else if (daysDiff <= 60) { aging.days30 += inv.balanceAmount; bucket = "31-60 days"; }
      else if (daysDiff <= 90) { aging.days60 += inv.balanceAmount; bucket = "61-90 days"; }
      else { aging.over90 += inv.balanceAmount; bucket = "90+ days"; }
      agingInvoices.push({ id: inv.id, invoiceNumber: inv.invoiceNumber, patientName: inv.patientName, totalAmount: inv.totalAmount, balanceAmount: inv.balanceAmount, date: new Date(inv.date).toISOString(), daysOverdue: daysDiff, bucket });
    }

    // ═══ 6. APPOINTMENT ANALYTICS ═══
    const totalAppts = currentAppointments.length;
    const prevTotalAppts = previousAppointments.length;
    const completedAppts = currentAppointments.filter(a => a.status === "completed").length;
    const cancelledAppts = currentAppointments.filter(a => a.status === "cancelled").length;
    const noShowAppts = currentAppointments.filter(a => a.status === "no-show").length;
    const walkinAppts = currentAppointments.filter(a => a.isWalkin).length;

    const apptsByType = new Map<string, number>();
    const apptsByStatus = new Map<string, number>();
    const dailyAppts: Record<string, number> = {};
    for (const a of currentAppointments) {
      apptsByType.set(a.type, (apptsByType.get(a.type) || 0) + 1);
      apptsByStatus.set(a.status, (apptsByStatus.get(a.status) || 0) + 1);
      const day = new Date(a.date).toISOString().split("T")[0];
      dailyAppts[day] = (dailyAppts[day] || 0) + 1;
    }
    const appointmentTrend = Object.entries(dailyAppts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      period: { from: fromDate.toISOString(), to: toDate.toISOString(), label: period },
      revenue: {
        total: Math.round(totalRevenue * 100) / 100,
        previousTotal: Math.round(prevRevenue * 100) / 100,
        change: Math.round(revenueChange * 10) / 10,
        billed: Math.round(totalBilled * 100) / 100,
        discount: Math.round(totalDiscount * 100) / 100,
        gst: Math.round(totalGst * 100) / 100,
        outstanding: Math.round(totalOutstanding * 100) / 100,
        invoiceCount: currentInvoices.length,
        trend: revenueTrend,
        paymentMethods,
        byCategory: revenueByCategory,
      },
      doctors: doctorPerformance,
      patients: {
        total: totalPatients,
        new: newPatients,
        previousNew: prevNewPatients,
        growth: Math.round(patientGrowth * 10) / 10,
      },
      treatments: treatmentPopularity,
      aging: {
        summary: {
          current: Math.round(aging.current * 100) / 100,
          days30: Math.round(aging.days30 * 100) / 100,
          days60: Math.round(aging.days60 * 100) / 100,
          over90: Math.round(aging.over90 * 100) / 100,
          total: Math.round(totalOutstanding * 100) / 100,
        },
        invoices: agingInvoices,
      },
      appointments: {
        total: totalAppts,
        previousTotal: prevTotalAppts,
        completed: completedAppts,
        cancelled: cancelledAppts,
        noShow: noShowAppts,
        walkins: walkinAppts,
        completionRate: totalAppts > 0 ? Math.round((completedAppts / totalAppts) * 1000) / 10 : 0,
        noShowRate: totalAppts > 0 ? Math.round((noShowAppts / totalAppts) * 1000) / 10 : 0,
        byType: Array.from(apptsByType.entries()).map(([type, count]) => ({ type, count })),
        byStatus: Array.from(apptsByStatus.entries()).map(([status, count]) => ({ status, count })),
        trend: appointmentTrend,
      },
      peakHours,
      hourlyDistribution,
      gstSummary: {
        totalTaxable: Math.round(currentInvoices.reduce((s, i) => s + (i.totalAmount - (i.gstAmount || 0)), 0) * 100) / 100,
        totalCgst: Math.round(totalGst / 2 * 100) / 100,
        totalSgst: Math.round(totalGst / 2 * 100) / 100,
        totalIgst: 0,
        totalGst: Math.round(totalGst * 100) / 100,
      },
      collectionEfficiency: totalBilled > 0 ? Math.round((totalRevenue / totalBilled) * 10000) / 100 : 0,
      averageInvoiceValue: currentInvoices.length > 0 ? Math.round((totalBilled / currentInvoices.length) * 100) / 100 : 0,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
