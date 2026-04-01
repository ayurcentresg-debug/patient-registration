import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

export async function GET(_request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const appointments = await db.appointment.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { time: "asc" },
      include: {
        patient: { select: { firstName: true, lastName: true, email: true, whatsapp: true, phone: true } },
        doctorRef: true,
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("GET /api/appointments/today error:", error);
    return NextResponse.json({ error: "Failed to fetch today's appointments" }, { status: 500 });
  }
}
