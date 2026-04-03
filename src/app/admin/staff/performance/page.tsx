"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────
interface StaffMetric {
  id: string;
  name: string;
  role: string;
  staffIdNumber: string | null;
  specialization: string | null;
  department: string | null;
  total: number;
  completed: number;
  noShows: number;
  cancelled: number;
  completionRate: number;
  uniquePatients: number;
  totalRevenue: number;
  avgRevenuePerAppt: number;
  avgApptsPerDay: number;
  trends: {
    appointments: number;
    revenue: number;
    completionRate: number;
  };
}

interface ClinicTotals {
  totalAppointments: number;
  completedAppointments: number;
  noShows: number;
  cancelled: number;
  completionRate: number;
  uniquePatients: number;
  totalRevenue: number;
  prevTotalAppointments: number;
  prevRevenue: number;
}

interface PerfData {
  period: string;
  from: string;
  to: string;
  workingDays: number;
  staff: StaffMetric[];
  clinicTotals: ClinicTotals;
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
function getRoleColor(role: string) {
  if (role === "doctor") return { color: "#2d6a4f", bg: "#f0faf4" };
  if (role === "therapist") return { color: "#059669", bg: "#ecfdf5" };
  return { color: "#78716c", bg: "#fafaf9" };
}

function rateColor(rate: number): string {
  if (rate >= 90) return "#2d6a4f";
  if (rate >= 70) return "#d97706";
  return "#dc2626";
}

function trendArrow(val: number): string {
  if (val > 0) return "\u2191";
  if (val < 0) return "\u2193";
  return "\u2014";
}

function trendColor(val: number): string {
  if (val > 0) return "#2d6a4f";
  if (val < 0) return "#dc2626";
  return "var(--grey-500)";
}

function formatCurrency(val: number): string {
  return "S$" + val.toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

type SortKey = "name" | "role" | "total" | "completed" | "noShows" | "completionRate" | "totalRevenue" | "uniquePatients" | "avgRevenuePerAppt";

// ─── Component ──────────────────────────────────────────────────────────────
export default function StaffPerformancePage() {
  const router = useRouter();
  const [data, setData] = useState<PerfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("totalRevenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, StaffDetail | null>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom" && customFrom && customTo) {
        params.set("from", customFrom);
        params.set("to", customTo);
      }
      const res = await fetch(`/api/staff/performance?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch individual detail when expanding
  const fetchDetail = async (staffId: string) => {
    if (detailData[staffId]) return;
    setDetailLoading((prev) => ({ ...prev, [staffId]: true }));
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom" && customFrom && customTo) {
        params.set("from", customFrom);
        params.set("to", customTo);
      }
      const res = await fetch(`/api/staff/${staffId}/performance?${params}`);
      if (res.ok) {
        const d = await res.json();
        setDetailData((prev) => ({ ...prev, [staffId]: d }));
      }
    } catch {
      /* ignore */
    } finally {
      setDetailLoading((prev) => ({ ...prev, [staffId]: false }));
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchDetail(id);
    }
  };

  // Sorting
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  };

  // Filter & sort staff
  const filteredStaff = (data?.staff || [])
    .filter((s) => roleFilter === "all" || s.role === roleFilter)
    .sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  // Top performer (highest revenue)
  const topPerformerId = filteredStaff.length > 0
    ? filteredStaff.reduce((top, s) => (s.totalRevenue > top.totalRevenue ? s : top), filteredStaff[0]).id
    : null;

  // Period change resets detail cache
  useEffect(() => {
    setDetailData({});
    setExpandedId(null);
  }, [period, customFrom, customTo]);

  // ─── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 md:p-8 yoda-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-7 w-56 rounded" style={{ background: "var(--grey-200)" }} />
            <div className="h-4 w-40 rounded mt-2" style={{ background: "var(--grey-100)" }} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 animate-pulse" style={{ ...cardStyle, height: 100 }}>
              <div className="h-4 w-24 rounded mb-3" style={{ background: "var(--grey-200)" }} />
              <div className="h-7 w-20 rounded" style={{ background: "var(--grey-200)" }} />
            </div>
          ))}
        </div>
        <div className="p-4 animate-pulse" style={{ ...cardStyle, height: 300 }}>
          <div className="h-5 w-40 rounded mb-4" style={{ background: "var(--grey-200)" }} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-full rounded mb-2" style={{ background: "var(--grey-100)" }} />
          ))}
        </div>
      </div>
    );
  }

  const totals = data?.clinicTotals;

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
            Staff Performance
          </h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            Track appointments, revenue, and completion rates for clinical staff
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/staff"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold transition-colors"
            style={{ background: "var(--grey-100)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Staff List
          </a>
          <a
            href="/admin/commission"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold transition-colors"
            style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-sm)", border: "1px solid var(--blue-200)" }}
          >
            Commission & Incentives
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

      {/* Summary Cards */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            label="Total Appointments"
            value={String(totals.totalAppointments)}
            trend={totals.totalAppointments - totals.prevTotalAppointments}
            trendLabel="vs prev period"
          />
          <SummaryCard
            label="Total Revenue"
            value={formatCurrency(totals.totalRevenue)}
            trend={totals.totalRevenue - totals.prevRevenue}
            trendLabel="vs prev period"
            isCurrency
          />
          <SummaryCard
            label="Avg Completion Rate"
            value={totals.completionRate + "%"}
            color={rateColor(totals.completionRate)}
          />
          <SummaryCard
            label="Unique Patients"
            value={String(totals.uniquePatients)}
          />
        </div>
      )}

      {/* Role Filter for Table */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[13px] font-semibold" style={{ color: "var(--grey-600)" }}>Filter:</span>
        {[
          { value: "all", label: "All" },
          { value: "doctor", label: "Doctors" },
          { value: "therapist", label: "Therapists" },
        ].map((r) => (
          <button
            key={r.value}
            onClick={() => setRoleFilter(r.value)}
            className="px-3 py-1 text-[12px] font-semibold transition-all duration-150"
            style={{
              borderRadius: "var(--radius-pill)",
              border: roleFilter === r.value ? "1.5px solid var(--green)" : "1px solid var(--grey-300)",
              background: roleFilter === r.value ? "var(--green-light)" : "var(--white)",
              color: roleFilter === r.value ? "var(--green)" : "var(--grey-600)",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Staff Table */}
      {filteredStaff.length === 0 ? (
        <div className="p-8 text-center" style={cardStyle}>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-500)" }}>No clinical staff found</p>
          <p className="text-[14px] mt-1" style={{ color: "var(--grey-400)" }}>Add doctors or therapists to see performance metrics</p>
        </div>
      ) : (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
                  <SortHeader label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Role" sortKey="role" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Appts" sortKey="total" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Completed" sortKey="completed" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="No-Shows" sortKey="noShows" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Rate" sortKey="completionRate" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Revenue" sortKey="totalRevenue" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Patients" sortKey="uniquePatients" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Avg/Appt" sortKey="avgRevenuePerAppt" current={sortKey} dir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((s) => {
                  const rc = getRoleColor(s.role);
                  const isExpanded = expandedId === s.id;
                  return (
                    <StaffRow
                      key={s.id}
                      staff={s}
                      roleColor={rc}
                      isTopPerformer={s.id === topPerformerId}
                      isExpanded={isExpanded}
                      onToggle={() => toggleExpand(s.id)}
                      detail={detailData[s.id] || null}
                      detailLoading={!!detailLoading[s.id]}
                      onViewFull={() => router.push(`/admin/staff/${s.id}/performance`)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Summary Card ───────────────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  trend,
  trendLabel,
  color,
  isCurrency,
}: {
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  color?: string;
  isCurrency?: boolean;
}) {
  return (
    <div className="p-5" style={cardStyle}>
      <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--grey-500)" }}>{label}</p>
      <p className="text-[26px] font-bold" style={{ color: color || "var(--grey-900)" }}>{value}</p>
      {trend !== undefined && (
        <p className="text-[12px] mt-1" style={{ color: trendColor(trend) }}>
          {trendArrow(trend)}{" "}
          {isCurrency ? formatCurrency(Math.abs(trend)) : Math.abs(trend)}{" "}
          <span style={{ color: "var(--grey-400)" }}>{trendLabel}</span>
        </p>
      )}
    </div>
  );
}

// ─── Sort Header ────────────────────────────────────────────────────────────
function SortHeader({
  label,
  sortKey: key,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const isActive = current === key;
  return (
    <th
      className="px-4 py-3 text-[12px] font-bold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
      style={{ color: isActive ? "var(--green)" : "var(--grey-500)" }}
      onClick={() => onSort(key)}
    >
      {label}
      {isActive && <span className="ml-0.5">{dir === "asc" ? "\u25B2" : "\u25BC"}</span>}
    </th>
  );
}

// ─── Staff Detail Types ─────────────────────────────────────────────────────
interface MonthlyData {
  month: string;
  total: number;
  completed: number;
  completionRate: number;
  revenue: number;
}

interface StaffDetail {
  monthlyBreakdown: MonthlyData[];
  topPatients: { id: string; name: string; count: number }[];
  dayDistribution: Record<string, number>;
  peakHours: { hour: string; count: number }[];
  recentAppointments: {
    id: string;
    date: string;
    time: string;
    status: string;
    type: string;
    treatmentName: string | null;
    patientName: string;
    revenue: number;
  }[];
}

// ─── Staff Row ──────────────────────────────────────────────────────────────
function StaffRow({
  staff: s,
  roleColor: rc,
  isTopPerformer,
  isExpanded,
  onToggle,
  detail,
  detailLoading,
  onViewFull,
}: {
  staff: StaffMetric;
  roleColor: { color: string; bg: string };
  isTopPerformer: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  detail: StaffDetail | null;
  detailLoading: boolean;
  onViewFull: () => void;
}) {
  return (
    <>
      <tr
        className="transition-colors cursor-pointer"
        style={{ borderBottom: "1px solid var(--grey-200)" }}
        onClick={onToggle}
      >
        {/* Name */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>
              {s.name}
            </span>
            {isTopPerformer && s.totalRevenue > 0 && (
              <span title="Top performer" className="text-[14px]" style={{ color: "#d97706" }}>&#9733;</span>
            )}
            <span
              className="text-[10px] font-bold"
              style={{ color: trendColor(s.trends.appointments) }}
            >
              {s.trends.appointments !== 0 && (
                <>{trendArrow(s.trends.appointments)} {Math.abs(s.trends.appointments)}</>
              )}
            </span>
          </div>
          {s.staffIdNumber && (
            <span className="text-[11px]" style={{ color: "var(--grey-400)" }}>{s.staffIdNumber}</span>
          )}
        </td>

        {/* Role */}
        <td className="px-4 py-3">
          <span
            className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
            style={{ background: rc.bg, color: rc.color, borderRadius: "var(--radius-pill)" }}
          >
            {s.role}
          </span>
        </td>

        {/* Appointments */}
        <td className="px-4 py-3 text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{s.total}</td>

        {/* Completed */}
        <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-700)" }}>{s.completed}</td>

        {/* No-Shows */}
        <td className="px-4 py-3 text-[14px]" style={{ color: s.noShows > 0 ? "#dc2626" : "var(--grey-500)" }}>
          {s.noShows}
        </td>

        {/* Completion Rate */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 rounded-full" style={{ background: "var(--grey-200)" }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${Math.min(s.completionRate, 100)}%`, background: rateColor(s.completionRate) }}
              />
            </div>
            <span
              className="text-[13px] font-bold"
              style={{ color: rateColor(s.completionRate) }}
            >
              {s.completionRate}%
            </span>
          </div>
        </td>

        {/* Revenue */}
        <td className="px-4 py-3">
          <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>
            {formatCurrency(s.totalRevenue)}
          </span>
          {s.trends.revenue !== 0 && (
            <span className="text-[10px] font-bold ml-1" style={{ color: trendColor(s.trends.revenue) }}>
              {trendArrow(s.trends.revenue)}
            </span>
          )}
        </td>

        {/* Unique Patients */}
        <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-700)" }}>{s.uniquePatients}</td>

