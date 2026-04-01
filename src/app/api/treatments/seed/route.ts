import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// Ayurveda treatments from AyurCentre Singapore reference
const SEED_TREATMENTS = [
  { name: "Abhyangam", description: "Ayurvedic full-body oil massage using customized herbal oils to nourish skin, ease stress, and improve joint flexibility", category: "massage", duration: 50, basePrice: 70, sort: 1 },
  { name: "Abhyangam & Podikizhi", description: "Full-body oil massage combined with herbal powder poultice therapy for pain relief and inflammation reduction", category: "massage", duration: 50, basePrice: 70, sort: 2 },
  { name: "Abhyangam & Januvasti", description: "Oil massage with warm medicated oil pooling over the knee joint for knee pain and stiffness", category: "massage", duration: 50, basePrice: 70, sort: 3 },
  { name: "Abhyangam & Kativasthi", description: "Oil massage with warm medicated oil pooling over the lower back for lumbar pain and sciatica", category: "massage", duration: 50, basePrice: 70, sort: 4 },
  { name: "Abhyangam & Njavarakizhi", description: "Oil massage followed by Njavara rice bolus application for nourishing muscles and improving skin texture", category: "massage", duration: 50, basePrice: 80, sort: 5 },
  { name: "Abhyangam & Netra Tharpanam", description: "Oil massage combined with medicated ghee eye bath for eye strain, dryness, and vision support", category: "specialty", duration: 50, basePrice: 70, sort: 6 },
  { name: "Abhyangam & Takradhara", description: "Oil massage followed by continuous pouring of medicated buttermilk on the forehead for stress, insomnia, and skin conditions", category: "massage", duration: 50, basePrice: 80, sort: 7 },
  { name: "Abhyangam & Thalam", description: "Oil massage with medicated paste application on the crown of the head for headaches and mental tension", category: "massage", duration: 50, basePrice: 70, sort: 8 },
  { name: "Abhyangam & Thalapothichil", description: "Oil massage with herbal paste head pack for hair health, cooling, and mental relaxation", category: "massage", duration: 50, basePrice: 70, sort: 9 },
  { name: "Udwarthanam", description: "Herbal powder massage using upward strokes for weight management, cellulite reduction, and skin toning", category: "massage", duration: 50, basePrice: 70, sort: 10 },
  { name: "Elakizhi", description: "Herbal leaf poultice massage for arthritis, joint pain, muscle spasms, and sports injuries", category: "massage", duration: 50, basePrice: 70, sort: 11 },
  { name: "Abhyangam & Lepanam", description: "Oil massage with therapeutic herbal paste application for skin conditions and localized inflammation", category: "massage", duration: 50, basePrice: 70, sort: 12 },
  { name: "Abhyangam & Nasyam", description: "Oil massage with nasal administration of medicated oils for sinusitis, migraine, and upper respiratory conditions", category: "panchakarma", duration: 50, basePrice: 70, sort: 13 },
  { name: "Pizhichil", description: "Royal oil bath — continuous warm medicated oil poured over the body for paralysis, nerve disorders, and rejuvenation", category: "specialty", duration: 50, basePrice: 80, sort: 14 },
  { name: "Post Natal Massage", description: "Specialized Ayurvedic massage for postpartum recovery, uterine toning, and lactation support", category: "specialty", duration: 50, basePrice: 70, sort: 15 },
  { name: "Shiroabhyangam", description: "Ayurvedic head, neck, and shoulder massage for headaches, hair health, and mental relaxation", category: "massage", duration: 30, basePrice: 40, sort: 16 },
  { name: "Abhyangam & Shirodhara", description: "Full-body oil massage followed by continuous warm oil stream on the forehead for deep relaxation and neurological conditions", category: "specialty", duration: 50, basePrice: 95, sort: 17 },
  { name: "Shirovasti", description: "Warm medicated oil retained on the head using a cap for neurological disorders, facial paralysis, and insomnia", category: "specialty", duration: 50, basePrice: 70, sort: 18 },
];

// POST /api/treatments/seed - Seed database with AyurCentre treatments
export async function POST() {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    // Check if treatments already exist
    const existingCount = await db.treatment.count();
    if (existingCount > 0) {
      return NextResponse.json(
        { message: `Database already has ${existingCount} treatments. Skipping seed.`, seeded: false },
        { status: 200 }
      );
    }

    const created = [];

    for (const t of SEED_TREATMENTS) {
      const treatment = await db.treatment.create({
        data: {
          name: t.name,
          description: t.description,
          category: t.category,
          duration: t.duration,
          basePrice: t.basePrice,
          isActive: true,
          sortOrder: t.sort,
        },
      });

      // Create default 10-session package with 20% discount (as per AyurCentre)
      const sessionCount = 10;
      const discountPercent = 20;
      const totalPrice = Math.round(t.basePrice * sessionCount * (1 - discountPercent / 100) * 100) / 100;
      const pricePerSession = Math.round((totalPrice / sessionCount) * 100) / 100;

      await db.treatmentPackage.create({
        data: {
          treatmentId: treatment.id,
          name: "10-Session Package",
          sessionCount,
          discountPercent,
          totalPrice,
          pricePerSession,
          isActive: true,
        },
      });

      // Also create a 5-session package with 10% discount
      const totalPrice5 = Math.round(t.basePrice * 5 * 0.9 * 100) / 100;
      const pricePerSession5 = Math.round((totalPrice5 / 5) * 100) / 100;

      await db.treatmentPackage.create({
        data: {
          treatmentId: treatment.id,
          name: "5-Session Package",
          sessionCount: 5,
          discountPercent: 10,
          totalPrice: totalPrice5,
          pricePerSession: pricePerSession5,
          isActive: true,
        },
      });

      created.push(treatment.name);
    }

    return NextResponse.json({
      message: `Seeded ${created.length} treatments with packages`,
      seeded: true,
      treatments: created,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/treatments/seed error:", error);
    return NextResponse.json({ error: "Failed to seed treatments" }, { status: 500 });
  }
}
