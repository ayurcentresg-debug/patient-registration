import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/staff/performance — all clinical staff performance metrics
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = request.nextUrl;
    const period = searchParams.get("period") || "month";
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");

    // Calculate date range
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (period === "custom" && customFrom && customTo) {
      fromDate = new Date(customFrom);
      toDate = new Date(customTo);
      toDate.setHours(23, 59, 59, 999);
    } else if (period === "quarter") {
      const quarter = Math.floor(now.getMonth() / 3);
      fromDate = new Date(now.getFullYear(), quarter * 3, 1);
    } else if (period === "year") {
      fromDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // month
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Previous period for comparison
    const periodMs = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - periodMs);
    const prevTo = new Date(fromDate.getTime() - 1);

    // Fetch all clinical staff
    const staff = await db.user.findMany({
      where: { role: { in: ["doctor", "therapist"] }, status: "active" },
      select: { id: true, name: true, role: true, staffIdNumber: true, specialization: true, department: true },
    });

    // Fetch all appointments in the date range
    const appointments = await db.appointment.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        doctorId: { not: null },
      },
      select: {
        id: true,
        doctorId: true,
        patientId: true,
        status: true,
        date: true,
        sessionPrice: true,
      },
    });

    // Fetch previous period appointments for trend comparison
    const prevAppointments = await db.appointment.findMany({
      where: {
        date: { gte: prevFrom, lte: prevTo },
        doctorId: { not: null },
      },
      select: {
        id: true,
        doctorId: true,
        patientId: true,
        status: true,
        sessionPrice: true,
      },
    });

    // Fetch invoices linked to appointments in the date range
    const invoices = await db.invoice.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        status: { not: "cancelled" },
        appointmentId: { not: null },
      },
      select: {
        id: true,
        appointmentId: true,
        totalAmount: true,
        paidAmount: true,
      },
    });

    // Build appointmentId -> invoice mapping
    const invoiceByAppt: Record<string, { totalAmount: number; paidAmount: number }> = {};
    for (const inv of invoices) {
      if (inv.appointmentId) {
        invoiceByAppt[inv.appointmentId] = { totalAmount: inv.totalAmount, paidAmount: inv.paidAmount };
      }
    }

    // Previous period invoices
    const prevInvoices = await db.invoice.findMany({
      where: {
        date: { gte: prevFrom, lte: prevTo },
        status: { not: "cancelled" },
        appointmentId: { not: null },
      },
      select: { appointmentId: true, totalAmount: true },
    });
    const prevInvoiceByAppt: Record<string, number> = {};
    for (const inv of prevInvoices) {
      if (inv.appointmentId) {
        prevInvoiceByAppt[inv.appointmentId] = inv.totalAmount;
      }
    }

    // Calculate working days in the period (Mon-Sat)
    const workingDays = countWorkingDays(fromDate, toDate);

    // Build per-staff metrics
    const staffMetrics = staff.map((s) => {
      const myAppts = appointments.filter((a) => a.doctorId === s.id);
      const total = myAppts.length;
      const completed = myAppts.filter((a) => a.status === "completed" || a.status === "checked-out").length;
      const noShows = myAppts.filter((a) => a.status === "no-show").length;
      const cancelled = myAppts.filter((a) => a.status === "cancelled").length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const uniquePatients = new Set(myAppts.filter((a) => a.patientId).map((a) => a.patientId)).size;

      // Revenue: from invoices linked to this doctor's appointments, or fallback to sessionPrice
      let totalRevenue = 0;
      for (const appt of myAppts) {
        if (invoiceByAppt[appt.id]) {
          totalRevenue += invoiceByAppt[appt.id].totalAmount;
        } else if (appt.sessionPrice) {
          totalRevenue += appt.sessionPrice;
        }
      }

      const avgRevenuePerAppt = completed > 0 ? Math.round(totalRevenue / completed) : 0;
      const avgApptsPerDay = workingDays > 0 ? Math.round((total / workingDays) * 10) / 10 : 0;

      // Previous period for trend
      const prevMyAppts = prevAppointments.filter((a) => a.doctorId === s.id);
      const prevTotal = prevMyAppts.length;
      const prevCompleted = prevMyAppts.filter((a) => a.status === "completed" || a.status === "checked-out").length;
      const prevCompletionRate = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0;

      let prevRevenue = 0;
      for (const appt of prevMyAppts) {
        if (prevInvoiceByAppt[appt.id]) {
          prevRevenue += prevInvoiceByAppt[appt.id];
        } else if (appt.sessionPrice) {
          prevRevenue += appt.sessionPrice;
        }
      }

      return {
        id: s.id,
        name: s.name,
        role: s.role,
        staffIdNumber: s.staffIdNumber,
        specialization: s.specialization,
        department: s.department,
        total,
        completed,
        noShows,
        cancelled,
        completionRate,
        uniquePatients,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgRevenuePerAppt,
        avgApptsPerDay,
        trends: {
          appointments: total - prevTotal,
          revenue: Math.round((totalRevenue - prevRevenue) * 100) / 100,
          completionRate: completionRate - prevCompletionRate,
        },
      };
    });

    // Clinic-wide totals
    const clinicTotals = {
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter((a) => a.status === "completed" || a.status === "checked-out").length,
      noShows: appointments.filter((a) => a.status === "no-show").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
      completionRate: appointments.length > 0
        ? Math.round((appointments.filter((a) => a.status === "completed" || a.status === "checked-out").length / appointments.length) * 100)
        : 0,
      uniquePatients: new Set(appointments.filter((a) => a.patientId).map((a) => a.patientId)).size,
      totalRevenue: Math.round(staffMetrics.reduce((sum, s) => sum + s.totalRevenue, 0) * 100) / 100,
      // Previous period totals
      prevTotalAppointments: prevAppointments.length,
      prevRevenue: Math.round(
        prevAppointments.reduce((sum, a) => {
          if (prevInvoiceByAppt[a.id]) return sum + prevInvoiceByAppt[a.id];
          if (a.sessionPrice) return sum + a.sessionPrice;
          return sum;
        }, 0) * 100
      ) / 100,
    };

    return NextResponse.json({
      period,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      workingDays,
      staff: staffMetrics,
      clinicTotals,
    });
  } catch (error) {
    console.error("Staff performance API error:", error);
    return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 });
  }
}

function countWorkingDays(from: Date, to: Date): number {
  let count = 0;
  const d = new Date(from);
  while (d <= to) {
    const day = d.getDay();
    if (day >= 1 && day <= 6) count++; // Mon=1 to Sat=6
    d.setDate(d.getDate() + 1);
  }
  return count;
}
