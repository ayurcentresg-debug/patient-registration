"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { calculateStatutory, getMOMSalaryBreakdown, isPartIVCovered, MOM_PART4_CAP_NON_WORKMAN, MOM_PART4_CAP_WORKMAN } from "@/lib/payroll-rules";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AllowanceItem {
  name: string;
  amount: number;
  taxable: boolean;
  cpfable: boolean;
}

interface DeductionItem {
  name: string;
  amount: number;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  staffIdNumber: string | null;
  specialization: string | null;
  department: string | null;
  dateOfBirth: string | null;
  ethnicity: string | null;
  residencyStatus: string | null;
  prStartDate: string | null;
  employmentType: string;
  isWorkman: boolean;
  weeklyContractedHours: number;
  workingDaysPerWeek: number;
}

interface SalaryConfigData {
  id: string;
  userId: string;
  baseSalary: number;
  salaryCurrency: string;
  salaryType: string;
  hourlyRate: number | null;
  allowances: AllowanceItem[];
  deductions: DeductionItem[];
  cpfEmployee: number;
  cpfEmployer: number;
  bankName: string | null;
  bankAccount: string | null;
  paymentFrequency: string;
  paymentDayOfMonth: number | null;
  paymentMode: string | null;
  hourlyOvertimeRate: number | null;
  awsEligible: boolean;
  awsMonths: number | null;
  variableBonusNote: string | null;
  cpfRateType: string;
  cpfOptIn: boolean;
}

interface PayrollForm {
  basicSalary: string;
  salaryCurrency: string;
  paymentFrequency: string;
  paymentDayOfMonth: string;
  paymentMode: string;
  bankName: string;
  bankAccountNumber: string;
  hourlyOvertimeRate: string;
  allowances: AllowanceItem[];
  deductions: DeductionItem[];
  awsEligible: boolean;
  awsMonths: string;
  variableBonusNote: string;
  cpfRateType: string;
  cpfOptIn: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const ALL_ROLES = [
  { value: "doctor", label: "Doctor", color: "#2d6a4f", bg: "#f0faf4" },
  { value: "therapist", label: "Therapist", color: "#059669", bg: "#ecfdf5" },
  { value: "pharmacist", label: "Pharmacist", color: "#7c3aed", bg: "#faf5ff" },
  { value: "receptionist", label: "Receptionist", color: "#37845e", bg: "#f0faf4" },
  { value: "admin", label: "Admin", color: "#dc2626", bg: "#fef2f2" },
  { value: "staff", label: "Staff", color: "#78716c", bg: "#fafaf9" },
];

const PAYMENT_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
];

const PAYMENT_MODES = [
  { value: "bank_transfer", label: "Bank Transfer (GIRO)" },
  { value: "paynow", label: "PayNow" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
];

// ─── Design Tokens ──────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--grey-400)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-900)",
  background: "var(--white)",
  fontSize: "15px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--grey-700)",
  marginBottom: "6px",
  display: "block",
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: "17px",
  fontWeight: 700,
  color: "var(--grey-900)",
  paddingBottom: "10px",
  marginBottom: "16px",
  borderBottom: "1px solid var(--grey-200)",
};

function getRoleMeta(role: string) {
  return ALL_ROLES.find((r) => r.value === role) || ALL_ROLES[5];
}

