import { prisma } from "@/lib/db";

const SETTINGS_ID = "platform_settings";

/**
 * Get platform settings (creates defaults if not exists)
 */
export async function getPlatformSettings() {
  let settings = await prisma.platformSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (!settings) {
    settings = await prisma.platformSettings.create({
      data: { id: SETTINGS_ID },
    });
  }

  return settings;
}

/**
 * Get plan limits from platform settings
 */
export async function getPlanLimits() {
  const s = await getPlatformSettings();
  return {
    trial: { maxUsers: s.trialMaxUsers, maxPatients: s.trialMaxPatients },
    starter: { maxUsers: s.starterMaxUsers, maxPatients: s.starterMaxPatients },
    professional: { maxUsers: s.proMaxUsers, maxPatients: s.proMaxPatients },
    enterprise: { maxUsers: s.enterpriseMaxUsers, maxPatients: s.enterpriseMaxPatients },
  };
}

/**
 * Get trial duration in days
 */
export async function getTrialDuration(): Promise<number> {
  const s = await getPlatformSettings();
  return s.trialDurationDays;
}
