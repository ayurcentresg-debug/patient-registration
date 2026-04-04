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
    let clinicName = "AYUR GATE";
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

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e3a5f,#1e40af);border-radius:12px;padding:24px 28px;margin-bottom:24px;">
    <tr>
      <td style="padding:24px 28px;">
        ${logoHtml}
        <div style="font-size:22px;font-weight:800;color:white;letter-spacing:1px;">${clinicName}</div>
        ${clinicAddress ? `<div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">${clinicAddress}</div>` : ""}
      </td>
      <td style="text-align:right;padding:24px 28px;">
        <div style="font-size:20px;font-weight:700;color:white;">PAYSLIP</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px;">${formatPeriodLabel(payroll.period)}</div>
        <div style="display:inline-block;font-size:11px;font-weight:700;color:#1e40af;background:#dbeafe;padding:2px 8px;border-radius:4px;margin-top:6px;">${countryConfig.label} (${countryConfig.currency})</div>
      </td>
    </tr>
  </table>

  <!-- Employee Info -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin-bottom:24px;border:1px solid #e2e8f0;">
    <tr>
      <td style="padding:14px 20px;width:50%;">
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Employee Name</div>
        <div style="font-size:15px;font-weight:700;margin-top:3px;color:#0f172a;">${user.name}</div>
      </td>
      <td style="padding:14px 20px;width:50%;">
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Staff ID</div>
        <div style="font-size:15px;font-weight:700;margin-top:3px;color:#0f172a;">${user.staffIdNumber || "N/A"}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 20px;">
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Role</div>
        <div style="font-size:15px;font-weight:700;margin-top:3px;color:#0f172a;">${(user.role || "staff").charAt(0).toUpperCase() + (user.role || "staff").slice(1)}</div>
      </td>
      <td style="padding:14px 20px;">
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Working Days / Leave</div>
        <div style="font-size:15px;font-weight:700;margin-top:3px;color:#0f172a;">${payroll.workingDays} days / ${payroll.leaveDays} leave</div>
      </td>
    </tr>
  </table>

  <!-- Earnings -->
  <div style="font-size:16px;font-weight:700;color:#1e40af;margin-bottom:10px;">Earnings</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
    <thead><tr style="background:#f1f5f9;"><th style="padding:10px 14px;text-align:left;font-size:13px;font-weight:600;color:#475569;">Description</th><th style="padding:10px 14px;text-align:right;font-size:13px;font-weight:600;color:#475569;">Amount</th></tr></thead>
    <tbody>
      <tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;">Base Salary</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;">${fmt(payroll.baseSalary)}</td></tr>
      ${allowances.map((a) => `<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;">${a.name}</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;font-variant-numeric:tabular-nums;">${fmt(a.amount)}</td></tr>`).join("")}
      ${payroll.commission > 0 ? `<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;">Commission</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;">${fmt(payroll.commission)}</td></tr>` : ""}
      ${payroll.overtime > 0 ? `<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;">Overtime</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;">${fmt(payroll.overtime)}</td></tr>` : ""}
      ${payroll.bonus > 0 ? `<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;">Bonus</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;">${fmt(payroll.bonus)}</td></tr>` : ""}
      <tr style="border-top:2px solid #1e40af;"><td style="padding:10px 14px;font-size:15px;font-weight:700;">Gross Pay</td><td style="padding:10px 14px;font-size:15px;font-weight:700;text-align:right;">${fmt(payroll.grossPay)}</td></tr>
    </tbody>
  </table>

  <!-- Deductions -->
  <div style="font-size:16px;font-weight:700;color:#1e40af;margin-bottom:10px;">Deductions</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
    <thead><tr style="background:#f1f5f9;"><th style="padding:10px 14px;text-align:left;font-size:13px;font-weight:600;color:#475569;">Description</th><th style="padding:10px 14px;text-align:right;font-size:13px;font-weight:600;color:#475569;">Amount</th></tr></thead>
    <tbody>
      ${statutoryEmployeeRows}
      ${taxRow}
      ${payroll.unpaidLeave > 0 ? `<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;">Unpaid Leave (${payroll.unpaidLeaveDays} days)</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;">${fmt(payroll.unpaidLeave)}</td></tr>` : ""}
      ${deductions.map((d) => `<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;">${d.name}</td><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;">${fmt(d.amount)}</td></tr>`).join("")}
      <tr style="border-top:2px solid #1e40af;"><td style="padding:10px 14px;font-size:15px;font-weight:700;">Total Deductions</td><td style="padding:10px 14px;font-size:15px;font-weight:700;text-align:right;">${fmt(payroll.totalDeductions)}</td></tr>
    </tbody>
  </table>

  <!-- Employer Contributions -->
  <div style="margin-bottom:20px;padding:14px;background:#f0fdf4;border-radius:6px;border:1px solid #bbf7d0;">
    <strong style="font-size:14px;color:#166534;">Employer Statutory Contributions</strong>
    <span style="color:#94a3b8;margin-left:8px;font-size:12px;">(not deducted from salary)</span>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      ${employerRows}
      <tr style="border-top:1px solid #166534;"><td style="padding:6px 14px;font-size:13px;font-weight:700;">Total Employer Cost</td><td style="padding:6px 14px;font-size:13px;font-weight:700;text-align:right;">${fmt(totalEmployerCost)}</td></tr>
    </table>
  </div>

  <!-- Net Pay -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e40af;border-radius:8px;margin-bottom:24px;">
    <tr>
      <td style="padding:18px 24px;font-size:18px;font-weight:600;color:white;">Net Pay</td>
      <td style="padding:18px 24px;font-size:24px;font-weight:700;color:white;text-align:right;">${fmt(payroll.netPay)}</td>
    </tr>
  </table>

  <!-- Footer -->
  <div style="text-align:center;padding:16px 0;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
    This is a computer-generated payslip from ${clinicName}.<br/>
    Generated on ${new Date().toLocaleDateString("en-SG")} | Confidential
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
