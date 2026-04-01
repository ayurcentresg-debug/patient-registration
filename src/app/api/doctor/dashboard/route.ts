import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || ""
);

export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const token = request.cookies.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;
    const userName = payload.name as string;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = today.toISOString().split("T")[0];

    // Get doctor's appointments for today
    const todayAppointments = await db.appointment.findMany({
      where: {
        doctorId: userId,
        date: { gte: today, lt: tomorrow },
      },
      include: {
        patient: { select: { firstName: true, lastName: true, patientIdNumber: true, phone: true, photoUrl: true } },
      },
      orderBy: { time: "asc" },
    });

    // Get upcoming appointments (next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingAppointments = await db.appointment.findMany({
      where: {
        doctorId: userId,
        date: { gt: tomorrow, lt: nextWeek },
        status: { not: "cancelled" },
      },
      include: {
        patient: { select: { firstName: true, lastName: true, patientIdNumber: true, phone: true } },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: 10,
    });

    // Get recent prescriptions by this doctor
    const recentPrescriptions = await db.prescription.findMany({
      where: { doctorId: userId },
      include: {
        patient: { select: { firstName: true, lastName: true, patientIdNumber: true } },
        items: { select: { medicineName: true }, take: 3 },
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    // Stats
    const totalAppointmentsToday = todayAppointments.length;
    const completedToday = todayAppointments.filter(a => a.status === "completed").length;
    const pendingToday = todayAppointments.filter(a => a.status === "scheduled").length;

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const totalAppointmentsMonth = await db.appointment.count({
      where: { doctorId: userId, date: { gte: thisMonthStart } },
    });

    const totalPrescriptionsMonth = await db.prescription.count({
      where: { doctorId: userId, date: { gte: thisMonthStart } },
    });

    // Unique patients this month
    const monthAppts = await db.appointment.findMany({
      where: { doctorId: userId, date: { gte: thisMonthStart } },
      select: { patientId: true },
      distinct: ["patientId"],
    });

    return NextResponse.json({
      doctorName: userName,
      today: todayStr,
      stats: {
        todayTotal: totalAppointmentsToday,
        todayCompleted: completedToday,
        todayPending: pendingToday,
        monthAppointments: totalAppointmentsMonth,
        monthPrescriptions: totalPrescriptionsMonth,
        monthPatients: monthAppts.length,
      },
      todayAppointments: todayAppointments.map(a => ({
        id: a.id,
        time: a.time,
        status: a.status,
        reason: a.reason,
        department: a.department,
        patient: a.patient,
      })),
      upcomingAppointments: upcomingAppointments.map(a => ({
        id: a.id,
        date: a.date,
        time: a.time,
        status: a.status,
        reason: a.reason,
        patient: a.patient,
      })),
      recentPrescriptions: recentPrescriptions.map(p => ({
        id: p.id,
        prescriptionNo: p.prescriptionNo,
        date: p.date,
        status: p.status,
        patient: p.patient,
        medicines: p.items.map(i => i.medicineName),
      })),
    });
  } catch (error) {
    console.error("GET /api/doctor/dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
