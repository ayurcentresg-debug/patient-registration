import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";

/**
 * GET /api/clinic/subscription
 *
 * Returns the current clinic's subscription status.
 * Used by the TrialBanner component to show trial info and enforce expiry.
 */
export async function GET() {
  try {
    const clinicId = await getClinicId();
    if (!clinicId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const subscription = await prisma.clinicSubscription.findUnique({
      where: { clinicId },
      include: {
        clinic: {
          select: { name: true, slug: true },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const now = new Date();
    const isTrialExpired =
      subscription.plan === "trial" &&
      subscription.trialEndsAt &&
      new Date(subscription.trialEndsAt) < now;

    const trialDaysRemaining =
      subscription.plan === "trial" && subscription.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

    return NextResponse.json({
      plan: subscription.plan,
      status: isTrialExpired ? "expired" : subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      trialDaysRemaining,
      isTrialExpired,
      maxUsers: subscription.maxUsers,
      maxPatients: subscription.maxPatients,
      clinicName: subscription.clinic.name,
      clinicSlug: subscription.clinic.slug,
    });
  } catch (error) {
    console.error("GET /api/clinic/subscription error:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}
