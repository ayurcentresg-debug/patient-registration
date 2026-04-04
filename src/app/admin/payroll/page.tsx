"use client";

import { useEffect, useState, useCallback } from "react";
import AdminTabs from "@/components/AdminTabs";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AllowanceDeduction {
  name: string;
  amount: number;
}

interface SalaryConfig {
  id: string;
  userId: string;
  country: string;
  baseSalary: number;
  salaryType: string;
  hourlyRate: number | null;
  age: number | null;
  allowances: AllowanceDeduction[];
  deductions: AllowanceDeduction[];
  cpfEmployee: number;
  cpfEmployer: number;
  bankName: string | null;
  bankAccount: string | null;
  isActive: boolean;
  userName: string;
  userRole: string;
  userEmail: string;
}

interface PayrollRecord {
  id: string;
  userId: string;
  period: string;
  country: string;
  baseSalary: number;
  totalAllowances: number;
  commission: number;
  overtime: number;
  bonus: number;
  grossPay: number;
  cpfEmployee: number;
  cpfEmployer: number;
  unpaidLeave: number;
  otherDeductions: number;
  totalDeductions: number;
  employerContributions: number;
  taxWithholding: number;
  statutoryBreakdown: string;
  netPay: number;
  workingDays: number;
  leaveDays: number;
  unpaidLeaveDays: number;
  status: string;
  paidAt: string | null;
  notes: string | null;
  userName: string;
  userRole: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: "Admin", color: "#7c3aed", bg: "#f5f3ff" },
  doctor: { label: "Doctor", color: "#2d6a4f", bg: "#f0faf4" },
  therapist: { label: "Therapist", color: "#059669", bg: "#ecfdf5" },
  pharmacist: { label: "Pharmacist", color: "#b45309", bg: "#fffbeb" },
  receptionist: { label: "Receptionist", color: "#0369a1", bg: "#f0f9ff" },
  staff: { label: "Staff", color: "#475569", bg: "#f8fafc" },
};

const STATUS_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: "#475569", bg: "#f1f5f9", label: "Draft" },
  confirmed: { color: "#1e40af", bg: "#dbeafe", label: "Confirmed" },
  paid: { color: "#065f46", bg: "#d1fae5", label: "Paid" },
};

const COUNTRY_OPTIONS = [
  { code: "SG", label: "Singapore", currency: "S$", flag: "SG" },
  { code: "IN", label: "India", currency: "\u20B9", flag: "IN" },
  { code: "MY", label: "Malaysia", currency: "RM", flag: "MY" },
];

const COUNTRY_LABEL: Record<string, string> = {
  SG: "Singapore",
  IN: "India",
  MY: "Malaysia",
};

const COUNTRY_CURRENCY: Record<string, string> = {
  SG: "S$",
  IN: "\u20B9",
  MY: "RM",
};

const COUNTRY_STATUTORY_LABELS: Record<string, string[]> = {
  SG: ["CPF Employee", "CPF Employer", "SDL", "SHG Fund"],
  IN: ["EPF", "ESI", "Prof. Tax", "TDS"],
  MY: ["EPF", "SOCSO", "EIS", "PCB"],
};

function getStatutoryLabel(country: string): string {
  switch (country) {
    case "IN": return "EPF/ESI/TDS";
    case "MY": return "EPF/SOCSO/PCB";
    case "SG":
    default: return "CPF";
  }
}

function formatCurrencyForCountry(amount: number, country: string): string {
  const sym = COUNTRY_CURRENCY[country] || "S$";
  return `${sym}${amount.toFixed(2)}`;
}

// ─── Design Tokens (YODA) ───────────────────────────────────────────────────

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

