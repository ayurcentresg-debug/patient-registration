import { NextResponse } from "next/server";
import { getPlatformSettings, getPlanLimits, getTrialDuration } from "@/lib/platform-settings";

/**
 * GET /api/public/platform
 * Returns public platform info: pricing, plan limits, trial duration, branding, feature flags.
 * No auth required — used by pricing page, register page, etc.
 */
export async function GET() {
  try {
    const settings = await getPlatformSettings();
    const planLimits = await getPlanLimits();
    const trialDays = await getTrialDuration();

    return NextResponse.json({
      branding: {
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
      },
      trial: {
        durationDays: trialDays,
        maxUsers: planLimits.trial.maxUsers,
        maxPatients: planLimits.trial.maxPatients,
      },
      plans: {
        starter: {
          ...planLimits.starter,
          monthlyPrice: settings.starterMonthlyPrice / 100,
          annualPrice: settings.starterAnnualPrice / 100,
        },
        professional: {
          ...planLimits.professional,
          monthlyPrice: settings.proMonthlyPrice / 100,
          annualPrice: settings.proAnnualPrice / 100,
        },
        enterprise: {
          ...planLimits.enterprise,
          monthlyPrice: settings.enterpriseMonthlyPrice / 100,
          annualPrice: settings.enterpriseAnnualPrice / 100,
        },
      },
      features: {
        enableOnlineBooking: settings.enableOnlineBooking,
        enablePayroll: settings.enablePayroll,
        enableInventory: settings.enableInventory,
        enablePackages: settings.enablePackages,
        enableReports: settings.enableReports,
        enableMultiBranch: settings.enableMultiBranch,
        enableCme: settings.enableCme,
        enableWhatsApp: settings.enableWhatsApp,
        enableSMS: settings.enableSMS,
        enableApiAccess: settings.enableApiAccess,
      },
      maintenanceMode: settings.maintenanceMode,
    });
  } catch (error) {
    console.error("Public platform info error:", error);
    return NextResponse.json({ error: "Failed to load platform info" }, { status: 500 });
  }
}
