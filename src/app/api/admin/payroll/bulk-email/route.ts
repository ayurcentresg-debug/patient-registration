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

// POST /api/admin/payroll/bulk-email — email payslips to all staff for a period
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { period } = await request.json();
    if (!period) return NextResponse.json({ error: "Period is required" }, { status: 400 });

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    // Get all payroll records for this period
    const payrolls = await db.payroll.findMany({ where: { period } });
    if (!payrolls.length) {
      return NextResponse.json({ error: "No payroll records found for this period" }, { status: 404 });
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

    const results: { staffName: string; email: string; status: "sent" | "failed" | "no-email"; error?: string }[] = [];

    for (const payroll of payrolls) {
      const user = await db.user.findFirst({
        where: { id: payroll.userId },
        select: { name: true, role: true, email: true, staffIdNumber: true },
      });

      if (!user || !user.email) {
        results.push({
          staffName: user?.name || "Unknown",
          email: "",
          status: "no-email",
        });
        continue;
      }

      try {
        const country = payroll.country || "SG";
        const countryConfig = getCountryConfig(country);
        const fmt = (amount: number) => formatCurrencyByCountry(amount, country);

        const allowances: { name: string; amount: number }[] = JSON.parse(payroll.allowanceBreakdown || "[]");
        const deductions: { name: string; amount: number }[] = JSON.parse(payroll.deductionBreakdown || "[]");

        let statutoryData: {
          employeeContributions?: { name: string; amount: number; rate?: number }[];
          employerContributions?: { name: string; amount: number; rate?: number }[];
          taxWithholding?: number;
        } = {};
        try {
          const raw = payroll.statutoryBreakdown || "[]";
          statutoryData = JSON.parse(raw);
          if (Array.isArray(statutoryData)) statutoryData = {};
        } catch {
          statutoryData = {};
        }

        const employeeContribs = statutoryData.employeeContributions || [];
        const taxWithholding = statutoryData.taxWithholding || payroll.taxWithholding || 0;

        // MOM-required fields
        const [pYear, pMonth] = payroll.period.split("-");
        const pStart = new Date(parseInt(pYear), parseInt(pMonth) - 1, 1).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
        const pEnd = new Date(parseInt(pYear), parseInt(pMonth), 0).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
        const additionalPay = (payroll.bonus || 0) + (payroll.commission || 0);

        const statutoryRows = employeeContribs.length > 0
          ? employeeContribs.map((c) => `<tr><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">${c.name}${c.rate ? ` (${c.rate}%)` : ""}</td><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${fmt(c.amount)}</td></tr>`).join("")
          : `<tr><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">CPF - Employee</td><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${fmt(payroll.cpfEmployee)}</td></tr>`;

        const logoHtml = clinicLogo
          ? `<img src="${clinicLogo}" alt="${clinicName}" style="max-height:40px;max-width:160px;" />`
          : "";

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#e8ecf1;font-family:'Segoe UI',-apple-system,sans-serif;">
<div style="max-width:720px;margin:0 auto;padding:20px 16px;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px 12px 0 0;border-bottom:2px solid #e5e7eb;">
    <tr>
      <td style="padding:20px 24px;">
        ${logoHtml}
        <div style="font-size:20px;font-weight:700;color:#14532d;">${clinicName}</div>
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
      <td style="padding:14px 24px;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Employee</div><div style="font-size:15px;font-weight:700;color:#1f2937;margin-top:2px;">${user.name}</div></td>
      <td style="padding:14px 24px;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Staff ID</div><div style="font-size:15px;font-weight:700;color:#1f2937;margin-top:2px;">${user.staffIdNumber || "N/A"}</div></td>
    </tr>
    <tr>
      <td style="padding:0 24px 14px;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Pay Date</div><div style="font-size:15px;font-weight:700;color:#1f2937;margin-top:2px;">${payroll.paidAt ? new Date(payroll.paidAt).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }) : "Pending"}</div></td>
      <td colspan="2" style="padding:0 24px 14px;"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Salary Period</div><div style="font-size:15px;font-weight:700;color:#1f2937;margin-top:2px;">${pStart} – ${pEnd}</div></td>
    </tr>
  </table>

  <!-- Earnings -->
  <div style="padding:16px 24px 0;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;background:#f0fdf4;color:#166534;padding:8px 14px;border-radius:8px 8px 0 0;border:1px solid #e5e7eb;border-bottom:none;">Earnings</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
      <tr><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">Basic Salary</td><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${fmt(payroll.baseSalary)}</td></tr>
      ${allowances.length > 0
        ? allowances.map((a) => `<tr><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">${a.name}</td><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${fmt(a.amount)}</td></tr>`).join("")
        : `<tr><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">Allowances</td><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${fmt(0)}</td></tr>`}
      <tr><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">Additional Pay (Bonus/PH/Rest)</td><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${fmt(additionalPay)}</td></tr>
      <tr><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">Overtime (${payroll.overtimeHours || 0} hrs)</td><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${fmt(payroll.overtime || 0)}</td></tr>
      <tr><td style="padding:8px 14px;font-weight:700;font-size:14px;border-top:1.5px solid #d1d5db;color:#166534;background:#f9fafb;">Gross Pay</td><td style="padding:8px 14px;font-weight:700;font-size:14px;text-align:right;border-top:1.5px solid #d1d5db;color:#166534;background:#f9fafb;">${fmt(payroll.grossPay)}</td></tr>
    </table>
  </div>

  <!-- Deductions -->
  <div style="padding:12px 24px 0;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;background:#fff7ed;color:#9a3412;padding:8px 14px;border-radius:8px 8px 0 0;border:1px solid #e5e7eb;border-bottom:none;">Deductions</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
      ${statutoryRows}
      ${taxWithholding > 0 ? `<tr><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">Tax Withholding</td><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${fmt(taxWithholding)}</td></tr>` : ""}
      ${payroll.unpaidLeave > 0 ? `<tr><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">Unpaid Leave (${payroll.unpaidLeaveDays} days)</td><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${fmt(payroll.unpaidLeave)}</td></tr>` : ""}
      ${deductions.map((d) => `<tr><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">${d.name}</td><td style="padding:6px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${fmt(d.amount)}</td></tr>`).join("")}
      <tr><td style="padding:8px 14px;font-weight:700;font-size:14px;border-top:1.5px solid #d1d5db;color:#9a3412;background:#f9fafb;">Total Deductions</td><td style="padding:8px 14px;font-weight:700;font-size:14px;text-align:right;border-top:1.5px solid #d1d5db;color:#9a3412;background:#f9fafb;">${fmt(payroll.totalDeductions)}</td></tr>
    </table>
  </div>

  <!-- Net Pay -->
  <div style="padding:12px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1.5px solid #d1d5db;border-radius:8px;">
      <tr>
        <td style="padding:12px 18px;font-size:16px;font-weight:600;color:#1f2937;">NET PAY</td>
        <td style="padding:12px 18px;font-size:24px;font-weight:800;color:#1f2937;text-align:right;">${fmt(payroll.netPay)}</td>
      </tr>
    </table>
  </div>

  <!-- Payment Details -->
  <div style="padding:0 24px 12px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
      <tr><td colspan="2" style="padding:10px 14px;font-size:11px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;">Payment Details</td></tr>
      <tr><td style="padding:4px 14px;font-size:12px;color:#374151;">Mode of Payment</td><td style="padding:4px 14px;font-size:12px;text-align:right;font-weight:600;color:#374151;">${(payroll.paymentMode || "bank_transfer").replace(/_/g, " ").split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</td></tr>
      <tr><td style="padding:4px 14px;font-size:12px;color:#374151;">OT Payment Period</td><td style="padding:4px 14px;font-size:12px;text-align:right;font-weight:600;color:#374151;">${pStart} – ${pEnd}</td></tr>
      <tr><td style="padding:4px 14px 10px;font-size:12px;color:#374151;">Status</td><td style="padding:4px 14px 10px;font-size:12px;text-align:right;font-weight:700;color:${payroll.status === "paid" ? "#065f46" : "#92400e"};">${payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}</td></tr>
    </table>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:12px 24px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;background:#fafafa;border-radius:0 0 12px 12px;">
    Computer-generated payslip &mdash; ${clinicName} &mdash; ${new Date().toLocaleDateString("en-SG")} | Confidential
  </div>
</div>
</body></html>`;

        await sendMarketingEmail({
          to: user.email,
          subject: `Your Payslip — ${formatPeriodLabel(payroll.period)} | ${clinicName}`,
          html,
        });

        results.push({ staffName: user.name, email: user.email, status: "sent" });
      } catch (err) {
        results.push({
          staffName: user.name,
          email: user.email,
          status: "failed",
          error: err instanceof Error ? err.message : "Send failed",
        });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const noEmail = results.filter((r) => r.status === "no-email").length;

    return NextResponse.json({
      success: true,
      period,
      total: results.length,
      sent,
      failed,
      noEmail,
      results,
    });
  } catch (e) {
    console.error("Bulk email payslip error:", e);
    return NextResponse.json({ error: "Failed to send bulk payslips" }, { status: 500 });
  }
}