function formatCurrency(amount: number) {
  return `S$${amount.toFixed(2)}`;
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatPeriodLabel(period: string) {
  const [y, m] = period.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString("en-SG", { year: "numeric", month: "long" });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<"payroll" | "salary" | "reports">("payroll");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminTabs />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--grey-900)" }}>
          Payroll Management
        </h1>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: "2px solid var(--grey-200)" }}>
        {(["payroll", "salary", "reports"] as const).map((tab) => {
          const labels = { payroll: "Payroll", salary: "Salary Setup", reports: "Reports" };
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-2.5 text-[15px] font-semibold whitespace-nowrap transition-colors duration-150"
              style={{
                color: active ? "var(--blue-500)" : "var(--grey-600)",
                borderBottom: active ? "2px solid var(--blue-500)" : "2px solid transparent",
                marginBottom: "-2px",
                background: active ? "var(--blue-50)" : "transparent",
                borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                border: "none",
                cursor: "pointer",
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-[15px] font-semibold"
          style={{ background: toast.type === "ok" ? "var(--green)" : "#ef4444" }}
        >
          {toast.msg}
        </div>
      )}

      {activeTab === "payroll" && <PayrollTab showToast={showToast} />}
      {activeTab === "salary" && <SalarySetupTab showToast={showToast} />}
      {activeTab === "reports" && <ReportsTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Payroll Tab
// ═══════════════════════════════════════════════════════════════════════════

function PayrollTab({ showToast }: { showToast: (m: string, t: "ok" | "err") => void }) {
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOvertime, setEditOvertime] = useState("");
  const [editBonus, setEditBonus] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [emailingId, setEmailingId] = useState<string | null>(null);
  const [bulkEmailing, setBulkEmailing] = useState(false);

  const fetchPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payroll?period=${period}`);
      if (res.ok) setPayrolls(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      if (res.ok) {
        const data = await res.json();
        setPayrolls(data);
        showToast(`Generated payroll for ${data.length} staff`, "ok");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to generate", "err");
      }
    } catch {
      showToast("Failed to generate payroll", "err");
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdatePayroll = async (id: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/admin/payroll/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showToast("Updated successfully", "ok");
        fetchPayrolls();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update", "err");
      }
    } catch {
      showToast("Failed to update", "err");
    }
  };

  const handleBulkAction = async (status: "confirmed" | "paid") => {
    const fromStatus = status === "confirmed" ? "draft" : "confirmed";
    const eligible = payrolls.filter((p) => p.status === fromStatus);
    if (!eligible.length) {
      showToast(`No ${fromStatus} records to update`, "err");
      return;
    }
    setBulkLoading(true);
    try {
      for (const p of eligible) {
        await fetch(`/api/admin/payroll/${p.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      }
      showToast(`${eligible.length} records marked as ${status}`, "ok");
      fetchPayrolls();
    } catch {
      showToast("Bulk action failed", "err");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleEmailPayslip = async (payrollId: string) => {
    setEmailingId(payrollId);
    try {
      const res = await fetch(`/api/admin/payroll/${payrollId}/email-payslip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Payslip emailed to ${data.sentTo}`, "ok");
      } else {
        showToast(data.error || "Failed to email payslip", "err");
      }
    } catch {
      showToast("Failed to email payslip", "err");
    } finally {
      setEmailingId(null);
    }
  };

  const handleBulkEmail = async () => {
    if (!payrolls.length) {
      showToast("No payroll records to email", "err");
      return;
    }
    if (!confirm(`Email payslips to all ${payrolls.length} staff for ${formatPeriodLabel(period)}?`)) return;
    setBulkEmailing(true);
    try {
      const res = await fetch("/api/admin/payroll/bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Emailed ${data.sent} payslips (${data.failed} failed, ${data.noEmail} no email)`, data.failed > 0 ? "err" : "ok");
      } else {
        showToast(data.error || "Bulk email failed", "err");
      }
    } catch {
      showToast("Bulk email failed", "err");
    } finally {
      setBulkEmailing(false);
    }
  };

  const startEdit = (p: PayrollRecord) => {
    setEditingId(p.id);
    setEditOvertime(String(p.overtime));
    setEditBonus(String(p.bonus));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await handleUpdatePayroll(editingId, {
      overtime: parseFloat(editOvertime) || 0,
      bonus: parseFloat(editBonus) || 0,
    });
    setEditingId(null);
  };

  // Totals
  const totals = payrolls.reduce(
    (acc, p) => ({
      baseSalary: acc.baseSalary + p.baseSalary,
      totalAllowances: acc.totalAllowances + p.totalAllowances,
      commission: acc.commission + p.commission,
      grossPay: acc.grossPay + p.grossPay,
      cpfEmployee: acc.cpfEmployee + p.cpfEmployee,
      cpfEmployer: acc.cpfEmployer + p.cpfEmployer,
      totalDeductions: acc.totalDeductions + p.totalDeductions,
      employerContributions: acc.employerContributions + (p.employerContributions || 0),
      taxWithholding: acc.taxWithholding + (p.taxWithholding || 0),
      netPay: acc.netPay + p.netPay,
    }),
    {
      baseSalary: 0,
      totalAllowances: 0,
      commission: 0,
      grossPay: 0,
      cpfEmployee: 0,
      cpfEmployer: 0,
      totalDeductions: 0,
      employerContributions: 0,
      taxWithholding: 0,
      netPay: 0,
    }
  );

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div>
          <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>
            Period
          </label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2"
            style={inputStyle}
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2.5 text-white font-semibold text-[14px] rounded-lg"
            style={{ background: "var(--blue-500)", opacity: generating ? 0.6 : 1 }}
          >
            {generating ? "Generating..." : "Generate Payroll"}
          </button>
          <button
            onClick={() => handleBulkAction("confirmed")}
            disabled={bulkLoading}
            className="px-4 py-2.5 font-semibold text-[14px] rounded-lg"
            style={{ background: "var(--blue-50)", color: "var(--blue-500)", border: "1px solid var(--blue-200)" }}
          >
            Confirm All
          </button>
          <button
            onClick={() => handleBulkAction("paid")}
            disabled={bulkLoading}
            className="px-4 py-2.5 font-semibold text-[14px] rounded-lg"
            style={{ background: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0" }}
          >
            Mark All Paid
          </button>
          <button
            onClick={handleBulkEmail}
            disabled={bulkEmailing || !payrolls.length}
            className="px-4 py-2.5 font-semibold text-[14px] rounded-lg"
            style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", opacity: bulkEmailing ? 0.6 : 1 }}
          >
            {bulkEmailing ? "Emailing..." : "📧 Email All Payslips"}
          </button>
          <button
            onClick={() => window.open("/api/public/sample-payslip", "_blank")}
            className="px-4 py-2.5 font-semibold text-[14px] rounded-lg"
            style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}
          >
            Sample Payslip
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={cardStyle} className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center" style={{ color: "var(--grey-500)" }}>
            Loading payroll data...
          </div>
        ) : payrolls.length === 0 ? (
          <div className="p-12 text-center" style={{ color: "var(--grey-500)" }}>
            <p className="text-lg font-semibold mb-2">No payroll records for {formatPeriodLabel(period)}</p>
            <p className="text-[14px]">Click &ldquo;Generate Payroll&rdquo; to create payroll records for all configured staff.</p>
            <button
              onClick={() => window.open("/api/public/sample-payslip", "_blank")}
              className="mt-4 px-4 py-2 font-semibold text-[13px] rounded-lg"
              style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}
            >
              View Sample Payslip
            </button>
          </div>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr style={{ background: "var(--grey-50)" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Staff</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Role</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--grey-600)", fontSize: "11px" }}>Country</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Base</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Allow.</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Comm.</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>OT</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Bonus</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Gross</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Statutory</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)", fontSize: "11px" }}>Tax</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Deduct.</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)", fontSize: "11px" }}>Emp. Cost</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Net Pay</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Status</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map((p) => {
                const badge = STATUS_BADGE[p.status] || STATUS_BADGE.draft;
                const roleMeta = ROLE_META[p.userRole] || ROLE_META.staff;
                const isEditing = editingId === p.id;

                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--grey-200)" }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: "var(--grey-900)" }}>
                      {p.userName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide rounded-full"
                        style={{ color: roleMeta.color, background: roleMeta.bg }}
                      >
                        {roleMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded" style={{ color: "#1e40af", background: "#dbeafe" }}>
                        {p.country || "SG"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrencyForCountry(p.baseSalary, p.country || "SG")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrencyForCountry(p.totalAllowances, p.country || "SG")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrencyForCountry(p.commission, p.country || "SG")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editOvertime}
                          onChange={(e) => setEditOvertime(e.target.value)}
                          className="w-20 px-2 py-1 text-right"
                          style={{ ...inputStyle, fontSize: "13px" }}
                          step="0.01"
                        />
                      ) : (
                        formatCurrencyForCountry(p.overtime, p.country || "SG")
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editBonus}
                          onChange={(e) => setEditBonus(e.target.value)}
                          className="w-20 px-2 py-1 text-right"
                          style={{ ...inputStyle, fontSize: "13px" }}
                          step="0.01"
                        />
                      ) : (
                        formatCurrencyForCountry(p.bonus, p.country || "SG")
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatCurrencyForCountry(p.grossPay, p.country || "SG")}</td>
                    <td className="px-4 py-3 text-right tabular-nums" title={getStatutoryLabel(p.country || "SG")}>{formatCurrencyForCountry(p.cpfEmployee, p.country || "SG")}</td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ fontSize: "12px", color: (p.taxWithholding || 0) > 0 ? "#92400e" : "var(--grey-400)" }}>{formatCurrencyForCountry(p.taxWithholding || 0, p.country || "SG")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrencyForCountry(p.totalDeductions, p.country || "SG")}</td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ fontSize: "12px", color: "#166534" }}>{formatCurrencyForCountry(p.employerContributions || 0, p.country || "SG")}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: "var(--blue-500)" }}>
                      {formatCurrencyForCountry(p.netPay, p.country || "SG")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide rounded-full"
                        style={{ color: badge.color, background: badge.bg }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={saveEdit}
                              className="px-2 py-1 text-[12px] font-semibold rounded"
                              style={{ background: "#d1fae5", color: "#065f46" }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-[12px] font-semibold rounded"
                              style={{ background: "var(--grey-100)", color: "var(--grey-600)" }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {p.status === "draft" && (
                              <>
                                <button
                                  onClick={() => startEdit(p)}
                                  className="px-2 py-1 text-[12px] font-semibold rounded"
                                  style={{ background: "var(--grey-100)", color: "var(--grey-700)" }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleUpdatePayroll(p.id, { status: "confirmed" })}
                                  className="px-2 py-1 text-[12px] font-semibold rounded"
                                  style={{ background: "var(--blue-50)", color: "var(--blue-500)" }}
                                >
                                  Confirm
                                </button>
                              </>
                            )}
                            {p.status === "confirmed" && (
                              <button
                                onClick={() => handleUpdatePayroll(p.id, { status: "paid" })}
                                className="px-2 py-1 text-[12px] font-semibold rounded"
                                style={{ background: "#d1fae5", color: "#065f46" }}
                              >
                                Mark Paid
                              </button>
                            )}
                            <button
                              onClick={() => window.open(`/api/admin/payroll/${p.id}/payslip`, "_blank")}
                              className="px-2 py-1 text-[12px] font-semibold rounded"
                              style={{ background: "#fef3c7", color: "#92400e" }}
                              title="View & Print Payslip"
                            >
                              Payslip
                            </button>
                            <button
                              onClick={() => handleEmailPayslip(p.id)}
                              disabled={emailingId === p.id}
                              className="px-2 py-1 text-[12px] font-semibold rounded"
                              style={{ background: "#dbeafe", color: "#1e40af", opacity: emailingId === p.id ? 0.6 : 1 }}
                              title="Email payslip to staff"
                            >
                              {emailingId === p.id ? "..." : "📧"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr style={{ borderTop: "2px solid var(--grey-400)", background: "var(--grey-50)" }}>
                <td className="px-4 py-3 font-bold" style={{ color: "var(--grey-900)" }} colSpan={3}>
                  TOTALS
                </td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCurrency(totals.baseSalary)}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCurrency(totals.totalAllowances)}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCurrency(totals.commission)}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums" colSpan={2}></td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCurrency(totals.grossPay)}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCurrency(totals.cpfEmployee)}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ fontSize: "12px" }}>{formatCurrency(totals.taxWithholding)}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCurrency(totals.totalDeductions)}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ fontSize: "12px", color: "#166534" }}>{formatCurrency(totals.employerContributions)}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: "var(--blue-500)" }}>
                  {formatCurrency(totals.netPay)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Salary Setup Tab
// ═══════════════════════════════════════════════════════════════════════════

function SalarySetupTab({ showToast }: { showToast: (m: string, t: "ok" | "err") => void }) {
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form state
  const [formCountry, setFormCountry] = useState("SG");
  const [formBaseSalary, setFormBaseSalary] = useState("");
  const [formSalaryType, setFormSalaryType] = useState("monthly");
  const [formHourlyRate, setFormHourlyRate] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formAllowances, setFormAllowances] = useState<AllowanceDeduction[]>([]);
  const [formDeductions, setFormDeductions] = useState<AllowanceDeduction[]>([]);
  const [formCpfEmployee, setFormCpfEmployee] = useState("20");
  const [formCpfEmployer, setFormCpfEmployer] = useState("17");
  const [formBankName, setFormBankName] = useState("");
  const [formBankAccount, setFormBankAccount] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, staffRes] = await Promise.all([
        fetch("/api/admin/payroll/salary-config"),
        fetch("/api/staff"),
      ]);
      if (configRes.ok) setConfigs(await configRes.json());
      if (staffRes.ok) setAllStaff(await staffRes.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const configuredUserIds = new Set(configs.map((c) => c.userId));
  const unconfigured = allStaff.filter((s) => !configuredUserIds.has(s.id));

  const openEditor = (userId: string, config?: SalaryConfig) => {
    setEditingUserId(userId);
    if (config) {
      setFormCountry(config.country || "SG");
      setFormBaseSalary(String(config.baseSalary));
      setFormSalaryType(config.salaryType);
      setFormHourlyRate(config.hourlyRate ? String(config.hourlyRate) : "");
      setFormAge(config.age ? String(config.age) : "");
      setFormAllowances(config.allowances.length ? config.allowances : []);
      setFormDeductions(config.deductions.length ? config.deductions : []);
      setFormCpfEmployee(String(config.cpfEmployee));
      setFormCpfEmployer(String(config.cpfEmployer));
      setFormBankName(config.bankName || "");
      setFormBankAccount(config.bankAccount || "");
    } else {
      setFormCountry("SG");
      setFormBaseSalary("");
      setFormSalaryType("monthly");
      setFormHourlyRate("");
      setFormAge("");
      setFormAllowances([]);
      setFormDeductions([]);
      setFormCpfEmployee("20");
      setFormCpfEmployer("17");
      setFormBankName("");
      setFormBankAccount("");
    }
  };

  const handleSave = async () => {
    if (!editingUserId || !formBaseSalary) {
      showToast("Base salary is required", "err");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payroll/salary-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUserId,
          country: formCountry,
          baseSalary: parseFloat(formBaseSalary),
          salaryType: formSalaryType,
          hourlyRate: formHourlyRate ? parseFloat(formHourlyRate) : null,
          age: formAge || null,
          allowances: formAllowances.filter((a) => a.name && a.amount > 0),
          deductions: formDeductions.filter((d) => d.name && d.amount > 0),
          cpfEmployee: parseFloat(formCpfEmployee) || 20,
          cpfEmployer: parseFloat(formCpfEmployer) || 17,
          bankName: formBankName || null,
          bankAccount: formBankAccount || null,
        }),
      });
      if (res.ok) {
        showToast("Salary config saved", "ok");
        setEditingUserId(null);
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save", "err");
      }
    } catch {
      showToast("Failed to save", "err");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (configId: string) => {
    if (!confirm("Deactivate this salary configuration?")) return;
    try {
      const res = await fetch(`/api/admin/payroll/salary-config/${configId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Config deactivated", "ok");
        fetchData();
      }
    } catch {
      showToast("Failed to deactivate", "err");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center" style={{ color: "var(--grey-500)" }}>
        Loading salary configurations...
      </div>
    );
  }

  return (
    <div>
      {/* Editor Modal */}
      {editingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-xl"
            style={{ ...cardStyle, background: "var(--white)" }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--grey-900)" }}>
              Configure Salary — {allStaff.find((s) => s.id === editingUserId)?.name || configs.find((c) => c.userId === editingUserId)?.userName || "Staff"}
            </h2>

            {/* Country Selector */}
            <div className="mb-4">
              <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>
                Country
              </label>
              <select
                value={formCountry}
                onChange={(e) => {
                  setFormCountry(e.target.value);
                  // Auto-set CPF rates for SG based on age
                  if (e.target.value === "SG") {
                    const age = parseInt(formAge) || 30;
                    if (age <= 55) { setFormCpfEmployee("20"); setFormCpfEmployer("17"); }
                    else if (age <= 60) { setFormCpfEmployee("17"); setFormCpfEmployer("14.5"); }
                    else if (age <= 65) { setFormCpfEmployee("13"); setFormCpfEmployer("11"); }
                    else { setFormCpfEmployee("7.5"); setFormCpfEmployer("7.5"); }
                  }
                }}
                className="w-full px-3 py-2"
                style={inputStyle}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.label} ({c.currency})</option>
                ))}
              </select>
            </div>

            {/* Country-specific statutory summary */}
            <div className="mb-4 p-3 rounded-lg" style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
              <div className="text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: "#0369a1" }}>
                Statutory Contributions ({COUNTRY_LABEL[formCountry] || "Singapore"})
              </div>
              <div className="text-[12px]" style={{ color: "#0369a1" }}>
                {formCountry === "SG" && "CPF Employee + Employer, SDL (0.25%), SHG Fund. No monthly tax withholding."}
                {formCountry === "IN" && "EPF 12%+12% (on basic up to \u20B915,000), ESI (if salary \u2264\u20B921,000), Professional Tax, TDS (New Regime)."}
                {formCountry === "MY" && "EPF 11%+12/13%, SOCSO (up to RM4,000), EIS (up to RM4,000), PCB monthly tax."}
              </div>
              <div className="text-[11px] mt-1" style={{ color: "#64748b" }}>
                Applicable items: {(COUNTRY_STATUTORY_LABELS[formCountry] || []).join(", ")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>
                  Salary Type
                </label>
                <select
                  value={formSalaryType}
                  onChange={(e) => setFormSalaryType(e.target.value)}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                >
                  <option value="monthly">Monthly</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>
                  Base Salary ({COUNTRY_CURRENCY[formCountry] || "S$"})
                </label>
                <input
                  type="number"
                  value={formBaseSalary}
                  onChange={(e) => setFormBaseSalary(e.target.value)}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                  placeholder="e.g. 3500"
                  step="0.01"
                />
              </div>
              {formSalaryType === "hourly" && (
                <div>
                  <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>
                    Hourly Rate ({COUNTRY_CURRENCY[formCountry] || "S$"})
                  </label>
                  <input
                    type="number"
                    value={formHourlyRate}
                    onChange={(e) => setFormHourlyRate(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    placeholder="e.g. 20"
                    step="0.01"
                  />
                </div>
              )}
              {/* Age field - useful for SG CPF rates */}
              <div>
                <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>
                  Employee Age {formCountry === "SG" && "(for CPF rate)"}
                </label>
                <input
                  type="number"
                  value={formAge}
                  onChange={(e) => {
                    setFormAge(e.target.value);
                    // Auto-adjust CPF rates for SG
                    if (formCountry === "SG" && e.target.value) {
                      const age = parseInt(e.target.value);
                      if (age <= 55) { setFormCpfEmployee("20"); setFormCpfEmployer("17"); }
                      else if (age <= 60) { setFormCpfEmployee("17"); setFormCpfEmployer("14.5"); }
                      else if (age <= 65) { setFormCpfEmployee("13"); setFormCpfEmployer("11"); }
                      else { setFormCpfEmployee("7.5"); setFormCpfEmployer("7.5"); }
                    }
                  }}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                  placeholder="e.g. 35"
                />
              </div>
            </div>

            {/* CPF/Contribution Rates (SG override) */}
            {formCountry === "SG" && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>
                    CPF Employee Rate (%) — Override
                  </label>
                  <input
                    type="number"
                    value={formCpfEmployee}
                    onChange={(e) => setFormCpfEmployee(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>
                    CPF Employer Rate (%) — Override
                  </label>
                  <input
                    type="number"
                    value={formCpfEmployer}
                    onChange={(e) => setFormCpfEmployer(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    step="0.1"
                  />
                </div>
              </div>
            )}
            {formCountry === "IN" && (
              <div className="p-3 mb-4 rounded-lg text-[12px]" style={{ background: "#fef3c7", color: "#92400e" }}>
                <strong>India Statutory Rates (auto-calculated):</strong> EPF 12%+12% (ceiling {"\u20B9"}15,000), ESI 0.75%+3.25% (if salary {"\u2264\u20B9"}21,000), Professional Tax up to {"\u20B9"}200/month, TDS per New Regime slabs.
              </div>
            )}
            {formCountry === "MY" && (
              <div className="p-3 mb-4 rounded-lg text-[12px]" style={{ background: "#fef3c7", color: "#92400e" }}>
                <strong>Malaysia Statutory Rates (auto-calculated):</strong> EPF 11%+12/13%, SOCSO 0.5%+1.75% (cap RM4,000), EIS 0.2%+0.2% (cap RM4,000), PCB per tax tables.
              </div>
            )}

            {/* Allowances */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-semibold" style={{ color: "var(--grey-600)" }}>
                  Allowances
                </label>
                <button
                  onClick={() => setFormAllowances([...formAllowances, { name: "", amount: 0 }])}
                  className="text-[13px] font-semibold px-2 py-1 rounded"
                  style={{ color: "var(--blue-500)", background: "var(--blue-50)" }}
                >
                  + Add
                </button>
              </div>
              {formAllowances.map((a, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={a.name}
                    onChange={(e) => {
                      const updated = [...formAllowances];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setFormAllowances(updated);
                    }}
                    className="flex-1 px-3 py-2"
                    style={inputStyle}
                    placeholder="e.g. Transport"
                  />
                  <input
                    type="number"
                    value={a.amount || ""}
                    onChange={(e) => {
                      const updated = [...formAllowances];
                      updated[i] = { ...updated[i], amount: parseFloat(e.target.value) || 0 };
                      setFormAllowances(updated);
                    }}
                    className="w-28 px-3 py-2"
                    style={inputStyle}
                    placeholder="Amount"
                    step="0.01"
                  />
                  <button
                    onClick={() => setFormAllowances(formAllowances.filter((_, j) => j !== i))}
                    className="px-2 py-1 text-[13px] font-semibold rounded"
                    style={{ color: "#ef4444" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Deductions */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-semibold" style={{ color: "var(--grey-600)" }}>
                  Deductions
                </label>
                <button
                  onClick={() => setFormDeductions([...formDeductions, { name: "", amount: 0 }])}
                  className="text-[13px] font-semibold px-2 py-1 rounded"
                  style={{ color: "var(--blue-500)", background: "var(--blue-50)" }}
                >
                  + Add
                </button>
              </div>
              {formDeductions.map((d, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={d.name}
                    onChange={(e) => {
                      const updated = [...formDeductions];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setFormDeductions(updated);
                    }}
                    className="flex-1 px-3 py-2"
                    style={inputStyle}
                    placeholder="e.g. Insurance"
                  />
                  <input
                    type="number"
                    value={d.amount || ""}
                    onChange={(e) => {
                      const updated = [...formDeductions];
                      updated[i] = { ...updated[i], amount: parseFloat(e.target.value) || 0 };
                      setFormDeductions(updated);
                    }}
                    className="w-28 px-3 py-2"
                    style={inputStyle}
                    placeholder="Amount"
                    step="0.01"
                  />
                  <button
                    onClick={() => setFormDeductions(formDeductions.filter((_, j) => j !== i))}
                    className="px-2 py-1 text-[13px] font-semibold rounded"
                    style={{ color: "#ef4444" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Bank Details */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formBankName}
                  onChange={(e) => setFormBankName(e.target.value)}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                  placeholder="e.g. DBS, OCBC, UOB"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={formBankAccount}
                  onChange={(e) => setFormBankAccount(e.target.value)}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                  placeholder="Account number"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingUserId(null)}
                className="px-4 py-2.5 font-semibold text-[14px] rounded-lg"
                style={{ background: "var(--grey-100)", color: "var(--grey-700)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 text-white font-semibold text-[14px] rounded-lg"
                style={{ background: "var(--blue-500)", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configured Staff */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--grey-900)" }}>
          Configured Staff ({configs.length})
        </h2>
        {configs.length === 0 ? (
          <div style={cardStyle} className="p-8 text-center" >
            <p style={{ color: "var(--grey-500)" }}>No salary configurations yet. Configure staff from the list below.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {configs.map((config) => {
              const roleMeta = ROLE_META[config.userRole] || ROLE_META.staff;
              const totalAllowances = config.allowances.reduce((s, a) => s + a.amount, 0);
              const totalDeductions = config.deductions.reduce((s, d) => s + d.amount, 0);

              return (
                <div key={config.id} style={cardStyle} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-[15px]" style={{ color: "var(--grey-900)" }}>
                          {config.userName}
                        </div>
                        <span
                          className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide rounded-full mt-1"
                          style={{ color: roleMeta.color, background: roleMeta.bg }}
                        >
                          {roleMeta.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-[14px]">
                      <div className="text-right">
                        <div style={{ color: "var(--grey-500)" }} className="text-[12px]">Base Salary</div>
                        <div className="font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(config.baseSalary)}</div>
                      </div>
                      {totalAllowances > 0 && (
                        <div className="text-right">
                          <div style={{ color: "var(--grey-500)" }} className="text-[12px]">Allowances</div>
                          <div className="font-semibold" style={{ color: "#065f46" }}>+{formatCurrency(totalAllowances)}</div>
                        </div>
                      )}
                      {totalDeductions > 0 && (
                        <div className="text-right">
                          <div style={{ color: "var(--grey-500)" }} className="text-[12px]">Deductions</div>
                          <div className="font-semibold" style={{ color: "#ef4444" }}>-{formatCurrency(totalDeductions)}</div>
                        </div>
                      )}
                      <div className="text-right">
                        <div style={{ color: "var(--grey-500)" }} className="text-[12px]">Country</div>
                        <div className="font-semibold" style={{ color: "var(--grey-700)" }}>
                          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded" style={{ color: "#1e40af", background: "#dbeafe" }}>
                            {config.country || "SG"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div style={{ color: "var(--grey-500)" }} className="text-[12px]">{getStatutoryLabel(config.country || "SG")}</div>
                        <div className="font-semibold" style={{ color: "var(--grey-700)" }}>
                          {(config.country || "SG") === "SG" ? `${config.cpfEmployee}% / ${config.cpfEmployer}%` : "Auto"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditor(config.userId, config)}
                          className="px-3 py-1.5 text-[13px] font-semibold rounded-lg"
                          style={{ background: "var(--blue-50)", color: "var(--blue-500)" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeactivate(config.id)}
                          className="px-3 py-1.5 text-[13px] font-semibold rounded-lg"
                          style={{ background: "#fef2f2", color: "#ef4444" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unconfigured Staff */}
      {unconfigured.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--grey-900)" }}>
            Not Configured ({unconfigured.length})
          </h2>
          <div className="grid gap-3">
            {unconfigured.map((staff) => {
              const roleMeta = ROLE_META[staff.role] || ROLE_META.staff;
              return (
                <div key={staff.id} style={cardStyle} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-semibold text-[15px]" style={{ color: "var(--grey-900)" }}>
                        {staff.name}
                      </div>
                      <span
                        className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide rounded-full mt-1"
                        style={{ color: roleMeta.color, background: roleMeta.bg }}
                      >
                        {roleMeta.label}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => openEditor(staff.id)}
                    className="px-4 py-2 text-[13px] font-semibold rounded-lg"
                    style={{ background: "var(--blue-500)", color: "#fff" }}
                  >
                    Configure
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Reports Tab
// ═══════════════════════════════════════════════════════════════════════════

function ReportsTab() {
  const [fromPeriod, setFromPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-01`;
  });
  const [toPeriod, setToPeriod] = useState(getCurrentPeriod());
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payroll?period=`);
      if (res.ok) {
        const all: PayrollRecord[] = await res.json();
        // Filter by range
        const filtered = all.filter((p) => p.period >= fromPeriod && p.period <= toPeriod);
        setPayrolls(filtered);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [fromPeriod, toPeriod]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Monthly summaries
  const monthlyMap = new Map<string, { gross: number; cpfEmployee: number; cpfEmployer: number; employerContributions: number; taxWithholding: number; net: number; count: number }>();
  for (const p of payrolls) {
    const existing = monthlyMap.get(p.period) || { gross: 0, cpfEmployee: 0, cpfEmployer: 0, employerContributions: 0, taxWithholding: 0, net: 0, count: 0 };
    existing.gross += p.grossPay;
    existing.cpfEmployee += p.cpfEmployee;
    existing.cpfEmployer += p.cpfEmployer;
    existing.employerContributions += (p.employerContributions || 0);
    existing.taxWithholding += (p.taxWithholding || 0);
    existing.net += p.netPay;
    existing.count += 1;
    monthlyMap.set(p.period, existing);
  }
  const monthlySummary = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b));

  // Per-staff YTD
  const staffMap = new Map<string, { name: string; role: string; country: string; gross: number; cpfEmployee: number; cpfEmployer: number; employerContributions: number; taxWithholding: number; net: number }>();
  for (const p of payrolls) {
    const existing = staffMap.get(p.userId) || { name: p.userName, role: p.userRole, country: p.country || "SG", gross: 0, cpfEmployee: 0, cpfEmployer: 0, employerContributions: 0, taxWithholding: 0, net: 0 };
    existing.gross += p.grossPay;
    existing.cpfEmployee += p.cpfEmployee;
    existing.cpfEmployer += p.cpfEmployer;
    existing.employerContributions += (p.employerContributions || 0);
    existing.taxWithholding += (p.taxWithholding || 0);
    existing.net += p.netPay;
    staffMap.set(p.userId, existing);
  }
  const staffSummary = Array.from(staffMap.entries());

  // Group staff by country
  const countries = [...new Set(payrolls.map(p => p.country || "SG"))].sort();
  const staffByCountry = new Map<string, typeof staffSummary>();
  for (const [uid, data] of staffSummary) {
    const c = data.country || "SG";
    if (!staffByCountry.has(c)) staffByCountry.set(c, []);
    staffByCountry.get(c)!.push([uid, data]);
  }

  // CSV export
  const exportCSV = () => {
    const headers = ["Period", "Country", "Staff Name", "Role", "Base Salary", "Allowances", "Commission", "Overtime", "Bonus", "Gross Pay", "Statutory Employee", "Tax Withholding", "Employer Contributions", "Total Deductions", "Net Pay", "Status"];
    const rows = payrolls.map((p) => [
      p.period, p.country || "SG", p.userName, p.userRole, p.baseSalary, p.totalAllowances, p.commission,
      p.overtime, p.bonus, p.grossPay, p.cpfEmployee, p.taxWithholding || 0, p.employerContributions || 0, p.totalDeductions, p.netPay, p.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-report-${fromPeriod}-to-${toPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Statutory report CSV (country-aware)
  const exportStatutory = () => {
    const headers = ["Country", "Staff Name", "Employee Statutory", "Tax Withholding", "Employer Statutory", "Total Contributions"];
    const rows = staffSummary.map(([, s]) => [
      s.country || "SG", s.name, s.cpfEmployee.toFixed(2), s.taxWithholding.toFixed(2), s.employerContributions.toFixed(2), (s.cpfEmployee + s.employerContributions).toFixed(2),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statutory-report-${fromPeriod}-to-${toPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Period range */}
      <div className="flex items-end gap-4 mb-6 flex-wrap">
        <div>
          <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>From</label>
          <input type="month" value={fromPeriod} onChange={(e) => setFromPeriod(e.target.value)} className="px-3 py-2" style={inputStyle} />
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>To</label>
          <input type="month" value={toPeriod} onChange={(e) => setToPeriod(e.target.value)} className="px-3 py-2" style={inputStyle} />
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2.5 font-semibold text-[14px] rounded-lg"
          style={{ background: "var(--blue-50)", color: "var(--blue-500)", border: "1px solid var(--blue-200)" }}
        >
          Export CSV
        </button>
        <button
          onClick={exportStatutory}
          className="px-4 py-2.5 font-semibold text-[14px] rounded-lg"
          style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}
        >
          Statutory Report
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center" style={{ color: "var(--grey-500)" }}>Loading reports...</div>
      ) : payrolls.length === 0 ? (
        <div style={cardStyle} className="p-12 text-center">
          <p style={{ color: "var(--grey-500)" }} className="text-lg font-semibold">No payroll data for selected period</p>
        </div>
      ) : (
        <>
          {/* Monthly Summary */}
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--grey-900)" }}>Monthly Payroll Summary</h2>
          <div style={cardStyle} className="overflow-x-auto mb-8">
            <table className="w-full text-[14px]">
              <thead>
                <tr style={{ background: "var(--grey-50)" }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Period</th>
                  <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Staff</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Total Gross</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Employee Statutory</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Tax Withholding</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Employer Cost</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Total Net</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummary.map(([period, data]) => (
                  <tr key={period} style={{ borderBottom: "1px solid var(--grey-200)" }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: "var(--grey-900)" }}>{formatPeriodLabel(period)}</td>
                    <td className="px-4 py-3 text-center">{data.count}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.gross)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.cpfEmployee)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.taxWithholding)}</td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: "#166534" }}>{formatCurrency(data.employerContributions)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: "var(--blue-500)" }}>
                      {formatCurrency(data.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-Staff YTD */}
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--grey-900)" }}>Staff Year-to-Date Summary</h2>
          <div style={cardStyle} className="overflow-x-auto mb-8">
            <table className="w-full text-[14px]">
              <thead>
                <tr style={{ background: "var(--grey-50)" }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Staff</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Role</th>
                  <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Country</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Total Gross</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Employee Statutory</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Tax Withheld</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Employer Cost</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Total Net</th>
                </tr>
              </thead>
              <tbody>
                {staffSummary.map(([userId, data]) => {
                  const roleMeta = ROLE_META[data.role] || ROLE_META.staff;
                  return (
                    <tr key={userId} style={{ borderBottom: "1px solid var(--grey-200)" }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--grey-900)" }}>{data.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide rounded-full"
                          style={{ color: roleMeta.color, background: roleMeta.bg }}
                        >
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded" style={{ color: "#1e40af", background: "#dbeafe" }}>
                          {data.country || "SG"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.gross)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.cpfEmployee)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.taxWithholding)}</td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: "#166534" }}>{formatCurrency(data.employerContributions)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: "var(--blue-500)" }}>
                        {formatCurrency(data.net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Country-Specific Statutory Reports */}
          {countries.map((countryCode) => {
            const countryStaff = staffByCountry.get(countryCode) || [];
            const countryName = COUNTRY_LABEL[countryCode] || countryCode;
            const statutoryLabel = countryCode === "SG" ? "CPF" : countryCode === "IN" ? "EPF/ESI" : "EPF/SOCSO";
            return (
              <div key={countryCode} className="mb-8">
                <h2 className="text-lg font-bold mb-3" style={{ color: "var(--grey-900)" }}>
                  {countryName} — {statutoryLabel} Contribution Report
                </h2>
                <div style={cardStyle} className="overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr style={{ background: "var(--grey-50)" }}>
                        <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Staff Name</th>
                        <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Employee Statutory</th>
                        <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Tax Withheld</th>
                        <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Employer Statutory</th>
                        <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-600)" }}>Total Contributions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {countryStaff.map(([userId, data]) => (
                        <tr key={userId} style={{ borderBottom: "1px solid var(--grey-200)" }}>
                          <td className="px-4 py-3 font-semibold" style={{ color: "var(--grey-900)" }}>{data.name}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.cpfEmployee)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.taxWithholding)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.employerContributions)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: "var(--blue-500)" }}>
                            {formatCurrency(data.cpfEmployee + data.employerContributions)}
                          </td>
                        </tr>
                      ))}
                      {/* Totals */}
                      <tr style={{ borderTop: "2px solid var(--grey-400)", background: "var(--grey-50)" }}>
                        <td className="px-4 py-3 font-bold" style={{ color: "var(--grey-900)" }}>TOTAL</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">
                          {formatCurrency(countryStaff.reduce((s, [, d]) => s + d.cpfEmployee, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">
                          {formatCurrency(countryStaff.reduce((s, [, d]) => s + d.taxWithholding, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">
                          {formatCurrency(countryStaff.reduce((s, [, d]) => s + d.employerContributions, 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: "var(--blue-500)" }}>
                          {formatCurrency(countryStaff.reduce((s, [, d]) => s + d.cpfEmployee + d.employerContributions, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
