"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────
interface StaffInfo {
  id: string;
  name: string;
  role: string;
  staffIdNumber: string | null;
  specialization: string | null;
  department: string | null;
}

interface Metrics {
  total: number;
  completed: number;
  noShows: number;
  cancelled: number;
  completionRate: number;
  uniquePatients: number;
  totalRevenue: number;
  avgRevenuePerAppt: number;
}

interface MonthlyData {
  month: string;
  total: number;
  completed: number;
  completionRate: number;
  revenue: number;
}

interface TopPatient {
  id: string;
  name: string;
  count: number;
}

interface PeakHour {
  hour: string;
  count: number;
}

interface RecentAppt {
  id: string;
  date: string;
  time: string;
  status: string;
  type: string;
  treatmentName: string | null;
  patientName: string;
  revenue: number;
}

interface DetailData {
  staff: StaffInfo;
  period: string;
  from: string;
  to: string;
  metrics: Metrics;
  monthlyBreakdown: MonthlyData[];
  topPatients: TopPatient[];
  dayDistribution: Record<string, number>;
  peakHours: PeakHour[];
  recentAppointments: RecentAppt[];
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

// ─── Helpers ────────────────────────────────────────────────────────────────
function rateColor(rate: number): string {
  if (rate >= 90) return "#2d6a4f";
  if (rate >= 70) return "#d97706";
  return "#dc2626";
}

function formatCurrency(val: number): string {
  return "S$" + val.toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getRoleMeta(role: string) {
  if (role === "doctor") return { label: "Doctor", color: "#2d6a4f", bg: "#f0faf4" };
  if (role === "therapist") return { label: "Therapist", color: "#059669", bg: "#ecfdf5" };
  return { label: role, color: "#78716c", bg: "#fafaf9" };
}

const statusStyles: Record<string, { bg: string; color: string }> = {
  completed: { bg: "#f0faf4", color: "#2d6a4f" },
  "checked-out": { bg: "#f0faf4", color: "#2d6a4f" },
  scheduled: { bg: "#eff6ff", color: "#2563eb" },
  confirmed: { bg: "#eff6ff", color: "#2563eb" },
  "in-progress": { bg: "#fffbeb", color: "#d97706" },
  cancelled: { bg: "#fef2f2", color: "#dc2626" },
  "no-show": { bg: "#fef2f2", color: "#dc2626" },
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function StaffPerformanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom" && customFrom && customTo) {
        params.set("from", customFrom);
        params.set("to", customTo);
      }
      const res = await fetch(`/api/staff/${id}/performance?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id, period, customFrom, customTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 md:p-8 yoda-fade-in">
        <div className="h-7 w-56 rounded mb-2" style={{ background: "var(--grey-200)" }} />
        <div className="h-4 w-40 rounded mb-6" style={{ background: "var(--grey-100)" }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 animate-pulse" style={{ ...cardStyle, height: 100 }}>
              <div className="h-4 w-24 rounded mb-3" style={{ background: "var(--grey-200)" }} />
              <div className="h-7 w-20 rounded" style={{ background: "var(--grey-200)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 md:p-8 yoda-fade-in">
        <p className="text-[16px]" style={{ color: "var(--grey-500)" }}>Unable to load performance data.</p>
        <a href="/admin/staff/performance" className="text-[14px] font-semibold mt-2 inline-block" style={{ color: "var(--blue-500)" }}>
          &larr; Back to Dashboard
        </a>
      </div>
    );
  }

  const { staff, metrics } = data;
  const roleMeta = getRoleMeta(staff.role);
  const maxMonthlyRevenue = Math.max(...data.monthlyBreakdown.map((m) => m.revenue), 1);
  const maxMonthlyAppts = Math.max(...data.monthlyBreakdown.map((m) => m.total), 1);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxDayCount = Math.max(...dayNames.map((d) => data.dayDistribution[d] || 0), 1);
  const maxPeakHour = Math.max(...data.peakHours.map((h) => h.count), 1);

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
              {staff.name}
            </h1>
            <span
              className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ background: roleMeta.bg, color: roleMeta.color, borderRadius: "var(--radius-pill)" }}
            >
              {roleMeta.label}
            </span>
          </div>
          <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>
            {staff.staffIdNumber && <span className="mr-2">{staff.staffIdNumber}</span>}
            {staff.specialization && <span className="mr-2">{staff.specialization}</span>}
            {staff.department && <span>| {staff.department}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/staff/performance"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold transition-colors"
            style={{ background: "var(--grey-100)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Dashboard
          </a>
          <a
            href={`/admin/staff/${staff.id}/leave`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold transition-colors"
            style={{ background: "#faf5ff", color: "#7c3aed", borderRadius: "var(--radius-sm)", border: "1px solid #e9d5ff" }}
          >
            Leaves
          </a>
        </div>
      </div>

      {/* Period Selector */}
      <div className="p-4 mb-5" style={cardStyle}>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "month", label: "This Month" },
            { value: "quarter", label: "This Quarter" },
            { value: "year", label: "This Year" },
            { value: "custom", label: "Custom Range" },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className="px-3 py-1.5 text-[13px] font-semibold transition-all duration-150"
              style={{
                borderRadius: "var(--radius-pill)",
                border: period === p.value ? "1.5px solid var(--blue-500)" : "1px solid var(--grey-300)",
                background: period === p.value ? "var(--blue-50)" : "var(--white)",
                color: period === p.value ? "var(--blue-500)" : "var(--grey-600)",
              }}
            >
              {p.label}
            </button>
          ))}
          {period === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1 text-[13px]"
                style={inputStyle}
              />
              <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1 text-[13px]"
                style={inputStyle}
              />
            </div>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <MetricCard label="Appointments" value={String(metrics.total)} />
        <MetricCard label="Completed" value={String(metrics.completed)} color="#2d6a4f" />
        <MetricCard label="No-Shows" value={String(metrics.noShows)} color={metrics.noShows > 0 ? "#dc2626" : undefined} />
        <MetricCard label="Cancelled" value={String(metrics.cancelled)} color={metrics.cancelled > 0 ? "#d97706" : undefined} />
        <MetricCard label="Rate" value={metrics.completionRate + "%"} color={rateColor(metrics.completionRate)} />
        <MetricCard label="Patients" value={String(metrics.uniquePatients)} />
        <MetricCard label="Revenue" value={formatCurrency(metrics.totalRevenue)} />
        <MetricCard label="Avg/Appt" value={formatCurrency(metrics.avgRevenuePerAppt)} />
      </div>

      {/* Completion Rate Bar */}
      <div className="p-4 mb-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold" style={{ color: "var(--grey-600)" }}>Completion Rate</span>
          <span className="text-[18px] font-bold" style={{ color: rateColor(metrics.completionRate) }}>
            {metrics.completionRate}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full" style={{ background: "var(--grey-200)" }}>
          <div
            className="h-3 rounded-full transition-all"
            style={{ width: `${Math.min(metrics.completionRate, 100)}%`, background: rateColor(metrics.completionRate) }}
          />
        </div>
      </div>

      {/* Grid: Trends + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Monthly Revenue Trend */}
        <div className="p-5" style={cardStyle}>
          <h3 className="text-[14px] font-bold uppercase tracking-wide mb-4" style={{ color: "var(--grey-500)" }}>
            Monthly Revenue Trend
          </h3>
          <div className="space-y-3">
            {data.monthlyBreakdown.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-[12px] w-20 shrink-0 font-medium" style={{ color: "var(--grey-600)" }}>{m.month}</span>
                <div className="flex-1 h-5 rounded" style={{ background: "var(--grey-100)" }}>
                  <div
                    className="h-5 rounded flex items-center justify-end px-1"
                    style={{
                      width: `${Math.max((m.revenue / maxMonthlyRevenue) * 100, 2)}%`,
                      background: "var(--green)",
                      minWidth: m.revenue > 0 ? "20px" : "0",
                    }}
                  >
                    {m.revenue > 0 && (
                      <span className="text-[9px] font-bold text-white">{formatCurrency(m.revenue)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Appointments Trend */}
        <div className="p-5" style={cardStyle}>
          <h3 className="text-[14px] font-bold uppercase tracking-wide mb-4" style={{ color: "var(--grey-500)" }}>
            Monthly Appointments
          </h3>
          <div className="space-y-3">
            {data.monthlyBreakdown.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-[12px] w-20 shrink-0 font-medium" style={{ color: "var(--grey-600)" }}>{m.month}</span>
                <div className="flex-1 h-5 rounded" style={{ background: "var(--grey-100)" }}>
                  <div
                    className="h-5 rounded"
                    style={{
                      width: `${Math.max((m.total / maxMonthlyAppts) * 100, 2)}%`,
                      background: "#7c3aed",
                      minWidth: m.total > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span className="text-[12px] w-12 text-right shrink-0 font-semibold" style={{ color: "var(--grey-700)" }}>
                  {m.total} <span className="text-[10px] font-normal" style={{ color: "var(--grey-400)" }}>({m.completionRate}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Day Distribution + Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Day of Week Distribution */}
        <div className="p-5" style={cardStyle}>
          <h3 className="text-[14px] font-bold uppercase tracking-wide mb-4" style={{ color: "var(--grey-500)" }}>
            Appointments by Day
          </h3>
          <div className="flex items-end gap-3 h-36">
            {dayNames.map((day) => {
              const count = data.dayDistribution[day] || 0;
              const pct = (count / maxDayCount) * 100;
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[12px] font-bold" style={{ color: "var(--grey-700)" }}>{count}</span>
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${Math.max(pct, 4)}%`,
                      background: "var(--green)",
                      minHeight: count > 0 ? "6px" : "3px",
                    }}
                  />
                  <span className="text-[11px] font-medium" style={{ color: "var(--grey-500)" }}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peak Hours */}
        <div className="p-5" style={cardStyle}>
          <h3 className="text-[14px] font-bold uppercase tracking-wide mb-4" style={{ color: "var(--grey-500)" }}>
            Peak Hours
          </h3>
          {data.peakHours.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--grey-400)" }}>No appointment data for peak hours</p>
          ) : (
            <div className="space-y-2">
              {data.peakHours.map((h) => (
                <div key={h.hour} className="flex items-center gap-3">
                  <span className="text-[12px] w-12 shrink-0 font-medium" style={{ color: "var(--grey-600)" }}>{h.hour}</span>
                  <div className="flex-1 h-4 rounded" style={{ background: "var(--grey-100)" }}>
                    <div
                      className="h-4 rounded"
                      style={{
                        width: `${(h.count / maxPeakHour) * 100}%`,
                        background: "#2563eb",
                        minWidth: "4px",
                      }}
                    />
                  </div>
                  <span className="text-[12px] w-8 text-right font-semibold" style={{ color: "var(--grey-700)" }}>{h.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid: Top Patients + Recent Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Patients */}
        <div className="p-5" style={cardStyle}>
          <h3 className="text-[14px] font-bold uppercase tracking-wide mb-4" style={{ color: "var(--grey-500)" }}>
            Top Patients
          </h3>
          {data.topPatients.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--grey-400)" }}>No patient data available</p>
          ) : (
            <div className="space-y-3">
              {data.topPatients.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded-full"
                      style={{
                        background: i === 0 ? "var(--green-light)" : "var(--grey-100)",
                        color: i === 0 ? "var(--green)" : "var(--grey-500)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[14px] font-medium" style={{ color: "var(--grey-800)" }}>{p.name}</span>
                  </div>
                  <span
                    className="inline-flex px-2 py-0.5 text-[12px] font-semibold"
                    style={{ background: "var(--grey-100)", color: "var(--grey-600)", borderRadius: "var(--radius-pill)" }}
                  >
                    {p.count} visits
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Appointments */}
        <div className="p-5" style={cardStyle}>
          <h3 className="text-[14px] font-bold uppercase tracking-wide mb-4" style={{ color: "var(--grey-500)" }}>
            Recent Appointments
          </h3>
          {data.recentAppointments.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--grey-400)" }}>No recent appointments</p>
          ) : (
            <div className="space-y-2">
              {data.recentAppointments.map((a) => {
                const ss = statusStyles[a.status] || { bg: "var(--grey-100)", color: "var(--grey-600)" };
                return (
                  <div key={a.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                    <div>
                      <span className="text-[13px] font-medium" style={{ color: "var(--grey-800)" }}>{a.patientName}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px]" style={{ color: "var(--grey-400)" }}>
                          {new Date(a.date).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--grey-400)" }}>{a.time}</span>
                        {a.treatmentName && (
                          <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>{a.treatmentName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold" style={{ color: "var(--grey-600)" }}>
                        {a.revenue > 0 ? formatCurrency(a.revenue) : ""}
                      </span>
                      <span
                        className="inline-flex px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: ss.bg, color: ss.color, borderRadius: "var(--radius-pill)" }}
                      >
                        {a.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────
function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-3 text-center" style={cardStyle}>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--grey-400)" }}>{label}</p>
      <p className="text-[18px] font-bold" style={{ color: color || "var(--grey-900)" }}>{value}</p>
    </div>
  );
}
