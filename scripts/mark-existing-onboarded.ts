/**
 * One-time script to mark all existing clinics as onboarded + email verified
 * so they are not affected by the new onboarding flow.
 *
 * Run: npx ts-node scripts/mark-existing-onboarded.ts
 * Or deploy to Railway and it will auto-handle via the migration in register API
 */

import { prisma } from "../src/lib/db";

async function main() {
  const result = await prisma.clinic.updateMany({
    where: { onboardingComplete: false },
    data: { onboardingComplete: true, emailVerified: true },
  });
  console.log(`Updated ${result.count} existing clinics to onboardingComplete=true, emailVerified=true`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