function configToForm(c: SalaryConfigData | null): PayrollForm {
  if (!c) {
    return {
      basicSalary: "", salaryCurrency: "SGD", paymentFrequency: "monthly",
      paymentDayOfMonth: "", paymentMode: "", bankName: "", bankAccountNumber: "",
      hourlyOvertimeRate: "", allowances: [], deductions: [],
      awsEligible: false, awsMonths: "", variableBonusNote: "",
      cpfRateType: "graduated_graduated", cpfOptIn: true,
    };
  }
  return {
    basicSalary: c.baseSalary ? String(c.baseSalary) : "",
    salaryCurrency: c.salaryCurrency || "SGD",
    paymentFrequency: c.paymentFrequency || "monthly",
    paymentDayOfMonth: c.paymentDayOfMonth !== null ? String(c.paymentDayOfMonth) : "",
    paymentMode: c.paymentMode || "",
    bankName: c.bankName || "",
    bankAccountNumber: c.bankAccount || "",
    hourlyOvertimeRate: c.hourlyOvertimeRate !== null ? String(c.hourlyOvertimeRate) : "",
    allowances: Array.isArray(c.allowances) ? c.allowances : [],
    deductions: Array.isArray(c.deductions) ? c.deductions : [],
    awsEligible: c.awsEligible || false,
    awsMonths: c.awsMonths !== null ? String(c.awsMonths) : "",
    variableBonusNote: c.variableBonusNote || "",
    cpfRateType: c.cpfRateType || "graduated_graduated",
    cpfOptIn: c.cpfOptIn !== false,
  };
}

function maskBank(acct: string): string {
  if (!acct) return "—";
  const last4 = acct.slice(-4);
  return `•••• •••• ${last4}`;
}

