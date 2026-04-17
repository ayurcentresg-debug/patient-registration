"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useFlash } from "@/components/FlashCardProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminTabs from "@/components/AdminTabs";
import TreatmentTabs from "@/components/TreatmentTabs";
import { cardStyle } from "@/lib/styles";
import { formatCurrency, formatDate } from "@/lib/formatters";

// ─── Types ──────────────────────────────────────────────────────────────────
interface PlanItem {
  id: string;
  treatmentName: string;
  category: string | null;
  totalSessions: number;
  completedSessions: number;
  sessionPrice: number;
  totalCost: number;
  status: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  achievedDate: string | null;
  status: string;
  notes: string | null;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  patientIdNumber: string;
  phone: string | null;
  email: string | null;
}

interface TreatmentPlan {
  id: string;
  planNumber: string;
  name: string;
  diagnosis: string | null;
  goals: string | null;
  doctorName: string;
  startDate: string;
  endDate: string | null;
  status: string;
  totalSessions: number;
  completedSessions: number;
  totalCost: number;
  patient: Patient;
  items: PlanItem[];
  milestones: Milestone[];
}

// ─── Constants ──────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: "#f0faf4", color: "#2d6a4f", label: "Active" },
  completed: { bg: "#ecfdf5", color: "#059669", label: "Completed" },
  paused: { bg: "#faf3e6", color: "#b68d40", label: "Paused" },
  cancelled: { bg: "#fef2f2", color: "#dc2626", label: "Cancelled" },
};

const ITEM_STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "var(--grey-100)", color: "var(--grey-600)", label: "Pending" },
  in_progress: { bg: "#f0faf4", color: "#2d6a4f", label: "In Progress" },
  completed: { bg: "#ecfdf5", color: "#059669", label: "Completed" },
  skipped: { bg: "#faf3e6", color: "#b68d40", label: "Skipped" },
};

