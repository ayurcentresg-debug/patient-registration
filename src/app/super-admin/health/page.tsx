"use client";

import { useEffect, useState } from "react";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";

interface ClinicHealth {
  id: string;
  name: string;
  email: string;
  country: string;
  city: string | null;
  isActive: boolean;
  plan: string;
  planStatus: string;
  trialDaysLeft: number | null;
  healthScore: number;
  status: "healthy" | "warning" | "critical" | "inactive";
  alerts: string[];
  lastLogin: string | null;
  daysSinceLogin: number | null;
  totalUsers: number;
  activeUsers: number;
  usersLoggedInLast7d: number;
  totalPatients: number;
  recentAppointments: number;
  weekAppointments: number;
  userUsagePct: number;
  patientUsagePct: number;
  createdAt: string;
  topUser: { name: string; role: string; lastLogin: string | null } | null;
}

interface Summary {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  inactive: number;
  neverLoggedIn: number;
  noActivityWeek: number;
  approachingLimits: number;
  expiringTrials: number;
}

const STATUS_CONFIG = {
  healthy:  { label: "Healthy",  color: "#059669", bg: "#ecfdf5", ring: "#bbf7d0" },
  warning:  { label: "Warning",  color: "#ea580c", bg: "#fff7ed", ring: "#fed7aa" },
  critical: { label: "Critical", color: "#dc2626", bg: "#fef2f2", ring: "#fecaca" },
  inactive: { label: "Inactive", color: "#6b7280", bg: "#f3f4f6", ring: "#e5e7eb" },
};

const PLAN_COLORS: Record<string, string> = {
  trial: "#059669",
  starter: "#2563eb",
  professional: "#7c3aed",
  enterprise: "#a855f7",
};

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? "#059669" : score >= 40 ? "#ea580c" : "#dc2626";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 100 }}>
      <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 3, transition: "width 0.5s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 28, textAlign: "right" }}>{score}</span>
    </div>
  );
}

