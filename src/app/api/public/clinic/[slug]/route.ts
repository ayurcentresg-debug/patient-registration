import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";

/**
 * GET /api/public/clinic/[slug]
 * Returns public clinic info, doctors, and treatments for the booking page.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const clinic = await prisma.clinic.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        address: true,
        city: true,
        country: true,
        logoUrl: true,
        isActive: true,
      },
    });

    if (!clinic || !clinic.isActive) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    const db = getTenantPrisma(clinic.id);

    // Get active doctors with their schedules
    const doctors = await db.user.findMany({
      where: {
        status: "active",
        role: { in: ["doctor", "therapist"] },
      },
      select: {
        id: true,
        name: true,
        role: true,
        specialization: true,
        department: true,
        consultationFee: true,
        slotDuration: true,
        avatar: true,
      },
      orderBy: { name: "asc" },
    });

    // Get active treatments
    const treatments = await db.treatment.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        duration: true,
        basePrice: true,
        description: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    // Get clinic settings
    const settings = await db.clinicSettings.findFirst({
      select: {
        clinicName: true,
        address: true,
        city: true,
        phone: true,
        email: true,
        currency: true,
        workingHoursStart: true,
        workingHoursEnd: true,
        workingDays: true,
      },
    });

    return NextResponse.json({
      clinic: {
        ...clinic,
        settings,
      },
      doctors,
      treatments,
    });
  } catch (error) {
    console.error("[Public Clinic] Error:", error);
    return NextResponse.json({ error: "Failed to load clinic" }, { status: 500 });
  }
}
