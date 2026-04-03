import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

function formatCurrency(amount: number) {
  return `S$${amount.toFixed(2)}`;
}

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
    if (clinicId) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, address: true, city: true, country: true },
      });
      if (clinic) {
        clinicName = clinic.name;
        clinicAddress = [clinic.address, clinic.city, clinic.country].filter(Boolean).join(", ");
      }
    }

    const allowances: { name: string; amount: number }[] = JSON.parse(
      payroll.allowanceBreakdown || "[]"
    );
    const deductions: { name: string; amount: number }[] = JSON.parse(
      payroll.deductionBreakdown || "[]"
    );

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
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${clinicName}</div>
      ${clinicAddress ? `<div class="company-address">${clinicAddress}</div>` : ""}
    </div>
    <div>
      <div class="payslip-title">PAYSLIP</div>
      <div class="period">${formatPeriodLabel(payroll.period)}</div>
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
      <tr><td>Base Salary</td><td class="amount">${formatCurrency(payroll.baseSalary)}</td></tr>
      ${allowances.map((a) => `<tr><td>${a.name}</td><td class="amount">${formatCurrency(a.amount)}</td></tr>`).join("")}
      ${payroll.commission > 0 ? `<tr><td>Commission</td><td class="amount">${formatCurrency(payroll.commission)}</td></tr>` : ""}
      ${payroll.overtime > 0 ? `<tr><td>Overtime</td><td class="amount">${formatCurrency(payroll.overtime)}</td></tr>` : ""}
      ${payroll.bonus > 0 ? `<tr><td>Bonus</td><td class="amount">${formatCurrency(payroll.bonus)}</td></tr>` : ""}
      <tr class="total-row"><td>Gross Pay</td><td class="amount">${formatCurrency(payroll.grossPay)}</td></tr>
    </tbody>
  </table>

  <div class="section-title">Deductions</div>
  <table>
    <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
    <tbody>
      <tr><td>CPF - Employee (${payroll.cpfEmployee > 0 ? ((payroll.cpfEmployee / (payroll.baseSalary + payroll.totalAllowances)) * 100).toFixed(1) : "0"}%)</td><td class="amount">${formatCurrency(payroll.cpfEmployee)}</td></tr>
      ${payroll.unpaidLeave > 0 ? `<tr><td>Unpaid Leave (${payroll.unpaidLeaveDays} days)</td><td class="amount">${formatCurrency(payroll.unpaidLeave)}</td></tr>` : ""}
      ${deductions.map((d) => `<tr><td>${d.name}</td><td class="amount">${formatCurrency(d.amount)}</td></tr>`).join("")}
      <tr class="total-row"><td>Total Deductions</td><td class="amount">${formatCurrency(payroll.totalDeductions)}</td></tr>
    </tbody>
  </table>

  <div style="margin-top: 12px; padding: 10px 14px; background: #f0fdf4; border-radius: 6px; font-size: 13px; color: #166534;">
    <strong>Employer CPF Contribution:</strong> ${formatCurrency(payroll.cpfEmployer)}
    <span style="color: #94a3b8; margin-left: 8px;">(not deducted from salary)</span>
  </div>

  <div class="net-pay">
    <span class="net-pay-label">Net Pay</span>
    <span class="net-pay-amount">${formatCurrency(payroll.netPay)}</span>
  </div>

  ${payroll.notes ? `<div style="margin-top: 20px; padding: 12px; background: #fffbeb; border-radius: 6px; font-size: 13px; color: #92400e;"><strong>Notes:</strong> ${payroll.notes}</div>` : ""}

  <div class="footer">
    This is a computer-generated payslip. | ${clinicName} | Generated on ${new Date().toLocaleDateString("en-SG")}
  </div>
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
