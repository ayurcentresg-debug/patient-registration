"use client";

import { useEffect, useState } from "react";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";

interface Stats {
  totalClinics: number;
  activeTrials: number;
  expiredTrials: number;
  totalUsers: number;
  totalPatients: number;
}

interface RecentClinic {
  id: string;
  name: string;
  email: string;
  country: string;
  city: string | null;
  createdAt: string;
  plan: string;
  status: string;
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: "1px solid #f3f4f6",
        flex: "1 1 200px",
        minWidth: 180,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: color + "15",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentClinic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.stats) {
          setStats(data.stats);
          setRecent(data.recentRegistrations || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <SuperAdminSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar />

      <div style={{ flex: 1, background: "#f9fafb", overflow: "auto" }}>
        {/* Header */}
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
            AYUR GATE Platform Overview
          </p>
        </div>

        <div style={{ padding: "24px 32px" }}>
          {/* Stats Row */}
          <div
            style={{
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              marginBottom: 32,
            }}
          >
            <StatCard
              label="Total Clinics"
              value={stats?.totalClinics || 0}
              color="#2d6a4f"
              icon="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
            />
            <StatCard
              label="Active Trials"
              value={stats?.activeTrials || 0}
              color="#059669"
              icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <StatCard
              label="Expired Trials"
              value={stats?.expiredTrials || 0}
              color="#dc2626"
              icon="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
            <StatCard
              label="Total Users"
              value={stats?.totalUsers || 0}
              color="#7c3aed"
              icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
            <StatCard
              label="Total Patients"
              value={stats?.totalPatients || 0}
              color="#0891b2"
              icon="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </div>

          {/* Recent Registrations */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid #f3f4f6",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: 0 }}>
                Recent Registrations
              </h2>
              <a
                href="/super-admin/clinics"
                style={{
                  fontSize: 13,
                  color: "#2d6a4f",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View All &rarr;
              </a>
            </div>

            {recent.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                No clinics registered yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Clinic", "Email", "Location", "Plan", "Status", "Registered"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: 600,
                            color: "#6b7280",
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((c) => (
                      <tr
                        key={c.id}
                        style={{ borderBottom: "1px solid #f3f4f6" }}
                      >
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: "#111827" }}>
                          {c.name}
                        </td>
                        <td style={{ padding: "14px 16px", color: "#6b7280" }}>{c.email}</td>
                        <td style={{ padding: "14px 16px", color: "#6b7280" }}>
                          {[c.city, c.country].filter(Boolean).join(", ") || "-"}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              background: c.plan === "trial" ? "#ecfdf5" : "var(--blue-50)",
                              color: c.plan === "trial" ? "#059669" : "var(--blue-600)",
                            }}
                          >
                            {c.plan}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              background: c.status === "active" ? "#ecfdf5" : "#fef2f2",
                              color: c.status === "active" ? "#059669" : "#dc2626",
                            }}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>
                          {new Date(c.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
