"use client";

import { useEffect, useState, useCallback } from "react";
import AdminTabs from "@/components/AdminTabs";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CommissionRule {
  id: string;
  userId: string | null;
  role: string | null;
  type: string;
  value: number;
  minRevenue: number | null;
  maxCommission: number | null;
  isActive: boolean;
  userName: string | null;
  userRole: string | null;
}

interface Payout {
  id: string;
  userId: string;
  period: string;
  appointments: number;
  totalRevenue: number;
  commissionRate: number;
  commissionType: string;
  commissionAmount: number;
  adjustments: number;
  finalAmount: number;
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
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  doctor: { label: "Doctor", color: "#2d6a4f", bg: "#f0faf4" },
  therapist: { label: "Therapist", color: "#059669", bg: "#ecfdf5" },
};

const STATUS_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: "#92400e", bg: "#fef3c7", label: "Pending" },
  approved: { color: "#065f46", bg: "#d1fae5", label: "Approved" },
  paid: { color: "#1e40af", bg: "#dbeafe", label: "Paid" },
};

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

export default function CommissionPage() {
  const [activeTab, setActiveTab] = useState<"payouts" | "rules" | "history">("payouts");
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
          Commission & Incentives
        </h1>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: "2px solid var(--grey-200)" }}>
        {(["payouts", "rules", "history"] as const).map((tab) => {
          const labels = { payouts: "Payouts", rules: "Rules", history: "History" };
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

      {activeTab === "payouts" && <PayoutsTab showToast={showToast} />}
      {activeTab === "rules" && <RulesTab showToast={showToast} />}
      {activeTab === "history" && <HistoryTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Payouts Tab
// ═══════════════════════════════════════════════════════════════════════════

function PayoutsTab({ showToast }: { showToast: (m: string, t: "ok" | "err") => void }) {
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [editingAdj, setEditingAdj] = useState<string | null>(null);
  const [adjValue, setAdjValue] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/commission/payouts?period=${period}`);
      if (res.ok) {
        setPayouts(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  async function handleCalculate() {
    setCalculating(true);
    try {
      const res = await fetch("/api/admin/commission/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      if (res.ok) {
        showToast("Commissions calculated successfully", "ok");
        fetchPayouts();
      } else {
        const err = await res.json();
        showToast(err.error || "Calculation failed", "err");
      }
    } catch {
      showToast("Calculation failed", "err");
    } finally {
      setCalculating(false);
    }
  }

  async function handleAdjustment(payoutId: string) {
    const adj = parseFloat(adjValue);
    if (isNaN(adj)) {
      showToast("Enter a valid number", "err");
      return;
    }
    try {
      const res = await fetch(`/api/admin/commission/payouts/${payoutId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustments: adj }),
      });
      if (res.ok) {
        showToast("Adjustment saved", "ok");
        setEditingAdj(null);
        setAdjValue("");
        fetchPayouts();
      }
    } catch {
      showToast("Failed to save adjustment", "err");
    }
  }

  async function handleStatusUpdate(payoutId: string, status: string) {
    try {
      const res = await fetch(`/api/admin/commission/payouts/${payoutId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showToast(`Payout ${status}`, "ok");
        fetchPayouts();
      }
    } catch {
      showToast("Failed to update status", "err");
    }
  }

  async function handleBulkAction(action: "approved" | "paid") {
    setBulkLoading(true);
    const targets = payouts.filter((p) =>
      action === "approved" ? p.status === "pending" : p.status === "approved"
    );
    try {
      await Promise.all(
        targets.map((p) =>
          fetch(`/api/admin/commission/payouts/${p.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: action }),
          })
        )
      );
      showToast(
        action === "approved"
          ? `${targets.length} payouts approved`
          : `${targets.length} payouts marked as paid`,
        "ok"
      );
      fetchPayouts();
    } catch {
      showToast("Bulk action failed", "err");
    } finally {
      setBulkLoading(false);
    }
  }

  const totals = payouts.reduce(
    (acc, p) => ({
      appointments: acc.appointments + p.appointments,
      revenue: acc.revenue + p.totalRevenue,
      commission: acc.commission + p.commissionAmount,
      adjustments: acc.adjustments + p.adjustments,
      final: acc.final + p.finalAmount,
    }),
    { appointments: 0, revenue: 0, commission: 0, adjustments: 0, final: 0 }
  );

  const pendingCount = payouts.filter((p) => p.status === "pending").length;
  const approvedCount = payouts.filter((p) => p.status === "approved").length;

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>
            Period:
          </label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2"
            style={inputStyle}
          />
        </div>
        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="px-4 py-2 text-white text-[14px] font-semibold rounded-md"
          style={{ background: "var(--blue-500)", opacity: calculating ? 0.6 : 1 }}
        >
          {calculating ? "Calculating..." : "Calculate Commissions"}
        </button>
        <div className="flex-1" />
        {pendingCount > 0 && (
          <button
            onClick={() => handleBulkAction("approved")}
            disabled={bulkLoading}
            className="px-4 py-2 text-[14px] font-semibold rounded-md"
            style={{
              background: "var(--white)",
              border: "1px solid #059669",
              color: "#059669",
              opacity: bulkLoading ? 0.6 : 1,
            }}
          >
            Approve All Pending ({pendingCount})
          </button>
        )}
        {approvedCount > 0 && (
          <button
            onClick={() => handleBulkAction("paid")}
            disabled={bulkLoading}
            className="px-4 py-2 text-[14px] font-semibold rounded-md"
            style={{
              background: "var(--white)",
              border: "1px solid var(--blue-500)",
              color: "var(--blue-500)",
              opacity: bulkLoading ? 0.6 : 1,
            }}
          >
            Mark All as Paid ({approvedCount})
          </button>
        )}
      </div>

      {/* Table */}
      <div style={cardStyle} className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--grey-500)" }}>
            Loading payouts...
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "var(--grey-500)" }}>
            <p className="text-[16px] font-semibold mb-1">No payouts for {formatPeriodLabel(period)}</p>
            <p className="text-[14px]">
              Click &quot;Calculate Commissions&quot; to generate payouts based on completed appointments.
            </p>
          </div>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Staff
                </th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Role
                </th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Appts
                </th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Revenue
                </th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Rate
                </th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Commission
                </th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Adj.
                </th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Final
                </th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Status
                </th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => {
                const badge = STATUS_BADGE[p.status] || STATUS_BADGE.pending;
                return (
                  <tr
                    key={p.id}
                    style={{ borderBottom: "1px solid var(--grey-100)" }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--grey-900)" }}>
                      {p.userName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide rounded-full"
                        style={{
                          color: ROLE_META[p.userRole]?.color || "#78716c",
                          background: ROLE_META[p.userRole]?.bg || "#fafaf9",
                        }}
                      >
                        {ROLE_META[p.userRole]?.label || p.userRole}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--grey-700)" }}>
                      {p.appointments}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--grey-700)" }}>
                      {formatCurrency(p.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--grey-700)" }}>
                      {p.commissionType === "percentage"
                        ? `${p.commissionRate}%`
                        : `${formatCurrency(p.commissionRate)}/appt`}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--grey-700)" }}>
                      {formatCurrency(p.commissionAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingAdj === p.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            step="0.01"
                            value={adjValue}
                            onChange={(e) => setAdjValue(e.target.value)}
                            className="w-20 px-2 py-1 text-[13px] text-right"
                            style={inputStyle}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAdjustment(p.id);
                              if (e.key === "Escape") {
                                setEditingAdj(null);
                                setAdjValue("");
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAdjustment(p.id)}
                            className="text-[12px] px-1.5 py-0.5 rounded"
                            style={{ color: "var(--green)", fontWeight: 600 }}
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingAdj(p.id);
                            setAdjValue(p.adjustments.toString());
                          }}
                          className="cursor-pointer hover:underline"
                          style={{
                            color: p.adjustments !== 0 ? (p.adjustments > 0 ? "#059669" : "#ef4444") : "var(--grey-500)",
                            background: "none",
                            border: "none",
                            fontSize: "14px",
                          }}
                          title="Click to adjust"
                        >
                          {p.adjustments !== 0
                            ? `${p.adjustments > 0 ? "+" : ""}${formatCurrency(p.adjustments)}`
                            : "--"}
                        </button>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-semibold"
                      style={{ color: "var(--grey-900)" }}
                    >
                      {formatCurrency(p.finalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide rounded-full"
                        style={{ color: badge.color, background: badge.bg }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        {p.status === "pending" && (
                          <button
                            onClick={() => handleStatusUpdate(p.id, "approved")}
                            className="text-[12px] px-2 py-1 rounded font-semibold"
                            style={{ color: "#059669", background: "#d1fae5" }}
                          >
                            Approve
                          </button>
                        )}
                        {p.status === "approved" && (
                          <button
                            onClick={() => handleStatusUpdate(p.id, "paid")}
                            className="text-[12px] px-2 py-1 rounded font-semibold"
                            style={{ color: "#1e40af", background: "#dbeafe" }}
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Totals row */}
              <tr style={{ background: "var(--grey-50)", borderTop: "2px solid var(--grey-300)" }}>
                <td
                  className="px-4 py-3 font-bold"
                  colSpan={2}
                  style={{ color: "var(--grey-900)" }}
                >
                  TOTAL ({payouts.length} staff)
                </td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--grey-900)" }}>
                  {totals.appointments}
                </td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--grey-900)" }}>
                  {formatCurrency(totals.revenue)}
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--grey-900)" }}>
                  {formatCurrency(totals.commission)}
                </td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: totals.adjustments >= 0 ? "#059669" : "#ef4444" }}>
                  {totals.adjustments !== 0
                    ? `${totals.adjustments > 0 ? "+" : ""}${formatCurrency(totals.adjustments)}`
                    : "--"}
                </td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--grey-900)" }}>
                  {formatCurrency(totals.final)}
                </td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Rules Tab
