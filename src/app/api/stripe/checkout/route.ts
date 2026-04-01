import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLAN_CONFIG } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for the authenticated clinic.
 * Body: { plan: "starter"|"professional", annual?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const clinicId = await getClinicId();
    if (!clinicId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { plan, annual } = await req.json();

    const planConfig = PLAN_CONFIG[plan];
    if (!planConfig) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get clinic & subscription info
    const subscription = await prisma.clinicSubscription.findUnique({
      where: { clinicId },
      include: { clinic: { select: { name: true, email: true } } },
    });

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    // If already on a paid plan, redirect to portal instead
    if (subscription.plan !== "trial" && subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Already subscribed. Use the billing portal to change plans." },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId = subscription.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: subscription.clinic.email,
        name: subscription.clinic.name,
        metadata: {
          clinicId,
          plan,
        },
      });
      stripeCustomerId = customer.id;

      await prisma.clinicSubscription.update({
        where: { clinicId },
        data: { stripeCustomerId },
      });
    }

    // Determine the price ID
    const priceId = annual ? planConfig.stripePriceAnnual : planConfig.stripePriceMonthly;

    // Build the base URL for redirects
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://www.ayurgate.com";

    // Create Checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId || undefined,
          // If no price ID set (dev mode), use price_data for ad-hoc pricing
          ...(!priceId && {
            price_data: {
              currency: "usd",
              product_data: {
                name: `AYUR GATE ${planConfig.name}`,
                description: `${planConfig.name} plan — ${planConfig.maxUsers} staff, ${planConfig.maxPatients === 999999 ? "unlimited" : planConfig.maxPatients} patients`,
              },
              unit_amount: annual
                ? Math.round((annual ? planConfig.annualAmount : planConfig.monthlyAmount) / 12)
                : planConfig.monthlyAmount,
              recurring: {
                interval: annual ? "year" : "month",
              },
            },
          }),
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          clinicId,
          plan,
          billing: annual ? "annual" : "monthly",
        },
      },
      success_url: `${origin}/dashboard?upgraded=true&plan=${plan}`,
      cancel_url: `${origin}/pricing?cancelled=true`,
      metadata: {
        clinicId,
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
