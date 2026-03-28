import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/invoices/generate - Generate invoice from an appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.appointmentId) {
      return NextResponse.json(
        { error: "Appointment ID is required" },
        { status: 400 }
      );
    }

    // Fetch appointment with patient and doctor
    const appointment = await prisma.appointment.findUnique({
      where: { id: body.appointmentId },
      include: {
        patient: true,
        doctorRef: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Check if invoice already exists for this appointment
    const existingInvoice = await prisma.invoice.findFirst({
      where: { appointmentId: body.appointmentId },
    });

    if (existingInvoice) {
      return NextResponse.json(
        {
          error: "An invoice already exists for this appointment",
          invoiceId: existingInvoice.id,
        },
        { status: 409 }
      );
    }

    // Determine patient name
    const patientName = appointment.patient
      ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
      : appointment.walkinName || "Walk-in Patient";

    const patientPhone = appointment.patient
      ? appointment.patient.phone
      : appointment.walkinPhone || null;

    // Determine item type and description based on appointment type
    const isTherapy = appointment.type === "procedure" || appointment.type === "therapy" ||
      ["panchakarma", "abhyanga", "shirodhara", "pizhichil", "njavarakizhi", "nasyam", "vasthi", "udvarthanam"].includes(appointment.type);
    const itemType = isTherapy ? "therapy" : "consultation";
    const doctorName = appointment.doctorRef?.name || appointment.doctor || "Doctor";

    // Use treatment name if available, otherwise appointment type
    const treatmentLabel = appointment.treatmentName || (isTherapy
      ? `${appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)}`
      : "Consultation");
    const itemDescription = `${treatmentLabel} - ${doctorName}${appointment.packageName ? ` (${appointment.packageName})` : ""}`;

    // Use treatment session price if available, otherwise doctor's consultation fee
    const unitPrice = appointment.sessionPrice ?? appointment.doctorRef?.consultationFee ?? 0;
    const gstPercent = 0; // Medical services typically GST-exempt in Singapore
    const gstAmount = 0;
    const amount = unitPrice;

    // Auto-generate invoice number
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `INV-${yearMonth}-`;

    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: "desc" },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split("-").pop() || "0", 10);
      sequence = lastSeq + 1;
    }
    const invoiceNumber = `${prefix}${String(sequence).padStart(4, "0")}`;

    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId: appointment.patientId || null,
        appointmentId: appointment.id,
        patientName,
        patientPhone,
        subtotal: unitPrice,
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: unitPrice,
        gstAmount,
        totalAmount: amount,
        paidAmount: 0,
        balanceAmount: amount,
        status: "pending",
        items: {
          create: [
            {
              type: itemType,
              description: itemDescription,
              quantity: 1,
              unitPrice,
              discount: 0,
              gstPercent,
              gstAmount,
              amount,
            },
          ],
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
