"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatsCard from "@/components/StatsCard";
import { PageGuide } from "@/components/HelpTip";

interface TodayAppointment {
  id: string;
  time: string;
  type: string;
  status: string;
  doctor: string;
  reason: string | null;
  patient: { firstName: string; lastName: string; patientIdNumber: string } | null;
  doctorRef: { name: string; specialization: string } | null;
  isWalkin?: boolean;
  walkinName?: string | null;
}

interface DashboardData {
  totalPatients: number;
  activePatients: number;
  totalAppointments: number;
  totalCommunications: number;
  totalDoctors: number;
  todaysAppointments: number;
  upcomingAppointments: number;
  recentPatients: Array<{
    id: string;
    patientIdNumber: string;
    firstName: string;
    lastName: string;
    phone: string;
    createdAt: string;
  }>;
  recentCommunications: Array<{
    id: string;
    type: string;
    message: string;
    status: string;
    sentAt: string;
    patient: { firstName: string; lastName: string };
  }>;
  todaysAppointmentsList: TodayAppointment[];
  // Enhanced analytics fields
  todayRevenue: number;
  monthRevenue: number;
  lastMonthRevenue: number;
  weeklyRevenue: Array<{ date: string; revenue: number }>;
  appointmentStatusCounts: Record<string, number>;
  monthlyAppointmentTrend: Array<{ month: string; count: number }>;
  topTreatments: Array<{ name: string; count: number }>;
  revenueByPaymentMethod: Array<{ paymentMethod: string; revenue: number }>;
  // Activity feed
  recentActivityAppointments: Array<{
    id: string;
    date: string;
    time: string;
    type: string;
    status: string;
    doctor: string;
    treatmentName: string | null;
    isWalkin: boolean;
    walkinName: string | null;
    createdAt: string;
    patient: { firstName: string; lastName: string } | null;
    doctorRef: { name: string; specialization: string } | null;
  }>;
  recentActivityInvoices: Array<{
    id: string;
    invoiceNumber: string;
    patientName: string;
    totalAmount: number;
    status: string;
    date: string;
    paymentMethod: string | null;
    patientId: string | null;
  }>;
  upcomingTodayAppointments: Array<{
    id: string;
    date: string;
    time: string;
    type: string;
    status: string;
    doctor: string;
    isWalkin: boolean;
    walkinName: string | null;
    patient: { firstName: string; lastName: string } | null;
    doctorRef: { name: string; specialization: string } | null;
  }>;
}

const statusColors: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: "#fff7ed", color: "#ea580c" },
  confirmed: { bg: "var(--blue-50)", color: "var(--blue-500)" },
  "in-progress": { bg: "#f0faf4", color: "#37845e" },
  completed: { bg: "var(--green-light)", color: "var(--green)" },
  cancelled: { bg: "var(--red-light)", color: "var(--red)" },
  "no-show": { bg: "var(--purple-light)", color: "var(--purple)" },
};

const methodColors: Record<string, string> = {
  cash: "var(--green)",
  card: "var(--blue-500)",
  upi: "var(--purple)",
  insurance: "#ea580c",
  bank_transfer: "#0d9488",
};

const methodLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  insurance: "Insurance",
  bank_transfer: "Bank Transfer",
};