function fmtSGD(n: number): string {
  return `S$${n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function StaffPayrollPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfigData | null>(null);
  const [form, setForm] = useState<PayrollForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [showBankAccount, setShowBankAccount] = useState(false);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      // Fetch staff profile + salary config in parallel
      const [staffRes, configRes] = await Promise.all([
        fetch(`/api/staff/${id}`),
        fetch(`/api/admin/payroll/salary-config?userId=${id}`),
      ]);
      if (!staffRes.ok) {
        setError(staffRes.status === 404 ? "Staff member not found" : "Failed to load staff member");
        return;
      }
      const staffData = await staffRes.json();
      setStaff(staffData);

      // Config API returns an array; pick first match
      let config: SalaryConfigData | null = null;
      if (configRes.ok) {
        const configs = await configRes.json();
        if (Array.isArray(configs) && configs.length > 0) {
          config = configs[0];
        }
      }
      setSalaryConfig(config);
      setForm(configToForm(config));
    } catch {
      setError("Failed to load staff member");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Live CPF / payroll preview ───
  const preview = useMemo(() => {
    if (!staff || !form) return null;
    const basic = parseFloat(form.basicSalary) || 0;
    const cpfableAllowances = form.allowances
      .filter((a) => a.cpfable)
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const nonCpfableAllowances = form.allowances
      .filter((a) => !a.cpfable)
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const totalAllowances = cpfableAllowances + nonCpfableAllowances;
    const totalDeductions = form.deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    const gross = basic + totalAllowances; // for payslip display
    const cpfBase = basic + cpfableAllowances; // OW basis for CPF calc (capped inside calc)

    const stat = calculateStatutory("SG", cpfBase, {
      dateOfBirth: staff.dateOfBirth,
      ethnicity: (staff.ethnicity || "").toLowerCase(),
      residencyStatus: (staff.residencyStatus || "").toLowerCase(),
      prStartDate: staff.prStartDate,
      cpfRateType: form.cpfRateType,
    });

    const momBreakdown = getMOMSalaryBreakdown({
      monthlyBasic: basic,
      monthlyGross: gross,
      workingDaysPerWeek: staff.workingDaysPerWeek || 5.5,
      isWorkman: staff.isWorkman,
      employmentType: staff.employmentType,
      weeklyContractedHours: staff.weeklyContractedHours,
    });

    const partIVCovered = isPartIVCovered(basic, staff.isWorkman);
    const netPay = gross - stat.totalEmployeeDeductions - totalDeductions;
    const totalEmployerCost = gross + stat.totalEmployerCost;

    return {
      basic,
      totalAllowances,
      gross,
      cpfBase,
      totalDeductions,
      stat,
      momBreakdown,
      partIVCovered,
      netPay,
      totalEmployerCost,
    };
  }, [staff, form]);

  const handleSave = async () => {
    if (!form || !id) return;
    if (!form.basicSalary || Number(form.basicSalary) <= 0) {
      showToast("Basic salary is required", "err");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        userId: id,
        baseSalary: Number(form.basicSalary),
        salaryCurrency: form.salaryCurrency || "SGD",
        paymentFrequency: form.paymentFrequency,
        paymentDayOfMonth: form.paymentDayOfMonth === "" ? null : Number(form.paymentDayOfMonth),
        paymentMode: form.paymentMode || null,
        bankName: form.bankName || null,
        bankAccount: form.bankAccountNumber || null,
        hourlyOvertimeRate: form.hourlyOvertimeRate === "" ? null : Number(form.hourlyOvertimeRate),
        allowances: form.allowances,
        deductions: form.deductions,
        awsEligible: form.awsEligible,
        awsMonths: form.awsMonths === "" ? null : Number(form.awsMonths),
        variableBonusNote: form.variableBonusNote || null,
        cpfRateType: form.cpfRateType,
        cpfOptIn: form.cpfOptIn,
        country: "SG",
      };
      // POST upserts (creates if no config, updates if exists)
      const res = await fetch(`/api/admin/payroll/salary-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save payroll");
      }
      const saved = await res.json();
      setSalaryConfig(saved);
      showToast("Payroll details saved");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save payroll";
      setError(msg);
      showToast(msg, "err");
    } finally {
      setSaving(false);
    }
  };

  const addAllowance = () => {
    if (!form) return;
    setForm({ ...form, allowances: [...form.allowances, { name: "", amount: 0, taxable: true, cpfable: true }] });
  };
  const updateAllowance = (i: number, patch: Partial<AllowanceItem>) => {
    if (!form) return;
    const next = form.allowances.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    setForm({ ...form, allowances: next });
  };
  const removeAllowance = (i: number) => {
    if (!form) return;
    setForm({ ...form, allowances: form.allowances.filter((_, idx) => idx !== i) });
  };
  const addDeduction = () => {
    if (!form) return;
    setForm({ ...form, deductions: [...form.deductions, { name: "", amount: 0 }] });
  };
  const updateDeduction = (i: number, patch: Partial<DeductionItem>) => {
    if (!form) return;
    const next = form.deductions.map((d, idx) => (idx === i ? { ...d, ...patch } : d));
    setForm({ ...form, deductions: next });
  };
  const removeDeduction = (i: number) => {
    if (!form) return;
    setForm({ ...form, deductions: form.deductions.filter((_, idx) => idx !== i) });
  };

  if (loading) {
    return <div className="p-8 text-[15px]" style={{ color: "var(--grey-600)" }}>Loading…</div>;
  }

  if (error && !staff) {
    return (
      <div className="p-6 md:p-8 yoda-fade-in">
        <div className="p-6" style={cardStyle}>
          <p className="text-[15px]" style={{ color: "var(--red-600)" }}>{error}</p>
          <Link href="/admin/staff" className="mt-3 inline-block text-[14px] font-semibold" style={{ color: "var(--blue-600)" }}>&larr; Back to Staff</Link>
        </div>
      </div>
    );
  }

  if (!staff || !form) return null;

  const roleMeta = getRoleMeta(staff.role);
  const residency = (staff.residencyStatus || "").toLowerCase();
  const isPR = residency === "pr";
  const isForeigner = residency === "foreigner" || residency === "ep" || residency === "s pass" || residency === "work permit" || residency === "dp";
  const isCitizen = residency === "citizen" || residency === "singaporean";

  return (
    <div className="p-6 md:p-8 yoda-fade-in max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href={`/admin/staff/${staff.id}`} className="text-[14px] font-semibold" style={{ color: "var(--blue-600)" }}>
              &larr; {staff.name}
            </Link>
            <span
              className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ background: roleMeta.bg, color: roleMeta.color, borderRadius: "var(--radius-pill)" }}
            >
              {roleMeta.label}
            </span>
          </div>
          <h1 className="text-[24px] font-bold tracking-tight mt-1" style={{ color: "var(--grey-900)" }}>
            Payroll
          </h1>
          <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>
            {staff.staffIdNumber && <span className="mr-2">{staff.staffIdNumber}</span>}
            <span>Salary structure, CPF &amp; bank details</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 text-[14px]" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ───────── Left column: forms (2 cards spanning 2 cols) ───────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Card 1 — Salary & Payment */}
          <div className="p-6" style={cardStyle}>
            <h2 style={sectionHeaderStyle}>Salary &amp; Payment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Basic Salary (monthly) *</label>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold" style={{ color: "var(--grey-600)", width: 40 }}>{form.salaryCurrency}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.basicSalary}
                    onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
                    placeholder="3000.00"
                    className="w-full px-3 py-2"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <select
                  value={form.salaryCurrency}
                  onChange={(e) => setForm({ ...form, salaryCurrency: e.target.value })}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                >
                  <option value="SGD">SGD (Singapore Dollar)</option>
                  <option value="INR">INR (Indian Rupee)</option>
                  <option value="MYR">MYR (Malaysian Ringgit)</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Payment Frequency</label>
                <select
                  value={form.paymentFrequency}
                  onChange={(e) => setForm({ ...form, paymentFrequency: e.target.value })}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                >
                  {PAYMENT_FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Payment Day (of month)</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.paymentDayOfMonth}
                  onChange={(e) => setForm({ ...form, paymentDayOfMonth: e.target.value })}
                  placeholder="7"
                  className="w-full px-3 py-2"
                  style={inputStyle}
                />
                <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>MOM: pay within 7 days of salary period end</p>
              </div>
              <div>
                <label style={labelStyle}>Payment Mode</label>
                <select
                  value={form.paymentMode}
                  onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                >
                  <option value="">Select mode…</option>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Overtime Rate (per hour)</label>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold" style={{ color: "var(--grey-600)" }}>S$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.hourlyOvertimeRate}
                    onChange={(e) => setForm({ ...form, hourlyOvertimeRate: e.target.value })}
                    placeholder={preview?.momBreakdown.overtimeRate ? preview.momBreakdown.overtimeRate.toFixed(2) : "0.00"}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                  />
                  {preview?.momBreakdown.overtimeRate ? (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, hourlyOvertimeRate: preview.momBreakdown.overtimeRate.toFixed(2) })}
                      className="text-[12px] px-2 py-1 font-semibold whitespace-nowrap"
                      style={{ background: "var(--blue-50)", color: "var(--blue-700)", border: "1px solid var(--blue-200)", borderRadius: "var(--radius-sm)" }}
                    >
                      MOM rate
                    </button>
                  ) : null}
                </div>
                <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>MOM formula: 1.5 × (12 × basic) / (52 × 44)</p>
              </div>
            </div>

            {/* Bank details */}
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--grey-700)", marginBottom: 10, marginTop: 20 }}>Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Bank Name</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="DBS / OCBC / UOB…"
                  className="w-full px-3 py-2"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Bank Account Number
                  <button
                    type="button"
                    onClick={() => setShowBankAccount(!showBankAccount)}
                    className="ml-2 text-[12px] font-normal"
                    style={{ color: "var(--blue-600)" }}
                  >
                    {showBankAccount ? "Hide" : "Show"}
                  </button>
                </label>
                <input
                  type={showBankAccount ? "text" : "password"}
                  value={form.bankAccountNumber}
                  onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                  placeholder="123-4-567890"
                  className="w-full px-3 py-2"
                  style={inputStyle}
                  autoComplete="off"
                />
                <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>Visible only to admins; encrypt at-rest in production.</p>
              </div>
            </div>

            {/* AWS */}
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--grey-700)", marginBottom: 10, marginTop: 20 }}>Annual Wage Supplement (13th month)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 14, color: "var(--grey-700)", fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={form.awsEligible}
                    onChange={(e) => setForm({ ...form, awsEligible: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>AWS eligible</span>
                </label>
              </div>
              {form.awsEligible && (
                <>
                  <div>
                    <label style={labelStyle}>AWS (months of basic)</label>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      step={0.25}
                      value={form.awsMonths}
                      onChange={(e) => setForm({ ...form, awsMonths: e.target.value })}
                      placeholder="1.0"
                      className="w-full px-3 py-2"
                      style={inputStyle}
                    />
                    <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>1.0 = full 13th month</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Variable Bonus Note</label>
                    <input
                      type="text"
                      value={form.variableBonusNote}
                      onChange={(e) => setForm({ ...form, variableBonusNote: e.target.value })}
                      placeholder="AVC subject to performance"
                      className="w-full px-3 py-2"
                      style={inputStyle}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 2 — Allowances & Deductions */}
          <div className="p-6" style={cardStyle}>
            <h2 style={sectionHeaderStyle}>Allowances &amp; Fixed Deductions</h2>

            {/* Allowances list */}
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--grey-700)", margin: 0 }}>Fixed Monthly Allowances</h3>
              <button
                type="button"
                onClick={addAllowance}
                className="px-3 py-1.5 text-[13px] font-semibold"
                style={{ background: "var(--blue-50)", color: "var(--blue-700)", border: "1px solid var(--blue-200)", borderRadius: "var(--radius-sm)" }}
              >
                + Add allowance
              </button>
            </div>
            {form.allowances.length === 0 ? (
              <p className="text-[13px] mb-3" style={{ color: "var(--grey-500)" }}>No allowances yet. Common ones: Transport, Meal, Shift, Housing.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {form.allowances.map((a, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={a.name}
                      onChange={(e) => updateAllowance(i, { name: e.target.value })}
                      placeholder="e.g. Transport"
                      className="col-span-4 px-3 py-2"
                      style={inputStyle}
                    />
                    <div className="col-span-3 flex items-center gap-1">
                      <span className="text-[13px]" style={{ color: "var(--grey-600)" }}>S$</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={a.amount}
                        onChange={(e) => updateAllowance(i, { amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-2"
                        style={inputStyle}
                      />
                    </div>
                    <label className="col-span-2 flex items-center gap-1 text-[13px] cursor-pointer" style={{ color: "var(--grey-700)" }}>
                      <input type="checkbox" checked={a.cpfable} onChange={(e) => updateAllowance(i, { cpfable: e.target.checked })} />
                      CPF-able
                    </label>
                    <label className="col-span-2 flex items-center gap-1 text-[13px] cursor-pointer" style={{ color: "var(--grey-700)" }}>
                      <input type="checkbox" checked={a.taxable} onChange={(e) => updateAllowance(i, { taxable: e.target.checked })} />
                      Taxable
                    </label>
                    <button
                      type="button"
                      onClick={() => removeAllowance(i)}
                      className="col-span-1 text-[13px] font-semibold"
                      style={{ color: "#b91c1c" }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Deductions list */}
            <div className="flex items-center justify-between mb-3 mt-4">
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--grey-700)", margin: 0 }}>Fixed Monthly Deductions</h3>
              <button
                type="button"
                onClick={addDeduction}
                className="px-3 py-1.5 text-[13px] font-semibold"
                style={{ background: "var(--blue-50)", color: "var(--blue-700)", border: "1px solid var(--blue-200)", borderRadius: "var(--radius-sm)" }}
              >
                + Add deduction
              </button>
            </div>
            {form.deductions.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Examples: Union fees, staff loan repayment.</p>
            ) : (
              <div className="space-y-2">
                {form.deductions.map((d, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={d.name}
                      onChange={(e) => updateDeduction(i, { name: e.target.value })}
                      placeholder="e.g. Union fees"
                      className="col-span-6 px-3 py-2"
                      style={inputStyle}
                    />
                    <div className="col-span-4 flex items-center gap-1">
                      <span className="text-[13px]" style={{ color: "var(--grey-600)" }}>S$</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={d.amount}
                        onChange={(e) => updateDeduction(i, { amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-2"
                        style={inputStyle}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDeduction(i)}
                      className="col-span-2 text-[13px] font-semibold"
                      style={{ color: "#b91c1c" }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3 — CPF Configuration */}
          <div className="p-6" style={cardStyle}>
            <h2 style={sectionHeaderStyle}>CPF Configuration</h2>

            <div className="mb-4 p-3" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius-sm)" }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px]">
                <div>
                  <div style={{ color: "var(--grey-500)" }}>Residency</div>
                  <div style={{ color: "var(--grey-900)", fontWeight: 600 }}>{staff.residencyStatus || "—"}</div>
                </div>
                <div>
                  <div style={{ color: "var(--grey-500)" }}>DOB / Age</div>
                  <div style={{ color: "var(--grey-900)", fontWeight: 600 }}>
                    {staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString("en-SG") : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--grey-500)" }}>Ethnicity</div>
                  <div style={{ color: "var(--grey-900)", fontWeight: 600 }}>{staff.ethnicity || "—"}</div>
                </div>
                <div>
                  <div style={{ color: "var(--grey-500)" }}>PR Start</div>
                  <div style={{ color: "var(--grey-900)", fontWeight: 600 }}>
                    {staff.prStartDate ? new Date(staff.prStartDate).toLocaleDateString("en-SG") : "—"}
                  </div>
                </div>
              </div>
              <p className="text-[12px] mt-2" style={{ color: "var(--grey-500)" }}>
                Age, residency, ethnicity &amp; PR start are managed on the <Link href={`/admin/staff/${staff.id}/edit`} style={{ color: "var(--blue-600)", fontWeight: 600 }}>staff profile</Link>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>CPF Opt-In</label>
                <select
                  value={form.cpfOptIn ? "yes" : "no"}
                  onChange={(e) => setForm({ ...form, cpfOptIn: e.target.value === "yes" })}
                  disabled={isForeigner}
                  className="w-full px-3 py-2 disabled:opacity-60"
                  style={inputStyle}
                >
                  <option value="yes">Yes (default for Citizen/PR)</option>
                  <option value="no">No</option>
                </select>
                {isForeigner && (
                  <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>Foreigners are not eligible for CPF.</p>
                )}
              </div>
              <div>
                <label style={labelStyle}>CPF Rate Type (PR only)</label>
                <select
                  value={form.cpfRateType}
                  onChange={(e) => setForm({ ...form, cpfRateType: e.target.value })}
                  disabled={!isPR}
                  className="w-full px-3 py-2 disabled:opacity-60"
                  style={inputStyle}
                >
                  <option value="graduated_graduated">Graduated / Graduated (G/G) — default</option>
                  <option value="full_graduated">Full / Graduated (F/G) — joint application</option>
                </select>
                <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>
                  {isPR
                    ? "Applies only to PR 1st/2nd year. Requires CPF joint application for F/G."
                    : "Only relevant for PRs in their 1st or 2nd year."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ───────── Right column: CPF / payslip live preview ───────── */}
        <div className="space-y-5">
          <div className="p-6 sticky top-4" style={cardStyle}>
            <h2 style={sectionHeaderStyle}>Monthly Pay Preview</h2>

            {!preview || !preview.basic ? (
              <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Enter a basic salary to see the breakdown.</p>
            ) : (
              <div className="text-[13px] space-y-3">
                <div>
                  <div className="flex justify-between py-1" style={{ color: "var(--grey-700)" }}>
                    <span>Basic</span><span>{fmtSGD(preview.basic)}</span>
                  </div>
                  {preview.totalAllowances > 0 && (
                    <div className="flex justify-between py-1" style={{ color: "var(--grey-700)" }}>
                      <span>+ Allowances</span><span>{fmtSGD(preview.totalAllowances)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-t mt-1 pt-2 font-bold" style={{ color: "var(--grey-900)", borderColor: "var(--grey-200)" }}>
                    <span>Gross</span><span>{fmtSGD(preview.gross)}</span>
                  </div>
                </div>

                {preview.stat.employeeContributions.length > 0 && (
                  <div>
                    <div style={{ color: "var(--grey-500)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Employee deductions</div>
                    {preview.stat.employeeContributions.map((c) => (
                      <div key={c.name} className="flex justify-between py-1" style={{ color: "#b91c1c" }}>
                        <span>− {c.name}{c.rate ? ` (${c.rate}%)` : ""}</span>
                        <span>{fmtSGD(c.amount)}</span>
                      </div>
                    ))}
                    {preview.totalDeductions > 0 && (
                      <div className="flex justify-between py-1" style={{ color: "#b91c1c" }}>
                        <span>− Other deductions</span><span>{fmtSGD(preview.totalDeductions)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between py-2 border-t border-b font-bold text-[15px]" style={{ color: "#047857", borderColor: "var(--grey-200)", background: "#ecfdf5", margin: "0 -8px", padding: "8px" }}>
                  <span>Net to staff</span><span>{fmtSGD(preview.netPay)}</span>
                </div>

                {preview.stat.employerContributions.length > 0 && (
                  <div>
                    <div style={{ color: "var(--grey-500)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Employer pays</div>
                    {preview.stat.employerContributions.map((c) => (
                      <div key={c.name} className="flex justify-between py-1" style={{ color: "var(--grey-700)" }}>
                        <span>{c.name}{c.rate ? ` (${c.rate}%)` : ""}</span>
                        <span>{fmtSGD(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between py-2 border-t font-bold" style={{ color: "var(--grey-900)", borderColor: "var(--grey-200)" }}>
                  <span>Total employer cost</span><span>{fmtSGD(preview.totalEmployerCost)}</span>
                </div>

                {/* MOM reference box */}
                <div className="mt-4 p-3 text-[12px]" style={{ background: "var(--blue-50)", border: "1px solid var(--blue-200)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ color: "var(--blue-700)", fontWeight: 700, marginBottom: 4 }}>MOM reference rates</div>
                  <div className="flex justify-between" style={{ color: "var(--grey-700)" }}>
                    <span>Hourly basic</span><span>{fmtSGD(preview.momBreakdown.hourlyBasicRate)}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: "var(--grey-700)" }}>
                    <span>Daily basic</span><span>{fmtSGD(preview.momBreakdown.dailyBasicRate)}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: "var(--grey-700)" }}>
                    <span>OT rate (1.5×)</span><span>{fmtSGD(preview.momBreakdown.overtimeRate)}</span>
                  </div>
                  <div className="mt-1 pt-1 border-t" style={{ borderColor: "var(--blue-200)", color: preview.partIVCovered ? "#047857" : "var(--grey-600)" }}>
                    {preview.partIVCovered
                      ? "✓ Covered by MOM Part IV (OT entitled)"
                      : `Above Part IV cap (S$${staff.isWorkman ? MOM_PART4_CAP_WORKMAN : MOM_PART4_CAP_NON_WORKMAN}). OT not statutory.`}
                  </div>
                </div>

                {(isCitizen || isPR) && staff.ethnicity && (
                  <p className="text-[11px] mt-3" style={{ color: "var(--grey-500)" }}>
                    Bank: {form.bankName || "—"} · {maskBank(form.bankAccountNumber)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 mt-5 p-4" style={cardStyle}>
        <button
          onClick={() => router.push(`/admin/staff/${staff.id}`)}
          className="px-4 py-2 text-[14px] font-semibold transition-colors"
          style={{ background: "var(--grey-100)", color: "var(--grey-700)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-[14px] font-semibold text-white transition-colors disabled:opacity-60"
          style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
        >
          {saving ? "Saving…" : "Save Payroll"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 px-4 py-3 text-[14px] font-semibold"
          style={{
            background: toast.type === "ok" ? "#ecfdf5" : "#fef2f2",
            color: toast.type === "ok" ? "#047857" : "#b91c1c",
            border: `1px solid ${toast.type === "ok" ? "#a7f3d0" : "#fecaca"}`,
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-card)",
            zIndex: 50,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
