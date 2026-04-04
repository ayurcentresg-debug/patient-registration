import { NextResponse } from "next/server";

// GET /api/public/sample-payslip — compact half-A4 colorful Singapore payslip
export async function GET() {
  const clinicName = "Ayur Centre Pte. Ltd.";
  const clinicAddress = "84 Bedok North Street 4 #01-17, Singapore 460084";
  const clinicPhone = "6445 0072";
  const clinicUEN = "201912345A";
  const staffName = "Karthikeyan";
  const staffId = "A10001";
  const role = "Admin";
  const period = "April 2026";
  const periodStart = "1 Apr 2026";
  const periodEnd = "30 Apr 2026";
  const payDate = "28 Apr 2026";
  const bankInfo = "DBS Bank ****4521";
  const fmt = (n: number) => `S$${n.toLocaleString("en-SG", { minimumFractionDigits: 2 })}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Payslip - ${staffName} - ${period}</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', -apple-system, sans-serif;
    color: #1a1a1a;
    background: #e8ecf1;
    padding: 20px;
  }
  .payslip {
    width: 720px;
    margin: 0 auto;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  }

  /* ── Header ── */
  .header {
    background: #ffffff;
    padding: 20px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #e5e7eb;
  }
  .logo-area { display: flex; align-items: center; gap: 12px; }
  .logo-icon {
    width: 40px; height: 40px;
    background: #14532d;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 800; font-size: 16px;
  }
  .company-info h1 { font-size: 20px; font-weight: 700; color: #14532d; letter-spacing: 0.3px; }
  .company-info p { font-size: 12px; color: #4b5563; margin-top: 2px; }
  .payslip-badge {
    text-align: right;
  }
  .payslip-badge h2 { font-size: 22px; font-weight: 800; color: #374151; letter-spacing: 2px; }
  .payslip-badge .period-text { font-size: 13px; color: #6b7280; margin-top: 3px; }

  /* ── Employee Row ── */
  .emp-row {
    display: flex;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    padding: 14px 24px;
    gap: 10px;
  }
  .emp-item { flex: 1; }
  .emp-item .lbl { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
  .emp-item .val { font-size: 15px; font-weight: 700; color: #1f2937; margin-top: 2px; }

  /* ── Body ── */
  .body { padding: 16px 24px 10px; }

  /* ── Two Column Layout ── */
  .two-col { display: flex; gap: 14px; margin-bottom: 12px; }
  .col { flex: 1; }

  /* ── Section ── */
  .section {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
  }
  .section-head {
    padding: 8px 14px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }
  .section-head.earn { background: #f0fdf4; color: #166534; border-bottom: 1px solid #e5e7eb; }
  .section-head.deduct { background: #fff7ed; color: #9a3412; border-bottom: 1px solid #e5e7eb; }

  .section table { width: 100%; border-collapse: collapse; }
  .section td { padding: 6px 14px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
  .section td:last-child { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  .section tr:last-child td { border-bottom: none; }

  .section .subtotal td {
    font-weight: 700;
    font-size: 14px;
    border-top: 1.5px solid;
    border-bottom: none;
    padding: 8px 14px;
  }
  .section .subtotal.earn td { border-top-color: #d1d5db; color: #166534; background: #f9fafb; }
  .section .subtotal.deduct td { border-top-color: #d1d5db; color: #9a3412; background: #f9fafb; }

  /* ── Net Pay ── */
  .net-pay-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f9fafb;
    border: 1.5px solid #d1d5db;
    color: #1f2937;
    padding: 12px 18px;
    border-radius: 8px;
    margin-bottom: 12px;
  }
  .net-pay-bar .label { font-size: 16px; font-weight: 600; }
  .net-pay-bar .amount { font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }

  /* ── CPF & Payment Row ── */
  .info-row {
    display: flex;
    gap: 12px;
    margin-bottom: 10px;
  }
  .info-card {
    flex: 1;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 12px;
  }
  .cpf-card { background: #f9fafb; border: 1px solid #e5e7eb; }
  .cpf-card .title { color: #4b5563; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .cpf-card table { width: 100%; }
  .cpf-card td { padding: 3px 0; font-size: 12px; color: #374151; border: none; }
  .cpf-card td:last-child { text-align: right; font-weight: 600; }

  .pay-card { background: #f9fafb; border: 1px solid #e5e7eb; }
  .pay-card .title { color: #4b5563; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .pay-card .detail { font-size: 12px; color: #374151; line-height: 1.6; }
  .pay-card .detail strong { font-weight: 700; }

  .days-card { background: #faf5ff; border: 1px solid #e9d5ff; }
  .days-card .title { color: #7c3aed; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .days-row { display: flex; gap: 12px; }
  .days-item { text-align: center; }
  .days-item .num { font-size: 13px; font-weight: 800; color: #7c3aed; }
  .days-item .txt { font-size: 7px; color: #6b21a8; text-transform: uppercase; letter-spacing: 0.3px; }

  /* ── Footer ── */
  .slip-footer {
    border-top: 1px solid #e5e7eb;
    padding: 8px 24px;
    text-align: center;
    font-size: 10px;
    color: #9ca3af;
    background: #fafafa;
  }

  /* ── Action Bar (no print) ── */
  .action-bar {
    display: flex; gap: 12px; justify-content: center; margin: 20px auto 0;
    width: 720px;
  }
  .action-bar button {
    padding: 10px 24px; border: none; border-radius: 8px;
    font-size: 14px; font-weight: 600; cursor: pointer;
  }
  .sample-flag {
    text-align: center; margin-bottom: 10px;
    font-size: 11px; font-weight: 700; color: #dc2626;
    letter-spacing: 1px;
  }

  @media print {
    body { background: #fff; padding: 0; margin: 0; }
    .payslip {
      box-shadow: none;
      border-radius: 0;
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .no-print { display: none !important; }
    .sample-flag { display: none; }
  }
</style>
</head>
<body>

  <div class="sample-flag no-print">SAMPLE PAYSLIP — SINGAPORE</div>

  <!-- ═══ PAYSLIP CARD ═══ -->
  <div class="payslip">

    <!-- Header -->
    <div class="header">
      <div class="logo-area">
        <div class="logo-icon">AC</div>
        <div class="company-info">
          <h1>${clinicName}</h1>
          <p>${clinicAddress}</p>
          <p>Tel: ${clinicPhone} | UEN: ${clinicUEN}</p>
        </div>
      </div>
      <div class="payslip-badge">
        <h2>PAYSLIP</h2>
        <div class="period-text">${period}</div>
      </div>
    </div>

    <!-- Employee Info Strip -->
    <div class="emp-row">
      <div class="emp-item">
        <div class="lbl">Employee</div>
        <div class="val">${staffName}</div>
      </div>
      <div class="emp-item">
        <div class="lbl">Staff ID</div>
        <div class="val">${staffId}</div>
      </div>
      <div class="emp-item">
        <div class="lbl">Pay Date</div>
        <div class="val">${payDate}</div>
      </div>
      <div class="emp-item">
        <div class="lbl">Salary Period</div>
        <div class="val">${periodStart} – ${periodEnd}</div>
      </div>
    </div>

    <div class="body">

      <!-- Days + Two Column Earnings/Deductions -->
      <div class="two-col">
        <!-- Earnings -->
        <div class="col">
          <div class="section">
            <div class="section-head earn">Earnings</div>
            <table>
              <tr><td>Basic Salary</td><td>${fmt(6000)}</td></tr>
              <tr><td>Allowances</td><td>${fmt(0)}</td></tr>
              <tr><td>Additional Pay (Bonus/PH/Rest)</td><td>${fmt(0)}</td></tr>
              <tr><td>Overtime (0 hrs)</td><td>${fmt(0)}</td></tr>
              <tr class="subtotal earn"><td>Gross Pay</td><td>${fmt(6000)}</td></tr>
            </table>
          </div>
        </div>

        <!-- Deductions -->
        <div class="col">
          <div class="section">
            <div class="section-head deduct">Deductions</div>
            <table>
              <tr><td>CPF Employee (20%)</td><td>${fmt(1200)}</td></tr>
              <tr><td>SHG Fund (SINDA)</td><td>${fmt(9)}</td></tr>
              <tr class="subtotal deduct"><td>Total Deductions</td><td>${fmt(1209)}</td></tr>
            </table>
          </div>
        </div>
      </div>

      <!-- Net Pay -->
      <div class="net-pay-bar">
        <div class="label">NET PAY</div>
        <div class="amount">${fmt(4791)}</div>
      </div>

      <!-- CPF Employer + Payment Details -->
      <div class="info-row">
        <div class="info-card cpf-card">
          <div class="title">Employer CPF Contributions (not deducted)</div>
          <table>
            <tr><td>CPF Employer (17%)</td><td>${fmt(1020)}</td></tr>
            <tr><td>SDL (0.25%, max S$11.25)</td><td>${fmt(11.25)}</td></tr>
            <tr style="border-top:1px solid #93c5fd;"><td style="font-weight:700;">Total Employer Cost</td><td style="font-weight:800;">${fmt(1031.25)}</td></tr>
          </table>
        </div>
        <div class="info-card pay-card">
          <div class="title">Payment Details</div>
          <div class="detail">
            <strong>Mode:</strong> Bank Transfer<br/>
            <strong>Bank:</strong> ${bankInfo}<br/>
            <strong>Date:</strong> ${payDate}<br/>
            <strong>Status:</strong> <span style="color:#065f46;font-weight:700;">Paid</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div class="slip-footer">
      Computer-generated payslip — ${clinicName} — ${new Date().toLocaleDateString("en-SG")}
    </div>

  </div>

  <!-- Action Buttons -->
  <div class="action-bar no-print">
    <button onclick="window.print()" style="background:#14532d;color:white;">Print / Save PDF</button>
    <button onclick="alert('Email feature works with real payroll records from Admin > Payroll')" style="background:#1e40af;color:white;">Email to Staff</button>
    <button onclick="window.close()" style="background:#e2e8f0;color:#475569;">Close</button>
  </div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
