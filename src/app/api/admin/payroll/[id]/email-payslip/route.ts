import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendMarketingEmail } from "@/lib/email";
import { getCountryConfig, formatCurrencyByCountry } from "@/lib/payroll-rules";

function formatPeriodLabel(period: string) {
  const [y, m] = period.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString("en-SG", { year: "numeric", month: "long" });
}

// POST /api/admin/payroll/[id]/email-payslip — email payslip to staff
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json().catch(() => ({}));
    const overrideEmail = body.email;

    const payroll = await db.payroll.findFirst({ where: { id } });
    if (!payroll) return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });

    const user = await db.user.findFirst({
      where: { id: payroll.userId },
      select: { name: true, role: true, email: true, staffIdNumber: true },
    });

    if (!user) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

    const recipientEmail = overrideEmail || user.email;
    if (!recipientEmail) {
      return NextResponse.json({ error: "No email address found for this staff member" }, { status: 400 });
    }

    // Get clinic info
    let clinicName = "AyurGate";
    let clinicAddress = "";
    let clinicLogo = "";
    if (clinicId) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, address: true, city: true, country: true, logoUrl: true },
      });
      if (clinic) {
        clinicName = clinic.name;
        clinicAddress = [clinic.address, clinic.city, clinic.country].filter(Boolean).join(", ");
        clinicLogo = clinic.logoUrl || "";
      }
    }

    const country = payroll.country || "SG";
    const countryConfig = getCountryConfig(country);
    const fmt = (amount: number) => formatCurrencyByCountry(amount, country);

    const allowances: { name: string; amount: number }[] = JSON.parse(payroll.allowanceBreakdown || "[]");
    const deductions: { name: string; amount: number }[] = JSON.parse(payroll.deductionBreakdown || "[]");

    let statutoryData: {
      employeeContributions?: { name: string; amount: number; rate?: number }[];
      employerContributions?: { name: string; amount: number; rate?: number }[];
      taxWithholding?: number;
      taxDetails?: string;
    } = {};
    try {
      const raw = payroll.statutoryBreakdown || "[]";
      statutoryData = JSON.parse(raw);
      if (Array.isArray(statutoryData)) statutoryData = {};
    } catch {
      statutoryData = {};
    }

    const employeeContribs = statutoryData.employeeContributions || [];
    const employerContribs = statutoryData.employerContributions || [];
    const taxWithholding = statutoryData.taxWithholding || payroll.taxWithholding || 0;

    // MOM-required fields
    const [periodYear, periodMonth] = payroll.period.split("-");
    const periodStartDate = new Date(parseInt(periodYear), parseInt(periodMonth) - 1, 1);
    const periodEndDate = new Date(parseInt(periodYear), parseInt(periodMonth), 0);
    const periodStartStr = periodStartDate.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
    const periodEndStr = periodEndDate.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
    const additionalPay = (payroll.bonus || 0) + (payroll.commission || 0);

    const statutoryEmployeeRows = employeeContribs.length > 0
      ? employeeContribs.map((c) =>
          `<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;">${c.name}${c.rate ? ` (${c.rate}%)` : ""}</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;">${fmt(c.amount)}</td></tr>`
        ).join("")
      : `<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;">CPF - Employee</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;">${fmt(payroll.cpfEmployee)}</td></tr>`;

    const taxRow = taxWithholding > 0
      ? `<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;">Tax Withholding${country === "IN" ? " (TDS)" : country === "MY" ? " (PCB)" : ""}</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;">${fmt(taxWithholding)}</td></tr>`
      : "";

    const employerRows = employerContribs.length > 0
      ? employerContribs.map((c) =>
          `<tr><td style="padding:6px 14px;border-bottom:1px solid #bbf7d0;font-size:13px;">${c.name}${c.rate ? ` (${c.rate}%)` : ""}</td><td style="padding:6px 14px;border-bottom:1px solid #bbf7d0;font-size:13px;text-align:right;">${fmt(c.amount)}</td></tr>`
        ).join("")
      : `<tr><td style="padding:6px 14px;border-bottom:1px solid #bbf7d0;font-size:13px;">CPF - Employer</td><td style="padding:6px 14px;border-bottom:1px solid #bbf7d0;font-size:13px;text-align:right;">${fmt(payroll.cpfEmployer)}</td></tr>`;

    const totalEmployerCost = employerContribs.length > 0
      ? employerContribs.reduce((s, c) => s + c.amount, 0)
      : payroll.cpfEmployer;

    const logoHtml = clinicLogo
      ? `<img src="${clinicLogo}" alt="${clinicName}" style="max-height:50px;max-width:200px;margin-bottom:8px;" /><br/>`
      : "";

    const td = `padding:8px 14px;border-bottom:1px solid #f3f4f6;font-size:14px;`;
    const tdR = `${td}text-align:right;font-variant-numeric:tabular-nums;`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#e8ecf1;font-family:'Segoe UI',-apple-system,sans-serif;">
