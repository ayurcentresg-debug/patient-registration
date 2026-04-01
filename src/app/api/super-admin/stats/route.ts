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

    const [
      totalClinics,
      totalUsers,
      totalPatients,
      subscriptions,
      recentClinics,
    ] = await Promise.all([
      prisma.clinic.count(),
      prisma.user.count(),
      prisma.patient.count(),
      prisma.clinicSubscription.findMany(),
      prisma.clinic.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { subscription: true },
      }),
    ]);

    let activeTrials = 0;
    let expiredTrials = 0;

    for (const sub of subscriptions) {
      if (sub.plan === "trial") {
        if (sub.trialEndsAt && new Date(sub.trialEndsAt) > now && sub.status === "active") {
          activeTrials++;
        } else {
          expiredTrials++;
        }
      }
    }

    const recentRegistrations = recentClinics.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      country: c.country,
      city: c.city,
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
      },
      recentRegistrations,
    });
  } catch (error) {
    console.error("Super admin stats error:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
