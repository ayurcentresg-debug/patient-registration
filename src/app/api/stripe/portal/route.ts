import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";

/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session so existing customers
 * can manage their subscription (upgrade, downgrade, cancel, update payment).
 */
export async function POST(req: NextRequest) {
  try {
    const clinicId = await getClinicId();
    if (!clinicId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const subscription = await prisma.clinicSubscription.findUnique({
      where: { clinicId },
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Please subscribe first." },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://www.ayurgate.com";

    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${origin}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
