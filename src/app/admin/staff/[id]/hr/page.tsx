"use client";

import { useEffect, useState, useCallback } from "react";
import { useFlash } from "@/components/FlashCardProvider";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Staff {
  id: string;
  name: string;
  role: string;
  staffIdNumber: string | null;
  specialization: string | null;
  department: string | null;
  dateOfJoining: string | null;
  employmentType: string;

  // HR fields
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  breakDurationMin: number | null;
  restDay: string | null;
  overtimeEligible: boolean;
  annualLeaveDays: number | null;
  sickLeaveDays: number | null;
  hospitalisationLeaveDays: number | null;
  probationMonths: number | null;
  probationStartDate: string | null;
  probationEndDate: string | null;
  noticeDaysProbation: number | null;
  noticeDaysConfirmed: number | null;
  employmentEndDate: string | null;
}

interface HrForm {
  dailyStartTime: string;
  dailyEndTime: string;
  breakDurationMin: string;
  restDay: string;
  overtimeEligible: boolean;
  annualLeaveDays: string;
  sickLeaveDays: string;
  hospitalisationLeaveDays: string;
  probationMonths: string;
  probationStartDate: string;
  probationEndDate: string;
  noticeDaysProbation: string;
  noticeDaysConfirmed: string;
  employmentEndDate: string;
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

const REST_DAYS = ["Sunday", "Saturday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Rotating", "None"];

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

function toDateInput(d: string | null): string {
  if (!d) return "";
  return d.split("T")[0];
}

function staffToForm(s: Staff): HrForm {
  return {
    dailyStartTime: s.dailyStartTime || "",
    dailyEndTime: s.dailyEndTime || "",
    breakDurationMin: s.breakDurationMin !== null ? String(s.breakDurationMin) : "",
    restDay: s.restDay || "",
    overtimeEligible: s.overtimeEligible || false,
    annualLeaveDays: s.annualLeaveDays !== null ? String(s.annualLeaveDays) : "",
    sickLeaveDays: s.sickLeaveDays !== null ? String(s.sickLeaveDays) : "",
    hospitalisationLeaveDays: s.hospitalisationLeaveDays !== null ? String(s.hospitalisationLeaveDays) : "",
    probationMonths: s.probationMonths !== null ? String(s.probationMonths) : "",
    probationStartDate: toDateInput(s.probationStartDate),
    probationEndDate: toDateInput(s.probationEndDate),
    noticeDaysProbation: s.noticeDaysProbation !== null ? String(s.noticeDaysProbation) : "",
    noticeDaysConfirmed: s.noticeDaysConfirmed !== null ? String(s.noticeDaysConfirmed) : "",
    employmentEndDate: toDateInput(s.employmentEndDate),
  };
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function StaffHrPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState<HrForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { showFlash } = useFlash();

  const fetchStaff = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/staff/${id}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Staff member not found" : "Failed to load staff member");
        return;
      }
      const data = await res.json();
      setStaff(data);
      setForm(staffToForm(data));
    } catch {
      setError("Failed to load staff member");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // Auto-calculate probation end from start + months
  useEffect(() => {
    if (!form) return;
    if (form.probationStartDate && form.probationMonths && !form.probationEndDate) {
      const start = new Date(form.probationStartDate);
      const months = parseInt(form.probationMonths, 10);
      if (!Number.isNaN(months) && months > 0) {
        const end = new Date(start);
        end.setMonth(end.getMonth() + months);
        const endStr = end.toISOString().split("T")[0];
        setForm((f) => (f ? { ...f, probationEndDate: endStr } : f));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.probationStartDate, form?.probationMonths]);

  const handleSave = async () => {
    if (!form || !id) return;
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        dailyStartTime: form.dailyStartTime || null,
        dailyEndTime: form.dailyEndTime || null,
        breakDurationMin: form.breakDurationMin === "" ? null : Number(form.breakDurationMin),
        restDay: form.restDay || null,
        overtimeEligible: form.overtimeEligible,
        annualLeaveDays: form.annualLeaveDays === "" ? null : Number(form.annualLeaveDays),
        sickLeaveDays: form.sickLeaveDays === "" ? null : Number(form.sickLeaveDays),
        hospitalisationLeaveDays: form.hospitalisationLeaveDays === "" ? null : Number(form.hospitalisationLeaveDays),
        probationMonths: form.probationMonths === "" ? null : Number(form.probationMonths),
        probationStartDate: form.probationStartDate || null,
        probationEndDate: form.probationEndDate || null,
        noticeDaysProbation: form.noticeDaysProbation === "" ? null : Number(form.noticeDaysProbation),
        noticeDaysConfirmed: form.noticeDaysConfirmed === "" ? null : Number(form.noticeDaysConfirmed),
        employmentEndDate: form.employmentEndDate || null,
      };
      const res = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save HR details");
      }
      const saved = await res.json();
      setStaff((s) => (s ? { ...s, ...saved } : s));
      showFlash({ type: "success", title: "Success", message: "HR details saved" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save HR details";
      setError(msg);
      showFlash({ type: "error", title: "Error", message: msg });
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="p-6 md:p-8 yoda-fade-in max-w-[1100px] mx-auto">
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
            HR Details
          </h1>
          <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>
            {staff.staffIdNumber && <span className="mr-2">{staff.staffIdNumber}</span>}
            <span>MOM Key Employment Terms — working hours, leave &amp; termination</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 text-[14px]" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)" }}>
          {error}
        </div>
      )}

      {/* Card 1 — Working Hours & Rest */}
      <div className="p-6 mb-5" style={cardStyle}>
        <h2 style={sectionHeaderStyle}>Working Hours &amp; Rest Day</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Daily Start Time</label>
            <input
              type="time"
              value={form.dailyStartTime}
              onChange={(e) => setForm({ ...form, dailyStartTime: e.target.value })}
              className="w-full px-3 py-2"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Daily End Time</label>
            <input
              type="time"
              value={form.dailyEndTime}
              onChange={(e) => setForm({ ...form, dailyEndTime: e.target.value })}
              className="w-full px-3 py-2"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Break Duration (minutes)</label>
            <input
              type="number"
              min={0}
              max={240}
              value={form.breakDurationMin}
              onChange={(e) => setForm({ ...form, breakDurationMin: e.target.value })}
              placeholder="60"
              className="w-full px-3 py-2"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Rest Day</label>
            <select
              value={form.restDay}
              onChange={(e) => setForm({ ...form, restDay: e.target.value })}
              className="w-full px-3 py-2"
              style={inputStyle}
            >
              <option value="">Select rest day…</option>
              {REST_DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 14, color: "var(--grey-700)", fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={form.overtimeEligible}
                onChange={(e) => setForm({ ...form, overtimeEligible: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Overtime eligible <span style={{ color: "var(--grey-500)", fontWeight: 400 }}>(MOM: non-workman earning ≤ $2,600/mo qualifies for OT pay)</span></span>
            </label>
          </div>
        </div>
      </div>

      {/* Card 2 — Leave & Termination */}
      <div className="p-6 mb-5" style={cardStyle}>
        <h2 style={sectionHeaderStyle}>Leave &amp; Termination</h2>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--grey-700)", marginBottom: 10, marginTop: 4 }}>Leave Entitlements (days/year)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div>
            <label style={labelStyle}>Annual Leave</label>
            <input
              type="number"
              min={0}
              max={365}
              value={form.annualLeaveDays}
              onChange={(e) => setForm({ ...form, annualLeaveDays: e.target.value })}
              placeholder="14"
              className="w-full px-3 py-2"
              style={inputStyle}
            />
            <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>MOM min: 7 (1 yr) → 14 (8+ yr)</p>
          </div>
          <div>
            <label style={labelStyle}>Outpatient Sick Leave</label>
            <input
              type="number"
              min={0}
              max={365}
              value={form.sickLeaveDays}
              onChange={(e) => setForm({ ...form, sickLeaveDays: e.target.value })}
              placeholder="14"
              className="w-full px-3 py-2"
              style={inputStyle}
            />
            <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>MOM: up to 14 days</p>
          </div>
          <div>
            <label style={labelStyle}>Hospitalisation Leave</label>
            <input
              type="number"
              min={0}
              max={365}
              value={form.hospitalisationLeaveDays}
              onChange={(e) => setForm({ ...form, hospitalisationLeaveDays: e.target.value })}
              placeholder="60"
              className="w-full px-3 py-2"
              style={inputStyle}
            />
            <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>MOM: up to 60 days (incl. sick)</p>
          </div>
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--grey-700)", marginBottom: 10 }}>Probation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div>
            <label style={labelStyle}>Probation Period (months)</label>
            <input
              type="number"
              min={0}
              max={24}
              value={form.probationMonths}
              onChange={(e) => setForm({ ...form, probationMonths: e.target.value })}
              placeholder="3"
              className="w-full px-3 py-2"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Probation Start Date</label>
            <input
              type="date"
              value={form.probationStartDate}
              onChange={(e) => setForm({ ...form, probationStartDate: e.target.value })}
              className="w-full px-3 py-2"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Probation End Date</label>
            <input
              type="date"
              value={form.probationEndDate}
              onChange={(e) => setForm({ ...form, probationEndDate: e.target.value })}
              className="w-full px-3 py-2"
              style={inputStyle}
            />
            <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>Auto-filled from start + months</p>
          </div>
        </div>

        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--grey-700)", marginBottom: 10 }}>Notice Period &amp; End Date</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label style={labelStyle}>Notice (during probation)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={365}
                value={form.noticeDaysProbation}
                onChange={(e) => setForm({ ...form, noticeDaysProbation: e.target.value })}
                placeholder="1"
                className="w-full px-3 py-2"
                style={inputStyle}
              />
              <span className="text-[14px]" style={{ color: "var(--grey-600)" }}>days</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notice (after confirmation)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={365}
                value={form.noticeDaysConfirmed}
                onChange={(e) => setForm({ ...form, noticeDaysConfirmed: e.target.value })}
                placeholder="30"
                className="w-full px-3 py-2"
                style={inputStyle}
              />
              <span className="text-[14px]" style={{ color: "var(--grey-600)" }}>days</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Employment End Date <span style={{ color: "var(--grey-500)", fontWeight: 400 }}>(fixed-term only)</span></label>
            <input
              type="date"
              value={form.employmentEndDate}
              onChange={(e) => setForm({ ...form, employmentEndDate: e.target.value })}
              className="w-full px-3 py-2"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 sticky bottom-4 p-4" style={cardStyle}>
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
          {saving ? "Saving…" : "Save HR Details"}
        </button>
      </div>

    </div>
  );
}