// ═══════════════════════════════════════════════════════════════════════════

function RulesTab({ showToast }: { showToast: (m: string, t: "ok" | "err") => void }) {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [applyTo, setApplyTo] = useState<"all" | "role" | "user">("all");
  const [formRole, setFormRole] = useState("doctor");
  const [formUserId, setFormUserId] = useState("");
  const [formType, setFormType] = useState<"percentage" | "fixed">("percentage");
  const [formValue, setFormValue] = useState("");
  const [formMinRevenue, setFormMinRevenue] = useState("");
  const [formMaxCommission, setFormMaxCommission] = useState("");

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/commission/rules");
      if (res.ok) setRules(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff?role=doctor,therapist");
      if (res.ok) {
        const data = await res.json();
        setStaffList(Array.isArray(data) ? data : data.staff || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchStaff();
  }, [fetchRules, fetchStaff]);

  function resetForm() {
    setApplyTo("all");
    setFormRole("doctor");
    setFormUserId("");
    setFormType("percentage");
    setFormValue("");
    setFormMinRevenue("");
    setFormMaxCommission("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(rule: CommissionRule) {
    setEditingId(rule.id);
    setApplyTo(rule.userId ? "user" : rule.role ? "role" : "all");
    setFormRole(rule.role || "doctor");
    setFormUserId(rule.userId || "");
    setFormType(rule.type as "percentage" | "fixed");
    setFormValue(rule.value.toString());
    setFormMinRevenue(rule.minRevenue?.toString() || "");
    setFormMaxCommission(rule.maxCommission?.toString() || "");
    setShowForm(true);
  }

  async function handleSave() {
    const value = parseFloat(formValue);
    if (isNaN(value) || value < 0) {
      showToast("Enter a valid positive value", "err");
      return;
    }

    const payload: Record<string, unknown> = {
      type: formType,
      value,
      minRevenue: formMinRevenue ? parseFloat(formMinRevenue) : null,
      maxCommission: formMaxCommission ? parseFloat(formMaxCommission) : null,
    };

    if (applyTo === "user" && formUserId) {
      payload.userId = formUserId;
    } else if (applyTo === "role") {
      payload.role = formRole;
    }
    // applyTo === "all" — no userId or role

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/commission/rules/${editingId}`
        : "/api/admin/commission/rules";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingId ? "Rule updated" : "Rule created", "ok");
        resetForm();
        fetchRules();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save rule", "err");
      }
    } catch {
      showToast("Failed to save rule", "err");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this commission rule?")) return;
    try {
      const res = await fetch(`/api/admin/commission/rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Rule deactivated", "ok");
        fetchRules();
      }
    } catch {
      showToast("Failed to delete rule", "err");
    }
  }

  function getPriorityLabel(rule: CommissionRule) {
    if (rule.userId) return "Staff-specific";
    if (rule.role) return "Role-based";
    return "Default (all staff)";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>
          Rules are applied in priority order: Staff-specific &gt; Role-based &gt; Default.
        </p>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 text-white text-[14px] font-semibold rounded-md"
          style={{ background: "var(--blue-500)" }}
        >
          + Add Rule
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={cardStyle} className="p-5 mb-5">
          <h3 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>
            {editingId ? "Edit Rule" : "New Commission Rule"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Apply To */}
            <div>
              <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                Apply To
              </label>
              <select
                value={applyTo}
                onChange={(e) => setApplyTo(e.target.value as "all" | "role" | "user")}
                className="w-full px-3 py-2"
                style={inputStyle}
              >
                <option value="all">All Staff (Default)</option>
                <option value="role">Specific Role</option>
                <option value="user">Specific Staff Member</option>
              </select>
            </div>

            {applyTo === "role" && (
              <div>
                <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                  Role
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                >
                  <option value="doctor">Doctor</option>
                  <option value="therapist">Therapist</option>
                </select>
              </div>
            )}

            {applyTo === "user" && (
              <div>
                <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                  Staff Member
                </label>
                <select
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                >
                  <option value="">-- Select --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Type */}
            <div>
              <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                Commission Type
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as "percentage" | "fixed")}
                className="w-full px-3 py-2"
                style={inputStyle}
              >
                <option value="percentage">Percentage of Revenue</option>
                <option value="fixed">Fixed Amount per Appointment</option>
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                {formType === "percentage" ? "Percentage (%)" : "Fixed Amount (S$)"}
              </label>
              <input
                type="number"
                step={formType === "percentage" ? "0.1" : "1"}
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                className="w-full px-3 py-2"
                style={inputStyle}
                placeholder={formType === "percentage" ? "e.g. 15" : "e.g. 50"}
              />
            </div>

            {/* Min Revenue */}
            <div>
              <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                Min Revenue Threshold (S$)
                <span className="text-[12px] font-normal ml-1" style={{ color: "var(--grey-500)" }}>
                  Optional
                </span>
              </label>
              <input
                type="number"
                step="1"
                value={formMinRevenue}
                onChange={(e) => setFormMinRevenue(e.target.value)}
                className="w-full px-3 py-2"
                style={inputStyle}
                placeholder="e.g. 1000"
              />
            </div>

            {/* Max Commission */}
            <div>
              <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                Max Commission Cap (S$/month)
                <span className="text-[12px] font-normal ml-1" style={{ color: "var(--grey-500)" }}>
                  Optional
                </span>
              </label>
              <input
                type="number"
                step="1"
                value={formMaxCommission}
                onChange={(e) => setFormMaxCommission(e.target.value)}
                className="w-full px-3 py-2"
                style={inputStyle}
                placeholder="e.g. 5000"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-white text-[14px] font-semibold rounded-md"
              style={{ background: "var(--blue-500)", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving..." : editingId ? "Update Rule" : "Create Rule"}
            </button>
            <button
              onClick={resetForm}
              className="px-5 py-2 text-[14px] font-semibold rounded-md"
              style={{ color: "var(--grey-600)", background: "var(--grey-100)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div style={cardStyle} className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--grey-500)" }}>
            Loading rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "var(--grey-500)" }}>
            <p className="text-[16px] font-semibold mb-1">No commission rules configured</p>
            <p className="text-[14px]">Add a rule to start calculating commissions for your staff.</p>
          </div>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Priority
                </th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Applies To
                </th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Type
                </th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Value
                </th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Min Revenue
                </th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Max Cap
                </th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--grey-700)" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, idx) => (
                <tr
                  key={rule.id}
                  style={{ borderBottom: "1px solid var(--grey-100)" }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex px-2 py-0.5 text-[12px] font-bold rounded-full"
                      style={{
                        color: rule.userId ? "#7c3aed" : rule.role ? "#2d6a4f" : "#78716c",
                        background: rule.userId ? "#faf5ff" : rule.role ? "#f0faf4" : "#fafaf9",
                      }}
                    >
                      #{idx + 1} {getPriorityLabel(rule)}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--grey-900)" }}>
                    {rule.userId
                      ? rule.userName || "Unknown staff"
                      : rule.role
                      ? `All ${ROLE_META[rule.role]?.label || rule.role}s`
                      : "All clinical staff"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--grey-700)" }}>
                    {rule.type === "percentage" ? "Percentage" : "Fixed/Appt"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: "var(--grey-900)" }}>
                    {rule.type === "percentage" ? `${rule.value}%` : formatCurrency(rule.value)}
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--grey-600)" }}>
                    {rule.minRevenue ? formatCurrency(rule.minRevenue) : "--"}
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--grey-600)" }}>
                    {rule.maxCommission ? formatCurrency(rule.maxCommission) : "--"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => startEdit(rule)}
                        className="text-[13px] font-semibold px-2 py-1 rounded"
                        style={{ color: "var(--blue-500)", background: "var(--blue-50)" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="text-[13px] font-semibold px-2 py-1 rounded"
                        style={{ color: "#ef4444", background: "#fef2f2" }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// History Tab
// ═══════════════════════════════════════════════════════════════════════════

function HistoryTab() {
  const [fromPeriod, setFromPeriod] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [toPeriod, setToPeriod] = useState(getCurrentPeriod());
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/commission/payouts?fromPeriod=${fromPeriod}&toPeriod=${toPeriod}`
      );
      if (res.ok) setPayouts(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [fromPeriod, toPeriod]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Group by period
  const periodMap: Record<string, Payout[]> = {};
  for (const p of payouts) {
    if (!periodMap[p.period]) periodMap[p.period] = [];
    periodMap[p.period].push(p);
  }
  const periods = Object.keys(periodMap).sort().reverse();

  // Role breakdown
  const roleBreakdown: Record<string, number> = {};
  let grandTotal = 0;
  for (const p of payouts) {
    if (p.status === "paid") {
      roleBreakdown[p.userRole] = (roleBreakdown[p.userRole] || 0) + p.finalAmount;
      grandTotal += p.finalAmount;
    }
  }

  function exportCSV() {
    const headers = [
      "Period",
      "Staff",
      "Role",
      "Appointments",
      "Revenue (S$)",
      "Commission Rate",
      "Commission Type",
      "Commission (S$)",
      "Adjustments (S$)",
      "Final (S$)",
      "Status",
    ];
    const rows = payouts.map((p) => [
      p.period,
      p.userName,
      p.userRole,
      p.appointments,
      p.totalRevenue.toFixed(2),
      p.commissionRate,
      p.commissionType,
      p.commissionAmount.toFixed(2),
      p.adjustments.toFixed(2),
      p.finalAmount.toFixed(2),
      p.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commission-history-${fromPeriod}-to-${toPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>
            From:
          </label>
          <input
            type="month"
            value={fromPeriod}
            onChange={(e) => setFromPeriod(e.target.value)}
            className="px-3 py-2"
            style={inputStyle}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>
            To:
          </label>
          <input
            type="month"
            value={toPeriod}
            onChange={(e) => setToPeriod(e.target.value)}
            className="px-3 py-2"
            style={inputStyle}
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={exportCSV}
          disabled={payouts.length === 0}
          className="px-4 py-2 text-[14px] font-semibold rounded-md"
          style={{
            color: "var(--grey-700)",
            background: "var(--white)",
            border: "1px solid var(--grey-400)",
            opacity: payouts.length === 0 ? 0.5 : 1,
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      {payouts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div style={cardStyle} className="p-4">
            <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--grey-500)" }}>
              Total Paid Commissions
            </p>
            <p className="text-[24px] font-bold" style={{ color: "var(--grey-900)" }}>
              {formatCurrency(grandTotal)}
            </p>
          </div>
          {Object.entries(roleBreakdown).map(([role, amount]) => (
            <div key={role} style={cardStyle} className="p-4">
              <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--grey-500)" }}>
                {ROLE_META[role]?.label || role} Commissions (Paid)
              </p>
              <p className="text-[24px] font-bold" style={{ color: ROLE_META[role]?.color || "var(--grey-900)" }}>
                {formatCurrency(amount)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Period-wise breakdown */}
      {loading ? (
        <div style={cardStyle} className="p-8 text-center" >
          <span style={{ color: "var(--grey-500)" }}>Loading history...</span>
        </div>
      ) : periods.length === 0 ? (
        <div style={cardStyle} className="p-8 text-center">
          <p className="text-[16px] font-semibold mb-1" style={{ color: "var(--grey-500)" }}>
            No commission history found
          </p>
          <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>
            Calculate commissions from the Payouts tab to see historical data.
          </p>
        </div>
      ) : (
        periods.map((period) => {
          const items = periodMap[period];
          const periodTotal = items.reduce((s, p) => s + p.finalAmount, 0);
          return (
            <div key={period} style={cardStyle} className="mb-4 overflow-x-auto">
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}
              >
                <h3 className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>
                  {formatPeriodLabel(period)}
                </h3>
                <span className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>
                  Total: {formatCurrency(periodTotal)}
                </span>
              </div>
              <table className="w-full text-[14px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--grey-100)" }}>
                    <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--grey-600)" }}>
                      Staff
                    </th>
                    <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--grey-600)" }}>
                      Role
                    </th>
                    <th className="text-right px-4 py-2 font-semibold" style={{ color: "var(--grey-600)" }}>
                      Appts
                    </th>
                    <th className="text-right px-4 py-2 font-semibold" style={{ color: "var(--grey-600)" }}>
                      Revenue
                    </th>
                    <th className="text-right px-4 py-2 font-semibold" style={{ color: "var(--grey-600)" }}>
                      Commission
                    </th>
                    <th className="text-right px-4 py-2 font-semibold" style={{ color: "var(--grey-600)" }}>
                      Final
                    </th>
                    <th className="text-center px-4 py-2 font-semibold" style={{ color: "var(--grey-600)" }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => {
                    const badge = STATUS_BADGE[p.status] || STATUS_BADGE.pending;
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--grey-50)" }}>
                        <td className="px-4 py-2" style={{ color: "var(--grey-900)" }}>
                          {p.userName}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase rounded-full"
                            style={{
                              color: ROLE_META[p.userRole]?.color || "#78716c",
                              background: ROLE_META[p.userRole]?.bg || "#fafaf9",
                            }}
                          >
                            {ROLE_META[p.userRole]?.label || p.userRole}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right" style={{ color: "var(--grey-700)" }}>
                          {p.appointments}
                        </td>
                        <td className="px-4 py-2 text-right" style={{ color: "var(--grey-700)" }}>
                          {formatCurrency(p.totalRevenue)}
                        </td>
                        <td className="px-4 py-2 text-right" style={{ color: "var(--grey-700)" }}>
                          {formatCurrency(p.commissionAmount)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold" style={{ color: "var(--grey-900)" }}>
                          {formatCurrency(p.finalAmount)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase rounded-full"
                            style={{ color: badge.color, background: badge.bg }}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}
