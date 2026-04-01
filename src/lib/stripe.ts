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

/** Currency for Stripe India accounts */
export const CURRENCY = "inr";

/**
 * Plan config: maps our plan names to Stripe price IDs and limits.
 * Amounts in smallest currency unit (paise for INR).
 * ₹3,999/mo Starter, ₹7,999/mo Professional
 */
export const PLAN_CONFIG: Record<
  string,
  {
    stripePriceMonthly: string;
    stripePriceAnnual: string;
    maxUsers: number;
    maxPatients: number;
    name: string;
    monthlyAmount: number; // in paise (₹3,999 = 399900 paise)
    annualAmount: number;  // in paise per year (20% discount)
  }
> = {
  starter: {
    stripePriceMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || "",
    stripePriceAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL || "",
    maxUsers: 10,
    maxPatients: 500,
    name: "Starter",
    monthlyAmount: 399900,            // ₹3,999
    annualAmount: 399900 * 12 * 0.8,  // ₹3,999 * 12 * 0.8 = ₹38,390.40/yr
  },
  professional: {
    stripePriceMonthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || "",
    stripePriceAnnual: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL || "",
    maxUsers: 25,
    maxPatients: 999999, // unlimited
    name: "Professional",
    monthlyAmount: 799900,            // ₹7,999
    annualAmount: 799900 * 12 * 0.8,  // ₹7,999 * 12 * 0.8 = ₹76,790.40/yr
  },
};
