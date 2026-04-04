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

// GET /api/admin/payroll/[id]/payslip — generate compact colorful HTML payslip
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

    const user = await db.user.findFirst({
      where: { id: payroll.userId },
      select: { name: true, role: true, email: true, staffIdNumber: true },
    });

    // Get clinic info
    let clinicName = "AYUR GATE";
    let clinicAddress = "";
    let clinicLogo = "";
    let clinicPhone = "";
    if (clinicId) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, address: true, city: true, country: true, logoUrl: true, phone: true },
      });
      if (clinic) {
        clinicName = clinic.name;
        clinicAddress = [clinic.address, clinic.city, clinic.country].filter(Boolean).join(", ");
        clinicLogo = clinic.logoUrl || "";
        clinicPhone = clinic.phone || "";
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

    // Build earnings rows — MOM requires: basic, allowances, additional payments, OT (always shown)
    const totalAllowances = allowances.reduce((s, a) => s + a.amount, 0);
    const additionalPay = (payroll.bonus || 0) + (payroll.commission || 0);
    const earningsRows = [
      `<tr><td>Basic Salary</td><td>${fmt(payroll.baseSalary)}</td></tr>`,
      ...allowances.map((a) => `<tr><td>${a.name}</td><td>${fmt(a.amount)}</td></tr>`),
      allowances.length === 0 ? `<tr><td>Allowances</td><td>${fmt(0)}</td></tr>` : "",
      `<tr><td>Additional Pay (Bonus/PH/Rest)</td><td>${fmt(additionalPay)}</td></tr>`,
      `<tr><td>Overtime</td><td>${fmt(payroll.overtime || 0)}</td></tr>`,
    ].filter(Boolean).join("");

    // Build deduction rows
    const deductionRows = [
      ...(employeeContribs.length > 0
        ? employeeContribs.map((c) => `<tr><td>${c.name}${c.rate ? ` (${c.rate}%)` : ""}</td><td>${fmt(c.amount)}</td></tr>`)
        : [`<tr><td>CPF Employee</td><td>${fmt(payroll.cpfEmployee)}</td></tr>`]),
      taxWithholding > 0 ? `<tr><td>Tax Withholding</td><td>${fmt(taxWithholding)}</td></tr>` : "",
      payroll.unpaidLeave > 0 ? `<tr><td>Unpaid Leave (${payroll.unpaidLeaveDays}d)</td><td>${fmt(payroll.unpaidLeave)}</td></tr>` : "",
      ...deductions.map((d) => `<tr><td>${d.name}</td><td>${fmt(d.amount)}</td></tr>`),
    ].filter(Boolean).join("");

    // Employer rows
    const employerRowsHtml = (employerContribs.length > 0
      ? employerContribs.map((c) => `<tr><td>${c.name}${c.rate ? ` (${c.rate}%)` : ""}</td><td>${fmt(c.amount)}</td></tr>`)
      : [`<tr><td>CPF Employer</td><td>${fmt(payroll.cpfEmployer)}</td></tr>`]
    ).join("");

    const totalEmployerCost = employerContribs.length > 0
      ? employerContribs.reduce((s, c) => s + c.amount, 0)
      : payroll.cpfEmployer;

    const logoHtml = clinicLogo
      ? `<img src="${clinicLogo}" alt="" style="max-height:40px;max-width:150px;display:block;" />`
      : `<div style="width:40px;height:40px;background:#14532d;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px;">${clinicName.charAt(0)}${clinicName.split(" ")[1]?.charAt(0) || ""}</div>`;

    // Salary period dates
    const [periodYear, periodMonth] = payroll.period.split("-");
    const periodStartDate = new Date(parseInt(periodYear), parseInt(periodMonth) - 1, 1);
    const periodEndDate = new Date(parseInt(periodYear), parseInt(periodMonth), 0);
    const periodStartStr = periodStartDate.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
    const periodEndStr = periodEndDate.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });

    const paidDate = payroll.paidAt
      ? new Date(payroll.paidAt).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })
      : "Pending";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payslip - ${user?.name || "Staff"} - ${formatPeriodLabel(payroll.period)}</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', -apple-system, sans-serif; color: #1a1a1a; background: #e8ecf1; padding: 20px; }
  .payslip { width: 720px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }

  .header { background: #ffffff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; }
  .logo-area { display: flex; align-items: center; gap: 12px; }
  .company-info h1 { font-size: 20px; font-weight: 700; color: #14532d; letter-spacing: 0.3px; }
  .company-info p { font-size: 12px; color: #4b5563; margin-top: 2px; }
  .payslip-badge { text-align: right; }
  .payslip-badge h2 { font-size: 22px; font-weight: 800; color: #374151; letter-spacing: 2px; }
  .payslip-badge .period-text { font-size: 13px; color: #6b7280; margin-top: 3px; }

  .emp-row { display: flex; background: #f9fafb; border-bottom: 1px solid #e5e7eb; padding: 14px 24px; gap: 10px; }
  .emp-item { flex: 1; }
  .emp-item .lbl { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
  .emp-item .val { font-size: 15px; font-weight: 700; color: #1f2937; margin-top: 2px; }

  .body { padding: 16px 24px 10px; }
  .two-col { display: flex; gap: 14px; margin-bottom: 12px; }
  .col { flex: 1; }

  .section { border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
  .section-head { padding: 8px 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; }
  .section-head.earn { background: #f0fdf4; color: #166534; border-bottom: 1px solid #e5e7eb; }
  .section-head.deduct { background: #fff7ed; color: #9a3412; border-bottom: 1px solid #e5e7eb; }
  .section table { width: 100%; border-collapse: collapse; }
  .section td { padding: 6px 14px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
  .section td:last-child { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  .section tr:last-child td { border-bottom: none; }
  .section .subtotal td { font-weight: 700; font-size: 14px; border-top: 1.5px solid; border-bottom: none; padding: 8px 14px; }
  .section .subtotal.earn td { border-top-color: #d1d5db; color: #166534; background: #f9fafb; }
  .section .subtotal.deduct td { border-top-color: #d1d5db; color: #9a3412; background: #f9fafb; }

  .net-pay-bar { display: flex; justify-content: space-between; align-items: center; background: #f9fafb; border: 1.5px solid #d1d5db; color: #1f2937; padding: 12px 18px; border-radius: 8px; margin-bottom: 12px; }
  .net-pay-bar .label { font-size: 16px; font-weight: 600; }
  .net-pay-bar .amount { font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }

  .info-row { display: flex; gap: 12px; margin-bottom: 10px; }
  .info-card { flex: 1; border-radius: 8px; padding: 10px 14px; font-size: 12px; }
  .cpf-card { background: #f9fafb; border: 1px solid #e5e7eb; }
  .cpf-card .title { color: #4b5563; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .cpf-card table { width: 100%; }
  .cpf-card td { padding: 3px 0; font-size: 12px; color: #374151; border: none; }
  .cpf-card td:last-child { text-align: right; font-weight: 600; }
  .pay-card { background: #f9fafb; border: 1px solid #e5e7eb; }
  .pay-card .title { color: #4b5563; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .pay-card .detail { font-size: 12px; color: #374151; line-height: 1.6; }
  .pay-card .detail strong { font-weight: 700; }

  .slip-footer { border-top: 1px solid #e5e7eb; padding: 8px 24px; text-align: center; font-size: 10px; color: #9ca3af; background: #fafafa; }
  .action-bar { display: flex; gap: 12px; justify-content: center; margin: 20px auto 0; width: 720px; }
  .action-bar button { padding: 10px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }

  @media print {
    body { background: #fff; padding: 0; margin: 0; }
    .payslip { box-shadow: none; border-radius: 0; width: 100%; max-width: 190mm; margin: 0 auto; page-break-inside: avoid; break-inside: avoid; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

  <div class="payslip">
    <div class="header">
      <div class="logo-area">
        ${logoHtml}
        <div class="company-info">
          <h1>${clinicName}</h1>
          <p>${clinicAddress}</p>
          ${clinicPhone ? `<p>Tel: ${clinicPhone}</p>` : ""}
        </div>
      </div>
      <div class="payslip-badge">
        <h2>PAYSLIP</h2>
        <div class="period-text">${formatPeriodLabel(payroll.period)}</div>
      </div>
    </div>

    <div class="emp-row">
      <div class="emp-item"><div class="lbl">Employee</div><div class="val">${user?.name || "N/A"}</div></div>
      <div class="emp-item"><div class="lbl">Staff ID</div><div class="val">${user?.staffIdNumber || "N/A"}</div></div>
      <div class="emp-item"><div class="lbl">Designation</div><div class="val">${(user?.role || "staff").charAt(0).toUpperCase() + (user?.role || "staff").slice(1)}</div></div>
      <div class="emp-item"><div class="lbl">Pay Date</div><div class="val">${paidDate}</div></div>
      <div class="emp-item"><div class="lbl">Salary Period</div><div class="val">${periodStartStr} – ${periodEndStr}</div></div>
    </div>

    <div class="body">
      <div class="two-col">
        <div class="col">
          <div class="section">
            <div class="section-head earn">Earnings</div>
            <table>
              ${earningsRows}
              <tr class="subtotal earn"><td>Gross Pay</td><td>${fmt(payroll.grossPay)}</td></tr>
            </table>
          </div>
        </div>
        <div class="col">
          <div class="section">
            <div class="section-head deduct">Deductions</div>
            <table>
              ${deductionRows}
              <tr class="subtotal deduct"><td>Total Deductions</td><td>${fmt(payroll.totalDeductions)}</td></tr>
            </table>
          </div>
        </div>
      </div>

      <div class="net-pay-bar">
        <div class="label">NET PAY</div>
        <div class="amount">${fmt(payroll.netPay)}</div>
      </div>

      <div class="info-row">
        <div class="info-card cpf-card">
          <div class="title">Employer Contributions (not deducted)</div>
          <table>
            ${employerRowsHtml}
            <tr style="border-top:1px solid #d1d5db;"><td style="font-weight:700;">Total Employer Cost</td><td style="font-weight:800;">${fmt(totalEmployerCost)}</td></tr>
          </table>
        </div>
        <div class="info-card pay-card">
          <div class="title">Payment Details</div>
          <div class="detail">
            <strong>Date:</strong> ${paidDate}<br/>
            <strong>Status:</strong> <span style="color:${payroll.status === "paid" ? "#065f46" : "#92400e"};font-weight:700;">${payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}</span>
            ${payroll.notes ? `<br/><strong>Note:</strong> ${payroll.notes}` : ""}
          </div>
        </div>
      </div>
    </div>

    <div class="slip-footer">
      Computer-generated payslip &mdash; ${clinicName} &mdash; ${new Date().toLocaleDateString("en-SG")}
    </div>
  </div>

  <div class="action-bar no-print">
    <button onclick="window.print()" style="background:#14532d;color:white;">Print / Save PDF</button>
    <button onclick="emailPayslip()" id="emailBtn" style="background:#1e40af;color:white;">Email to Staff</button>
    <button onclick="window.close()" style="background:#e2e8f0;color:#475569;">Close</button>
  </div>

  <div id="emailStatus" style="display:none;position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;z-index:1000;" class="no-print"></div>

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
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    console.error("Payslip GET error:", e);
    return NextResponse.json({ error: "Failed to generate payslip" }, { status: 500 });
  }
}
