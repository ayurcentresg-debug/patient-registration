import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendEmail } from "@/lib/email";
import { getBranding } from "@/lib/plan-enforcement";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/invoices/[id]/email
 * Sends the invoice/receipt to the patient's email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        payments: { orderBy: { date: "desc" } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get patient email
    let email: string | null = null;
    if (invoice.patientId) {
      const patient = await db.patient.findUnique({
        where: { id: invoice.patientId },
        select: { email: true },
      });
      email = patient?.email || null;
    }

    // Allow override email from body
    const body = await request.json().catch(() => ({}));
    email = body.email || email;

    if (!email) {
      return NextResponse.json({ error: "No email address available for this patient" }, { status: 400 });
    }

    // Fetch clinic settings for branding
    const branding = await getBranding();
    let clinicName = branding.platformName;
    let clinicPhone = branding.supportPhone || "";
    let clinicEmail = branding.supportEmail || "";
    let clinicAddress = "";

    // Try to get clinic-specific settings
    try {
      const clinicSettings = await db.clinicSettings.findFirst();
      if (clinicSettings) {
        clinicName = clinicSettings.clinicName || clinicName;
        clinicPhone = clinicSettings.phone || clinicPhone;
        clinicEmail = clinicSettings.email || clinicEmail;
        clinicAddress = [clinicSettings.address, clinicSettings.city, clinicSettings.zipCode].filter(Boolean).join(", ");
      }
    } catch { /* use defaults */ }

    const isPaid = invoice.status === "paid";
    const subject = isPaid
      ? `Payment Receipt - ${invoice.invoiceNumber} | ${clinicName}`
      : `Invoice ${invoice.invoiceNumber} | ${clinicName}`;

    // Build line items HTML
    const itemsHtml = invoice.items.map((item) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; color: #374151; font-size: 14px;">
          ${item.description}
          <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">${item.type}</div>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; color: #374151; font-size: 14px; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; color: #374151; font-size: 14px; text-align: right;">S$${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; color: #374151; font-size: 14px; text-align: right; font-weight: 600;">S$${item.amount.toFixed(2)}</td>
      </tr>
    `).join("");

    // Build payments HTML if any
    const paymentsHtml = invoice.payments.length > 0 ? `
      <div style="margin-top: 24px;">
        <h3 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 12px;">Payments Received</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Date</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Method</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.payments.map((p) => `
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #374151;">${new Date(p.date).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #374151; text-transform: capitalize;">${p.method}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #374151; text-align: right; font-weight: 600;">S$${p.amount.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : "";

    const statusColor = isPaid ? "#16a34a" : invoice.status === "partially_paid" ? "#2563eb" : "#f59e0b";
    const statusLabel = isPaid ? "PAID" : invoice.status === "partially_paid" ? "PARTIALLY PAID" : "PENDING";

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: #14532d; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <table style="width: 100%;">
            <tr>
              <td>
                <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 700;">${clinicName}</h1>
                ${clinicAddress ? `<p style="color: #bbf7d0; font-size: 13px; margin: 4px 0 0;">${clinicAddress}</p>` : ""}
              </td>
              <td style="text-align: right;">
                <span style="display: inline-block; padding: 4px 12px; background: ${statusColor}; color: white; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                  ${statusLabel}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Body -->
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <!-- Invoice info -->
          <table style="width: 100%; margin-bottom: 24px;">
            <tr>
              <td style="vertical-align: top;">
                <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">${isPaid ? "Receipt" : "Invoice"} Number</p>
                <p style="font-size: 16px; font-weight: 700; color: #111827; margin: 0;">${invoice.invoiceNumber}</p>
              </td>
              <td style="vertical-align: top; text-align: right;">
                <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px;">Date</p>
                <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0;">${new Date(invoice.date).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </td>
            </tr>
          </table>

          <!-- Patient info -->
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Bill To</p>
            <p style="font-size: 15px; font-weight: 700; color: #111827; margin: 0;">${invoice.patientName}</p>
            ${invoice.patientPhone ? `<p style="font-size: 13px; color: #6b7280; margin: 4px 0 0;">${invoice.patientPhone}</p>` : ""}
          </div>

          <!-- Line items -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #6b7280; font-weight: 600;">Qty</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">Rate</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="border-top: 2px solid #e5e7eb; padding-top: 16px;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 4px 0; font-size: 14px; color: #6b7280;">Subtotal</td>
                <td style="padding: 4px 0; font-size: 14px; color: #111827; text-align: right;">S$${invoice.subtotal.toFixed(2)}</td>
              </tr>
              ${invoice.discountAmount > 0 ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #6b7280;">Discount (${invoice.discountPercent}%)</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #dc2626; text-align: right;">-S$${invoice.discountAmount.toFixed(2)}</td>
                </tr>
              ` : ""}
              ${invoice.gstAmount > 0 ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #6b7280;">GST</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #111827; text-align: right;">S$${invoice.gstAmount.toFixed(2)}</td>
                </tr>
              ` : ""}
              <tr>
                <td style="padding: 12px 0 4px; font-size: 18px; font-weight: 700; color: #111827; border-top: 2px solid #111827;">Total</td>
                <td style="padding: 12px 0 4px; font-size: 18px; font-weight: 700; color: #111827; text-align: right; border-top: 2px solid #111827;">S$${invoice.totalAmount.toFixed(2)}</td>
              </tr>
              ${invoice.paidAmount > 0 ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #16a34a;">Paid</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #16a34a; text-align: right;">S$${invoice.paidAmount.toFixed(2)}</td>
                </tr>
              ` : ""}
              ${invoice.balanceAmount > 0 ? `
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; font-weight: 700; color: #dc2626;">Balance Due</td>
                  <td style="padding: 4px 0; font-size: 14px; font-weight: 700; color: #dc2626; text-align: right;">S$${invoice.balanceAmount.toFixed(2)}</td>
                </tr>
              ` : ""}
            </table>
          </div>

          ${paymentsHtml}

          <!-- Footer -->
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px;" />
          <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
            ${clinicName}${clinicPhone ? ` | ${clinicPhone}` : ""}${clinicEmail ? ` | ${clinicEmail}` : ""}
          </p>
          <p style="color: #d1d5db; font-size: 11px; margin: 8px 0 0; text-align: center;">
            This is a computer-generated ${isPaid ? "receipt" : "invoice"}. No signature is required.
          </p>
        </div>
      </div>
    `;

    await sendEmail({ to: email, subject, html });

    // Log communication
    if (invoice.patientId) {
      try {
        await db.communication.create({
          data: {
            patientId: invoice.patientId,
            type: "email",
            subject,
            message: `${isPaid ? "Receipt" : "Invoice"} ${invoice.invoiceNumber} emailed to ${email}`,
            status: "sent",
          },
        });
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({
      success: true,
      message: `${isPaid ? "Receipt" : "Invoice"} sent to ${email}`,
    });
  } catch (error) {
    console.error("Error emailing invoice:", error);
    return NextResponse.json({ error: "Failed to send invoice email" }, { status: 500 });
  }
}