        {/* Avg Revenue */}
        <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{formatCurrency(s.avgRevenuePerAppt)}</td>
      </tr>

      {/* Expanded Detail */}
      {isExpanded && (
        <tr>
          <td colSpan={9} style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
            {detailLoading ? (
              <div className="p-6 text-center">
                <p className="text-[14px] animate-pulse" style={{ color: "var(--grey-500)" }}>Loading details...</p>
              </div>
            ) : detail ? (
              <ExpandedDetail detail={detail} onViewFull={onViewFull} />
            ) : (
              <div className="p-6 text-center">
                <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>Unable to load details</p>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Expanded Detail Panel ──────────────────────────────────────────────────
function ExpandedDetail({ detail, onViewFull }: { detail: StaffDetail; onViewFull: () => void }) {
  const maxMonthlyRevenue = Math.max(...detail.monthlyBreakdown.map((m) => m.revenue), 1);
  const maxMonthlyAppts = Math.max(...detail.monthlyBreakdown.map((m) => m.total), 1);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxDayCount = Math.max(...dayNames.map((d) => detail.dayDistribution[d] || 0), 1);

  return (
    <div className="p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Monthly Trend */}
        <div className="p-4" style={{ ...cardStyle, background: "var(--white)" }}>
          <h4 className="text-[13px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--grey-500)" }}>
            Monthly Trend (6 Months)
          </h4>
          <div className="space-y-2">
            {detail.monthlyBreakdown.map((m) => (
              <div key={m.month} className="flex items-center gap-2">
                <span className="text-[11px] w-16 shrink-0" style={{ color: "var(--grey-600)" }}>{m.month}</span>
                <div className="flex-1 h-4 rounded" style={{ background: "var(--grey-100)" }}>
                  <div
                    className="h-4 rounded"
                    style={{
                      width: `${(m.revenue / maxMonthlyRevenue) * 100}%`,
                      background: "var(--green)",
                      minWidth: m.revenue > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span className="text-[11px] w-14 text-right shrink-0 font-semibold" style={{ color: "var(--grey-700)" }}>
                  {formatCurrency(m.revenue)}
                </span>
              </div>
            ))}
          </div>
          {/* Appointments mini-bars */}
          <h4 className="text-[12px] font-bold uppercase tracking-wide mt-4 mb-2" style={{ color: "var(--grey-400)" }}>
            Appointments
          </h4>
          <div className="space-y-1">
            {detail.monthlyBreakdown.map((m) => (
              <div key={m.month + "-a"} className="flex items-center gap-2">
                <span className="text-[11px] w-16 shrink-0" style={{ color: "var(--grey-500)" }}>{m.month}</span>
                <div className="flex-1 h-3 rounded" style={{ background: "var(--grey-100)" }}>
                  <div
                    className="h-3 rounded"
                    style={{
                      width: `${(m.total / maxMonthlyAppts) * 100}%`,
                      background: "#7c3aed",
                      minWidth: m.total > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span className="text-[11px] w-8 text-right shrink-0" style={{ color: "var(--grey-600)" }}>
                  {m.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Day Distribution */}
        <div className="p-4" style={{ ...cardStyle, background: "var(--white)" }}>
          <h4 className="text-[13px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--grey-500)" }}>
            By Day of Week
          </h4>
          <div className="flex items-end gap-2 h-28">
            {dayNames.map((day) => {
              const count = detail.dayDistribution[day] || 0;
              const pct = (count / maxDayCount) * 100;
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold" style={{ color: "var(--grey-700)" }}>{count}</span>
                  <div className="w-full rounded-t" style={{ height: `${Math.max(pct, 4)}%`, background: "var(--green)", minHeight: count > 0 ? "4px" : "2px" }} />
                  <span className="text-[10px]" style={{ color: "var(--grey-500)" }}>{day}</span>
                </div>
              );
            })}
          </div>

          {/* Peak Hours */}
          <h4 className="text-[13px] font-bold uppercase tracking-wide mt-4 mb-2" style={{ color: "var(--grey-500)" }}>
            Peak Hours
          </h4>
          {detail.peakHours.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--grey-400)" }}>No data</p>
          ) : (
            <div className="space-y-1">
              {detail.peakHours.slice(0, 5).map((h) => (
                <div key={h.hour} className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: "var(--grey-600)" }}>{h.hour}</span>
                  <span className="text-[12px] font-semibold" style={{ color: "var(--grey-800)" }}>{h.count} appts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Patients */}
        <div className="p-4" style={{ ...cardStyle, background: "var(--white)" }}>
          <h4 className="text-[13px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--grey-500)" }}>
            Top Patients
          </h4>
          {detail.topPatients.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--grey-400)" }}>No patient data</p>
          ) : (
            <div className="space-y-2">
              {detail.topPatients.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full"
                      style={{ background: i === 0 ? "var(--green-light)" : "var(--grey-100)", color: i === 0 ? "var(--green)" : "var(--grey-500)" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px]" style={{ color: "var(--grey-800)" }}>{p.name}</span>
                  </div>
                  <span className="text-[12px] font-semibold" style={{ color: "var(--grey-600)" }}>{p.count} visits</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Appointments */}
        <div className="p-4" style={{ ...cardStyle, background: "var(--white)" }}>
          <h4 className="text-[13px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--grey-500)" }}>
            Recent Appointments
          </h4>
          {detail.recentAppointments.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--grey-400)" }}>No appointments</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {detail.recentAppointments.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-[12px]">
                  <div>
                    <span style={{ color: "var(--grey-800)" }}>{a.patientName}</span>
                    <span className="ml-1.5" style={{ color: "var(--grey-400)" }}>
                      {new Date(a.date).toLocaleDateString("en-SG", { day: "2-digit", month: "short" })} {a.time}
                    </span>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onViewFull}
            className="mt-3 text-[12px] font-semibold"
            style={{ color: "var(--blue-500)" }}
          >
            View Full Detail &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    completed: { bg: "#f0faf4", color: "#2d6a4f" },
    "checked-out": { bg: "#f0faf4", color: "#2d6a4f" },
    scheduled: { bg: "#eff6ff", color: "#2563eb" },
    confirmed: { bg: "#eff6ff", color: "#2563eb" },
    "in-progress": { bg: "#fffbeb", color: "#d97706" },
    cancelled: { bg: "#fef2f2", color: "#dc2626" },
    "no-show": { bg: "#fef2f2", color: "#dc2626" },
  };
  const s = styles[status] || { bg: "var(--grey-100)", color: "var(--grey-600)" };
  return (
    <span
      className="inline-flex px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: s.bg, color: s.color, borderRadius: "var(--radius-pill)" }}
    >
      {status}
    </span>
  );
}
