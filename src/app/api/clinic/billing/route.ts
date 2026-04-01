import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";

/**
 * GET /api/clinic/billing
 *
 * Returns detailed billing/subscription info for the current clinic.
 * Used by the billing/settings pages.
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
        clinic: { select: { name: true, email: true } },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "No subscription" }, { status: 404 });
    }

    return NextResponse.json({
      plan: subscription.plan,
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      maxUsers: subscription.maxUsers,
      maxPatients: subscription.maxPatients,
      paymentMethod: subscription.paymentMethod,
      hasStripe: !!subscription.stripeCustomerId,
      clinicName: subscription.clinic.name,
      clinicEmail: subscription.clinic.email,
    });
  } catch (error) {
    console.error("GET /api/clinic/billing error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
