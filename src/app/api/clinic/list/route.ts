import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/get-clinic-id";

/**
 * GET /api/clinic/list
 *
 * Super-admin only: Lists all registered clinics with subscription info.
 * Only accessible by the platform admin (Ayur Centre clinic).
 */
export async function GET() {
  try {
    const payload = await getAuthPayload();

    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinics = await prisma.clinic.findMany({
      include: {
        subscription: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get counts per clinic
    const clinicData = await Promise.all(
      clinics.map(async (clinic) => {
        const [userCount, patientCount, appointmentCount] = await Promise.all([
          prisma.user.count({ where: { clinicId: clinic.id } }),
          prisma.patient.count({ where: { clinicId: clinic.id } }),
          prisma.appointment.count({ where: { clinicId: clinic.id } }),
        ]);

        return {
          id: clinic.id,
          name: clinic.name,
          slug: clinic.slug,
          email: clinic.email,
          phone: clinic.phone,
          country: clinic.country,
          city: clinic.city,
          createdAt: clinic.createdAt,
          subscription: clinic.subscription
            ? {
                plan: clinic.subscription.plan,
                status: clinic.subscription.status,
                trialEndsAt: clinic.subscription.trialEndsAt,
                maxUsers: clinic.subscription.maxUsers,
                maxPatients: clinic.subscription.maxPatients,
              }
            : null,
          stats: {
            users: userCount,
            patients: patientCount,
            appointments: appointmentCount,
          },
        };
      })
    );

    return NextResponse.json({ clinics: clinicData });
  } catch (error) {
    console.error("Error listing clinics:", error);
    return NextResponse.json({ error: "Failed to list clinics" }, { status: 500 });
  }
}
