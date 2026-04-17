"use client";

import { useState, useEffect, useCallback } from "react";
import { useFlash } from "@/components/FlashCardProvider";
import Link from "next/link";
import AdminTabs from "@/components/AdminTabs";
import TreatmentTabs from "@/components/TreatmentTabs";
import { cardStyle, inputStyle } from "@/lib/styles";
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
  targetDate: string | null;
  status: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  patientIdNumber: string;
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
  _count?: { items: number };
}

// ─── Constants ──────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: "#f0faf4", color: "#2d6a4f", label: "Active" },
  completed: { bg: "#ecfdf5", color: "#059669", label: "Completed" },
  paused: { bg: "#faf3e6", color: "#b68d40", label: "Paused" },
  cancelled: { bg: "#fef2f2", color: "#dc2626", label: "Cancelled" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function TreatmentPlansPage() {
  const [mounted, setMounted] = useState(false);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { showFlash } = useFlash();

  useEffect(() => { setMounted(true); }, []);

  const fetchPlans = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/treatment-plans?${params}`)
      .then(r => r.json())
      .then(data => {
        const arr = data.plans || data;
        setPlans(Array.isArray(arr) ? arr : []);
      })
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchPlans, 300);
    return () => clearTimeout(timeout);
  }, [fetchPlans]);

  // Stats
  const activePlans = plans.filter(p => p.status === "active").length;
  const completedPlans = plans.filter(p => p.status === "completed").length;
  const pausedPlans = plans.filter(p => p.status === "paused").length;
  const totalSessionsDone = plans.reduce((sum, p) => sum + p.completedSessions, 0);

  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-56 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Treatment Plans</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {plans.length} plan{plans.length !== 1 ? "s" : ""} &middot; Manage patient treatment programs
          </p>
        </div>
        <Link href="/admin/treatments/plans/new" className="inline-flex items-center gap-2 text-white px-5 py-2 text-[15px] font-semibold rounded" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          + New Plan
        </Link>
      </div>

      <AdminTabs />
      <TreatmentTabs />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active Plans", value: activePlans, color: "#2d6a4f", bg: "#f0faf4" },
          { label: "Completed", value: completedPlans, color: "#059669", bg: "#ecfdf5" },
          { label: "Paused", value: pausedPlans, color: "#b68d40", bg: "#faf3e6" },
          { label: "Total Sessions Done", value: totalSessionsDone, color: "#37845e", bg: "#e8f5e9" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-lg" style={{ ...cardStyle, borderLeft: `3px solid ${s.color}` }}>
            <p className="text-[13px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--grey-600)" }}>{s.label}</p>
            <p className="text-[24px] font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search plans, patients, diagnosis..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-[15px]" style={inputStyle} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-[15px]" style={{ ...inputStyle, minWidth: 160 }}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Plan Cards */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No treatment plans found</p>
          <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>Create a new plan to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const st = STATUS_COLORS[plan.status] || STATUS_COLORS.active;
            const pct = plan.totalSessions > 0 ? Math.round((plan.completedSessions / plan.totalSessions) * 100) : 0;
            const patientName = `${plan.patient.firstName} ${plan.patient.lastName}`;
            const itemCount = plan._count?.items ?? plan.items?.length ?? 0;

            return (
              <Link key={plan.id} href={`/admin/treatments/plans/${plan.id}`} className="block" style={{ textDecoration: "none" }}>
                <div className="p-4 transition-shadow hover:shadow-md" style={cardStyle}>
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    {/* Left section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[13px] font-mono" style={{ color: "var(--grey-500)" }}>{plan.planNumber}</span>
                        <span className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{plan.name}</span>
                        <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide rounded" style={{ background: st.bg, color: st.color, borderRadius: "var(--radius-sm)" }}>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[14px] mb-2" style={{ color: "var(--grey-600)" }}>
                        <span>{patientName}</span>
                        <span>&middot;</span>
                        <span>Dr. {plan.doctorName}</span>
                      </div>
                      {plan.diagnosis && (
                        <span className="inline-flex px-2 py-0.5 text-[12px] font-semibold rounded mb-2" style={{ background: "#faf3e6", color: "#b68d40", borderRadius: "var(--radius-sm)" }}>
                          {plan.diagnosis}
                        </span>
                      )}
                      {/* Progress bar */}
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--grey-200)", maxWidth: 200 }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "#059669" : "#2d6a4f" }} />
                        </div>
                        <span className="text-[13px] font-semibold" style={{ color: pct === 100 ? "#059669" : "var(--grey-700)" }}>
                          {plan.completedSessions}/{plan.totalSessions} ({pct}%)
                        </span>
                      </div>
                    </div>

                    {/* Right section */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(plan.totalCost)}</p>
                      <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                        {itemCount} treatment{itemCount !== 1 ? "s" : ""}
                      </p>
                      <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                        {formatDate(plan.startDate)}{plan.endDate ? ` — ${formatDate(plan.endDate)}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
