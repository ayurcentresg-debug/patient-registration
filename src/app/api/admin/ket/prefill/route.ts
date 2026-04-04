import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { formatCurrencyByCountry } from "@/lib/payroll-rules";

// GET /api/admin/ket/prefill?userId=xxx — pre-fill KET form from staff + salary data
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Get clinic info
    let companyName = "AYUR GATE";
    let placeOfWork = "";
    if (clinicId) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, address: true, city: true, country: true },
      });
      if (clinic) {
        companyName = clinic.name;
        placeOfWork = [clinic.address, clinic.city, clinic.country].filter(Boolean).join(", ");
      }
    }

    // Get salary config
    const salary = await db.salaryConfig.findFirst({ where: { userId } });

    const fmt = (n: number) => formatCurrencyByCountry(n, "SG");
    const isHourly = salary?.salaryType === "hourly";
    const baseSalary = salary?.baseSalary || 0;
    const hourlyRate = salary?.hourlyRate || 0;

    // Parse allowances/deductions from salary config
    let allowances: { name: string; amount: number }[] = [];
    let deductions: { name: string; amount: number }[] = [];
    try { allowances = JSON.parse(salary?.allowances || "[]"); } catch { /* */ }
    try { deductions = JSON.parse(salary?.deductions || "[]"); } catch { /* */ }

    const totalAllowances = allowances.reduce((s, a) => s + a.amount, 0);
    const grossRate = isHourly
      ? `${fmt(hourlyRate)}/hr`
      : `${fmt(baseSalary + totalAllowances)} per month`;

    // Calculate OT rate (1.5x hourly basic)
    const monthlyHourlyRate = baseSalary / (26 * 8); // ~26 working days, 8 hrs
    const otHourlyRate = isHourly ? hourlyRate * 1.5 : monthlyHourlyRate * 1.5;

    const prefill = {
      userId,
      companyName,
      placeOfWork,
      employeeName: user.name,
      nricFin: user.nricFin || "",
      jobTitle: user.jobTitle || user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || "",
      employmentType: user.employmentType || "full_time",
      mainDuties: user.mainDuties || "",
      employmentStartDate: user.dateOfJoining ? new Date(user.dateOfJoining).toISOString().split("T")[0] : "",
      employmentEndDate: "",
      // Section B defaults
      dailyWorkingHours: "8",
      workStartEndTime: "Mon-Fri: 9am-6pm, Sat: 9am-1pm",
      breakDuration: "1 hour",
      workingDaysPerWeek: "5.5",
      restDays: "Sunday",
      // Section C
      salaryPeriod: "First to last day of the month",
      salaryFrequency: isHourly ? "hourly" : "monthly",
      overtimePaymentPeriod: "",
      overtimeFrequency: "",
      salaryPaymentDate: "2nd of every calendar month",
      overtimePaymentDate: "2nd of every calendar month",
      basicRate: isHourly ? `${fmt(hourlyRate)}/hr` : `${fmt(baseSalary)} per month`,
      grossRate,
      overtimeRate: `1.5x hourly basic rate (${fmt(otHourlyRate)})`,
      fixedAllowances: JSON.stringify(allowances.map(a => ({ item: a.name, amount: a.amount }))),
      fixedDeductions: JSON.stringify(deductions.map(d => ({ item: d.name, amount: d.amount }))),
      otherSalaryComponents: "",
      cpfApplicable: user.residencyStatus !== "foreigner",
      // Section D defaults
      annualLeaveDays: "14",
      sickLeaveDays: "14",
      hospitalisationLeaveDays: "60",
      otherLeave: "",
      medicalBenefits: "Full reimbursement for medical examination fee.",
      // Section E defaults
      probationLength: "3 months",
      probationStartDate: user.dateOfJoining ? new Date(user.dateOfJoining).toISOString().split("T")[0] : "",
      probationEndDate: "",
      noticePeriod: "1 month notice or 1 month salary in lieu of notice",
    };

    return NextResponse.json(prefill);
  } catch (e) {
    console.error("KET prefill error:", e);
    return NextResponse.json({ error: "Failed to prefill KET" }, { status: 500 });
  }
}
