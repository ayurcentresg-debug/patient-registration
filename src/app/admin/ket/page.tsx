"use client";

import { useEffect, useState, useCallback } from "react";
import AdminTabs from "@/components/AdminTabs";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  role: string;
  staffIdNumber: string | null;
  nricFin: string | null;
  jobTitle: string | null;
  employmentType: string;
}

interface KETRecord {
  id: string;
  userId: string;
  issuedDate: string;
  status: string;
  employeeName: string;
  jobTitle: string;
  employmentType: string;
  userName: string;
  userRole: string;
  userStaffId: string;
  createdAt: string;
}

interface AllowanceItem {
  item: string;
  amount: number;
}

interface KETForm {
  userId: string;
  companyName: string;
  placeOfWork: string;
  employeeName: string;
  nricFin: string;
  jobTitle: string;
  employmentType: string;
  mainDuties: string;
  employmentStartDate: string;
  employmentEndDate: string;
  dailyWorkingHours: string;
  workStartEndTime: string;
  breakDuration: string;
  workingDaysPerWeek: string;
  restDays: string;
  salaryPeriod: string;
  salaryFrequency: string;
  overtimePaymentPeriod: string;
  overtimeFrequency: string;
  salaryPaymentDate: string;
  overtimePaymentDate: string;
  basicRate: string;
  grossRate: string;
  overtimeRate: string;
  fixedAllowances: AllowanceItem[];
  fixedDeductions: AllowanceItem[];
  otherSalaryComponents: string;
  cpfApplicable: boolean;
  annualLeaveDays: string;
  sickLeaveDays: string;
  hospitalisationLeaveDays: string;
  otherLeave: string;
  medicalBenefits: string;
  probationLength: string;
  probationStartDate: string;
  probationEndDate: string;
  noticePeriod: string;
  status: string;
}

const EMPTY_FORM: KETForm = {
  userId: "", companyName: "", placeOfWork: "", employeeName: "", nricFin: "",
  jobTitle: "", employmentType: "full_time", mainDuties: "",
  employmentStartDate: "", employmentEndDate: "",
  dailyWorkingHours: "8", workStartEndTime: "", breakDuration: "1 hour",
  workingDaysPerWeek: "5.5", restDays: "Sunday",
  salaryPeriod: "First to last day of the month", salaryFrequency: "monthly",
  overtimePaymentPeriod: "", overtimeFrequency: "",
  salaryPaymentDate: "", overtimePaymentDate: "",
  basicRate: "", grossRate: "", overtimeRate: "",
  fixedAllowances: [], fixedDeductions: [],
  otherSalaryComponents: "", cpfApplicable: true,
  annualLeaveDays: "14", sickLeaveDays: "14", hospitalisationLeaveDays: "60",
  otherLeave: "", medicalBenefits: "Full reimbursement for medical examination fee.",
  probationLength: "3 months", probationStartDate: "", probationEndDate: "",
  noticePeriod: "1 month notice or 1 month salary in lieu of notice",
  status: "draft",
};