<div style="max-width:720px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px 12px 0 0;border-bottom:2px solid #e5e7eb;">
    <tr>
      <td style="padding:20px 24px;">
        ${logoHtml}
        <div style="font-size:20px;font-weight:700;color:#14532d;letter-spacing:0.3px;">${clinicName}</div>
        ${clinicAddress ? `<div style="font-size:12px;color:#4b5563;margin-top:2px;">${clinicAddress}</div>` : ""}
      </td>
      <td style="text-align:right;padding:20px 24px;">
        <div style="font-size:22px;font-weight:800;color:#374151;letter-spacing:2px;">PAYSLIP</div>
      </td>
    </tr>
  </table>

  <!-- Employee Info -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
    <tr>
      <td style="padding:14px 24px;">
        <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Employee</div>
        <div style="font-size:15px;font-weight:700;color:#1f2937;margin-top:2px;">${user.name}</div>
      </td>
      <td style="padding:14px 24px;">
        <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Staff ID</div>
        <div style="font-size:15px;font-weight:700;color:#1f2937;margin-top:2px;">${user.staffIdNumber || "N/A"}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 14px;">
        <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Pay Date</div>
        <div style="font-size:15px;font-weight:700;color:#1f2937;margin-top:2px;">${payroll.paidAt ? new Date(payroll.paidAt).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }) : "Pending"}</div>
      </td>
      <td colspan="2" style="padding:0 24px 14px;">
        <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Salary Period</div>
        <div style="font-size:15px;font-weight:700;color:#1f2937;margin-top:2px;">${periodStartStr} – ${periodEndStr}</div>
      </td>
    </tr>
  </table>

  <!-- Earnings -->
  <div style="padding:16px 24px 0;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;background:#f0fdf4;color:#166534;padding:8px 14px;border-radius:8px 8px 0 0;border:1px solid #e5e7eb;border-bottom:none;">Earnings</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
      <tr><td style="${td}">Basic Salary</td><td style="${tdR}">${fmt(payroll.baseSalary)}</td></tr>
      ${allowances.length > 0
        ? allowances.map((a) => `<tr><td style="${td}">${a.name}</td><td style="${tdR}">${fmt(a.amount)}</td></tr>`).join("")
        : `<tr><td style="${td}">Allowances</td><td style="${tdR}">${fmt(0)}</td></tr>`}
      <tr><td style="${td}">Additional Pay (Bonus/PH/Rest)</td><td style="${tdR}">${fmt(additionalPay)}</td></tr>
      <tr><td style="${td}">Overtime (${payroll.overtimeHours || 0} hrs)</td><td style="${tdR}">${fmt(payroll.overtime || 0)}</td></tr>
      <tr><td style="padding:8px 14px;font-weight:700;font-size:14px;border-top:1.5px solid #d1d5db;color:#166534;background:#f9fafb;">Gross Pay</td><td style="padding:8px 14px;font-weight:700;font-size:14px;text-align:right;border-top:1.5px solid #d1d5db;color:#166534;background:#f9fafb;">${fmt(payroll.grossPay)}</td></tr>
    </table>
  </div>

  <!-- Deductions -->
  <div style="padding:12px 24px 0;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;background:#fff7ed;color:#9a3412;padding:8px 14px;border-radius:8px 8px 0 0;border:1px solid #e5e7eb;border-bottom:none;">Deductions</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
      ${statutoryEmployeeRows}
      ${taxRow}
      ${payroll.unpaidLeave > 0 ? `<tr><td style="${td}">Unpaid Leave (${payroll.unpaidLeaveDays} days)</td><td style="${tdR}">${fmt(payroll.unpaidLeave)}</td></tr>` : ""}
      ${deductions.map((d) => `<tr><td style="${td}">${d.name}</td><td style="${tdR}">${fmt(d.amount)}</td></tr>`).join("")}
      <tr><td style="padding:8px 14px;font-weight:700;font-size:14px;border-top:1.5px solid #d1d5db;color:#9a3412;background:#f9fafb;">Total Deductions</td><td style="padding:8px 14px;font-weight:700;font-size:14px;text-align:right;border-top:1.5px solid #d1d5db;color:#9a3412;background:#f9fafb;">${fmt(payroll.totalDeductions)}</td></tr>
    </table>
  </div>

  <!-- Net Pay -->
  <div style="padding:12px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1.5px solid #d1d5db;border-radius:8px;">
      <tr>
        <td style="padding:12px 18px;font-size:16px;font-weight:600;color:#1f2937;">NET PAY</td>
        <td style="padding:12px 18px;font-size:24px;font-weight:800;color:#1f2937;text-align:right;letter-spacing:0.5px;">${fmt(payroll.netPay)}</td>
      </tr>
    </table>
  </div>

  <!-- Employer Contributions -->
  <div style="padding:0 24px 12px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
      <tr><td colspan="2" style="padding:10px 14px;font-size:11px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;">Employer Contributions (not deducted)</td></tr>
      ${employerRows}
      <tr style="border-top:1px solid #d1d5db;"><td style="padding:6px 14px;font-size:12px;font-weight:700;color:#374151;">Total Employer Cost</td><td style="padding:6px 14px;font-size:12px;font-weight:800;text-align:right;color:#374151;">${fmt(totalEmployerCost)}</td></tr>
    </table>
  </div>

  <!-- Payment Details -->
  <div style="padding:0 24px 12px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
      <tr><td colspan="2" style="padding:10px 14px;font-size:11px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;">Payment Details</td></tr>
      <tr><td style="padding:4px 14px;font-size:12px;color:#374151;">Mode of Payment</td><td style="padding:4px 14px;font-size:12px;text-align:right;font-weight:600;color:#374151;">${(payroll.paymentMode || "bank_transfer").replace(/_/g, " ").split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</td></tr>
      <tr><td style="padding:4px 14px;font-size:12px;color:#374151;">OT Payment Period</td><td style="padding:4px 14px;font-size:12px;text-align:right;font-weight:600;color:#374151;">${periodStartStr} – ${periodEndStr}</td></tr>
      <tr><td style="padding:4px 14px 10px;font-size:12px;color:#374151;">Status</td><td style="padding:4px 14px 10px;font-size:12px;text-align:right;font-weight:700;color:${payroll.status === "paid" ? "#065f46" : "#92400e"};">${payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}</td></tr>
    </table>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:12px 24px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;background:#fafafa;border-radius:0 0 12px 12px;">
    Computer-generated payslip &mdash; ${clinicName} &mdash; ${new Date().toLocaleDateString("en-SG")} | Confidential
  </div>

</div>
</body></html>`;

    const result = await sendMarketingEmail({
      to: recipientEmail,
      subject: `Your Payslip — ${formatPeriodLabel(payroll.period)} | ${clinicName}`,
      html,
    });

    return NextResponse.json({
      success: true,
      sentTo: recipientEmail,
      messageId: result.messageId,
      staffName: user.name,
      period: payroll.period,
    });
  } catch (e) {
    console.error("Email payslip error:", e);
    return NextResponse.json({ error: "Failed to email payslip" }, { status: 500 });
  }
}
