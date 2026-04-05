import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin-auth";

export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Get all clinics with subscription and users
    const clinics = await prisma.clinic.findMany({
      include: {
        subscription: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // For each clinic, get user stats and recent activity
    const clinicHealth = await Promise.all(
      clinics.map(async (clinic) => {
        const [users, patientCount, recentAppointments, weekAppointments] =
          await Promise.all([
            prisma.user.findMany({
              where: { clinicId: clinic.id },
              select: {
                id: true,
                name: true,
                role: true,
                isActive: true,
                lastLogin: true,
              },
              orderBy: { lastLogin: { sort: "desc", nulls: "last" } },
            }),
            prisma.patient.count({ where: { clinicId: clinic.id } }),
            // Appointments in last 7 days
            prisma.appointment.count({
              where: {
                clinicId: clinic.id,
                createdAt: {
                  gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                },
              },
            }),
            // Appointments in last 30 days
            prisma.appointment.count({
              where: {
                clinicId: clinic.id,
                createdAt: {
                  gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                },
              },
            }),
          ]);

        // Derive health metrics
        const lastUserLogin = users.find((u) => u.lastLogin)?.lastLogin;
        const daysSinceLogin = lastUserLogin
          ? Math.floor(
              (now.getTime() - new Date(lastUserLogin).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

        const activeUsers = users.filter((u) => u.isActive).length;
        const usersLoggedInLast7d = users.filter(
          (u) =>
            u.lastLogin &&
            now.getTime() - new Date(u.lastLogin).getTime() <
              7 * 24 * 60 * 60 * 1000
        ).length;

        // Trial status
        const trialEndsAt = clinic.subscription?.trialEndsAt;
        const trialDaysLeft = trialEndsAt
          ? Math.ceil(
              (new Date(trialEndsAt).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

        // Usage percentages
        const maxUsers = clinic.subscription?.maxUsers || 5;
        const maxPatients = clinic.subscription?.maxPatients || 100;
        const userUsagePct = Math.round((users.length / maxUsers) * 100);
        const patientUsagePct =
          maxPatients >= 999999
            ? 0
            : Math.round((patientCount / maxPatients) * 100);

        // Health score (0-100)
        let healthScore = 50; // base
        if (daysSinceLogin !== null) {
          if (daysSinceLogin <= 1) healthScore += 30;
          else if (daysSinceLogin <= 3) healthScore += 20;
          else if (daysSinceLogin <= 7) healthScore += 10;
          else if (daysSinceLogin > 14) healthScore -= 20;
          else if (daysSinceLogin > 30) healthScore -= 40;
        } else {
          healthScore -= 30; // never logged in
        }
        if (recentAppointments > 0) healthScore += 10;
        if (weekAppointments > 5) healthScore += 10;
        if (patientCount > 0) healthScore += 5;
        if (activeUsers > 1) healthScore += 5;
        healthScore = Math.max(0, Math.min(100, healthScore));

        // Determine health status
        let status: "healthy" | "warning" | "critical" | "inactive";
        if (!clinic.isActive) status = "inactive";
        else if (healthScore >= 70) status = "healthy";
        else if (healthScore >= 40) status = "warning";
        else status = "critical";

        // Alerts
        const alerts: string[] = [];
        if (daysSinceLogin === null) alerts.push("Never logged in");
        else if (daysSinceLogin > 14)
          alerts.push(`No login for ${daysSinceLogin} days`);
        if (trialDaysLeft !== null && trialDaysLeft <= 3 && trialDaysLeft > 0)
          alerts.push(`Trial expires in ${trialDaysLeft}d`);
        if (trialDaysLeft !== null && trialDaysLeft <= 0)
          alerts.push("Trial expired");
        if (userUsagePct >= 90) alerts.push(`User limit ${userUsagePct}%`);
        if (patientUsagePct >= 90)
          alerts.push(`Patient limit ${patientUsagePct}%`);
        if (recentAppointments === 0 && daysSinceLogin !== null && daysSinceLogin <= 7)
          alerts.push("Active but no appointments this week");
        if (!clinic.onboardingComplete) alerts.push("Onboarding incomplete");

        return {
          id: clinic.id,
          name: clinic.name,
          email: clinic.email,
          country: clinic.country,
          city: clinic.city,
          isActive: clinic.isActive,
          plan: clinic.subscription?.plan || "none",
          planStatus: clinic.subscription?.status || "unknown",
          trialDaysLeft,
          healthScore,
          status,
          alerts,
          lastLogin: lastUserLogin,
          daysSinceLogin,
          totalUsers: users.length,
          activeUsers,
          usersLoggedInLast7d,
          totalPatients: patientCount,
          recentAppointments,
          weekAppointments,
          userUsagePct,
          patientUsagePct,
          createdAt: clinic.createdAt,
          topUser: users[0]
            ? { name: users[0].name, role: users[0].role, lastLogin: users[0].lastLogin }
            : null,
        };
      })
    );

    // Sort by health score ascending (worst first)
    clinicHealth.sort((a, b) => a.healthScore - b.healthScore);

    // Summary stats
    const summary = {
      total: clinicHealth.length,
      healthy: clinicHealth.filter((c) => c.status === "healthy").length,
      warning: clinicHealth.filter((c) => c.status === "warning").length,
      critical: clinicHealth.filter((c) => c.status === "critical").length,
      inactive: clinicHealth.filter((c) => c.status === "inactive").length,
      neverLoggedIn: clinicHealth.filter((c) => c.daysSinceLogin === null)
        .length,
      noActivityWeek: clinicHealth.filter(
        (c) => c.daysSinceLogin !== null && c.daysSinceLogin > 7
      ).length,
      approachingLimits: clinicHealth.filter(
        (c) => c.userUsagePct >= 80 || c.patientUsagePct >= 80
      ).length,
      expiringTrials: clinicHealth.filter(
        (c) =>
          c.trialDaysLeft !== null && c.trialDaysLeft > 0 && c.trialDaysLeft <= 7
      ).length,
    };

    return NextResponse.json({ clinics: clinicHealth, summary });
  } catch (error) {
    console.error("Health monitoring error:", error);
    return NextResponse.json(
      { error: "Failed to load health data" },
      { status: 500 }
    );
  }
}
