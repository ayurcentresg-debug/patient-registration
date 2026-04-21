"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatsCard from "@/components/StatsCard";
import { useAuth } from "@/components/AuthProvider";
import dynamic from "next/dynamic";

const WeeklyRevenueChart = dynamic(() => import("@/components/DashboardCharts").then(m => m.WeeklyRevenueChart), { ssr: false });
const AppointmentStatusChart = dynamic(() => import("@/components/DashboardCharts").then(m => m.AppointmentStatusChart), { ssr: false });
const MonthlyTrendChart = dynamic(() => import("@/components/DashboardCharts").then(m => m.MonthlyTrendChart), { ssr: false });
const RevenueByMethodChart = dynamic(() => import("@/components/DashboardCharts").then(m => m.RevenueByMethodChart), { ssr: false });
const TopTreatmentsChart = dynamic(() => import("@/components/DashboardCharts").then(m => m.TopTreatmentsChart), { ssr: false });
import { DashboardSkeleton } from "@/components/Skeleton";
import { cardStyle } from "@/lib/styles";
import { formatCurrency, timeAgo } from "@/lib/formatters";

interface SetupStep {
  key: string;
  title: string;
  description: string;
  link: string;
  completed: boolean;
}

interface SetupChecklist {
  steps: SetupStep[];
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
}

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

const methodLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  insurance: "Insurance",
  bank_transfer: "Bank Transfer",
};

