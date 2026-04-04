import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { getCountryConfig, formatCurrencyByCountry } from "@/lib/payroll-rules";

function formatPeriodLabel(period: string) {
  const [y, m] = period.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString("en-SG", { year: "numeric", month: "long" });
}

// GET /api/admin/payroll/[id]/payslip — generate HTML payslip
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const payroll = await db.payroll.findFirst({ where: { id } });
    if (!payroll) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get user info
    const user = await db.user.findFirst({
      where: { id: payroll.userId },
      select: { name: true, role: true, email: true, staffIdNumber: true },
    });

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

    const allowances: { name: string; amount: number }[] = JSON.parse(
      payroll.allowanceBreakdown || "[]"
    );
    const deductions: { name: string; amount: number }[] = JSON.parse(
      payroll.deductionBreakdown || "[]"
    );

    // Parse statutory breakdown
    let statutoryData: {
      employeeContributions?: { name: string; amount: number; rate?: number }[];
      employerContributions?: { name: string; amount: number; rate?: number }[];
      taxWithholding?: number;
      taxDetails?: string;
    } = {};
    try {
      const raw = payroll.statutoryBreakdown || "[]";
      statutoryData = JSON.parse(raw);
      // Handle legacy array format
      if (Array.isArray(statutoryData)) {
        statutoryData = {};
      }
    } catch {
      statutoryData = {};
    }

    const employeeContribs = statutoryData.employeeContributions || [];
    const employerContribs = statutoryData.employerContributions || [];
    const taxWithholding = statutoryData.taxWithholding || payroll.taxWithholding || 0;
    const taxDetails = statutoryData.taxDetails || "";

    // Build statutory deductions rows (employee side)
    const statutoryEmployeeRows = employeeContribs.length > 0
      ? employeeContribs.map((c) =>
          `<tr><td>${c.name}${c.rate ? ` (${c.rate}%)` : ""}</td><td class="amount">${fmt(c.amount)}</td></tr>`
        ).join("")
      : `<tr><td>CPF - Employee (${payroll.cpfEmployee > 0 ? ((payroll.cpfEmployee / (payroll.baseSalary + payroll.totalAllowances)) * 100).toFixed(1) : "0"}%)</td><td class="amount">${fmt(payroll.cpfEmployee)}</td></tr>`;

    // Tax withholding row
    const taxRow = taxWithholding > 0
      ? `<tr><td>Tax Withholding${country === "IN" ? " (TDS)" : country === "MY" ? " (PCB)" : ""}</td><td class="amount">${fmt(taxWithholding)}</td></tr>`
      : "";

    // Employer contributions section
    const employerRows = employerContribs.length > 0
      ? employerContribs.map((c) =>
          `<tr><td>${c.name}${c.rate ? ` (${c.rate}%)` : ""}</td><td class="amount">${fmt(c.amount)}</td></tr>`
        ).join("")
      : `<tr><td>CPF - Employer</td><td class="amount">${fmt(payroll.cpfEmployer)}</td></tr>`;

    const totalEmployerCost = employerContribs.length > 0
      ? employerContribs.reduce((s, c) => s + c.amount, 0)
      : payroll.cpfEmployer;

    // Country label for display
    const countryLabel = countryConfig.label;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payslip - ${user?.name || "Staff"} - ${formatPeriodLabel(payroll.period)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1e40af; }
  .company-name { font-size: 28px; font-weight: 700; color: #1e40af; }
  .company-address { font-size: 13px; color: #666; margin-top: 4px; }
  .payslip-title { font-size: 20px; font-weight: 600; color: #1e40af; text-align: right; }
  .period { font-size: 14px; color: #666; text-align: right; margin-top: 4px; }
  .country-badge { display: inline-block; font-size: 11px; font-weight: 700; color: #1e40af; background: #dbeafe; padding: 2px 8px; border-radius: 4px; margin-top: 4px; text-transform: uppercase; }
  .employee-info { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px; padding: 16px; background: #f8fafc; border-radius: 8px; }
  .info-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-value { font-size: 15px; font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  td.amount { text-align: right; font-variant-numeric: tabular-nums; }
  th.amount { text-align: right; }
  .section-title { font-size: 16px; font-weight: 700; color: #1e40af; margin: 24px 0 12px; }
  .total-row td { font-weight: 700; border-top: 2px solid #1e40af; border-bottom: none; font-size: 15px; }
  .net-pay { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: #1e40af; color: #fff; border-radius: 8px; margin-top: 20px; }
  .net-pay-label { font-size: 18px; font-weight: 600; }
  .net-pay-amount { font-size: 24px; font-weight: 700; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  .meta-row { display: flex; gap: 32px; margin-bottom: 24px; }
  .meta-item { text-align: center; }
  .meta-number { font-size: 22px; font-weight: 700; color: #1e40af; }
  .meta-label { font-size: 12px; color: #666; text-transform: uppercase; }
  .employer-section { margin-top: 12px; padding: 14px; background: #f0fdf4; border-radius: 6px; font-size: 13px; color: #166534; }
  .employer-section table { margin: 8px 0 0 0; }
  .employer-section td { padding: 4px 14px; border-bottom: 1px solid #bbf7d0; font-size: 13px; }
  .employer-section .total-row td { border-top: 1px solid #166534; border-bottom: none; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
  <!-- Action Buttons (hidden on print) -->
  <div class="no-print" style="display:flex;gap:12px;margin-bottom:20px;justify-content:flex-end;">
    <button onclick="window.print()" style="padding:10px 24px;background:#1e40af;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
      Print / Save PDF
    </button>
    <button onclick="emailPayslip()" id="emailBtn" style="padding:10px 24px;background:#059669;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
      Email to Staff
    </button>
    <button onclick="window.close()" style="padding:10px 24px;background:#e2e8f0;color:#475569;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
      Close
    </button>
  </div>

  <div class="header">
    <div>
      ${clinicLogo ? `<img src="${clinicLogo}" alt="${clinicName}" style="max-height:50px;max-width:200px;margin-bottom:8px;display:block;" />` : ""}
      <div class="company-name">${clinicName}</div>
      ${clinicAddress ? `<div class="company-address">${clinicAddress}</div>` : ""}
    </div>
    <div>
      <div class="payslip-title">PAYSLIP</div>
      <div class="period">${formatPeriodLabel(payroll.period)}</div>
      <div class="country-badge">${countryLabel} (${countryConfig.currency})</div>
    </div>
  </div>

  <div class="employee-info">
    <div>
      <div class="info-label">Employee Name</div>
      <div class="info-value">${user?.name || "N/A"}</div>
    </div>
    <div>
      <div class="info-label">Staff ID</div>
      <div class="info-value">${user?.staffIdNumber || "N/A"}</div>
    </div>
    <div>
      <div class="info-label">Role</div>
      <div class="info-value">${(user?.role || "staff").charAt(0).toUpperCase() + (user?.role || "staff").slice(1)}</div>
    </div>
    <div>
      <div class="info-label">Status</div>
      <div class="info-value">${payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}</div>
    </div>
  </div>

  <div class="meta-row">
    <div class="meta-item">
      <div class="meta-number">${payroll.workingDays}</div>
      <div class="meta-label">Working Days</div>
    </div>
    <div class="meta-item">
      <div class="meta-number">${payroll.leaveDays}</div>
      <div class="meta-label">Leave Days</div>
    </div>
    <div class="meta-item">
      <div class="meta-number">${payroll.unpaidLeaveDays}</div>
      <div class="meta-label">Unpaid Leave</div>
    </div>
  </div>

  <div class="section-title">Earnings</div>
  <table>
    <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
    <tbody>
      <tr><td>Base Salary</td><td class="amount">${fmt(payroll.baseSalary)}</td></tr>
      ${allowances.map((a) => `<tr><td>${a.name}</td><td class="amount">${fmt(a.amount)}</td></tr>`).join("")}
      ${payroll.commission > 0 ? `<tr><td>Commission</td><td class="amount">${fmt(payroll.commission)}</td></tr>` : ""}
      ${payroll.overtime > 0 ? `<tr><td>Overtime</td><td class="amount">${fmt(payroll.overtime)}</td></tr>` : ""}
      ${payroll.bonus > 0 ? `<tr><td>Bonus</td><td class="amount">${fmt(payroll.bonus)}</td></tr>` : ""}
      <tr class="total-row"><td>Gross Pay</td><td class="amount">${fmt(payroll.grossPay)}</td></tr>
    </tbody>
  </table>

  <div class="section-title">Statutory Deductions</div>
  <table>
    <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
    <tbody>
      ${statutoryEmployeeRows}
      ${taxRow}
      ${payroll.unpaidLeave > 0 ? `<tr><td>Unpaid Leave (${payroll.unpaidLeaveDays} days)</td><td class="amount">${fmt(payroll.unpaidLeave)}</td></tr>` : ""}
      ${deductions.map((d) => `<tr><td>${d.name}</td><td class="amount">${fmt(d.amount)}</td></tr>`).join("")}
      <tr class="total-row"><td>Total Deductions</td><td class="amount">${fmt(payroll.totalDeductions)}</td></tr>
    </tbody>
  </table>

  <div class="employer-section">
    <strong>Employer Statutory Contributions</strong> <span style="color: #94a3b8; margin-left: 8px;">(not deducted from salary)</span>
    <table>
      ${employerRows}
      <tr class="total-row"><td><strong>Total Employer Cost</strong></td><td class="amount"><strong>${fmt(totalEmployerCost)}</strong></td></tr>
    </table>
  </div>

  ${taxDetails ? `<div style="margin-top: 12px; padding: 10px 14px; background: #fef3c7; border-radius: 6px; font-size: 12px; color: #92400e;"><strong>Tax Note:</strong> ${taxDetails}</div>` : ""}

  <div class="net-pay">
    <span class="net-pay-label">Net Pay</span>
    <span class="net-pay-amount">${fmt(payroll.netPay)}</span>
  </div>

  ${payroll.notes ? `<div style="margin-top: 20px; padding: 12px; background: #fffbeb; border-radius: 6px; font-size: 13px; color: #92400e;"><strong>Notes:</strong> ${payroll.notes}</div>` : ""}

  <div class="footer">
    This is a computer-generated payslip. | ${clinicName} | Generated on ${new Date().toLocaleDateString("en-SG")}
  </div>

  <!-- Email notification banner -->
  <div id="emailStatus" style="display:none;position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;z-index:1000;"></div>

  <script>
    async function emailPayslip() {
      const btn = document.getElementById('emailBtn');
      const status = document.getElementById('emailStatus');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      btn.style.opacity = '0.6';
      try {
        const res = await fetch('/api/admin/payroll/${id}/email-payslip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (res.ok) {
          status.style.display = 'block';
          status.style.background = '#d1fae5';
          status.style.color = '#065f46';
          status.textContent = 'Payslip emailed to ' + data.sentTo;
          btn.textContent = 'Sent!';
          btn.style.background = '#d1fae5';
          btn.style.color = '#065f46';
        } else {
          throw new Error(data.error || 'Failed');
        }
      } catch (err) {
        status.style.display = 'block';
        status.style.background = '#fef2f2';
        status.style.color = '#dc2626';
        status.textContent = 'Failed to send: ' + err.message;
        btn.textContent = 'Retry Email';
        btn.style.opacity = '1';
        btn.disabled = false;
      }
      setTimeout(() => { status.style.display = 'none'; }, 5000);
    }
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (e) {
    console.error("Payslip GET error:", e);
    return NextResponse.json({ error: "Failed to generate payslip" }, { status: 500 });
  }
}
