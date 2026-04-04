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

    // Build earnings rows
    const earningsRows = [
      `<tr><td>Basic Salary</td><td>${fmt(payroll.baseSalary)}</td></tr>`,
      ...allowances.map((a) => `<tr><td>${a.name}</td><td>${fmt(a.amount)}</td></tr>`),
      payroll.commission > 0 ? `<tr><td>Commission</td><td>${fmt(payroll.commission)}</td></tr>` : "",
      payroll.overtime > 0 ? `<tr><td>Overtime</td><td>${fmt(payroll.overtime)}</td></tr>` : "",
      payroll.bonus > 0 ? `<tr><td>Bonus</td><td>${fmt(payroll.bonus)}</td></tr>` : "",
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
      ? `<img src="${clinicLogo}" alt="" style="max-height:36px;max-width:150px;margin-bottom:4px;display:block;" />`
      : `<div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;border:1.5px solid rgba(255,255,255,0.3);">${clinicName.charAt(0)}${clinicName.split(" ")[1]?.charAt(0) || ""}</div>`;

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
  .payslip { width: 580px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
  .header { background: linear-gradient(135deg, #14532d 0%, #166534 40%, #15803d 100%); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; }
  .logo-area { display: flex; align-items: center; gap: 10px; }
  .company-info h1 { font-size: 15px; font-weight: 700; color: #fff; }
  .company-info p { font-size: 9px; color: rgba(255,255,255,0.75); margin-top: 1px; }
  .payslip-badge h2 { font-size: 18px; font-weight: 800; color: #fff; letter-spacing: 2px; text-align: right; }
  .payslip-badge .period-text { font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 2px; text-align: right; }
  .sg-badge { display: inline-block; margin-top: 3px; font-size: 8px; font-weight: 700; color: #14532d; background: #bbf7d0; padding: 2px 7px; border-radius: 10px; letter-spacing: 0.5px; }
  .emp-row { display: flex; background: #f0fdf4; border-bottom: 1px solid #dcfce7; padding: 7px 18px; gap: 8px; }
  .emp-item { flex: 1; }
  .emp-item .lbl { font-size: 7px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
  .emp-item .val { font-size: 11px; font-weight: 700; color: #14532d; margin-top: 1px; }
  .body { padding: 10px 18px 6px; }
  .info-row { display: flex; gap: 8px; margin-bottom: 8px; }
  .info-card { flex: 1; border-radius: 6px; padding: 6px 10px; font-size: 10px; }
  .days-card { background: #faf5ff; border: 1px solid #e9d5ff; }
  .days-card .title { color: #7c3aed; font-weight: 700; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .days-row { display: flex; gap: 12px; }
  .days-item { text-align: center; }
  .days-item .num { font-size: 13px; font-weight: 800; color: #7c3aed; }
  .days-item .txt { font-size: 7px; color: #6b21a8; text-transform: uppercase; }
  .two-col { display: flex; gap: 10px; margin-bottom: 8px; }
  .col { flex: 1; }
  .section { border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
  .section-head { padding: 4px 10px; font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; }
  .section-head.earn { background: #14532d; color: #fff; }
  .section-head.deduct { background: #7c2d12; color: #fff; }
  .section table { width: 100%; border-collapse: collapse; }
  .section td { padding: 2px 10px; font-size: 10px; border-bottom: 1px solid #f3f4f6; }
  .section td:last-child { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  .section tr:last-child td { border-bottom: none; }
  .section .subtotal td { font-weight: 700; font-size: 10px; border-top: 1.5px solid; border-bottom: none; padding: 3px 10px; }
  .section .subtotal.earn td { border-top-color: #14532d; color: #14532d; background: #f0fdf4; }
  .section .subtotal.deduct td { border-top-color: #7c2d12; color: #7c2d12; background: #fef2f2; }
  .net-pay-bar { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #14532d, #166534); color: #fff; padding: 7px 14px; border-radius: 6px; margin-bottom: 6px; }
  .net-pay-bar .label { font-size: 12px; font-weight: 600; }
  .net-pay-bar .amount { font-size: 18px; font-weight: 800; }
  .cpf-card { background: #eff6ff; border: 1px solid #bfdbfe; }
  .cpf-card .title { color: #1e40af; font-weight: 700; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .cpf-card td { padding: 1px 0; font-size: 9px; color: #1e3a5f; border: none; }
  .cpf-card td:last-child { text-align: right; font-weight: 600; }
  .pay-card { background: #fefce8; border: 1px solid #fde68a; }
  .pay-card .title { color: #92400e; font-weight: 700; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .pay-card .detail { font-size: 9px; color: #78350f; line-height: 1.5; }
  .pay-card .detail strong { font-weight: 700; }
  .slip-footer { border-top: 1px solid #e5e7eb; padding: 4px 16px; text-align: center; font-size: 7px; color: #9ca3af; background: #fafafa; }
  .action-bar { display: flex; gap: 10px; justify-content: center; margin: 16px auto 0; width: 580px; }
  .action-bar button { padding: 8px 20px; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
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
        <span class="sg-badge">${countryConfig.label} &middot; ${countryConfig.currency}</span>
      </div>
    </div>

    <div class="emp-row">
      <div class="emp-item"><div class="lbl">Employee</div><div class="val">${user?.name || "N/A"}</div></div>
      <div class="emp-item"><div class="lbl">Staff ID</div><div class="val">${user?.staffIdNumber || "N/A"}</div></div>
      <div class="emp-item"><div class="lbl">Designation</div><div class="val">${(user?.role || "staff").charAt(0).toUpperCase() + (user?.role || "staff").slice(1)}</div></div>
      <div class="emp-item"><div class="lbl">Status</div><div class="val">${payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}</div></div>
    </div>

    <div class="body">
      <div class="info-row" style="margin-bottom:8px;">
        <div class="info-card days-card" style="flex:1;">
          <div class="title">Attendance</div>
          <div class="days-row">
            <div class="days-item"><div class="num">${payroll.workingDays}</div><div class="txt">Working</div></div>
            <div class="days-item"><div class="num">${payroll.leaveDays}</div><div class="txt">Leave</div></div>
            <div class="days-item"><div class="num">${payroll.unpaidLeaveDays}</div><div class="txt">Unpaid</div></div>
          </div>
        </div>
      </div>

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
            <tr style="border-top:1px solid #93c5fd;"><td style="font-weight:700;">Total Employer Cost</td><td style="font-weight:800;">${fmt(totalEmployerCost)}</td></tr>
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