function formatCurrency(amount: number): string {
  return `S$${(amount ?? 0).toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 1000) {
    return `S$${(amount / 1000).toFixed(1)}k`;
  }
  return `S$${amount}`;
}

function getDayAbbr(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-SG", { weekday: "short" });
}

function getMonthAbbr(monthStr: string): string {
  // monthStr could be "2026-01" or "January" etc
  if (monthStr.includes("-")) {
    const d = new Date(monthStr + "-01");
    return d.toLocaleDateString("en-SG", { month: "short" });
  }
  return monthStr.substring(0, 3);
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

/* ─── Card wrapper ─── */
const cardStyle = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredTrendBar, setHoveredTrendBar] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((err) => console.error("Dashboard fetch failed:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="space-y-6">
          <div className="h-7 rounded w-40" style={{ background: "var(--grey-200)" }} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-md animate-pulse" style={{ background: "var(--grey-200)" }} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 rounded-md animate-pulse" style={{ background: "var(--grey-200)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Revenue calculations
  const todayRevenue = data?.todayRevenue ?? 0;
  const monthRevenue = data?.monthRevenue ?? 0;
  const lastMonthRevenue = data?.lastMonthRevenue ?? 0;
  const revenueChange = lastMonthRevenue > 0
    ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
    : 0;

  const weeklyRevenue = data?.weeklyRevenue ?? [];
  const maxWeeklyRevenue = Math.max(...weeklyRevenue.map((d) => d.revenue), 1);

  const statusCounts = data?.appointmentStatusCounts ?? {};
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count })).filter(s => s.count > 0);
  const totalStatusCount = statusBreakdown.reduce((sum, s) => sum + s.count, 0) || 1;

  const topTreatments = (data?.topTreatments ?? []).slice(0, 5);
  const maxTreatmentCount = Math.max(...topTreatments.map((t) => t.count), 1);

  const revenueByMethod = (data?.revenueByPaymentMethod ?? []).map(m => ({ method: m.paymentMethod, total: m.revenue }));
  const maxMethodTotal = Math.max(...revenueByMethod.map((m) => m.total), 1);

  const monthlyTrend = data?.monthlyAppointmentTrend ?? [];
  const maxTrendCount = Math.max(...monthlyTrend.map((m) => m.count), 1);

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Dashboard</h1>
        <p className="text-[15px] mt-1" style={{ color: "var(--grey-600)" }}>Overview of your clinic management system</p>
      </div>

      <PageGuide
        storageKey="dashboard"
        title="Welcome to Your Clinic Dashboard"
        subtitle="Here's a quick overview of how to get started with the system."
        steps={[
          { icon: "👤", title: "Register Patients", description: "Go to Patients > Add Patient to register new patients with their details, medical history, and insurance info." },
          { icon: "📅", title: "Book Appointments", description: "Schedule appointments from the Appointments page. Select a doctor, time slot, and treatment type." },
          { icon: "💊", title: "Manage Inventory", description: "Track medicines, herbs, and supplies in the Inventory section. Set reorder levels for automatic alerts." },
          { icon: "💰", title: "Create Invoices", description: "Go to Billing > New Invoice to bill patients for consultations, treatments, and medicines." },
          { icon: "👨‍⚕️", title: "Add Staff", description: "Set up doctors, therapists, and staff in the Admin section. Each gets a unique Staff ID." },
          { icon: "📊", title: "Track Revenue", description: "This dashboard shows today's revenue, appointment stats, and trends. Data updates in real-time." },
        ]}
      />

      {/* ═══════ Row 1: Key Metrics ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today's Revenue */}
        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Today&apos;s Revenue</p>
              <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{formatCurrency(todayRevenue)}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#d1f2e0", borderRadius: "var(--radius-sm)", color: "#2d6a4f" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {todayRevenue > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <svg className="w-3.5 h-3.5" style={{ color: "var(--green)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="text-[13px] font-semibold" style={{ color: "var(--green)" }}>Active today</span>
            </div>
          )}
        </div>

        {/* Monthly Revenue */}
        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Monthly Revenue</p>
              <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{formatCurrency(monthRevenue)}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#dbeafe", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          {lastMonthRevenue > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <svg
                className="w-3.5 h-3.5"
                style={{ color: revenueChange >= 0 ? "var(--green)" : "var(--red)", transform: revenueChange < 0 ? "rotate(180deg)" : undefined }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="text-[13px] font-semibold" style={{ color: revenueChange >= 0 ? "var(--green)" : "var(--red)" }}>
                {revenueChange >= 0 ? "+" : ""}{revenueChange.toFixed(1)}% vs last month
              </span>
            </div>
          )}
        </div>

        {/* Today's Appointments */}
        <StatsCard
          title="Today's Appts"
          value={data?.todaysAppointments || 0}
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          color="orange"
        />

        {/* Total Patients */}
        <StatsCard
          title="Total Patients"
          value={data?.totalPatients || 0}
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          color="blue"
        />
      </div>

      {/* ═══════ Row 2: Charts ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Weekly Revenue Chart */}
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Revenue (Last 7 Days)</h2>
              <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>Daily revenue overview</p>
            </div>
            <div className="text-right">
              <p className="text-[18px] font-bold" style={{ color: "var(--grey-900)" }}>
                {formatCurrency(weeklyRevenue.reduce((s, d) => s + d.revenue, 0))}
              </p>
              <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>7-day total</p>
            </div>
          </div>
          {weeklyRevenue.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No revenue data available</p>
            </div>
          ) : (
            <div className="relative" style={{ height: 200 }}>
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-24 flex flex-col justify-between" style={{ width: 50 }}>
                <span className="text-[12px]" style={{ color: "var(--grey-500)" }}>{formatCurrencyShort(maxWeeklyRevenue)}</span>
                <span className="text-[12px]" style={{ color: "var(--grey-500)" }}>{formatCurrencyShort(maxWeeklyRevenue / 2)}</span>
                <span className="text-[12px]" style={{ color: "var(--grey-500)" }}>S$0</span>
              </div>
              {/* Bars */}
              <div className="flex items-end gap-2 justify-between" style={{ marginLeft: 55, height: 160 }}>
                {weeklyRevenue.map((day, i) => {
                  const barHeight = maxWeeklyRevenue > 0 ? (day.revenue / maxWeeklyRevenue) * 140 : 0;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center flex-1 relative"
                      onMouseEnter={() => setHoveredBar(i)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Tooltip */}
                      {hoveredBar === i && (
                        <div
                          className="absolute -top-8 px-2 py-1 text-[12px] font-semibold text-white whitespace-nowrap z-10"
                          style={{ background: "var(--grey-900)", borderRadius: "var(--radius-sm)" }}
                        >
                          {formatCurrency(day.revenue)}
                        </div>
                      )}
                      {/* Bar */}
                      <div
                        className="w-full transition-all duration-300 ease-out"
                        style={{
                          height: Math.max(barHeight, 2),
                          background: hoveredBar === i ? "#14532d" : "var(--blue-500)",
                          borderRadius: "4px 4px 0 0",
                          minWidth: 16,
                          maxWidth: 48,
                          opacity: hoveredBar !== null && hoveredBar !== i ? 0.5 : 1,
                          cursor: "pointer",
                        }}
                      />
                      {/* Label */}
                      <span className="text-[12px] mt-2 font-medium" style={{ color: "var(--grey-600)" }}>
                        {getDayAbbr(day.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Appointment Status Breakdown */}
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Appointment Status</h2>
              <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>Today&apos;s breakdown</p>
            </div>
            <span className="text-[24px] font-bold" style={{ color: "var(--grey-900)" }}>{totalStatusCount > 1 ? totalStatusCount : 0}</span>
          </div>
          {statusBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No appointment data</p>
            </div>
          ) : (
            <div>
              {/* Stacked bar */}
              <div className="flex overflow-hidden mb-5" style={{ height: 28, borderRadius: "var(--radius-sm)" }}>
                {statusBreakdown.map((s) => {
                  const sc = statusColors[s.status] || statusColors.scheduled;
                  const pct = (s.count / totalStatusCount) * 100;
                  return (
                    <div
                      key={s.status}
                      className="transition-all duration-300 relative group"
                      style={{
                        width: `${pct}%`,
                        background: sc.color,
                        minWidth: pct > 0 ? 4 : 0,
                      }}
                      title={`${s.status}: ${s.count} (${pct.toFixed(0)}%)`}
                    />
                  );
                })}
              </div>
              {/* Legend */}
              <div className="space-y-2.5">
                {statusBreakdown.map((s) => {
                  const sc = statusColors[s.status] || statusColors.scheduled;
                  const pct = (s.count / totalStatusCount) * 100;
                  return (
                    <div key={s.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: sc.color }} />
                        <span className="text-[14px] font-medium capitalize" style={{ color: "var(--grey-700)" }}>{s.status.replace("-", " ")}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[14px] font-bold tabular-nums" style={{ color: "var(--grey-900)" }}>{s.count}</span>
                        <span className="text-[13px] tabular-nums" style={{ color: "var(--grey-500)", minWidth: 36, textAlign: "right" }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Row 3: Three Columns ═══════ */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        {/* Today's Appointments (existing) */}
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Today&apos;s Appointments</h2>
            <Link href="/appointments" className="text-[14px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>View all</Link>
          </div>
          {!data?.todaysAppointmentsList?.length ? (
            <div className="text-center py-8">
              <svg className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No appointments today</p>
              <Link href="/appointments/new" className="inline-block mt-2 text-[14px] font-semibold" style={{ color: "var(--blue-500)" }}>Book one now</Link>
            </div>
          ) : (
            <div className="space-y-1">
              {data.todaysAppointmentsList.map((apt) => {
                const sc = statusColors[apt.status] || statusColors.scheduled;
                return (
                  <Link
                    key={apt.id}
                    href={`/appointments`}
                    className="flex items-center justify-between py-2.5 px-3 -mx-3 transition-colors duration-100"
                    style={{ borderRadius: "var(--radius-sm)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] font-bold tabular-nums" style={{ color: "var(--blue-500)", minWidth: 48 }}>{apt.time}</span>
                      <div>
                        <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>
                          {apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : (apt.walkinName || "Walk-in")}
                          {apt.isWalkin && <span className="ml-1 text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: "#d1f2e0", color: "#14532d" }}>WALK-IN</span>}
                        </p>
                        <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                          {apt.doctorRef?.name || apt.doctor} &middot; {apt.type}
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-[12px] font-bold uppercase px-2 py-0.5"
                      style={{ background: sc.bg, color: sc.color, borderRadius: "var(--radius-sm)" }}
                    >
                      {apt.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Treatments */}
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Top Treatments</h2>
              <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>This month</p>
            </div>
            <div className="w-9 h-9 flex items-center justify-center" style={{ background: "#d1f2e0", borderRadius: "var(--radius-sm)", color: "#2d6a4f" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          {topTreatments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No treatment data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topTreatments.map((t, i) => {
                const pct = (t.count / maxTreatmentCount) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[14px] font-semibold truncate" style={{ color: "var(--grey-800)", maxWidth: "70%" }}>{t.name}</span>
                      <span className="text-[14px] font-bold tabular-nums" style={{ color: "var(--grey-900)" }}>{t.count}</span>
                    </div>
                    <div className="w-full overflow-hidden" style={{ height: 6, background: "var(--grey-200)", borderRadius: 3 }}>
                      <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{ width: `${pct}%`, background: "var(--blue-500)", borderRadius: 3 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue by Payment Method */}
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Revenue by Method</h2>
              <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>Payment breakdown</p>
            </div>
            <div className="w-9 h-9 flex items-center justify-center" style={{ background: "var(--blue-50)", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          {revenueByMethod.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No payment data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {revenueByMethod.map((m, i) => {
                const pct = (m.total / maxMethodTotal) * 100;
                const color = methodColors[m.method] || "var(--grey-500)";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-[14px] font-semibold" style={{ color: "var(--grey-800)" }}>
                          {methodLabels[m.method] || m.method}
                        </span>
                      </div>
                      <span className="text-[14px] font-bold tabular-nums" style={{ color: "var(--grey-900)" }}>{formatCurrency(m.total)}</span>
                    </div>
                    <div className="w-full overflow-hidden" style={{ height: 6, background: "var(--grey-200)", borderRadius: 3 }}>
                      <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{ width: `${pct}%`, background: color, borderRadius: 3 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Row 4: Monthly Trend + Quick Actions ═══════ */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        {/* Monthly Appointment Trend (spans 2 cols) */}
        <div className="lg:col-span-2 p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Monthly Appointment Trend</h2>
              <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>Last 6 months</p>
            </div>
            <div className="text-right">
              <p className="text-[18px] font-bold" style={{ color: "var(--grey-900)" }}>
                {monthlyTrend.reduce((s, m) => s + m.count, 0)}
              </p>
              <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Total appointments</p>
            </div>
          </div>
          {monthlyTrend.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No trend data available</p>
            </div>
          ) : (
            <div className="relative" style={{ height: 180 }}>
              {/* Y-axis */}
              <div className="absolute left-0 top-0 bottom-24 flex flex-col justify-between" style={{ width: 36 }}>
                <span className="text-[12px]" style={{ color: "var(--grey-500)" }}>{maxTrendCount}</span>
                <span className="text-[12px]" style={{ color: "var(--grey-500)" }}>{Math.round(maxTrendCount / 2)}</span>
                <span className="text-[12px]" style={{ color: "var(--grey-500)" }}>0</span>
              </div>
              {/* Bars */}
              <div className="flex items-end gap-3 justify-between" style={{ marginLeft: 42, height: 150 }}>
                {monthlyTrend.map((m, i) => {
                  const barHeight = maxTrendCount > 0 ? (m.count / maxTrendCount) * 130 : 0;
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center flex-1 relative"
                      onMouseEnter={() => setHoveredTrendBar(i)}
                      onMouseLeave={() => setHoveredTrendBar(null)}
                    >
                      {/* Tooltip */}
                      {hoveredTrendBar === i && (
                        <div
                          className="absolute -top-8 px-2 py-1 text-[12px] font-semibold text-white whitespace-nowrap z-10"
                          style={{ background: "var(--grey-900)", borderRadius: "var(--radius-sm)" }}
                        >
                          {m.count} appointments
                        </div>
                      )}
                      {/* Bar */}
                      <div
                        className="w-full transition-all duration-300 ease-out"
                        style={{
                          height: Math.max(barHeight, 2),
                          background: hoveredTrendBar === i ? "#14532d" : "var(--blue-500)",
                          borderRadius: "4px 4px 0 0",
                          minWidth: 24,
                          maxWidth: 64,
                          opacity: hoveredTrendBar !== null && hoveredTrendBar !== i ? 0.5 : 1,
                          cursor: "pointer",
                        }}
                      />
                      {/* Label */}
                      <span className="text-[12px] mt-2 font-medium" style={{ color: "var(--grey-600)" }}>
                        {getMonthAbbr(m.month)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-5" style={cardStyle}>
          <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Quick Actions</h2>
          <div className="space-y-2.5">
            <Link
              href="/patients/new"
              className="flex items-center gap-3 px-4 py-3 text-[15px] font-semibold text-white transition-all duration-150"
              style={{ background: "var(--blue-500)", borderRadius: "var(--radius)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--blue-600)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--blue-500)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Register Patient
            </Link>
            <Link
              href="/appointments/new"
              className="flex items-center gap-3 px-4 py-3 text-[15px] font-semibold transition-all duration-150"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", color: "var(--grey-700)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--white)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book Appointment
            </Link>
            <Link
              href="/doctors/new"
              className="flex items-center gap-3 px-4 py-3 text-[15px] font-semibold transition-all duration-150"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", color: "var(--grey-700)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--white)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Doctor
            </Link>
            <Link
              href="/communications"
              className="flex items-center gap-3 px-4 py-3 text-[15px] font-semibold transition-all duration-150"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", color: "var(--grey-700)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--white)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Message
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════ Row 5: Recent Patients + Communications ═══════ */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Patients */}
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Recent Patients</h2>
            <Link href="/patients" className="text-[14px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>View all</Link>
          </div>
          {data?.recentPatients.length === 0 ? (
            <p className="text-[15px] text-center py-8" style={{ color: "var(--grey-500)" }}>No patients registered yet</p>
          ) : (
            <div className="space-y-1">
              {data?.recentPatients.map((p) => (
                <Link
                  key={p.id}
                  href={`/patients/${p.id}`}
                  className="flex items-center justify-between py-2.5 px-3 -mx-3 transition-colors duration-100"
                  style={{ borderRadius: "var(--radius-sm)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 flex items-center justify-center text-[13px] font-bold"
                      style={{
                        background: "var(--blue-50)",
                        color: "var(--blue-500)",
                        borderRadius: "var(--radius-pill)",
                      }}
                    >
                      {p.firstName[0]}{p.lastName[0]}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{p.firstName} {p.lastName}</p>
                      <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{p.phone}</p>
                    </div>
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: "var(--grey-500)" }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Communications */}
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Recent Communications</h2>
            <Link href="/communications" className="text-[14px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>View all</Link>
          </div>
          {data?.recentCommunications.length === 0 ? (
            <p className="text-[15px] text-center py-8" style={{ color: "var(--grey-500)" }}>No messages sent yet</p>
          ) : (
            <div className="space-y-1">
              {data?.recentCommunications.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2.5 px-3 -mx-3"
                  style={{ borderRadius: "var(--radius-sm)" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide"
                      style={{
                        borderRadius: "var(--radius-sm)",
                        background: c.type === "whatsapp" ? "var(--green-light)" : "var(--blue-50)",
                        color: c.type === "whatsapp" ? "var(--green)" : "var(--blue-500)",
                      }}
                    >
                      {c.type === "whatsapp" ? "WA" : "EM"}
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{c.patient.firstName} {c.patient.lastName}</p>
                      <p className="text-[13px] truncate max-w-[200px]" style={{ color: "var(--grey-500)" }}>{c.message}</p>
                    </div>
                  </div>
                  <span
                    className="text-[12px] font-bold uppercase"
                    style={{ color: c.status === "sent" ? "var(--green)" : "var(--red)" }}
                  >
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Row 6: Recent Activity Feed + Upcoming Appointments Today ═══════ */}
      <div className="grid lg:grid-cols-3 gap-5 mt-6">
        {/* Recent Activity Feed (spans 2 cols) */}
        <div className="lg:col-span-2 p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 flex items-center justify-center" style={{ background: "#d1f2e0", borderRadius: "var(--radius-sm)", color: "#2d6a4f" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Recent Activity</h2>
                <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>Latest actions across the clinic</p>
              </div>
            </div>
          </div>
          {(() => {
            // Merge appointments and invoices into a single timeline
            const activities: Array<{
              id: string;
              type: "appointment" | "payment";
              description: string;
              detail: string;
              timestamp: string;
              href: string;
              iconBg: string;
              iconColor: string;
            }> = [];

            for (const apt of data?.recentActivityAppointments ?? []) {
              const patientName = apt.patient
                ? `${apt.patient.firstName} ${apt.patient.lastName}`
                : (apt.walkinName || "Walk-in");
              const doctorName = apt.doctorRef?.name || apt.doctor;
              activities.push({
                id: `apt-${apt.id}`,
                type: "appointment",
                description: `${patientName} - ${apt.type} appointment`,
                detail: `With ${doctorName}${apt.treatmentName ? ` \u00b7 ${apt.treatmentName}` : ""}`,
                timestamp: apt.createdAt,
                href: "/appointments",
                iconBg: "#fff7ed",
                iconColor: "#ea580c",
              });
            }

            for (const inv of data?.recentActivityInvoices ?? []) {
              const statusLabel = inv.status === "paid" ? "Payment received" : inv.status === "partially_paid" ? "Partial payment" : `Invoice ${inv.status}`;
              activities.push({
                id: `inv-${inv.id}`,
                type: "payment",
                description: `${statusLabel} - ${inv.patientName}`,
                detail: `${inv.invoiceNumber} \u00b7 ${formatCurrency(inv.totalAmount)}${inv.paymentMethod ? ` \u00b7 ${methodLabels[inv.paymentMethod] || inv.paymentMethod}` : ""}`,
                timestamp: inv.date,
                href: inv.patientId ? `/patients/${inv.patientId}` : "/invoices",
                iconBg: "var(--green-light)",
                iconColor: "var(--green)",
              });
            }

            // Sort by timestamp descending and take 10
            activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const feed = activities.slice(0, 10);

            if (feed.length === 0) {
              return (
                <div className="text-center py-10">
                  <svg className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No recent activity yet</p>
                </div>
              );
            }

            return (
              <div className="relative">
                {/* Timeline line */}
                <div
                  className="absolute top-0 bottom-0"
                  style={{ left: 17, width: 2, background: "var(--grey-200)" }}
                />
                <div className="space-y-0.5">
                  {feed.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex items-start gap-3.5 py-2.5 px-3 -mx-3 relative transition-colors duration-100"
                      style={{ borderRadius: "var(--radius-sm)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* Timeline dot */}
                      <div
                        className="w-[36px] h-[36px] flex items-center justify-center flex-shrink-0 relative z-10"
                        style={{ background: item.iconBg, borderRadius: "var(--radius-sm)", border: "2px solid var(--white)" }}
                      >
                        {item.type === "appointment" ? (
                          <svg className="w-4 h-4" style={{ color: item.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" style={{ color: item.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[15px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>
                          {item.description}
                        </p>
                        <p className="text-[13px] truncate" style={{ color: "var(--grey-500)" }}>
                          {item.detail}
                        </p>
                      </div>
                      {/* Time */}
                      <span className="text-[13px] font-medium flex-shrink-0 pt-0.5" style={{ color: "var(--grey-500)" }}>
                        {timeAgo(item.timestamp)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Upcoming Appointments Today */}
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 flex items-center justify-center" style={{ background: "var(--blue-50)", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Upcoming Today</h2>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>Remaining appointments</p>
              </div>
            </div>
            <Link href="/appointments" className="text-[14px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>View all</Link>
          </div>
          {!data?.upcomingTodayAppointments?.length ? (
            <div className="text-center py-8">
              <svg className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>All caught up for today</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {data.upcomingTodayAppointments.map((apt) => {
                const sc = statusColors[apt.status] || statusColors.scheduled;
                const patientName = apt.patient
                  ? `${apt.patient.firstName} ${apt.patient.lastName}`
                  : (apt.walkinName || "Walk-in");
                const doctorName = apt.doctorRef?.name || apt.doctor;
                return (
                  <div
                    key={apt.id}
                    className="py-2.5 px-3 -mx-3 transition-colors duration-100"
                    style={{ borderRadius: "var(--radius-sm)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[15px] font-semibold truncate" style={{ color: "var(--grey-900)", maxWidth: "60%" }}>
                        {patientName}
                      </span>
                      <span
                        className="text-[12px] font-bold uppercase px-2 py-0.5 flex-shrink-0"
                        style={{ background: sc.bg, color: sc.color, borderRadius: "var(--radius-sm)" }}
                      >
                        {apt.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold tabular-nums" style={{ color: "var(--blue-500)" }}>{apt.time}</span>
                      <span className="text-[13px]" style={{ color: "var(--grey-400)" }}>&middot;</span>
                      <span className="text-[13px] truncate" style={{ color: "var(--grey-500)" }}>{doctorName}</span>
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
