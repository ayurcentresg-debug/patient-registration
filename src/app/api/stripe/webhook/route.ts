import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLAN_CONFIG } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import Stripe from "stripe";

/** Helper: extract period dates from a Stripe subscription's first item */
function getPeriodDates(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0];
  if (!item) return { start: new Date(), end: null as Date | null };
  return {
    start: new Date(item.current_period_start * 1000),
    end: new Date(item.current_period_end * 1000),
  };
}

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events:
 * - checkout.session.completed  → activate subscription
 * - invoice.paid                → renew period
 * - customer.subscription.updated → plan changes
 * - customer.subscription.deleted → cancellation
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clinicId = session.metadata?.clinicId;
        const plan = session.metadata?.plan;

        if (!clinicId || !plan) {
          console.error("Missing metadata in checkout session:", session.id);
          break;
        }

        const planConfig = PLAN_CONFIG[plan];
        if (!planConfig) break;

        // Retrieve the subscription to get period dates
        const stripeSub = session.subscription
          ? await getStripe().subscriptions.retrieve(session.subscription as string)
          : null;

        const period = stripeSub ? getPeriodDates(stripeSub) : { start: new Date(), end: null };

        await prisma.clinicSubscription.update({
          where: { clinicId },
          data: {
            plan,
            status: "active",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: stripeSub?.id || null,
            stripePriceId: stripeSub?.items?.data?.[0]?.price?.id || null,
            maxUsers: planConfig.maxUsers,
            maxPatients: planConfig.maxPatients,
            paymentMethod: "stripe",
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
          },
        });

        // Send notification email to platform admin
        const clinic = await prisma.clinic.findUnique({
          where: { id: clinicId },
          select: { name: true, email: true },
        });

        if (clinic) {
          try {
            await sendEmail({
              to: process.env.ADMIN_NOTIFICATION_EMAIL || "ayurcentresg@gmail.com",
              subject: `New paid subscription: ${clinic.name} → ${planConfig.name}`,
              html: `
                <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
                  <h2 style="color:#14532d;">New Paid Subscription</h2>
                  <p><strong>${clinic.name}</strong> upgraded to <strong>${planConfig.name}</strong> plan.</p>
                  <table style="width:100%;border-collapse:collapse;margin-top:16px;">
                    <tr><td style="padding:6px 0;color:#6b7280;">Clinic</td><td style="padding:6px 0;font-weight:600;">${clinic.name}</td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;">${clinic.email}</td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;">Plan</td><td style="padding:6px 0;font-weight:600;">${planConfig.name}</td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;">Max Staff</td><td style="padding:6px 0;">${planConfig.maxUsers}</td></tr>
                    <tr><td style="padding:6px 0;color:#6b7280;">Max Patients</td><td style="padding:6px 0;">${planConfig.maxPatients === 999999 ? "Unlimited" : planConfig.maxPatients}</td></tr>
                  </table>
                </div>
              `,
            });
          } catch {
            // Don't fail webhook for email errors
          }
        }

        console.log(`Clinic ${clinicId} upgraded to ${plan}`);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        // In newer Stripe API versions, subscription is under parent.subscription_details
        const subscriptionId =
          (invoice.parent?.subscription_details?.subscription as string) || null;

        if (!subscriptionId) break;

        const sub = await prisma.clinicSubscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (sub) {
          const stripeSub = await getStripe().subscriptions.retrieve(subscriptionId);
          const period = getPeriodDates(stripeSub);
          await prisma.clinicSubscription.update({
            where: { id: sub.id },
            data: {
              status: "active",
              currentPeriodStart: period.start,
              currentPeriodEnd: period.end,
            },
          });
          console.log(`Subscription renewed for clinic ${sub.clinicId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const sub = await prisma.clinicSubscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (sub) {
          const newPriceId = subscription.items?.data?.[0]?.price?.id;
          let newPlan = sub.plan;
          let newMaxUsers = sub.maxUsers;
          let newMaxPatients = sub.maxPatients;

          for (const [planKey, config] of Object.entries(PLAN_CONFIG)) {
            if (
              newPriceId === config.stripePriceMonthly ||
              newPriceId === config.stripePriceAnnual
            ) {
              newPlan = planKey;
              newMaxUsers = config.maxUsers;
              newMaxPatients = config.maxPatients;
              break;
            }
          }

          const period = getPeriodDates(subscription);

          await prisma.clinicSubscription.update({
            where: { id: sub.id },
            data: {
              plan: newPlan,
              status: subscription.status === "active" ? "active" : "suspended",
              stripePriceId: newPriceId || sub.stripePriceId,
              maxUsers: newMaxUsers,
              maxPatients: newMaxPatients,
              currentPeriodStart: period.start,
              currentPeriodEnd: period.end,
            },
          });
          console.log(`Subscription updated for clinic ${sub.clinicId}: ${newPlan}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const sub = await prisma.clinicSubscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (sub) {
          await prisma.clinicSubscription.update({
            where: { id: sub.id },
            data: {
              status: "cancelled",
              stripeSubscriptionId: null,
              stripePriceId: null,
            },
          });
          console.log(`Subscription cancelled for clinic ${sub.clinicId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
