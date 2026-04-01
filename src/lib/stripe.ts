import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazy-initialized Stripe client (avoids build-time crash when env not set) */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia",
    });
  }
  return _stripe;
}

/**
 * Plan config: maps our plan names to Stripe price IDs and limits.
 * Set STRIPE_PRICE_STARTER_MONTHLY etc. in env after creating products in Stripe dashboard.
 */
export const PLAN_CONFIG: Record<
  string,
  {
    stripePriceMonthly: string;
    stripePriceAnnual: string;
    maxUsers: number;
    maxPatients: number;
    name: string;
    monthlyAmount: number; // in cents
    annualAmount: number;  // in cents (per year)
  }
> = {
  starter: {
    stripePriceMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || "",
    stripePriceAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL || "",
    maxUsers: 10,
    maxPatients: 500,
    name: "Starter",
    monthlyAmount: 4900,
    annualAmount: 47040, // $49 * 12 * 0.8 = $470.40/yr
  },
  professional: {
    stripePriceMonthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || "",
    stripePriceAnnual: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL || "",
    maxUsers: 25,
    maxPatients: 999999, // unlimited
    name: "Professional",
    monthlyAmount: 9900,
    annualAmount: 95040, // $99 * 12 * 0.8 = $950.40/yr
  },
};
