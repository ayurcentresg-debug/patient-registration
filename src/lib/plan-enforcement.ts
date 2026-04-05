import { prisma } from "@/lib/db";
import { getPlatformSettings } from "@/lib/platform-settings";

/**
 * Check if a clinic has exceeded its max users limit.
 * Returns { allowed: true } or { allowed: false, message, current, max }.
 */
export async function checkUserLimit(clinicId: string) {
  const sub = await prisma.clinicSubscription.findUnique({ where: { clinicId } });
  if (!sub) return { allowed: false, message: "No subscription found", current: 0, max: 0 };

  const current = await prisma.user.count({ where: { clinicId, isActive: true } });
  if (current >= sub.maxUsers) {
    return {
      allowed: false,
      message: `User limit reached (${current}/${sub.maxUsers}). Please upgrade your plan.`,
      current,
      max: sub.maxUsers,
    };
  }
  return { allowed: true, current, max: sub.maxUsers };
}

/**
 * Check if a clinic has exceeded its max patients limit.
 * Returns { allowed: true } or { allowed: false, message, current, max }.
 */
export async function checkPatientLimit(clinicId: string) {
  const sub = await prisma.clinicSubscription.findUnique({ where: { clinicId } });
  if (!sub) return { allowed: false, message: "No subscription found", current: 0, max: 0 };

  const current = await prisma.patient.count({ where: { clinicId, deletedAt: null } });
  if (current >= sub.maxPatients) {
    return {
      allowed: false,
      message: `Patient limit reached (${current}/${sub.maxPatients}). Please upgrade your plan.`,
      current,
      max: sub.maxPatients,
    };
  }
  return { allowed: true, current, max: sub.maxPatients };
}

/**
 * Check if a clinic's trial has expired. Returns true if expired.
 */
export async function isTrialExpired(clinicId: string): Promise<boolean> {
  const sub = await prisma.clinicSubscription.findUnique({ where: { clinicId } });
  if (!sub) return true;
  if (sub.plan !== "trial") return false; // Paid plans don't expire this way
  if (!sub.trialEndsAt) return false;
  return new Date(sub.trialEndsAt) < new Date();
}

/**
 * Check if a specific platform feature flag is enabled.
 * Returns true if the feature is enabled.
 */
export async function isFeatureEnabled(flag: string): Promise<boolean> {
  const settings = await getPlatformSettings();
  const value = (settings as Record<string, unknown>)[flag];
  return value === true;
}

/**
 * Check if the platform is in maintenance mode.
 */
export async function isMaintenanceMode(): Promise<boolean> {
  const settings = await getPlatformSettings();
  return settings.maintenanceMode === true;
}

/**
 * Combined guard for tenant API routes.
 * Checks: trial not expired + not in maintenance mode.
 * Returns null if OK, or { error, status } if blocked.
 */
export async function checkTenantAccess(clinicId: string): Promise<{ error: string; status: number } | null> {
  // Check maintenance mode
  if (await isMaintenanceMode()) {
    return { error: "Platform is currently under maintenance. Please try again later.", status: 503 };
  }

  // Check trial expiration
  if (await isTrialExpired(clinicId)) {
    return { error: "Your trial has expired. Please upgrade your plan to continue.", status: 403 };
  }

  return null;
}

/**
 * Get platform branding values.
 */
export async function getBranding() {
  const settings = await getPlatformSettings();
  return {
    platformName: settings.platformName,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
  };
}

/**
 * Get dynamic pricing for the pricing page / checkout.
 * Returns prices in display format (divided by 100 from cents).
 */
export async function getDynamicPricing() {
  const settings = await getPlatformSettings();
  return {
    starter: {
      monthly: settings.starterMonthlyPrice / 100,
      annual: settings.starterAnnualPrice / 100,
    },
    professional: {
      monthly: settings.proMonthlyPrice / 100,
      annual: settings.proAnnualPrice / 100,
    },
    enterprise: {
      monthly: settings.enterpriseMonthlyPrice / 100,
      annual: settings.enterpriseAnnualPrice / 100,
    },
  };
}
