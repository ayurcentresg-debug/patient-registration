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

        const statutoryRows = employeeContribs.length > 0
          ? employeeContribs.map((c) => `<tr><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">${c.name}${c.rate ? ` (${c.rate}%)` : ""}</td><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;">${fmt(c.amount)}</td></tr>`).join("")
          : `<tr><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">CPF - Employee</td><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;">${fmt(payroll.cpfEmployee)}</td></tr>`;

        const logoHtml = clinicLogo
          ? `<img src="${clinicLogo}" alt="${clinicName}" style="max-height:40px;max-width:160px;margin-bottom:6px;" /><br/>`
          : "";

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e3a5f,#1e40af);border-radius:10px;margin-bottom:20px;">
    <tr>
      <td style="padding:20px 24px;">
        ${logoHtml}
        <div style="font-size:20px;font-weight:800;color:white;">${clinicName}</div>
        ${clinicAddress ? `<div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:3px;">${clinicAddress}</div>` : ""}
      </td>
      <td style="text-align:right;padding:20px 24px;">
        <div style="font-size:18px;font-weight:700;color:white;">PAYSLIP</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:3px;">${formatPeriodLabel(payroll.period)}</div>
        <div style="display:inline-block;font-size:10px;font-weight:700;color:#1e40af;background:#dbeafe;padding:2px 6px;border-radius:3px;margin-top:4px;">${countryConfig.label}</div>
      </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;">
    <tr>
      <td style="padding:12px 16px;"><div style="font-size:10px;color:#64748b;text-transform:uppercase;">Employee</div><div style="font-size:14px;font-weight:700;color:#0f172a;margin-top:2px;">${user.name}</div></td>
      <td style="padding:12px 16px;"><div style="font-size:10px;color:#64748b;text-transform:uppercase;">Staff ID</div><div style="font-size:14px;font-weight:700;color:#0f172a;margin-top:2px;">${user.staffIdNumber || "N/A"}</div></td>
      <td style="padding:12px 16px;"><div style="font-size:10px;color:#64748b;text-transform:uppercase;">Role</div><div style="font-size:14px;font-weight:700;color:#0f172a;margin-top:2px;">${(user.role || "staff").charAt(0).toUpperCase() + (user.role || "staff").slice(1)}</div></td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
    <thead><tr style="background:#f1f5f9;"><th style="padding:8px 14px;text-align:left;font-size:12px;font-weight:600;color:#475569;">EARNINGS</th><th style="padding:8px 14px;text-align:right;font-size:12px;font-weight:600;color:#475569;">AMOUNT</th></tr></thead>
    <tbody>
      <tr><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">Base Salary</td><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;">${fmt(payroll.baseSalary)}</td></tr>
      ${allowances.map((a) => `<tr><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">${a.name}</td><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;">${fmt(a.amount)}</td></tr>`).join("")}
      ${payroll.commission > 0 ? `<tr><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">Commission</td><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;">${fmt(payroll.commission)}</td></tr>` : ""}
      ${payroll.overtime > 0 ? `<tr><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">Overtime</td><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;">${fmt(payroll.overtime)}</td></tr>` : ""}
      ${payroll.bonus > 0 ? `<tr><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">Bonus</td><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;">${fmt(payroll.bonus)}</td></tr>` : ""}
      <tr><td style="padding:8px 14px;font-weight:700;border-top:2px solid #1e40af;">Gross Pay</td><td style="padding:8px 14px;font-weight:700;text-align:right;border-top:2px solid #1e40af;">${fmt(payroll.grossPay)}</td></tr>
    </tbody>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
    <thead><tr style="background:#f1f5f9;"><th style="padding:8px 14px;text-align:left;font-size:12px;font-weight:600;color:#475569;">DEDUCTIONS</th><th style="padding:8px 14px;text-align:right;font-size:12px;font-weight:600;color:#475569;">AMOUNT</th></tr></thead>
    <tbody>
      ${statutoryRows}
      ${taxWithholding > 0 ? `<tr><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">Tax Withholding</td><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;">${fmt(taxWithholding)}</td></tr>` : ""}
      ${payroll.unpaidLeave > 0 ? `<tr><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">Unpaid Leave (${payroll.unpaidLeaveDays} days)</td><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;">${fmt(payroll.unpaidLeave)}</td></tr>` : ""}
      ${deductions.map((d) => `<tr><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">${d.name}</td><td style="padding:6px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;">${fmt(d.amount)}</td></tr>`).join("")}
      <tr><td style="padding:8px 14px;font-weight:700;border-top:2px solid #1e40af;">Total Deductions</td><td style="padding:8px 14px;font-weight:700;text-align:right;border-top:2px solid #1e40af;">${fmt(payroll.totalDeductions)}</td></tr>
    </tbody>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e40af;border-radius:8px;margin-bottom:20px;">
    <tr>
      <td style="padding:16px 20px;font-size:16px;font-weight:600;color:white;">Net Pay</td>
      <td style="padding:16px 20px;font-size:22px;font-weight:700;color:white;text-align:right;">${fmt(payroll.netPay)}</td>
    </tr>
  </table>

  <div style="text-align:center;font-size:11px;color:#94a3b8;padding-top:12px;border-top:1px solid #e2e8f0;">
    Computer-generated payslip from ${clinicName} | ${new Date().toLocaleDateString("en-SG")} | Confidential
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