export default function HealthPage() {
  const [clinics, setClinics] = useState<ClinicHealth[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "login" | "name">("score");

  useEffect(() => {
    fetch("/api/super-admin/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.clinics) {
          setClinics(data.clinics);
          setSummary(data.summary);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = clinics.filter((c) => {
    if (filter === "all") return true;
    if (filter === "alerts") return c.alerts.length > 0;
    return c.status === filter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "score") return a.healthScore - b.healthScore;
    if (sortBy === "login") return (a.daysSinceLogin ?? 999) - (b.daysSinceLogin ?? 999);
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <SuperAdminSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Analyzing clinic health...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar />

      <div style={{ flex: 1, background: "#f9fafb", overflow: "auto" }}>
        {/* Header */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Clinic Health</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>Monitor activity, usage limits, and engagement across all clinics</p>
        </div>

        <div style={{ padding: "24px 32px" }}>
          {/* Summary Cards */}
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Healthy", value: summary.healthy, color: "#059669", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                { label: "Warning", value: summary.warning, color: "#ea580c", icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" },
                { label: "Critical", value: summary.critical, color: "#dc2626", icon: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" },
                { label: "Never Logged In", value: summary.neverLoggedIn, color: "#7c3aed", icon: "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" },
                { label: "Expiring Trials", value: summary.expiringTrials, color: "#0891b2", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
              ].map((s) => (
                <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: s.color + "10", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                      </svg>
                    </div>
                    <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filter & Sort Bar */}
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "12px 20px",
            marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { key: "all", label: `All (${clinics.length})` },
                { key: "critical", label: `Critical (${summary?.critical || 0})` },
                { key: "warning", label: `Warning (${summary?.warning || 0})` },
                { key: "healthy", label: `Healthy (${summary?.healthy || 0})` },
                { key: "alerts", label: "Has Alerts" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: filter === f.key ? "#14532d" : "#f3f4f6",
                    color: filter === f.key ? "#fff" : "#374151",
                    border: "none",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Sort:</span>
              {[
                { key: "score" as const, label: "Health Score" },
                { key: "login" as const, label: "Last Login" },
                { key: "name" as const, label: "Name" },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key)}
                  style={{
                    padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: sortBy === s.key ? "#e5e7eb" : "transparent",
                    color: "#374151", border: "none",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clinic Health Table */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Status", "Clinic", "Health", "Last Login", "Users", "Patients", "Appts (7d)", "Plan", "Alerts"].map((h) => (
                    <th key={h} style={{
                      padding: "11px 14px", textAlign: "left", fontWeight: 600,
                      color: "#6b7280", fontSize: 11, textTransform: "uppercase",
                      letterSpacing: "0.5px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No clinics match this filter</td></tr>
                ) : sorted.map((c, i) => {
                  const sc = STATUS_CONFIG[c.status];
                  return (
                    <tr key={c.id} style={{ borderBottom: i < sorted.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      {/* Status dot */}
                      <td style={{ padding: "12px 14px", width: 70 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: sc.bg, color: sc.color,
                        }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc.color }} />
                          {sc.label}
                        </span>
                      </td>

                      {/* Clinic name */}
                      <td style={{ padding: "12px 14px" }}>
                        <a href={`/super-admin/clinics/${c.id}`} style={{ fontWeight: 600, color: "#111827", textDecoration: "none", fontSize: 13 }}>
                          {c.name}
                        </a>
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                          {[c.city, c.country].filter(Boolean).join(", ")}
                        </div>
                      </td>

                      {/* Health bar */}
                      <td style={{ padding: "12px 14px", minWidth: 120 }}>
                        <HealthBar score={c.healthScore} />
                      </td>

                      {/* Last login */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        {c.lastLogin ? (
                          <div>
                            <div style={{
                              fontSize: 13, fontWeight: 600,
                              color: c.daysSinceLogin !== null && c.daysSinceLogin > 7 ? "#dc2626" : c.daysSinceLogin !== null && c.daysSinceLogin > 3 ? "#ea580c" : "#111827",
                            }}>
                              {c.daysSinceLogin === 0 ? "Today" : c.daysSinceLogin === 1 ? "Yesterday" : `${c.daysSinceLogin}d ago`}
                            </div>
                            {c.topUser && (
                              <div style={{ fontSize: 11, color: "#9ca3af" }}>{c.topUser.name}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>Never</span>
                        )}
                      </td>

                      {/* Users */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.activeUsers}/{c.totalUsers}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{c.usersLoggedInLast7d} active 7d</div>
                      </td>

                      {/* Patients */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.totalPatients}</div>
                        {c.patientUsagePct >= 80 && (
                          <div style={{ fontSize: 11, color: "#ea580c", fontWeight: 600 }}>{c.patientUsagePct}% limit</div>
                        )}
                      </td>

                      {/* Appointments 7d */}
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          fontSize: 13, fontWeight: 600,
                          color: c.recentAppointments > 0 ? "#059669" : "#dc2626",
                        }}>
                          {c.recentAppointments}
                        </span>
                      </td>

                      {/* Plan */}
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: (PLAN_COLORS[c.plan] || "#6b7280") + "15",
                          color: PLAN_COLORS[c.plan] || "#6b7280",
                          textTransform: "capitalize",
                        }}>
                          {c.plan}
                        </span>
                        {c.trialDaysLeft !== null && c.plan === "trial" && (
                          <div style={{
                            fontSize: 11, marginTop: 2, fontWeight: 600,
                            color: c.trialDaysLeft <= 0 ? "#dc2626" : c.trialDaysLeft <= 3 ? "#ea580c" : "#6b7280",
                          }}>
                            {c.trialDaysLeft <= 0 ? "Expired" : `${c.trialDaysLeft}d left`}
                          </div>
                        )}
                      </td>

                      {/* Alerts */}
                      <td style={{ padding: "12px 14px", maxWidth: 200 }}>
                        {c.alerts.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {c.alerts.slice(0, 3).map((a, j) => (
                              <span key={j} style={{
                                padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                                background: "#fef2f2", color: "#dc2626", whiteSpace: "nowrap",
                              }}>
                                {a}
                              </span>
                            ))}
                            {c.alerts.length > 3 && (
                              <span style={{ fontSize: 10, color: "#9ca3af" }}>+{c.alerts.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "#bbf7d0" }}>--</span>
                        )}
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
  );
}
