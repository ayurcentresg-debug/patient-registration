import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import path from "path";

async function main() {
  const dbPath = path.join(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter });

  const email = "admin@clinic.com";
  const password = "admin123";
  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role: "admin", isActive: true },
    create: {
      name: "Admin",
      email,
      password: hashed,
      role: "admin",
      isActive: true,
    },
  });

  console.log("✅ Admin user created/updated:");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role:     ${user.role}`);
  console.log(`   ID:       ${user.id}`);

  // Seed clinic settings with Ayur Centre details
  await prisma.clinicSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      clinicName: "Ayur Centre Pte. Ltd.",
      address: "84 Bedok North Street 4 #01-17",
      city: "Singapore",
      state: "Singapore",
      zipCode: "460084",
      phone: "6445 0072",
      email: "ayurcentresg@gmail.com",
      website: "www.ayurcentre.sg",
      currency: "SGD",
      dateFormat: "dd/MM/yyyy",
      timeFormat: "12h",
      appointmentDuration: 30,
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      workingDays: "[1,2,3,4,5,6]",
    },
  });

  console.log("✅ Clinic settings seeded (Ayur Centre Pte. Ltd.)");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
