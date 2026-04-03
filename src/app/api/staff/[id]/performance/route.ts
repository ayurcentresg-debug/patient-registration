import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/staff/[id]/performance — individual staff performance detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const { id } = await params;

    // Fetch the staff member
    const staffMember = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, staffIdNumber: true, specialization: true, department: true },
    });

    if (!staffMember) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

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
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Fetch appointments for this staff in the date range
    const appointments = await db.appointment.findMany({
      where: {
        doctorId: id,
        date: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        patientId: true,
        status: true,
        date: true,
        time: true,
        sessionPrice: true,
        type: true,
        treatmentName: true,
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { date: "desc" },
    });

    // Fetch invoices linked to this staff's appointments
    const appointmentIds = appointments.map((a) => a.id);
    const invoices = await db.invoice.findMany({
      where: {
        appointmentId: { in: appointmentIds },
        status: { not: "cancelled" },
      },
      select: {
        appointmentId: true,
        totalAmount: true,
      },
    });
    const invoiceByAppt: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.appointmentId) {
        invoiceByAppt[inv.appointmentId] = inv.totalAmount;
      }
    }

    // Core metrics
    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === "completed" || a.status === "checked-out").length;
    const noShows = appointments.filter((a) => a.status === "no-show").length;
    const cancelled = appointments.filter((a) => a.status === "cancelled").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const uniquePatients = new Set(appointments.filter((a) => a.patientId).map((a) => a.patientId)).size;

    let totalRevenue = 0;
    for (const appt of appointments) {
      if (invoiceByAppt[appt.id]) {
        totalRevenue += invoiceByAppt[appt.id];
      } else if (appt.sessionPrice) {
        totalRevenue += appt.sessionPrice;
      }
    }
    const avgRevenuePerAppt = completed > 0 ? Math.round(totalRevenue / completed) : 0;

    // Monthly breakdown (last 6 months)
    const monthlyBreakdown = [];
    for (let i = 5; i >= 0; i--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthAppts = await db.appointment.findMany({
        where: {
          doctorId: id,
          date: { gte: mDate, lte: mEnd },
        },
        select: { id: true, status: true, sessionPrice: true },
      });

      const mInvoices = await db.invoice.findMany({
        where: {
          appointmentId: { in: monthAppts.map((a) => a.id) },
          status: { not: "cancelled" },
        },
        select: { appointmentId: true, totalAmount: true },
      });
      const mInvMap: Record<string, number> = {};
      for (const inv of mInvoices) {
        if (inv.appointmentId) mInvMap[inv.appointmentId] = inv.totalAmount;
      }

      const mTotal = monthAppts.length;
      const mCompleted = monthAppts.filter((a) => a.status === "completed" || a.status === "checked-out").length;
      let mRevenue = 0;
      for (const a of monthAppts) {
        if (mInvMap[a.id]) mRevenue += mInvMap[a.id];
        else if (a.sessionPrice) mRevenue += a.sessionPrice;
      }

      monthlyBreakdown.push({
        month: mDate.toLocaleString("default", { month: "short", year: "numeric" }),
        year: mDate.getFullYear(),
        monthIndex: mDate.getMonth(),
        total: mTotal,
        completed: mCompleted,
        completionRate: mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0,
        revenue: Math.round(mRevenue * 100) / 100,
      });
    }

    // Top 5 most frequent patients
    const patientCounts: Record<string, { count: number; name: string; id: string }> = {};
    for (const a of appointments) {
      if (a.patientId && a.patient) {
        if (!patientCounts[a.patientId]) {
          patientCounts[a.patientId] = {
            count: 0,
            name: `${a.patient.firstName} ${a.patient.lastName}`,
            id: a.patientId,
          };
        }
        patientCounts[a.patientId].count++;
      }
    }
    const topPatients = Object.values(patientCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Appointment distribution by day of week (0=Sun, 1=Mon, ..., 6=Sat)
    const dayDistribution: Record<string, number> = {
      Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0,
    };
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (const a of appointments) {
      const d = new Date(a.date);
      dayDistribution[dayNames[d.getDay()]]++;
    }

    // Peak hours breakdown
    const hourCounts: Record<string, number> = {};
    for (const a of appointments) {
      if (a.time) {
        const hour = a.time.split(":")[0] + ":00";
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    }
    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([hour, count]) => ({ hour, count }));

    // Recent 10 appointments
    const recentAppointments = appointments.slice(0, 10).map((a) => ({
      id: a.id,
      date: a.date,
      time: a.time,
      status: a.status,
      type: a.type,
      treatmentName: a.treatmentName,
      patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "Walk-in",
      revenue: invoiceByAppt[a.id] || a.sessionPrice || 0,
    }));

    return NextResponse.json({
      staff: staffMember,
      period,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      metrics: {
        total,
        completed,
        noShows,
        cancelled,
        completionRate,
        uniquePatients,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgRevenuePerAppt,
      },
      monthlyBreakdown,
      topPatients,
      dayDistribution,
      peakHours,
      recentAppointments,
    });
  } catch (error) {
    console.error("Individual staff performance error:", error);
    return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 });
  }
}
