"use client";

import { useState, useEffect, useCallback } from "react";
import { useFlash } from "@/components/FlashCardProvider";
import Link from "next/link";
import AdminTabs from "@/components/AdminTabs";
import TreatmentTabs from "@/components/TreatmentTabs";
import { cardStyle } from "@/lib/styles";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";

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
  plan: {
    id: string;
    name: string;
    planNumber: string;
    patientId: string;
  };
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

interface RecentProgressItem {
  id: string;
  treatmentName: string;
  totalSessions: number;
  completedSessions: number;
  status: string;
  plan: {
    id: string;
    name: string;
    planNumber: string;
    patientId: string;
  };
}

interface Stats {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  pausedPlans: number;
  overallProgress: number;
  totalSessions: number;
  completedSessions: number;
  upcomingMilestones: Milestone[];
  recentProgress: RecentProgressItem[];
}

// ─── Constants ──────────────────────────────────────────────────────────────
const MILESTONE_STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "#f0faf4", color: "#37845e", label: "Pending" },
  achieved: { bg: "#ecfdf5", color: "#059669", label: "Achieved" },
  missed: { bg: "#fef2f2", color: "#dc2626", label: "Missed" },
};

function daysBetween(from: string, to: Date): number {
  const start = new Date(from);
  const diff = to.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getDueColor(days: number | null): string {
  if (days === null) return "var(--grey-600)";
  if (days < 3) return "#dc2626";
  if (days <= 7) return "#37845e";
  return "#059669";
}

function getDueBg(days: number | null): string {
  if (days === null) return "var(--grey-100)";
  if (days < 3) return "#fef2f2";
  if (days <= 7) return "#f0faf4";
  return "#ecfdf5";
}

// ─── Patient Name Cache ─────────────────────────────────────────────────────
const patientNameCache: Record<string, string> = {};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function ProgressTrackerPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activePlans, setActivePlans] = useState<TreatmentPlan[]>([]);
  const { showFlash } = useFlash();

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stats and active plan list in parallel
      const [statsRes, plansRes] = await Promise.all([
        fetch("/api/treatment-plans/stats"),
        fetch("/api/treatment-plans?status=active&limit=50"),
      ]);
      const statsData = await statsRes.json();
      const plansData = await plansRes.json();

      if (!statsRes.ok) throw new Error("Failed to load stats");
      setStats(statsData);

      // Get plan IDs from list, then fetch each with full details (items)
      const planList = plansData.plans || plansData;
      const planArr = Array.isArray(planList) ? planList : [];

      if (planArr.length > 0) {
        const detailPromises = planArr.map((p: TreatmentPlan) =>
          fetch(`/api/treatment-plans/${p.id}`).then(r => r.json())
        );
        const details = await Promise.all(detailPromises);
        setActivePlans(details.filter((d: TreatmentPlan) => d.id));

        // Cache patient names from active plans
        details.forEach((plan: TreatmentPlan) => {
          if (plan.patient) {
            patientNameCache[plan.patient.id] = `${plan.patient.firstName} ${plan.patient.lastName}`;
          }
        });
      } else {
        setActivePlans([]);
      }
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to load progress data" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Loading Skeleton ───────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-56 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Progress Tracker</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            Monitor treatment progress across all active plans
          </p>
        </div>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 text-[15px] font-semibold rounded" style={{ background: "var(--grey-100)", color: "var(--grey-700)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      <AdminTabs />
      <TreatmentTabs />

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Total Plans", value: stats.totalPlans, color: "var(--grey-700)", bg: "var(--grey-50)" },
            { label: "Active Plans", value: stats.activePlans, color: "#2d6a4f", bg: "#f0faf4" },
            { label: "Completed", value: stats.completedPlans, color: "#059669", bg: "#ecfdf5" },
            { label: "Overall Progress", value: `${stats.overallProgress}%`, color: "#b68d40", bg: "#faf3e6" },
            { label: "Sessions Done", value: stats.completedSessions, color: "#37845e", bg: "#e8f5e9" },
            { label: "Upcoming Milestones", value: stats.upcomingMilestones?.length ?? 0, color: "#2d6a4f", bg: "#f0faf4" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-lg" style={{ ...cardStyle, borderLeft: `3px solid ${s.color}` }}>
              <p className="text-[13px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--grey-600)" }}>{s.label}</p>
              <p className="text-[24px] font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Overall Progress Bar (pure CSS chart) */}
      {stats && !loading && stats.totalSessions > 0 && (
        <div className="mb-8 p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Overall Treatment Completion</p>
            <p className="text-[15px] font-semibold" style={{ color: "#7c3aed" }}>{stats.completedSessions} / {stats.totalSessions} sessions ({stats.overallProgress}%)</p>
          </div>
          <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: "var(--grey-200)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${stats.overallProgress}%`, background: "linear-gradient(90deg, #2d6a4f, #37845e)" }} />
          </div>
          {/* Mini bar chart: breakdown by status */}
          <div className="flex items-center gap-4 mt-3">
            {[
              { label: "Active", count: stats.activePlans, color: "#2d6a4f" },
              { label: "Completed", count: stats.completedPlans, color: "#059669" },
              { label: "Paused", count: stats.pausedPlans, color: "#b68d40" },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--grey-600)" }}>
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: b.color }} />
                {b.label}: {b.count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Treatment Progress */}
      <div className="mb-8">
        <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>
          <svg className="w-5 h-5 inline-block mr-2 -mt-0.5" style={{ color: "#059669" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          Active Treatment Progress
        </h2>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-40 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
        ) : activePlans.length === 0 ? (
          <div className="text-center py-12" style={cardStyle}>
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
              <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No active treatment plans</p>
            <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>Create a treatment plan to start tracking progress</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activePlans.map(plan => {
              const pct = plan.totalSessions > 0 ? Math.round((plan.completedSessions / plan.totalSessions) * 100) : 0;
              const patientName = `${plan.patient.firstName} ${plan.patient.lastName}`;
              const daysSinceStart = daysBetween(plan.startDate, now);

              return (
                <div key={plan.id} className="p-5" style={cardStyle}>
                  {/* Plan Header */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[13px] font-mono" style={{ color: "var(--grey-500)" }}>{plan.planNumber}</span>
                        <span className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>{plan.name}</span>
                        <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide rounded" style={{ background: "#ecfdf5", color: "#059669", borderRadius: "var(--radius-sm)" }}>
                          Active
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[14px]" style={{ color: "var(--grey-600)" }}>
                        <span>{patientName}</span>
                        <span>&middot;</span>
                        <span>Dr. {plan.doctorName}</span>
                        <span>&middot;</span>
                        <span>{daysSinceStart} day{daysSinceStart !== 1 ? "s" : ""} since start</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(plan.totalCost)}</p>
                      <Link href={`/admin/treatments/plans/${plan.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-[14px] font-semibold rounded" style={{ background: "#f0faf4", color: "#2d6a4f", borderRadius: "var(--radius-sm)", textDecoration: "none" }}>
                        View Plan
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </Link>
                    </div>
                  </div>

                  {/* Overall Progress Bar */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--grey-200)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct === 100 ? "#059669" : "linear-gradient(90deg, #2d6a4f, #37845e)" }} />
                    </div>
                    <span className="text-[14px] font-bold min-w-[80px] text-right" style={{ color: pct === 100 ? "#059669" : "var(--grey-700)" }}>
                      {plan.completedSessions}/{plan.totalSessions} ({pct}%)
                    </span>
                  </div>

                  {/* Per-Item Mini Progress Bars */}
                  {plan.items && plan.items.length > 0 && (
                    <div className="space-y-2 p-3 rounded-lg" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius-sm)" }}>
                      <p className="text-[13px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--grey-500)" }}>Treatment Items</p>
                      {plan.items.map(item => {
                        const itemPct = item.totalSessions > 0 ? Math.round((item.completedSessions / item.totalSessions) * 100) : 0;
                        const itemStatusColor = item.status === "completed" ? "#059669" : item.status === "in_progress" ? "#2d6a4f" : "var(--grey-500)";
                        return (
                          <div key={item.id} className="flex items-center gap-3">
                            <span className="text-[14px] font-medium min-w-[140px] truncate" style={{ color: "var(--grey-800)" }}>{item.treatmentName}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--grey-200)" }}>
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${itemPct}%`, background: itemPct === 100 ? "#059669" : itemStatusColor }} />
                            </div>
                            <span className="text-[13px] font-semibold min-w-[60px] text-right" style={{ color: itemStatusColor }}>
                              {item.completedSessions}/{item.totalSessions}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two-Column: Milestones + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Milestones */}
        <div>
          <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>
            <svg className="w-5 h-5 inline-block mr-2 -mt-0.5" style={{ color: "#37845e" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            Upcoming Milestones
          </h2>
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
          ) : !stats?.upcomingMilestones?.length ? (
            <div className="text-center py-10" style={cardStyle}>
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No upcoming milestones</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.upcomingMilestones.map(milestone => {
                const days = daysUntil(milestone.targetDate);
                const dueColor = getDueColor(days);
                const dueBg = getDueBg(days);
                const st = MILESTONE_STATUS_COLORS[milestone.status] || MILESTONE_STATUS_COLORS.pending;
                const planPatientName = patientNameCache[milestone.plan.patientId] || "Patient";

                return (
                  <div key={milestone.id} className="p-4" style={cardStyle}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold truncate" style={{ color: "var(--grey-900)" }}>{milestone.title}</p>
                        <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>
                          {milestone.plan.name} &middot; {planPatientName}
                        </p>
                        {milestone.targetDate && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>Target: {formatDate(milestone.targetDate)}</span>
                            <span className="inline-flex px-2 py-0.5 text-[12px] font-bold rounded" style={{ background: dueBg, color: dueColor, borderRadius: "var(--radius-sm)" }}>
                              {days !== null ? (days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`) : "No date"}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide rounded flex-shrink-0" style={{ background: st.bg, color: st.color, borderRadius: "var(--radius-sm)" }}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>
            <svg className="w-5 h-5 inline-block mr-2 -mt-0.5" style={{ color: "#2d6a4f" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Recent Activity
          </h2>
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
          ) : !stats?.recentProgress?.length ? (
            <div className="text-center py-10" style={cardStyle}>
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recentProgress.map((item, idx) => {
                const planPatientName = patientNameCache[item.plan.patientId] || "Patient";
                return (
                  <div key={`${item.id}-${idx}`} className="p-4 flex items-center gap-3" style={cardStyle}>
                    <div className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: item.completedSessions === item.totalSessions ? "#ecfdf5" : "var(--blue-50)" }}>
                      {item.completedSessions === item.totalSessions ? (
                        <svg className="w-4 h-4" style={{ color: "#059669" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-4 h-4" style={{ color: "#2d6a4f" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>{item.treatmentName}</p>
                      <p className="text-[13px]" style={{ color: "var(--grey-600)" }}>
                        {planPatientName} &middot; {item.plan.name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[14px] font-bold" style={{ color: item.completedSessions === item.totalSessions ? "#059669" : "#2d6a4f" }}>
                        Session {item.completedSessions} of {item.totalSessions}
                      </p>
                      {item.completedSessions === item.totalSessions && (
                        <span className="text-[12px] font-bold uppercase" style={{ color: "#059669" }}>Completed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pure CSS Donut Chart - Plan Status Distribution */}
      {stats && !loading && stats.totalPlans > 0 && (
        <div className="mt-8 p-5" style={cardStyle}>
          <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Plan Status Distribution</h2>
          <div className="flex items-center gap-8 flex-wrap">
            {/* CSS Donut */}
            <div className="relative" style={{ width: 120, height: 120 }}>
              <div style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: (() => {
                  const total = stats.totalPlans;
                  const activeAngle = (stats.activePlans / total) * 360;
                  const completedAngle = (stats.completedPlans / total) * 360;
                  const pausedAngle = (stats.pausedPlans / total) * 360;
                  const otherAngle = 360 - activeAngle - completedAngle - pausedAngle;
                  return `conic-gradient(#2d6a4f 0deg ${activeAngle}deg, #059669 ${activeAngle}deg ${activeAngle + completedAngle}deg, #b68d40 ${activeAngle + completedAngle}deg ${activeAngle + completedAngle + pausedAngle}deg, #94a3b8 ${activeAngle + completedAngle + pausedAngle}deg ${activeAngle + completedAngle + pausedAngle + otherAngle}deg)`;
                })(),
              }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--white)" }}>
                  <span className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{stats.totalPlans}</span>
                </div>
              </div>
            </div>
            {/* Legend */}
            <div className="space-y-2">
              {[
                { label: "Active", count: stats.activePlans, color: "#2d6a4f" },
                { label: "Completed", count: stats.completedPlans, color: "#059669" },
                { label: "Paused", count: stats.pausedPlans, color: "#b68d40" },
                { label: "Other", count: stats.totalPlans - stats.activePlans - stats.completedPlans - stats.pausedPlans, color: "#94a3b8" },
              ].filter(s => s.count > 0).map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
                  <span className="text-[14px] font-medium" style={{ color: "var(--grey-700)" }}>{s.label}</span>
                  <span className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>{s.count}</span>
                  <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>({stats.totalPlans > 0 ? Math.round((s.count / stats.totalPlans) * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
