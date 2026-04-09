"use client";

import { useEffect, useState } from "react";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";
import { CLINIC_TYPES } from "@/lib/country-data";

interface DashboardData {
  stats: {
    totalClinics: number;
    activeTrials: number;
    expiredTrials: number;
    totalUsers: number;
    totalPatients: number;
    totalAppointments: number;
    todayAppointments: number;
    paidPlans: number;
    suspended: number;
  };
  growth: {
    clinicsThisMonth: number;
    clinicsLastMonth: number;
    patientsThisMonth: number;
    patientsLastMonth: number;
    appointmentsThisMonth: number;
    appointmentsLastMonth: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
  };
  planBreakdown: Record<string, number>;
  conversionRate: number;
  expiringSoon: number;
  monthlySignups: { month: string; count: number }[];
  recentActivity: {
    id: string;
    name: string;
    email: string;
    plan: string;
    status: string;
    daysLeft: number | null;
    createdAt: string;
    timeAgo: string;
  }[];
  recentRegistrations: {
    id: string;
    name: string;
    email: string;
    country: string;
    city: string | null;
    clinicType: string | null;
    practitionerCount: string | null;
    createdAt: string;
    plan: string;
    status: string;
  }[];
  whatsapp?: { totalMessages: number; todayMessages: number };
  roleBreakdown?: Record<string, number>;
}

const PLAN_BADGE: Record<string, { bg: string; color: string }> = {
  trial: { bg: "#ecfdf5", color: "#059669" },
  starter: { bg: "#eff6ff", color: "#2563eb" },
  professional: { bg: "#f5f3ff", color: "#7c3aed" },
  enterprise: { bg: "#fdf4ff", color: "#a855f7" },
  none: { bg: "#f3f4f6", color: "#6b7280" },
};

