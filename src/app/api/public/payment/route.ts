import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";

/**
 * POST /api/public/payment
 * Creates a Stripe Checkout session for appointment payment.
 * Called from the public booking page after appointment is created.
 */
export async function POST(req: NextRequest) {
  try {
    // Lazy import stripe to avoid build crashes when key not set
    const { getStripe } = await import("@/lib/stripe");

    const body = await req.json();
    const { appointmentId, clinicId } = body;

    if (!appointmentId || !clinicId) {
      return NextResponse.json({ error: "appointmentId and clinicId required" }, { status: 400 });
    }

    const stripe = getStripe();
    const db = getTenantPrisma(clinicId);

    // Get appointment details
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const amount = appointment.sessionPrice;
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "No payment required for this appointment" }, { status: 400 });
    }

    // Get clinic info
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, slug: true },
    });

    const clinicSettings = await db.clinicSettings.findFirst({
      select: { clinicName: true, currency: true },
    });

    const clinicName = clinicSettings?.clinicName || clinic?.name || "Clinic";
    const currency = (clinicSettings?.currency || "SGD").toLowerCase();
    const patientName = appointment.patient
      ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
      : "Patient";
    const patientEmail = appointment.patient?.email;

    // Amount in smallest unit (cents for SGD, paise for INR)
    const amountInSmallest = Math.round(amount * 100);

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: patientEmail || undefined,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountInSmallest,
            product_data: {
              name: `${appointment.treatmentName || "Consultation"} - ${appointment.doctor || "Doctor"}`,
              description: `Appointment on ${new Date(appointment.date).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })} at ${appointment.time}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        appointmentId: appointment.id,
        clinicId,
        patientId: appointment.patientId || "",
        type: "appointment_payment",
      },
      success_url: `${req.nextUrl.origin}/book/${clinic?.slug || "clinic"}?payment=success&appointmentId=${appointmentId}`,
      cancel_url: `${req.nextUrl.origin}/book/${clinic?.slug || "clinic"}?payment=cancelled&appointmentId=${appointmentId}`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("[Payment] Checkout error:", error);
    // If Stripe is not configured, return a helpful message
    if (error instanceof Error && error.message.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json({ error: "Online payments are not configured for this clinic" }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
