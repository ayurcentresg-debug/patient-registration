import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/prescriptions/[id]/convert-invoice
 *
 * Converts a prescription into a draft invoice.
 * - Creates invoice with medicine items from prescription
 * - Links to patient
 * - Sets status to "draft" so front desk can review before finalizing
 * - Marks prescription as "dispensed"
 *
 * Body (optional): { branchId?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { branchId } = body;

    // Fetch prescription with items and patient
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sequence: "asc" } },
        patient: { select: { id: true, firstName: true, lastName: true, phone: true, patientIdNumber: true } },
      },
    });

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    if (prescription.status === "cancelled") {
      return NextResponse.json({ error: "Cannot convert a cancelled prescription" }, { status: 400 });
    }

    // Check if already converted
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        notes: { contains: `Prescription: ${prescription.prescriptionNo}` },
        patientId: prescription.patientId,
      },
    });
    if (existingInvoice) {
      return NextResponse.json({
        error: `Already converted to invoice ${existingInvoice.invoiceNumber}`,
        invoiceId: existingInvoice.id,
      }, { status: 409 });
    }

    // Generate invoice number
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const count = await prisma.invoice.count({
      where: { invoiceNumber: { startsWith: prefix } },
    });
    const invoiceNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

    // Build invoice items from prescription items
    // Look up inventory items for pricing
    const invoiceItems = [];
    let subtotal = 0;
    let totalGst = 0;

    for (const item of prescription.items) {
      let unitPrice = 0;
      let gstPercent = 0;
      let hsnCode: string | null = null;

      if (item.inventoryItemId) {
        const invItem = await prisma.inventoryItem.findUnique({
          where: { id: item.inventoryItemId },
          select: { unitPrice: true, gstPercent: true, hsnCode: true },
        });
        if (invItem) {
          unitPrice = invItem.unitPrice;
          gstPercent = invItem.gstPercent;
          hsnCode = invItem.hsnCode;
        }
      }

      const qty = item.quantity || 1;
      const lineAmount = unitPrice * qty;
      const lineGst = lineAmount * (gstPercent / 100);
      subtotal += lineAmount;
      totalGst += lineGst;

      invoiceItems.push({
        type: "medicine",
        description: `${item.medicineName}${item.dosage ? ` — ${item.dosage}` : ""}${item.duration ? ` (${item.duration})` : ""}`,
        hsnSacCode: hsnCode,
        inventoryItemId: item.inventoryItemId,
        quantity: qty,
        unitPrice,
        discount: 0,
        gstPercent,
        gstAmount: lineGst,
        amount: lineAmount + lineGst,
      });
    }

    const totalAmount = subtotal + totalGst;
    const patientName = `${prescription.patient.firstName} ${prescription.patient.lastName}`;

    // Create draft invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId: prescription.patientId,
        branchId: branchId || null,
        date: now,
        patientName,
        patientPhone: prescription.patient.phone,
        subtotal,
        taxableAmount: subtotal,
        gstAmount: totalGst,
        totalAmount,
        balanceAmount: totalAmount,
        status: "draft",
        notes: `Prescription: ${prescription.prescriptionNo} | Dr. ${prescription.doctorName}${prescription.diagnosis ? ` | Diagnosis: ${prescription.diagnosis}` : ""}`,
        items: {
          create: invoiceItems,
        },
      },
      include: { items: true },
    });

    // Update prescription status
    await prisma.prescription.update({
      where: { id },
      data: { status: "completed" },
    });

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      itemCount: invoiceItems.length,
    });
  } catch (error) {
    console.error("POST /api/prescriptions/[id]/convert-invoice error:", error);
    return NextResponse.json({ error: "Failed to convert prescription to invoice" }, { status: 500 });
  }
}