function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const pct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  const isUp = pct >= 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 2,
      fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
      background: isUp ? "#ecfdf5" : "#fef2f2",
      color: isUp ? "#059669" : "#dc2626",
    }}>
      {isUp ? "+" : ""}{pct}%
    </span>
  );
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/stats")
      .then((r) => r.json())
      .then((d) => { if (d.stats) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <SuperAdminSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  const { stats, growth, planBreakdown, conversionRate, expiringSoon, monthlySignups, recentActivity, recentRegistrations } = data;
  const maxSignup = Math.max(...monthlySignups.map((m) => m.count), 1);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar />

      <div style={{ flex: 1, background: "#f9fafb", overflow: "auto" }}>
        {/* Header */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Dashboard</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>AyurGate Platform Overview</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {expiringSoon > 0 && (
              <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa" }}>
                {expiringSoon} trial{expiringSoon > 1 ? "s" : ""} expiring in 3 days
              </span>
            )}
            <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#f3f4f6", color: "#374151" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        <div style={{ padding: "24px 32px" }}>
          {/* ── Top Stats Row ─────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total Clinics", value: stats.totalClinics, growth: [growth.clinicsThisMonth, growth.clinicsLastMonth], color: "#14532d", icon: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" },
              { label: "Total Patients", value: stats.totalPatients, growth: [growth.patientsThisMonth, growth.patientsLastMonth], color: "#7c3aed", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
              { label: "Appointments", value: stats.totalAppointments, growth: [growth.appointmentsThisMonth, growth.appointmentsLastMonth], color: "#ea580c", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" },
              { label: "Total Users", value: stats.totalUsers, color: "#2563eb", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" },
              { label: "Today Appts", value: stats.todayAppointments, color: "#0891b2", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color + "10", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                    </svg>
                  </div>
                  {s.growth && <GrowthBadge current={s.growth[0]} previous={s.growth[1]} />}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{s.value.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Row 2: Plan Breakdown + Revenue + Signup Chart ─── */}
          <div style={{ display: "grid", gridTemplateColumns: "280px 280px 1fr", gap: 16, marginBottom: 24 }}>

            {/* Plan Breakdown Card */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Plans</h3>
                <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>{conversionRate}% converted</span>
              </div>
              <div style={{ padding: "12px 20px" }}>
                {Object.entries(planBreakdown).map(([plan, count]) => {
                  const total = stats.totalClinics || 1;
                  const pct = Math.round((count / total) * 100);
                  const colors: Record<string, string> = { trial: "#059669", starter: "#2563eb", professional: "#7c3aed", enterprise: "#a855f7" };
                  return (
                    <div key={plan} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: "#374151", fontWeight: 500, textTransform: "capitalize" }}>{plan}</span>
                        <span style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>{count} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: colors[plan] || "#6b7280", borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Active Trials</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>{stats.activeTrials}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Expired Trials</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>{stats.expiredTrials}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Suspended</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#ea580c" }}>{stats.suspended}</span>
                </div>
              </div>
            </div>

            {/* Revenue Card */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Revenue</h3>
              </div>
              <div style={{ padding: "20px" }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>This Month</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>${growth.revenueThisMonth.toLocaleString()}</span>
                    <GrowthBadge current={growth.revenueThisMonth} previous={growth.revenueLastMonth} />
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Last Month</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#6b7280" }}>${growth.revenueLastMonth.toLocaleString()}</div>
                </div>
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16, marginTop: 16 }}>
                  {[
                    { label: "Patients (MTD)", cur: growth.patientsThisMonth, prev: growth.patientsLastMonth },
                    { label: "Appointments (MTD)", cur: growth.appointmentsThisMonth, prev: growth.appointmentsLastMonth },
                  ].map((m) => (
                    <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{m.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{m.cur}</span>
                        <GrowthBadge current={m.cur} previous={m.prev} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Monthly Signups Chart */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Clinic Signups</h3>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Last 6 months</span>
              </div>
              <div style={{ padding: "20px", display: "flex", alignItems: "flex-end", gap: 8, height: 200 }}>
                {monthlySignups.map((m, i) => {
                  const barH = Math.max((m.count / maxSignup) * 140, 4);
                  const isLatest = i === monthlySignups.length - 1;
                  return (
                    <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{m.count}</span>
                      <div style={{
                        width: "100%", maxWidth: 48, height: barH, borderRadius: "6px 6px 2px 2px",
                        background: isLatest ? "linear-gradient(180deg, #14532d, #2d6a4f)" : "#e5e7eb",
                        transition: "height 0.5s",
                      }} />
                      <span style={{ fontSize: 11, color: isLatest ? "#14532d" : "#9ca3af", fontWeight: isLatest ? 600 : 400 }}>{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Row 2.5: WhatsApp + Staff Role Breakdown ───────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            {/* WhatsApp Summary */}
            <a href="/super-admin/whatsapp" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, transition: "box-shadow 0.2s", cursor: "pointer" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>WhatsApp Messaging</div>
                  <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                    <span style={{ color: "#6b7280" }}>Total: <strong style={{ color: "#111827" }}>{(data.whatsapp?.totalMessages ?? 0).toLocaleString()}</strong></span>
                    <span style={{ color: "#6b7280" }}>Today: <strong style={{ color: "#059669" }}>{(data.whatsapp?.todayMessages ?? 0).toLocaleString()}</strong></span>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </a>

            {/* Staff Role Breakdown */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "20px 24px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Staff by Role</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {(() => {
                  const rb = data.roleBreakdown || {};
                  const roleColors: Record<string, string> = {
                    admin: "#7c3aed", doctor: "#059669", therapist: "#0891b2",
                    pharmacist: "#ea580c", receptionist: "#2563eb", staff: "#6b7280",
                  };
                  const roles = ["admin", "doctor", "therapist", "pharmacist", "receptionist", "staff"];
                  return roles.filter((r) => (rb[r] || 0) > 0).map((r) => (
                    <div key={r} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 12px", borderRadius: 8,
                      background: (roleColors[r] || "#6b7280") + "10",
                    }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: roleColors[r] || "#6b7280" }}>{rb[r]}</span>
                      <span style={{ fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>{r}s</span>
                    </div>
                  ));
                })()}
                {(!data.roleBreakdown || Object.keys(data.roleBreakdown).length === 0) && (
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>No staff data</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Row 3: Recent Activity + Recent Registrations ─── */}
          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>

            {/* Recent Activity Feed */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Recent Activity</h3>
              </div>
              <div style={{ maxHeight: 380, overflow: "auto" }}>
                {recentActivity.map((a, i) => {
                  const badge = PLAN_BADGE[a.plan] || PLAN_BADGE.none;
                  return (
                    <div key={a.id} style={{
                      padding: "12px 20px", borderBottom: i < recentActivity.length - 1 ? "1px solid #f3f4f6" : "none",
                      display: "flex", alignItems: "flex-start", gap: 12,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                        background: "linear-gradient(135deg, #14532d, #2d6a4f)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 13, fontWeight: 700,
                      }}>
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <a href={`/super-admin/clinics/${a.id}`} style={{ fontSize: 13, fontWeight: 600, color: "#111827", textDecoration: "none" }}>
                          {a.name}
                        </a>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{
                            padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                            background: badge.bg, color: badge.color,
                          }}>
                            {a.plan}
                          </span>
                          {a.daysLeft !== null && a.plan === "trial" && (
                            <span style={{
                              fontSize: 11, fontWeight: 600,
                              color: a.daysLeft <= 0 ? "#dc2626" : a.daysLeft <= 3 ? "#ea580c" : "#059669",
                            }}>
                              {a.daysLeft <= 0 ? "expired" : `${a.daysLeft}d left`}
                            </span>
                          )}
                          <span style={{ color: "#d1d5db" }}>|</span>
                          <span>{a.timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Registrations Table */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Recent Registrations</h3>
                <a href="/super-admin/clinics" style={{ fontSize: 12, color: "#14532d", fontWeight: 600, textDecoration: "none" }}>View All &rarr;</a>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Clinic", "Email", "Location", "Plan", "Status", "Date"].map((h) => (
                        <th key={h} style={{
                          padding: "10px 16px", textAlign: "left", fontWeight: 600,
                          color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px",
                          whiteSpace: "nowrap", borderBottom: "1px solid #e5e7eb",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentRegistrations.map((c, i) => {
                      const badge = PLAN_BADGE[c.plan] || PLAN_BADGE.none;
                      return (
                        <tr key={c.id} style={{ borderBottom: i < recentRegistrations.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                          <td style={{ padding: "11px 16px" }}>
                            <a href={`/super-admin/clinics/${c.id}`} style={{ fontWeight: 600, color: "#111827", textDecoration: "none" }}>{c.name}</a>
                            {c.clinicType && (
                              <span style={{
                                display: "inline-block", marginLeft: 6, padding: "1px 7px", borderRadius: 10,
                                fontSize: 10, fontWeight: 600, background: "#f0fdf4", color: "#14532d",
                                verticalAlign: "middle",
                              }}>
                                {CLINIC_TYPES.find(t => t.value === c.clinicType)?.label?.replace(" Clinic", "").replace(" Centre", "").replace(" Therapy", "") || c.clinicType}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "11px 16px", color: "#6b7280" }}>{c.email}</td>
                          <td style={{ padding: "11px 16px", color: "#6b7280" }}>{[c.city, c.country].filter(Boolean).join(", ") || "-"}</td>
                          <td style={{ padding: "11px 16px" }}>
                            <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>{c.plan}</span>
                          </td>
                          <td style={{ padding: "11px 16px" }}>
                            <span style={{
                              padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                              background: c.status === "active" ? "#ecfdf5" : "#fef2f2",
                              color: c.status === "active" ? "#059669" : "#dc2626",
                            }}>{c.status}</span>
                          </td>
                          <td style={{ padding: "11px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>
                            {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
