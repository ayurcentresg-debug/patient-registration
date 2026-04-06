import { prisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";
import { getPatientAuth } from "@/lib/patient-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/portal/feedback — List patient's past feedback + pending appointments to review
 */
export async function GET() {
  try {
    const auth = await getPatientAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = auth.clinicId ? getTenantPrisma(auth.clinicId) : prisma;

    // Get submitted feedback
    const feedbacks = await db.feedback.findMany({
      where: { patientId: auth.patientId, rating: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Get completed appointments without feedback
    const completedAppointments = await db.appointment.findMany({
      where: {
        patientId: auth.patientId,
        status: "completed",
      },
      orderBy: { date: "desc" },
      take: 10,
      select: {
        id: true, date: true, time: true, doctor: true, doctorId: true,
        treatmentName: true, type: true,
      },
    });

    // Filter out those that already have feedback
    const feedbackAppointmentIds = new Set(feedbacks.map(f => f.appointmentId).filter(Boolean));
    const pendingReview = completedAppointments.filter(a => !feedbackAppointmentIds.has(a.id));

    return NextResponse.json({ feedbacks, pendingReview });
  } catch (error) {
    console.error("Portal feedback GET error:", error);
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 });
  }
}

/**
 * POST /api/portal/feedback — Submit feedback from patient portal
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getPatientAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = auth.clinicId ? getTenantPrisma(auth.clinicId) : prisma;
    const body = await req.json();
    const { appointmentId, rating, category, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Check if feedback already exists for this appointment
    if (appointmentId) {
      const existing = await db.feedback.findFirst({
        where: { appointmentId, patientId: auth.patientId, rating: { gt: 0 } },
      });
      if (existing) {
        return NextResponse.json({ error: "You have already reviewed this appointment" }, { status: 409 });
      }
    }

    // Get appointment details for doctor info
    let doctorId: string | null = null;
    let doctorName: string | null = null;
    if (appointmentId) {
      const appt = await db.appointment.findUnique({
        where: { id: appointmentId },
        select: { doctorId: true, doctor: true },
      });
      doctorId = appt?.doctorId || null;
      doctorName = appt?.doctor || null;
    }

    const feedback = await db.feedback.create({
      data: {
        appointmentId: appointmentId || null,
        patientId: auth.patientId,
        patientName: auth.name,
        doctorId,
        doctorName,
        rating,
        category: category || "general",
        comment: comment || null,
        source: "portal",
      },
    });

    return NextResponse.json({ success: true, id: feedback.id });
  } catch (error) {
    console.error("Portal feedback POST error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
