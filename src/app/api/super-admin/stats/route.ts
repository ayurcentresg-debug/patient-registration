import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSuperAdminPayload } from "@/lib/super-admin-auth";

export async function GET() {
  try {
    const payload = await getSuperAdminPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalClinics,
      totalUsers,
      totalPatients,
      totalAppointments,
      subscriptions,
      recentClinics,
      todayAppointments,
      thisMonthAppointments,
      lastMonthAppointments,
      thisMonthPatients,
      lastMonthPatients,
      thisMonthRevenue,
      lastMonthRevenue,
      allClinics,
      thisMonthClinics,
      lastMonthClinics,
    ] = await Promise.all([
      prisma.clinic.count(),
      prisma.user.count(),
      prisma.patient.count(),
      prisma.appointment.count(),
      prisma.clinicSubscription.findMany(),
      prisma.clinic.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { subscription: true },
      }),
      // Today's appointments
      prisma.appointment.count({
        where: { date: { gte: today } },
      }),
      // This month appointments
      prisma.appointment.count({
        where: { date: { gte: thisMonthStart } },
      }),
      // Last month appointments
      prisma.appointment.count({
        where: { date: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
      // This month new patients
      prisma.patient.count({
        where: { createdAt: { gte: thisMonthStart } },
      }),
      // Last month new patients
      prisma.patient.count({
        where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
      // This month revenue
      prisma.appointment.aggregate({
        where: {
          status: "completed",
          date: { gte: thisMonthStart },
        },
        _sum: { sessionPrice: true },
      }),
      // Last month revenue
      prisma.appointment.aggregate({
        where: {
          status: "completed",
          date: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { sessionPrice: true },
      }),
      // All clinics with subscription for plan breakdown
      prisma.clinic.findMany({
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              trialEndsAt: true,
            },
          },
        },
      }),
      // This month new clinics
      prisma.clinic.count({
        where: { createdAt: { gte: thisMonthStart } },
      }),
      // Last month new clinics
      prisma.clinic.count({
        where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
    ]);

    // Subscription breakdown
    let activeTrials = 0;
    let expiredTrials = 0;
    let paidPlans = 0;
    let suspended = 0;
    const planBreakdown: Record<string, number> = {
      trial: 0,
      starter: 0,
      professional: 0,
      enterprise: 0,
    };

    for (const sub of subscriptions) {
      planBreakdown[sub.plan] = (planBreakdown[sub.plan] || 0) + 1;

      if (sub.plan === "trial") {
        if (
          sub.trialEndsAt &&
          new Date(sub.trialEndsAt) > now &&
          sub.status === "active"
        ) {
          activeTrials++;
        } else {
          expiredTrials++;
        }
      } else {
        if (sub.status === "active") paidPlans++;
      }

      if (sub.status === "suspended") suspended++;
    }

    // Trial conversion rate
    const totalTrialEver = subscriptions.filter(
      (s) => s.plan !== "trial"
    ).length;
    const conversionRate =
      subscriptions.length > 0
        ? Math.round((totalTrialEver / subscriptions.length) * 100)
        : 0;

    // Clinics expiring soon (next 3 days)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringSoon = subscriptions.filter((sub) => {
      if (sub.plan !== "trial" || !sub.trialEndsAt) return false;
      const ends = new Date(sub.trialEndsAt);
      return ends > now && ends <= threeDaysFromNow;
    }).length;

    // Growth metrics
    const revenueThisMonth = thisMonthRevenue._sum.sessionPrice || 0;
    const revenueLastMonth = lastMonthRevenue._sum.sessionPrice || 0;

    // Monthly signup trend (last 6 months)
    const monthlySignups = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const count = allClinics.filter((c) => {
        const d = new Date(c.createdAt);
        return d >= mStart && d <= mEnd;
      }).length;
      monthlySignups.push({
        month: mStart.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        count,
      });
    }

    // Recent activity (signups, plan changes, etc.)
    const recentActivity = recentClinics.slice(0, 8).map((c) => {
      const trialEnd = c.subscription?.trialEndsAt;
      const daysLeft = trialEnd
        ? Math.ceil(
            (new Date(trialEnd).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        plan: c.subscription?.plan || "none",
        status: c.subscription?.status || "unknown",
        daysLeft,
        createdAt: c.createdAt,
        timeAgo: getTimeAgo(c.createdAt),
      };
    });

    const recentRegistrations = recentClinics.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      country: c.country,
      city: c.city,
      clinicType: c.clinicType,
      practitionerCount: c.practitionerCount,
      createdAt: c.createdAt,
      plan: c.subscription?.plan || "none",
      status: c.subscription?.status || "unknown",
    }));

    return NextResponse.json({
      stats: {
        totalClinics,
        activeTrials,
        expiredTrials,
        totalUsers,
        totalPatients,
        totalAppointments,
        todayAppointments,
        paidPlans,
        suspended,
      },
      growth: {
        clinicsThisMonth: thisMonthClinics,
        clinicsLastMonth: lastMonthClinics,
        patientsThisMonth: thisMonthPatients,
        patientsLastMonth: lastMonthPatients,
        appointmentsThisMonth: thisMonthAppointments,
        appointmentsLastMonth: lastMonthAppointments,
        revenueThisMonth,
        revenueLastMonth,
      },
      planBreakdown,
      conversionRate,
      expiringSoon,
      monthlySignups,
      recentActivity,
      recentRegistrations,
    });
  } catch (error) {
    console.error("Super admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date | string): string {
  const now = Date.now();
  const d = new Date(date).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