/* Role helpers */
const ADMIN_ROLES = ["admin", "receptionist", "staff"];
const CLINICAL_ROLES = ["doctor", "therapist"];
const ROLE_GREETINGS: Record<string, string> = {
  admin: "Clinic Overview",
  receptionist: "Front Desk",
  doctor: "Doctor Dashboard",
  therapist: "Therapist Dashboard",
  pharmacist: "Pharmacy Dashboard",
  staff: "Dashboard",
};
const ROLE_SUBTITLES: Record<string, string> = {
  admin: "Overview of your clinic management system",
  receptionist: "Today's appointments, walk-ins, and patient queue",
  doctor: "Your schedule, patients, and consultations",
  therapist: "Your schedule, patients, and therapy sessions",
  pharmacist: "Inventory, prescriptions, and stock alerts",
  staff: "Quick actions and today's activity",
};

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || "admin";
  const isAdmin = ADMIN_ROLES.includes(role) || role === "admin";
  const isClinical = CLINICAL_ROLES.includes(role);
  const isPharmacist = role === "pharmacist";
  // Show revenue/charts only for admin
  const showRevenue = role === "admin";
  // Show appointments for everyone except pharmacist
  const showAppointments = !isPharmacist;
  // Show inventory for admin and pharmacist
  const showInventory = isAdmin || isPharmacist;
  // Show staff summary only for admin
  const showStaffSummary = role === "admin";
  // Show quick actions for receptionist and staff
  const showQuickActions = ["receptionist", "staff"].includes(role) || isClinical;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryStats, setInventoryStats] = useState<{
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    expiringSoonCount: number;
  } | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string; code: string; isMainBranch: boolean }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [staffSummary, setStaffSummary] = useState<{
    availableCount: number;
    onLeaveCount: number;
    onLeaveNames: string[];
    topPerformer: { name: string; appointments: number; revenue: number } | null;
    isClinicHoliday: boolean;
  } | null>(null);

  const [setupChecklist, setSetupChecklist] = useState<SetupChecklist | null>(null);
  const [checklistDismissed, setChecklistDismissed] = useState(false);

  // Fetch setup checklist
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("setup-checklist-dismissed") === "true") {
      setChecklistDismissed(true);
    }
    fetch("/api/dashboard/setup-checklist")
      .then((r) => r.ok ? r.json() : null)
      .then(setSetupChecklist)
      .catch(() => {});
  }, []);

  // Fetch staff summary
  useEffect(() => {
    fetch("/api/dashboard/staff-summary")
      .then((r) => r.ok ? r.json() : null)
      .then(setStaffSummary)
      .catch(() => {});
  }, []);

  // Fetch branches once
  useEffect(() => {
    fetch("/api/branches?active=true")
      .then((r) => r.ok ? r.json() : [])
      .then((list: { id: string; name: string; code: string; isMainBranch: boolean }[]) => {
        setBranches(list);
        const main = list.find((b) => b.isMainBranch);
        if (main) setSelectedBranchId(main.id);
      })
      .catch(() => {});
  }, []);

  // Fetch inventory stats when branch changes
  useEffect(() => {
    const url = selectedBranchId
      ? `/api/inventory/stats?branchId=${selectedBranchId}`
      : "/api/inventory/stats";
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      })
      .then(setInventoryStats)
      .catch(() => {});
  }, [selectedBranchId]);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load dashboard (${r.status})`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block p-6 rounded-xl bg-red-50 border border-red-200">
          <p className="text-red-700 font-medium mb-2">Something went wrong</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
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

  const statusCounts = data?.appointmentStatusCounts ?? {};
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count })).filter(s => s.count > 0);
  const totalStatusCount = statusBreakdown.reduce((sum, s) => sum + s.count, 0) || 1;

  const topTreatments = (data?.topTreatments ?? []).slice(0, 5);

  const revenueByMethod = (data?.revenueByPaymentMethod ?? []).map(m => ({ method: m.paymentMethod, total: m.revenue }));

  const monthlyTrend = data?.monthlyAppointmentTrend ?? [];

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
            {user?.name ? `Hi, ${user.name.split(" ")[0]}` : ROLE_GREETINGS[role] || "Dashboard"}
          </h1>
          <p className="text-[15px] mt-1" style={{ color: "var(--grey-600)" }}>
            {ROLE_SUBTITLES[role] || "Overview of your clinic management system"}
          </p>
        </div>
        <span className="hidden sm:inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ background: "#f0fdf4", color: "#2d6a4f", border: "1px solid #d1fae5" }}>
          {role}
        </span>
      </div>

      {/* ═══ Quick Actions (Receptionist / Clinical / Staff) ═══ */}
      {showQuickActions && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {!isPharmacist && (
            <Link href="/appointments/new" className="flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-md" style={{ background: "white", border: "1.5px solid #e5e7eb" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#eff6ff" }}>
                <svg className="w-4 h-4" fill="none" stroke="#2563eb" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "#111827" }}>Book Appointment</p>
                <p className="text-[11px]" style={{ color: "#9ca3af" }}>Schedule now</p>
              </div>
            </Link>
          )}
          {!isClinical && (
            <Link href="/patients/new" className="flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-md" style={{ background: "white", border: "1.5px solid #e5e7eb" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#f0fdf4" }}>
                <svg className="w-4 h-4" fill="none" stroke="#2d6a4f" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "#111827" }}>Register Patient</p>
                <p className="text-[11px]" style={{ color: "#9ca3af" }}>Add new</p>
              </div>
            </Link>
          )}
          {isClinical && (
            <Link href="/doctor" className="flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-md" style={{ background: "white", border: "1.5px solid #e5e7eb" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#fef3c7" }}>
                <svg className="w-4 h-4" fill="none" stroke="#d97706" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "#111827" }}>My Portal</p>
                <p className="text-[11px]" style={{ color: "#9ca3af" }}>Consult patients</p>
              </div>
            </Link>
          )}
          {isPharmacist && (
            <Link href="/inventory" className="flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-md" style={{ background: "white", border: "1.5px solid #e5e7eb" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#fff7ed" }}>
                <svg className="w-4 h-4" fill="none" stroke="#ea580c" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "#111827" }}>Inventory</p>
                <p className="text-[11px]" style={{ color: "#9ca3af" }}>Manage stock</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ═══════ Setup Checklist ═══════ */}
      {setupChecklist && !setupChecklist.allComplete && !checklistDismissed && (
        <div className="mb-6 p-5 rounded-xl" style={{ background: "#fff", border: "1.5px solid #d1fae5", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[16px] font-bold" style={{ color: "#14532d" }}>Setup Your Clinic</h3>
              <p className="text-[13px] mt-0.5" style={{ color: "#6b7280" }}>
                {setupChecklist.completedCount} of {setupChecklist.totalCount} steps complete
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 rounded-full" style={{ background: "#e5e7eb" }}>
                <div className="h-2 rounded-full transition-all duration-500" style={{ background: "#14532d", width: `${(setupChecklist.completedCount / setupChecklist.totalCount) * 100}%` }} />
              </div>
              <button
                onClick={() => { setChecklistDismissed(true); localStorage.setItem("setup-checklist-dismissed", "true"); }}
                className="text-[12px] px-2 py-1 rounded hover:bg-gray-100"
                style={{ color: "#9ca3af" }}
                title="Dismiss checklist"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {setupChecklist.steps.map((step) => (
              <Link
                key={step.key}
                href={step.link}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:shadow-sm"
                style={{
                  background: step.completed ? "#f0fdf4" : "#fafafa",
                  border: `1px solid ${step.completed ? "#bbf7d0" : "#e5e7eb"}`,
                }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: step.completed ? "#14532d" : "#e5e7eb",
                    color: step.completed ? "#fff" : "#9ca3af",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {step.completed ? "\u2713" : ""}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: step.completed ? "#166534" : "#374151" }}>{step.title}</div>
                  <div className="text-[11px] truncate" style={{ color: step.completed ? "#4ade80" : "#9ca3af" }}>{step.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ Row 1: Key Metrics (Admin only) ═══════ */}
      {showRevenue && (<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "var(--blue-100)", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
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
      </div>)}

      {/* ═══════ Staff Today (Admin only) ═══════ */}
      {showStaffSummary && staffSummary && (
        <div className="mb-6 p-4 flex items-center gap-4 flex-wrap" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex items-center justify-center" style={{ background: "#d1f2e0", borderRadius: "var(--radius-sm)", color: "#2d6a4f" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>Staff Today</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap flex-1">
            <span className="text-[14px] font-semibold" style={{ color: "#2d6a4f" }}>
              {staffSummary.availableCount} available
            </span>
            {staffSummary.onLeaveCount > 0 && (
              <span className="text-[14px] font-semibold px-2 py-0.5 rounded" style={{ background: "#fff7ed", color: "#ea580c" }} title={staffSummary.onLeaveNames.join(", ")}>
                {staffSummary.onLeaveCount} on leave
                {staffSummary.onLeaveNames.length > 0 && (
                  <span className="text-[12px] font-medium ml-1" style={{ color: "#9a3412" }}>
                    ({staffSummary.onLeaveNames.slice(0, 2).join(", ")}{staffSummary.onLeaveNames.length > 2 ? ` +${staffSummary.onLeaveNames.length - 2}` : ""})
                  </span>
                )}
              </span>
            )}
            {staffSummary.isClinicHoliday && (
              <span className="text-[14px] font-bold px-2 py-0.5 rounded" style={{ background: "#fef2f2", color: "#dc2626" }}>
                Clinic Holiday
              </span>
            )}
            {staffSummary.topPerformer && (
              <span className="ml-auto text-[13px] font-medium" style={{ color: "var(--grey-600)" }}>
                Top: <strong style={{ color: "var(--grey-900)" }}>{staffSummary.topPerformer.name}</strong>
                <span className="ml-1 text-[12px] px-1.5 py-0.5 rounded" style={{ background: "#d1f2e0", color: "#14532d" }}>
                  {staffSummary.topPerformer.appointments} appts
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ═══════ Inventory Overview (Admin + Pharmacist) ═══════ */}
      {showInventory && (<div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Inventory Overview</h2>
          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-2.5 py-1.5 text-[13px] font-medium rounded-md"
              style={{ border: "1px solid var(--grey-300)", color: "var(--grey-700)", background: "var(--white)" }}
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/inventory" className="block">
            <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Total Items</p>
                  <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{inventoryStats?.totalItems ?? 0}</p>
                </div>
                <div className="w-11 h-11 flex items-center justify-center" style={{ background: "var(--blue-50)", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/inventory" className="block">
            <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Stock Value</p>
                  <p className="text-[18px] md:text-[28px] font-bold mt-1 tracking-tight truncate" style={{ color: "var(--grey-900)" }}>{formatCurrency(inventoryStats?.totalValue ?? 0)}</p>
                </div>
                <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#d1f2e0", borderRadius: "var(--radius-sm)", color: "#2d6a4f" }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/inventory/alerts" className="block">
            <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)", borderColor: (inventoryStats?.lowStockCount ?? 0) > 0 ? "var(--red)" : undefined }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: (inventoryStats?.lowStockCount ?? 0) > 0 ? "var(--red)" : "var(--grey-600)" }}>Low Stock</p>
                  <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: (inventoryStats?.lowStockCount ?? 0) > 0 ? "var(--red)" : "var(--grey-900)" }}>{inventoryStats?.lowStockCount ?? 0}</p>
                </div>
                <div className="w-11 h-11 flex items-center justify-center" style={{ background: (inventoryStats?.lowStockCount ?? 0) > 0 ? "var(--red-light)" : "var(--orange-light)", borderRadius: "var(--radius-sm)", color: (inventoryStats?.lowStockCount ?? 0) > 0 ? "var(--red)" : "var(--orange)" }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/inventory/alerts" className="block">
            <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)", borderColor: (inventoryStats?.expiringSoonCount ?? 0) > 0 ? "#ea580c" : undefined }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: (inventoryStats?.expiringSoonCount ?? 0) > 0 ? "#ea580c" : "var(--grey-600)" }}>Expiring Soon</p>
                  <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: (inventoryStats?.expiringSoonCount ?? 0) > 0 ? "#ea580c" : "var(--grey-900)" }}>{inventoryStats?.expiringSoonCount ?? 0}</p>
                </div>
                <div className="w-11 h-11 flex items-center justify-center" style={{ background: (inventoryStats?.expiringSoonCount ?? 0) > 0 ? "#fff7ed" : "var(--grey-100)", borderRadius: "var(--radius-sm)", color: (inventoryStats?.expiringSoonCount ?? 0) > 0 ? "#ea580c" : "var(--grey-500)" }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>)}

      {/* ═══════ Row 2: Charts (Admin only) ═══════ */}
      {showRevenue && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div className="min-w-0 overflow-hidden"><WeeklyRevenueChart data={weeklyRevenue} /></div>
          <div className="min-w-0 overflow-hidden"><AppointmentStatusChart data={statusBreakdown} total={totalStatusCount} /></div>
        </div>
      )}

      {/* ═══════ Row 3: Three Columns (Admin only) ═══════ */}
      {showRevenue && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
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
        <TopTreatmentsChart data={topTreatments} />

        {/* Revenue by Payment Method */}
        <RevenueByMethodChart data={revenueByMethod} />
      </div>)}

      {/* ═══════ Row 4: Monthly Trend + Quick Actions (Admin only) ═══════ */}
      {showRevenue && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {/* Monthly Appointment Trend (spans 2 cols) */}
        <MonthlyTrendChart data={monthlyTrend} />

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
      </div>)}

      {/* ═══════ Row 5: Recent Patients + Communications ═══════ */}
      {isAdmin && (<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
      )}

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
