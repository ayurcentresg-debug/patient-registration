import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-SG", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// GET /api/admin/ket/[id]/html — render KET as printable HTML matching MOM template
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

    const ket = await db.keyEmploymentTerms.findFirst({ where: { id } });
    if (!ket) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Parse allowances/deductions
    let allowances: { item: string; amount: number }[] = [];
    let deductions: { item: string; amount: number }[] = [];
    try { allowances = JSON.parse(ket.fixedAllowances || "[]"); } catch { /* */ }
    try { deductions = JSON.parse(ket.fixedDeductions || "[]"); } catch { /* */ }

    const totalAllowances = allowances.reduce((s, a) => s + (a.amount || 0), 0);
    const totalDeductions = deductions.reduce((s, d) => s + (d.amount || 0), 0);

    const isPartTime = ket.employmentType === "part_time";
    const leaveUnit = isPartTime ? "hrs" : "days";

    // Frequency checkboxes
    const freqCheck = (freq: string | null, val: string) =>
      freq === val ? "☑" : "☐";

    const allowanceRows = allowances.length > 0
      ? allowances.map(a => `<tr><td style="padding:3px 8px;border:1px solid #bbb;font-size:12px;">${a.item}</td><td style="padding:3px 8px;border:1px solid #bbb;font-size:12px;text-align:right;">$${(a.amount || 0).toFixed(2)}</td></tr>`).join("")
      : `<tr><td style="padding:3px 8px;border:1px solid #bbb;font-size:12px;">N.A.</td><td style="padding:3px 8px;border:1px solid #bbb;font-size:12px;text-align:right;"></td></tr>`;

    const deductionRows = deductions.length > 0
      ? deductions.map(d => `<tr><td style="padding:3px 8px;border:1px solid #bbb;font-size:12px;">${d.item}</td><td style="padding:3px 8px;border:1px solid #bbb;font-size:12px;text-align:right;">$${(d.amount || 0).toFixed(2)}</td></tr>`).join("")
      : `<tr><td style="padding:3px 8px;border:1px solid #bbb;font-size:12px;">N.A.</td><td style="padding:3px 8px;border:1px solid #bbb;font-size:12px;text-align:right;"></td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Key Employment Terms — ${ket.employeeName}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', -apple-system, sans-serif; color: #1a1a1a; background: #e8ecf1; padding: 20px; }
  .ket { width: 780px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }

  .ket-header { padding: 20px 28px 12px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; }
  .ket-header h1 { font-size: 24px; font-weight: 800; color: #1a1a1a; }
  .ket-header .subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .issued-box { border: 2px solid #a16207; padding: 10px 16px; text-align: center; border-radius: 6px; }
  .issued-box .label { font-size: 16px; font-weight: 700; color: #1a1a1a; }
  .issued-box .date { font-size: 15px; font-weight: 700; color: #a16207; margin-top: 2px; }
  .issued-box .note { font-size: 9px; color: #6b7280; margin-top: 2px; }

  .ket-body { padding: 16px 28px; display: flex; gap: 16px; }
  .ket-left { flex: 3; }
  .ket-right { flex: 2; }

  .section { margin-bottom: 14px; }
  .section-title { font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #fff; padding: 6px 10px; border-radius: 4px; margin-bottom: 6px; }
  .section-title.a { background: #a16207; }
  .section-title.b { background: #a16207; }
  .section-title.c { background: #a16207; }
  .section-title.d { background: #a16207; }
  .section-title.e { background: #a16207; }

  .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #bbb; border-radius: 4px; overflow: hidden; }
  .field-grid.cols-1 { grid-template-columns: 1fr; }
  .field { border-bottom: 1px solid #ddd; border-right: 1px solid #ddd; padding: 5px 8px; }
  .field:nth-child(even) { border-right: none; }
  .field.full { grid-column: span 2; border-right: none; }
  .field .lbl { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 600; }
  .field .val { font-size: 12px; font-weight: 600; color: #1a1a1a; margin-top: 1px; min-height: 14px; }
  .field .val.blue { color: #1e40af; }

  .check-row { font-size: 11px; color: #333; line-height: 1.6; padding: 2px 0; }

  .allowance-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .allowance-table th { padding: 3px 8px; border: 1px solid #bbb; font-size: 10px; text-transform: uppercase; background: #f3f4f6; text-align: left; font-weight: 700; }
  .allowance-table td { padding: 3px 8px; border: 1px solid #bbb; font-size: 12px; }
  .allowance-table .total td { font-weight: 700; background: #f9fafb; }

  .ket-footer { border-top: 1px solid #e5e7eb; padding: 8px 28px; text-align: center; font-size: 9px; color: #9ca3af; background: #fafafa; }
  .ket-footer a { color: #a16207; text-decoration: none; }

  .action-bar { display: flex; gap: 12px; justify-content: center; margin: 16px auto 0; width: 780px; }
  .action-bar button { padding: 10px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }

  @media print {
    body { background: #fff; padding: 0; margin: 0; }
    .ket { box-shadow: none; border-radius: 0; width: 100%; max-width: 190mm; page-break-inside: avoid; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<div class="ket">
  <div class="ket-header">
    <div>
      <h1>Key Employment Terms</h1>
      <div class="subtitle">All fields are mandatory, unless they are not applicable</div>
    </div>
    <div class="issued-box">
      <div class="label">Issued on:</div>
      <div class="date">${fmtDate(ket.issuedDate)}</div>
      <div class="note">DD / MM / YYYY</div>
      <div class="note">All information accurate as of issuance date</div>
    </div>
  </div>

  <div class="ket-body">
    <div class="ket-left">

      <!-- Section A -->
      <div class="section">
        <div class="section-title a">Section A | Employment Details</div>
        <div class="field-grid">
          <div class="field"><div class="lbl">Company Name</div><div class="val blue">${ket.companyName}</div></div>
          <div class="field"><div class="lbl">Place of Work</div><div class="val blue">${ket.placeOfWork || ""}</div></div>
          <div class="field"><div class="lbl">Employee Full Name (as in NRIC/Work Pass)</div><div class="val blue">${ket.employeeName}</div></div>
          <div class="field"><div class="lbl">Employee NRIC number/FIN</div><div class="val blue">${ket.nricFin || ""}</div></div>
          <div class="field">
            <div class="lbl">Job Title</div>
            <div class="val blue">${ket.jobTitle}</div>
            <div class="check-row">${ket.employmentType === "full_time" ? "☑" : "☐"} Full-Time Employment &nbsp;&nbsp; ${ket.employmentType === "part_time" ? "☑" : "☐"} Part-Time Employment</div>
          </div>
          <div class="field"><div class="lbl">Main Duties and Responsibilities</div><div class="val blue" style="font-style:italic;">${ket.mainDuties || ""}</div></div>
          <div class="field"><div class="lbl">Employment Start Date</div><div class="val blue">${fmtDate(ket.employmentStartDate)}</div></div>
          <div class="field"><div class="lbl">Employment End Date <span style="font-size:8px;color:#888;">(only applicable for fixed term contract)</span></div><div class="val blue">${fmtDate(ket.employmentEndDate)}</div></div>
        </div>
      </div>

      <!-- Section B -->
      <div class="section">
        <div class="section-title b">Section B | Working Hours and Rest Day</div>
        <div class="field-grid">
          <div class="field">
            <div class="lbl">Daily working hours</div>
            <div class="lbl" style="margin-top:2px;">Start and end of work:</div>
            <div class="val blue">${ket.workStartEndTime || ""}</div>
            <div class="val blue">${ket.dailyWorkingHours ? ket.dailyWorkingHours + " hours" : ""}</div>
            <div class="lbl" style="margin-top:2px;">Break during work:</div>
            <div class="val blue">${ket.breakDuration || ""}</div>
          </div>
          <div class="field">
            <div class="lbl">Number of working days per week</div>
            <div class="val blue">${ket.workingDaysPerWeek ? ket.workingDaysPerWeek + " days per week" : ""}</div>
            <div class="lbl" style="margin-top:8px;">Rest day (specify day)</div>
            <div class="val blue">${ket.restDays || ""}</div>
          </div>
        </div>
      </div>

      <!-- Section C -->
      <div class="section">
        <div class="section-title c">Section C | Salary</div>
        <div class="field-grid">
          <div class="field">
            <div class="lbl">Salary Period: <span class="val blue" style="font-size:11px;">${ket.salaryPeriod || ""}</span></div>
            <div class="check-row">
              ${freqCheck(ket.salaryFrequency, "hourly")} Hourly &nbsp;
              ${freqCheck(ket.salaryFrequency, "daily")} Daily &nbsp;
              ${freqCheck(ket.salaryFrequency, "weekly")} Weekly &nbsp;
              ${freqCheck(ket.salaryFrequency, "fortnightly")} Fortnightly &nbsp;
              ${freqCheck(ket.salaryFrequency, "monthly")} Monthly
            </div>
            <div class="lbl" style="margin-top:4px;">Overtime Payment Period: <span class="val blue" style="font-size:11px;">${ket.overtimePaymentPeriod || ""}</span></div>
            <div class="check-row" style="font-size:10px;color:#888;">
              (only if different from salary period)<br/>
              ${freqCheck(ket.overtimeFrequency, "hourly")} Hourly &nbsp;
              ${freqCheck(ket.overtimeFrequency, "daily")} Daily &nbsp;
              ${freqCheck(ket.overtimeFrequency, "weekly")} Weekly &nbsp;
              ${freqCheck(ket.overtimeFrequency, "fortnightly")} Fortnightly &nbsp;
              ${freqCheck(ket.overtimeFrequency, "monthly")} Monthly
            </div>
          </div>
          <div class="field">
            <div class="lbl">Date(s) of Salary Payment</div>
            <div class="val blue">${ket.salaryPaymentDate || ""}</div>
            <div class="lbl" style="margin-top:8px;">Date(s) of Overtime Payment</div>
            <div class="val blue">${ket.overtimePaymentDate || ""}</div>
          </div>
          <div class="field full">
            <div style="display:flex;gap:20px;flex-wrap:wrap;">
              <div><div class="lbl">Basic rate of pay:</div><div class="val blue">${ket.basicRate || ""}</div></div>
              <div><div class="lbl">Gross rate of pay:</div><div class="val blue">${ket.grossRate || ""}</div></div>
            </div>
            <div style="margin-top:4px;"><div class="lbl">Overtime rate of pay:</div><div class="val blue">${ket.overtimeRate || ""}</div></div>
          </div>
          <div class="field">
            <div class="lbl">Fixed Allowances Per Salary Period</div>
            <table class="allowance-table">
              <tr><th>Item</th><th>Allowance (S$)</th></tr>
              ${allowanceRows}
              <tr class="total"><td>Total Fixed Allowances</td><td style="text-align:right;">$${totalAllowances.toFixed(2)}</td></tr>
            </table>
          </div>
          <div class="field">
            <div class="lbl">Fixed Deductions Per Salary Period</div>
            <table class="allowance-table">
              <tr><th>Item</th><th>Deduction (S$)</th></tr>
              ${deductionRows}
              <tr class="total"><td>Total Fixed Deductions</td><td style="text-align:right;">$${totalDeductions.toFixed(2)}</td></tr>
            </table>
          </div>
          <div class="field"><div class="lbl">Other Salary-Related Components</div><div class="val blue">${ket.otherSalaryComponents || ""}</div></div>
          <div class="field"><div class="check-row">${ket.cpfApplicable ? "☑" : "☐"} CPF contributions payable</div><div style="font-size:9px;color:#888;font-style:italic;">(subject to prevailing CPF contribution rates)</div></div>
        </div>
      </div>

    </div>

    <div class="ket-right">

      <!-- Section D -->
      <div class="section">
        <div class="section-title d">Section D | Leave and Medical Benefits</div>
        <div class="field-grid cols-1">
          <div class="field">
            <div class="lbl">Types of Leaves</div>
            <div style="font-size:9px;color:#888;font-style:italic;margin:2px 0;">(Applicable if service is at least 3 months; pay will not be deducted for taking leave)</div>
            <div style="margin-top:6px;">
              <div class="lbl">Paid Annual Leave Per Year:</div>
              <div class="val blue">${ket.annualLeaveDays || ""} <span style="font-size:10px;color:#888;">(${leaveUnit})</span></div>
            </div>
            <div style="margin-top:4px;">
              <div class="lbl">Paid Outpatient Sick Leave Per Year:</div>
              <div class="val blue">${ket.sickLeaveDays || ""} <span style="font-size:10px;color:#888;">(${leaveUnit})</span></div>
            </div>
            <div style="margin-top:4px;">
              <div class="lbl">Paid Hospitalisation Leave Per Year:</div>
              <div class="val blue">${ket.hospitalisationLeaveDays || ""} <span style="font-size:10px;color:#888;">(${leaveUnit})</span></div>
            </div>
            <div style="margin-top:4px;">
              <div class="lbl">Others:</div>
              <div class="val blue" style="font-style:italic;">${ket.otherLeave || ""}</div>
            </div>
            <div style="margin-top:6px;font-size:8px;color:#888;font-style:italic;">
              (Note that paid hospitalisation leave per year is inclusive of paid outpatient sick leave. Leave entitlement for part-time employees may be pro-rated based on hours.)
            </div>
          </div>
          <div class="field">
            <div class="lbl">Medical Benefits</div>
            <div class="val blue" style="font-style:italic;">${ket.medicalBenefits || ""}</div>
          </div>
        </div>
      </div>

      <!-- Section E -->
      <div class="section">
        <div class="section-title e">Section E | Others</div>
        <div class="field-grid cols-1">
          <div class="field">
            <div style="display:flex;gap:12px;">
              <div style="flex:1;"><div class="lbl">Length of probation:</div><div class="val blue">${ket.probationLength || ""}</div></div>
              <div style="flex:1;"><div class="lbl">Notice Period for Termination of Employment</div><div style="font-size:8px;color:#888;font-style:italic;">(initiated by either party whereby the length shall be the same)</div></div>
            </div>
            <div style="display:flex;gap:12px;margin-top:4px;">
              <div style="flex:1;"><div class="lbl">Probation Start Date:</div><div class="val blue">${fmtDate(ket.probationStartDate)}</div></div>
              <div style="flex:1;"><div class="val blue">${ket.noticePeriod || ""}</div></div>
            </div>
            <div style="margin-top:4px;">
              <div class="lbl">Probation End Date:</div><div class="val blue">${fmtDate(ket.probationEndDate)}</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <div class="ket-footer">
    Please refer to <a href="https://www.mom.gov.sg">www.mom.gov.sg</a> for more details on employment laws, leave benefits and soft copy of the KETs template.
  </div>
</div>

<div class="action-bar no-print">
  <button onclick="window.print()" style="background:#a16207;color:white;">Print / Save PDF</button>
  <button onclick="window.close()" style="background:#e2e8f0;color:#475569;">Close</button>
</div>

</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    console.error("KET HTML error:", e);
    return NextResponse.json({ error: "Failed to generate KET" }, { status: 500 });
  }
}