// ─── Design Tokens ──────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "var(--white)", border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)",
};
const inputStyle: React.CSSProperties = {
  border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)",
  background: "var(--white)", outline: "none",
};
const sectionHead: React.CSSProperties = {
  fontSize: "13px", fontWeight: 700, letterSpacing: "0.5px",
  textTransform: "uppercase" as const, color: "#fff", padding: "8px 14px",
  borderRadius: "6px", marginBottom: "10px", background: "#c0392b",
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "#92400e", bg: "#fef3c7" },
  issued: { label: "Issued", color: "#065f46", bg: "#d1fae5" },
  superseded: { label: "Superseded", color: "#6b7280", bg: "#f3f4f6" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function KETPage() {
  const [kets, setKets] = useState<KETRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<KETForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchKETs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ket");
      if (res.ok) setKets(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff?status=active");
      if (res.ok) setStaff(await res.json());
    } catch { /* */ }
  }, []);

  useEffect(() => { fetchKETs(); fetchStaff(); }, [fetchKETs, fetchStaff]);

  const prefillForStaff = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/ket/prefill?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          ...EMPTY_FORM,
          ...data,
          fixedAllowances: JSON.parse(data.fixedAllowances || "[]"),
          fixedDeductions: JSON.parse(data.fixedDeductions || "[]"),
        });
      }
    } catch { showToast("Failed to prefill", "err"); }
  };

  const openNew = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleStaffSelect = (userId: string) => {
    setForm({ ...form, userId });
    if (userId) prefillForStaff(userId);
  };

  const handleSave = async () => {
    if (!form.userId) { showToast("Select a staff member", "err"); return; }
    if (!form.employeeName) { showToast("Employee name is required", "err"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        fixedAllowances: JSON.stringify(form.fixedAllowances),
        fixedDeductions: JSON.stringify(form.fixedDeductions),
      };
      const res = await fetch("/api/admin/ket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("KET saved successfully", "ok");
        setShowForm(false);
        fetchKETs();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save", "err");
      }
    } catch { showToast("Failed to save", "err"); }
    finally { setSaving(false); }
  };

  const handleIssue = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/ket/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "issued", issuedDate: new Date().toISOString() }),
      });
      if (res.ok) { showToast("KET issued", "ok"); fetchKETs(); }
    } catch { showToast("Failed to issue", "err"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this KET?")) return;
    try {
      const res = await fetch(`/api/admin/ket/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("KET deleted", "ok"); fetchKETs(); }
    } catch { showToast("Failed to delete", "err"); }
  };

  const addAllowance = () => setForm({ ...form, fixedAllowances: [...form.fixedAllowances, { item: "", amount: 0 }] });
  const addDeduction = () => setForm({ ...form, fixedDeductions: [...form.fixedDeductions, { item: "", amount: 0 }] });
  const updateAllowance = (i: number, field: string, val: string | number) => {
    const items = [...form.fixedAllowances];
    items[i] = { ...items[i], [field]: val };
    setForm({ ...form, fixedAllowances: items });
  };
  const updateDeduction = (i: number, field: string, val: string | number) => {
    const items = [...form.fixedDeductions];
    items[i] = { ...items[i], [field]: val };
    setForm({ ...form, fixedDeductions: items });
  };
  const removeAllowance = (i: number) => setForm({ ...form, fixedAllowances: form.fixedAllowances.filter((_, idx) => idx !== i) });
  const removeDeduction = (i: number) => setForm({ ...form, fixedDeductions: form.fixedDeductions.filter((_, idx) => idx !== i) });

  const Field = ({ label, value, onChange, placeholder, type = "text", hint }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string;
  }) => (
    <div>
      <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
        {label} {hint && <span className="font-normal text-[11px]" style={{ color: "var(--grey-400)" }}>({hint})</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 text-[14px]" style={inputStyle} />
    </div>
  );

  // ─── FORM VIEW ────────────────────────────────────────────────────────────
  if (showForm) {
    return (
      <div>
        <AdminTabs />
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-lg font-semibold text-[14px] shadow-lg"
            style={{ background: toast.type === "ok" ? "#d1fae5" : "#fef2f2", color: toast.type === "ok" ? "#065f46" : "#dc2626" }}>
            {toast.msg}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-bold" style={{ color: "var(--grey-900)" }}>Generate Key Employment Terms</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[14px] font-semibold rounded-lg"
              style={{ background: "var(--grey-100)", color: "var(--grey-600)" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-[14px] font-semibold rounded-lg"
              style={{ background: "#c0392b", color: "#fff", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save KET"}
            </button>
          </div>
        </div>

        {/* Staff Selector */}
        <div className="p-4 mb-4 rounded-lg" style={cardStyle}>
          <label className="block text-[14px] font-semibold mb-2" style={{ color: "var(--grey-700)" }}>Select Staff Member</label>
          <select value={form.userId} onChange={(e) => handleStaffSelect(e.target.value)}
            className="w-full px-3 py-2 text-[15px]" style={inputStyle}>
            <option value="">-- Select Staff --</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.staffIdNumber || s.role})</option>
            ))}
          </select>
          <p className="text-[12px] mt-1" style={{ color: "var(--grey-400)" }}>
            Selecting a staff member auto-fills from their profile and salary config. You can edit all fields below.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4">

            {/* Section A — Employment Details */}
            <div className="p-4 rounded-lg" style={cardStyle}>
              <div style={sectionHead}>Section A | Employment Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Company Name" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} />
                <Field label="Place of Work" value={form.placeOfWork} onChange={(v) => setForm({ ...form, placeOfWork: v })} />
                <Field label="Employee Full Name" value={form.employeeName} onChange={(v) => setForm({ ...form, employeeName: v })} hint="as in NRIC/Work Pass" />
                <Field label="NRIC/FIN" value={form.nricFin} onChange={(v) => setForm({ ...form, nricFin: v })} />
                <Field label="Job Title" value={form.jobTitle} onChange={(v) => setForm({ ...form, jobTitle: v })} />
                <div>
                  <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Employment Type</label>
                  <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                    className="w-full px-3 py-2 text-[14px]" style={inputStyle}>
                    <option value="full_time">Full-Time</option>
                    <option value="part_time">Part-Time</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Main Duties and Responsibilities" value={form.mainDuties} onChange={(v) => setForm({ ...form, mainDuties: v })} />
                </div>
                <Field label="Employment Start Date" value={form.employmentStartDate} onChange={(v) => setForm({ ...form, employmentStartDate: v })} type="date" />
                <Field label="Employment End Date" value={form.employmentEndDate} onChange={(v) => setForm({ ...form, employmentEndDate: v })} type="date" hint="fixed-term only" />
              </div>
            </div>

            {/* Section B — Working Hours */}
            <div className="p-4 rounded-lg" style={cardStyle}>
              <div style={sectionHead}>Section B | Working Hours and Rest Day</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Daily Working Hours" value={form.dailyWorkingHours} onChange={(v) => setForm({ ...form, dailyWorkingHours: v })} placeholder="e.g. 8" />
                <Field label="Working Days Per Week" value={form.workingDaysPerWeek} onChange={(v) => setForm({ ...form, workingDaysPerWeek: v })} placeholder="e.g. 5.5" />
                <div className="sm:col-span-2">
                  <Field label="Work Start and End Time" value={form.workStartEndTime} onChange={(v) => setForm({ ...form, workStartEndTime: v })} placeholder="e.g. Mon-Fri: 9am-6pm, Sat: 9am-1pm" />
                </div>
                <Field label="Break Duration" value={form.breakDuration} onChange={(v) => setForm({ ...form, breakDuration: v })} placeholder="e.g. 1 hour" />
                <Field label="Rest Day(s)" value={form.restDays} onChange={(v) => setForm({ ...form, restDays: v })} placeholder="e.g. Sunday" />
              </div>
            </div>

            {/* Section C — Salary */}
            <div className="p-4 rounded-lg" style={cardStyle}>
              <div style={sectionHead}>Section C | Salary</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Salary Period" value={form.salaryPeriod} onChange={(v) => setForm({ ...form, salaryPeriod: v })} placeholder="First to last day of the month" />
                <div>
                  <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Salary Frequency</label>
                  <select value={form.salaryFrequency} onChange={(e) => setForm({ ...form, salaryFrequency: e.target.value })}
                    className="w-full px-3 py-2 text-[14px]" style={inputStyle}>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <Field label="Salary Payment Date" value={form.salaryPaymentDate} onChange={(v) => setForm({ ...form, salaryPaymentDate: v })} placeholder="2nd of every calendar month" />
                <Field label="OT Payment Date" value={form.overtimePaymentDate} onChange={(v) => setForm({ ...form, overtimePaymentDate: v })} placeholder="2nd of every calendar month" />
                <Field label="OT Payment Period" value={form.overtimePaymentPeriod} onChange={(v) => setForm({ ...form, overtimePaymentPeriod: v })} hint="if different from salary" />
                <div>
                  <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>OT Frequency</label>
                  <select value={form.overtimeFrequency || ""} onChange={(e) => setForm({ ...form, overtimeFrequency: e.target.value })}
                    className="w-full px-3 py-2 text-[14px]" style={inputStyle}>
                    <option value="">Same as salary</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <Field label="Basic Rate of Pay" value={form.basicRate} onChange={(v) => setForm({ ...form, basicRate: v })} placeholder="$2,000.00 per month" />
                <Field label="Gross Rate of Pay" value={form.grossRate} onChange={(v) => setForm({ ...form, grossRate: v })} placeholder="$2,100.00 per month" />
                <div className="sm:col-span-2">
                  <Field label="Overtime Rate of Pay" value={form.overtimeRate} onChange={(v) => setForm({ ...form, overtimeRate: v })} placeholder="1.5x hourly basic rate ($15.80)" />
                </div>
              </div>

              {/* Allowances */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-semibold" style={{ color: "var(--grey-700)" }}>Fixed Allowances Per Salary Period</label>
                  <button onClick={addAllowance} className="text-[12px] font-semibold px-2 py-1 rounded" style={{ background: "#dbeafe", color: "#1e40af" }}>+ Add</button>
                </div>
                {form.fixedAllowances.map((a, i) => (
                  <div key={i} className="flex gap-2 mb-1 items-center">
                    <input value={a.item} onChange={(e) => updateAllowance(i, "item", e.target.value)} placeholder="Item name" className="flex-1 px-2 py-1 text-[13px]" style={inputStyle} />
                    <input type="number" value={a.amount} onChange={(e) => updateAllowance(i, "amount", parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 text-[13px] text-right" style={inputStyle} step="0.01" />
                    <button onClick={() => removeAllowance(i)} className="text-[16px] px-1" style={{ color: "#dc2626" }}>×</button>
                  </div>
                ))}
              </div>

              {/* Deductions */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-semibold" style={{ color: "var(--grey-700)" }}>Fixed Deductions Per Salary Period</label>
                  <button onClick={addDeduction} className="text-[12px] font-semibold px-2 py-1 rounded" style={{ background: "#fef3c7", color: "#92400e" }}>+ Add</button>
                </div>
                {form.fixedDeductions.map((d, i) => (
                  <div key={i} className="flex gap-2 mb-1 items-center">
                    <input value={d.item} onChange={(e) => updateDeduction(i, "item", e.target.value)} placeholder="Item name" className="flex-1 px-2 py-1 text-[13px]" style={inputStyle} />
                    <input type="number" value={d.amount} onChange={(e) => updateDeduction(i, "amount", parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 text-[13px] text-right" style={inputStyle} step="0.01" />
                    <button onClick={() => removeDeduction(i)} className="text-[16px] px-1" style={{ color: "#dc2626" }}>×</button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <Field label="Other Salary Components" value={form.otherSalaryComponents} onChange={(v) => setForm({ ...form, otherSalaryComponents: v })} placeholder="e.g. Productivity incentive" />
                <div className="flex items-center gap-2 mt-6">
                  <input type="checkbox" checked={form.cpfApplicable} onChange={(e) => setForm({ ...form, cpfApplicable: e.target.checked })} id="cpf-check" />
                  <label htmlFor="cpf-check" className="text-[13px] font-semibold" style={{ color: "var(--grey-700)" }}>CPF contributions payable</label>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4">

            {/* Section D — Leave */}
            <div className="p-4 rounded-lg" style={cardStyle}>
              <div style={sectionHead}>Section D | Leave and Medical Benefits</div>
              <div className="grid grid-cols-1 gap-3">
                <Field label={`Paid Annual Leave Per Year (${form.employmentType === "part_time" ? "hours" : "days"})`}
                  value={form.annualLeaveDays} onChange={(v) => setForm({ ...form, annualLeaveDays: v })} />
                <Field label={`Paid Outpatient Sick Leave Per Year (${form.employmentType === "part_time" ? "hours" : "days"})`}
                  value={form.sickLeaveDays} onChange={(v) => setForm({ ...form, sickLeaveDays: v })} />
                <Field label={`Paid Hospitalisation Leave Per Year (${form.employmentType === "part_time" ? "hours" : "days"})`}
                  value={form.hospitalisationLeaveDays} onChange={(v) => setForm({ ...form, hospitalisationLeaveDays: v })} />
                <Field label="Other Leave" value={form.otherLeave} onChange={(v) => setForm({ ...form, otherLeave: v })} placeholder="e.g. 16 weeks Maternity Leave" />
                <p className="text-[10px]" style={{ color: "var(--grey-400)", fontStyle: "italic" }}>
                  Note: Paid hospitalisation leave is inclusive of paid outpatient sick leave. Part-time leave may be pro-rated by hours.
                </p>
                <Field label="Medical Benefits" value={form.medicalBenefits} onChange={(v) => setForm({ ...form, medicalBenefits: v })} placeholder="Full reimbursement for medical examination fee." />
              </div>
            </div>

            {/* Section E — Others */}
            <div className="p-4 rounded-lg" style={cardStyle}>
              <div style={sectionHead}>Section E | Others</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Length of Probation" value={form.probationLength} onChange={(v) => setForm({ ...form, probationLength: v })} placeholder="e.g. 3 months" />
                <Field label="Notice Period for Termination" value={form.noticePeriod} onChange={(v) => setForm({ ...form, noticePeriod: v })} placeholder="1 month notice or salary in lieu" />
                <Field label="Probation Start Date" value={form.probationStartDate} onChange={(v) => setForm({ ...form, probationStartDate: v })} type="date" />
                <Field label="Probation End Date" value={form.probationEndDate} onChange={(v) => setForm({ ...form, probationEndDate: v })} type="date" />
              </div>
            </div>

            {/* Status */}
            <div className="p-4 rounded-lg" style={cardStyle}>
              <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>KET Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 text-[14px]" style={inputStyle}>
                <option value="draft">Draft — Save for later</option>
                <option value="issued">Issued — Final document</option>
              </select>
            </div>

          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex justify-end gap-2 mt-4 mb-8">
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[14px] font-semibold rounded-lg"
            style={{ background: "var(--grey-100)", color: "var(--grey-600)" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-[14px] font-semibold rounded-lg"
            style={{ background: "#c0392b", color: "#fff", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Save KET"}
          </button>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────────
  return (
    <div>
      <AdminTabs />
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-lg font-semibold text-[14px] shadow-lg"
          style={{ background: toast.type === "ok" ? "#d1fae5" : "#fef2f2", color: toast.type === "ok" ? "#065f46" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[22px] font-bold" style={{ color: "var(--grey-900)" }}>Key Employment Terms (KET)</h2>
          <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
            MOM-mandated document — must be issued to every employee within 14 days of employment
          </p>
        </div>
        <button onClick={openNew} className="px-5 py-2.5 text-[14px] font-semibold rounded-lg"
          style={{ background: "#c0392b", color: "#fff" }}>
          + Generate KET
        </button>
      </div>

      <div className="rounded-lg overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--grey-400)" }}>Loading...</div>
        ) : kets.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-[40px] mb-2">📋</div>
            <div className="text-[15px] font-semibold" style={{ color: "var(--grey-700)" }}>No KETs generated yet</div>
            <p className="text-[13px] mt-1" style={{ color: "var(--grey-400)" }}>
              Click &quot;Generate KET&quot; to create a Key Employment Terms document for a staff member.
            </p>
          </div>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr style={{ background: "var(--grey-50)" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Employee</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Staff ID</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Job Title</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Type</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Issued</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Status</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {kets.map((k) => {
                const badge = STATUS_BADGE[k.status] || STATUS_BADGE.draft;
                return (
                  <tr key={k.id} style={{ borderBottom: "1px solid var(--grey-200)" }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: "var(--grey-900)" }}>{k.employeeName}</td>
                    <td className="px-4 py-3" style={{ color: "var(--grey-500)", fontSize: "12px" }}>{k.userStaffId || "—"}</td>
                    <td className="px-4 py-3" style={{ color: "var(--grey-700)" }}>{k.jobTitle}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase rounded-full"
                        style={{ color: k.employmentType === "part_time" ? "#7c3aed" : "#1e40af", background: k.employmentType === "part_time" ? "#faf5ff" : "#dbeafe" }}>
                        {k.employmentType === "part_time" ? "Part-Time" : "Full-Time"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[12px]" style={{ color: "var(--grey-500)" }}>
                      {new Date(k.issuedDate).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded-full"
                        style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => window.open(`/api/admin/ket/${k.id}/html`, "_blank")}
                          className="px-2 py-1 text-[12px] font-semibold rounded"
                          style={{ background: "#dbeafe", color: "#1e40af" }}>View</button>
                        {k.status === "draft" && (
                          <button onClick={() => handleIssue(k.id)}
                            className="px-2 py-1 text-[12px] font-semibold rounded"
                            style={{ background: "#d1fae5", color: "#065f46" }}>Issue</button>
                        )}
                        <button onClick={() => handleDelete(k.id)}
                          className="px-2 py-1 text-[12px] font-semibold rounded"
                          style={{ background: "#fef2f2", color: "#dc2626" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