const MILESTONE_STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "var(--grey-100)", color: "var(--grey-600)", label: "Pending" },
  in_progress: { bg: "#f0faf4", color: "#2d6a4f", label: "In Progress" },
  achieved: { bg: "#ecfdf5", color: "#059669", label: "Achieved" },
  missed: { bg: "#fef2f2", color: "#dc2626", label: "Missed" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function TreatmentPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { showFlash } = useFlash();

  useEffect(() => { setMounted(true); }, []);

  const fetchPlan = useCallback(() => {
    setLoading(true);
    fetch(`/api/treatment-plans/${id}`)
      .then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(data => setPlan(data))
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const updateStatus = async (newStatus: string) => {
    setActionLoading(newStatus);
    try {
      const res = await fetch(`/api/treatment-plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }
      const updated = await res.json();
      setPlan(updated);
      showFlash({ type: "success", title: "Success", message: `Plan ${newStatus === "active" ? "resumed" : newStatus}` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update status";
      showFlash({ type: "error", title: "Error", message: msg });
    } finally {
      setActionLoading(null);
    }
  };

  const recordSession = async (itemId: string) => {
    setActionLoading(itemId);
    try {
      const res = await fetch(`/api/treatment-plans/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record session");
      }
      const updated = await res.json();
      setPlan(updated);
      showFlash({ type: "success", title: "Success", message: "Session recorded successfully" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to record session";
      showFlash({ type: "error", title: "Error", message: msg });
    } finally {
      setActionLoading(null);
    }
  };

  const markMilestoneAchieved = async (milestoneId: string) => {
    setActionLoading(milestoneId);
    try {
      const res = await fetch(`/api/treatment-plans/${id}/milestones`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, status: "achieved" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update milestone");
      }
      // Refetch plan to get updated milestones
      fetchPlan();
      showFlash({ type: "success", title: "Success", message: "Milestone marked as achieved" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update milestone";
      showFlash({ type: "error", title: "Error", message: msg });
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Loading Skeleton ───────────────────────────────────────────────────────
  if (!mounted || loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-5 w-24 animate-pulse mb-4" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="h-8 w-64 animate-pulse mb-2" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="h-4 w-48 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="h-10 w-full animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}
        </div>
        <div className="h-64 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
      </div>
    );
  }

  // ─── Not Found ──────────────────────────────────────────────────────────────
  if (!plan) {
    return (
      <div className="p-6 md:p-8">
        <Link href="/admin/treatments/plans" className="inline-flex items-center gap-1.5 text-[15px] font-semibold mb-6" style={{ color: "#2d6a4f" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Plans
        </Link>
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>Treatment plan not found</p>
          <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>The plan may have been deleted or does not exist</p>
        </div>
      </div>
    );
  }

  // ─── Computed Values ────────────────────────────────────────────────────────
  const st = STATUS_COLORS[plan.status] || STATUS_COLORS.active;
  const pct = plan.totalSessions > 0 ? Math.round((plan.completedSessions / plan.totalSessions) * 100) : 0;
  const patientName = `${plan.patient.firstName} ${plan.patient.lastName}`;
  const isEditable = plan.status === "active" || plan.status === "paused";

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Back button */}
      <Link href="/admin/treatments/plans" className="inline-flex items-center gap-1.5 text-[15px] font-semibold mb-5" style={{ color: "#2d6a4f", textDecoration: "none" }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Plans
      </Link>

      <AdminTabs />
      <TreatmentTabs />

      {/* ═══ Plan Header ═══ */}
      <div className="p-5 mb-6" style={cardStyle}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Left: Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[13px] font-mono" style={{ color: "var(--grey-500)" }}>{plan.planNumber}</span>
              <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>{plan.name}</h1>
              <span className="inline-flex px-2.5 py-0.5 text-[13px] font-bold uppercase tracking-wide rounded" style={{ background: st.bg, color: st.color, borderRadius: "var(--radius-sm)" }}>
                {st.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[15px] mb-2 flex-wrap" style={{ color: "var(--grey-600)" }}>
              <Link href={`/patients/${plan.patient.id}`} className="font-semibold hover:underline" style={{ color: "#2d6a4f", textDecoration: "none" }}>
                {patientName}
              </Link>
              <span>&middot;</span>
              <span>Dr. {plan.doctorName}</span>
              <span>&middot;</span>
              <span>{formatDate(plan.startDate)}{plan.endDate ? ` — ${formatDate(plan.endDate)}` : ""}</span>
            </div>
            {plan.diagnosis && (
              <span className="inline-flex px-2 py-0.5 text-[12px] font-semibold rounded" style={{ background: "#faf3e6", color: "#b68d40", borderRadius: "var(--radius-sm)" }}>
                {plan.diagnosis}
              </span>
            )}
          </div>

          {/* Right: Action Buttons */}
          {isEditable && (
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {plan.status === "active" && (
                <button
                  onClick={() => updateStatus("paused")}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[14px] font-semibold rounded transition-opacity"
                  style={{ background: "#f0faf4", color: "#37845e", border: "1px solid #fcd34d", borderRadius: "var(--radius-sm)", opacity: actionLoading ? 0.6 : 1 }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {actionLoading === "paused" ? "Pausing..." : "Pause"}
                </button>
              )}
              {plan.status === "paused" && (
                <button
                  onClick={() => updateStatus("active")}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[14px] font-semibold rounded transition-opacity"
                  style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #6ee7b7", borderRadius: "var(--radius-sm)", opacity: actionLoading ? 0.6 : 1 }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {actionLoading === "active" ? "Resuming..." : "Resume"}
                </button>
              )}
              {plan.status === "active" && (
                <button
                  onClick={() => updateStatus("completed")}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[14px] font-semibold rounded transition-opacity"
                  style={{ background: "#f0faf4", color: "#2d6a4f", border: "1px solid #a7e3bd", borderRadius: "var(--radius-sm)", opacity: actionLoading ? 0.6 : 1 }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {actionLoading === "completed" ? "Completing..." : "Complete"}
                </button>
              )}
              <button
                onClick={() => updateStatus("cancelled")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[14px] font-semibold rounded transition-opacity"
                style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "var(--radius-sm)", opacity: actionLoading ? 0.6 : 1 }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                {actionLoading === "cancelled" ? "Cancelling..." : "Cancel"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Overall Progress + Cost Summary Row ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Progress Card */}
        <div className="p-5" style={cardStyle}>
          <p className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--grey-600)" }}>Overall Progress</p>
          <div className="flex items-center gap-4">
            {/* Circular Progress */}
            <div className="relative flex-shrink-0" style={{ width: 80, height: 80 }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--grey-200)" strokeWidth="8" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke={pct === 100 ? "#059669" : "#2d6a4f"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                  transform="rotate(-90 40 40)"
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[16px] font-bold" style={{ color: pct === 100 ? "#059669" : "var(--grey-900)" }}>{pct}%</span>
              </div>
            </div>
            <div>
              <p className="text-[20px] font-bold" style={{ color: "var(--grey-900)" }}>
                {plan.completedSessions}<span className="text-[16px] font-normal" style={{ color: "var(--grey-500)" }}>/{plan.totalSessions}</span>
              </p>
              <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>sessions completed</p>
              <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>
                {plan.items.length} treatment{plan.items.length !== 1 ? "s" : ""} in plan
              </p>
            </div>
          </div>
        </div>

        {/* Cost Summary Card */}
        <div className="p-5 md:col-span-2" style={cardStyle}>
          <p className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--grey-600)" }}>Cost Summary</p>
          <p className="text-[24px] font-bold mb-3" style={{ color: "var(--grey-900)" }}>{formatCurrency(plan.totalCost)}</p>
          <div className="space-y-1.5" style={{ maxHeight: 120, overflowY: "auto" }}>
            {plan.items.map(item => (
              <div key={item.id} className="flex items-center justify-between text-[14px]">
                <span style={{ color: "var(--grey-700)" }}>{item.treatmentName}</span>
                <span className="font-semibold" style={{ color: "var(--grey-900)" }}>
                  {formatCurrency(item.totalCost)}
                  <span className="font-normal ml-1.5" style={{ color: "var(--grey-500)" }}>
                    ({item.totalSessions} x {formatCurrency(item.sessionPrice)})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Treatment Items Table ═══ */}
      <div className="mb-6 overflow-x-auto" style={cardStyle}>
        <div className="p-4 pb-2">
          <p className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Treatment Items</p>
        </div>
        <table className="w-full text-[14px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--grey-200)" }}>
              {["Treatment", "Category", "Sessions", "Session Price", "Total Cost", "Status", ""].map((h, i) => (
                <th key={i} className="text-left px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wider" style={{ color: "var(--grey-600)", background: "var(--grey-50)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.items.map(item => {
              const ist = ITEM_STATUS_COLORS[item.status] || ITEM_STATUS_COLORS.pending;
              const itemPct = item.totalSessions > 0 ? Math.round((item.completedSessions / item.totalSessions) * 100) : 0;
              const canRecord = plan.status === "active" && item.status !== "completed" && item.status !== "skipped";

              return (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--grey-100)" }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--grey-900)" }}>{item.treatmentName}</td>
                  <td className="px-4 py-3" style={{ color: "var(--grey-600)" }}>{item.category || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--grey-200)", minWidth: 60, maxWidth: 80 }}>
                        <div className="h-full rounded-full" style={{ width: `${itemPct}%`, background: itemPct === 100 ? "#059669" : "#2d6a4f", transition: "width 0.3s ease" }} />
                      </div>
                      <span className="font-semibold whitespace-nowrap" style={{ color: "var(--grey-700)" }}>
                        {item.completedSessions}/{item.totalSessions}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--grey-700)" }}>{formatCurrency(item.sessionPrice)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--grey-900)" }}>{formatCurrency(item.totalCost)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide rounded" style={{ background: ist.bg, color: ist.color, borderRadius: "var(--radius-sm)" }}>
                      {ist.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canRecord && (
                      <button
                        onClick={() => recordSession(item.id)}
                        disabled={actionLoading !== null}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[13px] font-semibold rounded transition-opacity"
                        style={{ background: "#2d6a4f", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", opacity: actionLoading ? 0.6 : 1 }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        {actionLoading === item.id ? "Recording..." : "Record Session"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {plan.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[15px]" style={{ color: "var(--grey-500)" }}>
                  No treatment items in this plan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══ Milestones Timeline ═══ */}
      <div className="p-5 mb-6" style={cardStyle}>
        <p className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Milestones</p>
        {plan.milestones.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No milestones set for this plan</p>
          </div>
        ) : (
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-[9px] top-1 bottom-1" style={{ width: 2, background: "var(--grey-200)" }} />

            <div className="space-y-5">
              {plan.milestones.map((ms, idx) => {
                const mst = MILESTONE_STATUS_COLORS[ms.status] || MILESTONE_STATUS_COLORS.pending;
                const isAchieved = ms.status === "achieved";
                const canMarkAchieved = isEditable && ms.status !== "achieved" && ms.status !== "missed";

                return (
                  <div key={ms.id} className="relative">
                    {/* Dot on timeline */}
                    <div
                      className="absolute flex items-center justify-center"
                      style={{
                        left: -21,
                        top: 2,
                        width: 18,
                        height: 18,
                        borderRadius: "var(--radius-pill)",
                        background: isAchieved ? "#059669" : ms.status === "missed" ? "#dc2626" : "var(--white)",
                        border: isAchieved || ms.status === "missed" ? "none" : "2px solid var(--grey-400)",
                      }}
                    >
                      {isAchieved && (
                        <svg className="w-3 h-3" fill="none" stroke="#fff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                      {ms.status === "missed" && (
                        <svg className="w-3 h-3" fill="none" stroke="#fff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{ms.title}</span>
                          <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide rounded" style={{ background: mst.bg, color: mst.color, borderRadius: "var(--radius-sm)" }}>
                            {mst.label}
                          </span>
                        </div>
                        {ms.description && (
                          <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-600)" }}>{ms.description}</p>
                        )}
                        <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>
                          Target: {formatDate(ms.targetDate)}
                          {ms.achievedDate && <span className="ml-2">Achieved: {formatDate(ms.achievedDate)}</span>}
                        </p>
                      </div>

                      {canMarkAchieved && (
                        <button
                          onClick={() => markMilestoneAchieved(ms.id)}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[13px] font-semibold rounded flex-shrink-0 transition-opacity"
                          style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #6ee7b7", borderRadius: "var(--radius-sm)", cursor: "pointer", opacity: actionLoading ? 0.6 : 1 }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          {actionLoading === ms.id ? "Saving..." : "Mark Achieved"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Goals ═══ */}
      {plan.goals && (
        <div className="p-5 mb-6" style={cardStyle}>
          <p className="text-[16px] font-bold mb-2" style={{ color: "var(--grey-900)" }}>Goals</p>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--grey-700)" }}>{plan.goals}</p>
        </div>
      )}
    </div>
  );
}
