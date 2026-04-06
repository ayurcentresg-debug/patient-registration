"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

const cardStyle = { background: "var(--white, #fff)", border: "1px solid var(--grey-300, #d6d3d1)", borderRadius: "var(--radius, 10px)", boxShadow: "var(--shadow-card, 0 1px 3px rgba(0,0,0,0.06))" };

interface DashboardData {
  doctorName: string;
  today: string;
  stats: { todayTotal: number; todayCompleted: number; todayPending: number; monthAppointments: number; monthPrescriptions: number; monthPatients: number };
  todayAppointments: Array<{ id: string; time: string; status: string; reason: string | null; department: string | null; patient: { firstName: string; lastName: string; patientIdNumber: string; phone: string; photoUrl: string | null } }>;
  upcomingAppointments: Array<{ id: string; date: string; time: string; status: string; reason: string | null; patient: { firstName: string; lastName: string; patientIdNumber: string; phone: string } }>;
  recentPrescriptions: Array<{ id: string; prescriptionNo: string; date: string; status: string; patient: { firstName: string; lastName: string; patientIdNumber: string }; medicines: string[] }>;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}
function formatDay(d: string) {
  return new Date(d).toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short" });
}

export default function DoctorPortal() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "upcoming" | "prescriptions">("today");
  const [lowStockItems, setLowStockItems] = useState<Array<{ name: string; quantity: number; unit: string; reorderLevel: number }>>([]);
  const [showStock, setShowStock] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const r = await fetch("/api/doctor/dashboard");
      if (r.ok) setData(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Fetch low stock items for main branch
  useEffect(() => {
    async function fetchLowStock() {
      try {
        const branchRes = await fetch("/api/branches?active=true");
        if (!branchRes.ok) return;
        const branches = await branchRes.json();
        const main = branches.find((b: { isMainBranch: boolean }) => b.isMainBranch) || branches[0];
        if (!main) return;

        const stockRes = await fetch(`/api/branches/stock?branchId=${main.id}`);
        if (!stockRes.ok) return;
        const stockData = await stockRes.json();

        // Get reorder levels
        const invRes = await fetch("/api/inventory?status=active");
        if (!invRes.ok) return;
        const items = await invRes.json();
        const reorderMap = new Map<string, { reorderLevel: number; unit: string }>();
        for (const item of (Array.isArray(items) ? items : [])) {
          reorderMap.set(item.id, { reorderLevel: item.reorderLevel || 0, unit: item.unit || "nos" });
        }

        const low = stockData
          .filter((s: { itemId: string; quantity: number }) => {
            const info = reorderMap.get(s.itemId);
            return info && s.quantity <= info.reorderLevel && s.quantity >= 0;
          })
          .map((s: { itemId: string; name: string; quantity: number }) => ({
            name: s.name,
            quantity: s.quantity,
            unit: reorderMap.get(s.itemId)?.unit || "nos",
            reorderLevel: reorderMap.get(s.itemId)?.reorderLevel || 0,
          }))
          .sort((a: { quantity: number }, b: { quantity: number }) => a.quantity - b.quantity)
          .slice(0, 20);

        setLowStockItems(low);
      } catch { /* ignore */ }
    }
    fetchLowStock();
  }, []);

  async function updateStatus(apptId: string, status: string) {
    try {
      const r = await fetch(`/api/appointments/${apptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (r.ok) fetchDashboard();
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fefbf6" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: "#e5e7eb", borderTopColor: "#2d6a4f" }} />
          <p className="text-[15px] font-medium" style={{ color: "#6b7280" }}>Loading portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen yoda-fade-in" style={{ background: "#fefbf6" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between" style={{ background: "#2d6a4f", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center font-bold text-[16px]" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: "10px" }}>
            {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "DR"}
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-white">Doctor Portal</h1>
            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>{user?.name || "Doctor"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/security" className="px-3 py-1.5 text-[13px] font-medium rounded-lg" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Settings
          </Link>
          <button onClick={logout} className="px-3 py-1.5 text-[13px] font-medium rounded-lg" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Greeting */}
        <div className="mb-6">
          <h2 className="text-[20px] font-bold" style={{ color: "var(--grey-900, #1c1917)" }}>
            Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}, Dr. {data?.doctorName?.replace(/^Dr\.?\s*/i, "") || user?.name}
          </h2>
          <p className="text-[15px]" style={{ color: "var(--grey-500, #78716c)" }}>
            {new Date().toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Today's Appointments", value: data?.stats.todayTotal || 0, color: "#2d6a4f", bg: "#f0faf4", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
            { label: "Pending", value: data?.stats.todayPending || 0, color: "#b68d40", bg: "#faf3e6", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            { label: "This Month Patients", value: data?.stats.monthPatients || 0, color: "#059669", bg: "#ecfdf5", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
            { label: "Prescriptions (Month)", value: data?.stats.monthPrescriptions || 0, color: "#7c3aed", bg: "#f5f3ff", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
          ].map((stat) => (
            <div key={stat.label} className="p-4" style={cardStyle}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--grey-500, #78716c)" }}>{stat.label}</span>
                <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: stat.bg }}>
                  <svg className="w-4 h-4" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} /></svg>
                </div>
              </div>
              <p className="text-[24px] font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="mb-6 overflow-hidden" style={{ ...cardStyle, border: "1px solid #fed7aa" }}>
            <button
              onClick={() => setShowStock(!showStock)}
              className="w-full flex items-center justify-between p-4 text-left"
              style={{ background: "#fffbeb" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "#fef3c7" }}>
                  <svg className="w-5 h-5" style={{ color: "#d97706" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-bold" style={{ color: "#92400e" }}>Low Stock Alert</p>
                  <p className="text-[13px]" style={{ color: "#b45309" }}>{lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} at or below reorder level</p>
                </div>
              </div>
              <svg className="w-5 h-5 transition-transform" style={{ color: "#d97706", transform: showStock ? "rotate(180deg)" : "rotate(0)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showStock && (
              <div className="px-4 pb-4">
                <table className="w-full" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #fde68a" }}>
                      <th className="text-left py-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "#92400e" }}>Medicine</th>
                      <th className="text-right py-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "#92400e" }}>Stock</th>
                      <th className="text-right py-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "#92400e" }}>Reorder At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((item, i) => (
                      <tr key={i} style={{ borderBottom: i < lowStockItems.length - 1 ? "1px solid #fef3c7" : "none" }}>
                        <td className="py-2 text-[14px] font-medium" style={{ color: "var(--grey-900, #1c1917)" }}>{item.name}</td>
                        <td className="py-2 text-[14px] font-bold text-right" style={{ color: item.quantity === 0 ? "#dc2626" : "#d97706" }}>
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2 text-[13px] text-right" style={{ color: "var(--grey-500, #78716c)" }}>
                          {item.reorderLevel} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--grey-100, #f5f5f4)" }}>
          {[
            { key: "today" as const, label: `Today's Schedule (${data?.todayAppointments.length || 0})` },
            { key: "upcoming" as const, label: `Upcoming (${data?.upcomingAppointments.length || 0})` },
            { key: "prescriptions" as const, label: `Recent Rx (${data?.recentPrescriptions.length || 0})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2 text-[14px] font-semibold rounded-md transition-all"
              style={{
                background: activeTab === tab.key ? "var(--white, #fff)" : "transparent",
                color: activeTab === tab.key ? "#2d6a4f" : "var(--grey-500, #78716c)",
                boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Today's Schedule */}
        {activeTab === "today" && (
          <div className="space-y-3">
            {(data?.todayAppointments.length || 0) === 0 ? (
              <div className="py-12 text-center" style={cardStyle}>
                <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-[16px] font-medium" style={{ color: "var(--grey-500)" }}>No appointments scheduled for today</p>
                <p className="text-[14px] mt-1" style={{ color: "var(--grey-400)" }}>Your schedule is clear. Enjoy your day!</p>
              </div>
            ) : data?.todayAppointments.map(appt => (
              <div key={appt.id} className="flex items-center gap-4 p-4" style={{ ...cardStyle, borderLeft: `4px solid ${appt.status === "completed" ? "#059669" : appt.status === "cancelled" ? "#dc2626" : "#2d6a4f"}` }}>
                <div className="text-center flex-shrink-0" style={{ minWidth: 50 }}>
                  <p className="text-[18px] font-bold" style={{ color: "#2d6a4f" }}>{appt.time}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/doctor/consult/${appt.id}`} className="text-[16px] font-bold hover:underline" style={{ color: "var(--grey-900)" }}>
                    {appt.patient?.firstName} {appt.patient?.lastName}
                  </Link>
                  <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                    {appt.patient?.patientIdNumber} &middot; {appt.patient?.phone}
                    {appt.reason && <> &middot; {appt.reason}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{
                    background: appt.status === "completed" ? "#ecfdf5" : appt.status === "cancelled" ? "#fef2f2" : "#f0faf4",
                    color: appt.status === "completed" ? "#059669" : appt.status === "cancelled" ? "#dc2626" : "#2d6a4f",
                  }}>{appt.status}</span>
                  {appt.status === "scheduled" && (
                    <div className="flex gap-1">
                      <Link href={`/doctor/consult/${appt.id}`} className="px-2.5 py-1 text-[12px] font-bold rounded flex items-center gap-1" style={{ background: "#14532d", color: "#fff", textDecoration: "none" }} title="Start Consultation">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Consult
                      </Link>
                      <button onClick={(e) => { e.stopPropagation(); updateStatus(appt.id, "cancelled"); }} className="px-2 py-1 text-[12px] font-bold rounded" style={{ background: "#fef2f2", color: "#dc2626" }} title="Cancel">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming */}
        {activeTab === "upcoming" && (
          <div className="space-y-3">
            {(data?.upcomingAppointments.length || 0) === 0 ? (
              <div className="py-12 text-center" style={cardStyle}>
                <p className="text-[16px] font-medium" style={{ color: "var(--grey-500)" }}>No upcoming appointments</p>
              </div>
            ) : data?.upcomingAppointments.map(appt => (
              <div key={appt.id} className="flex items-center gap-4 p-4" style={cardStyle}>
                <div className="text-center flex-shrink-0 px-3 py-1.5 rounded-lg" style={{ background: "#f0faf4", minWidth: 70 }}>
                  <p className="text-[13px] font-bold" style={{ color: "#2d6a4f" }}>{formatDay(appt.date as unknown as string)}</p>
                  <p className="text-[17px] font-bold" style={{ color: "#2d6a4f" }}>{appt.time}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>{appt.patient?.firstName} {appt.patient?.lastName}</p>
                  <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                    {appt.patient?.patientIdNumber} {appt.reason && <>&middot; {appt.reason}</>}
                  </p>
                </div>
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: "#f0faf4", color: "#2d6a4f" }}>{appt.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recent Prescriptions */}
        {activeTab === "prescriptions" && (
          <div className="space-y-3">
            {(data?.recentPrescriptions.length || 0) === 0 ? (
              <div className="py-12 text-center" style={cardStyle}>
                <p className="text-[16px] font-medium" style={{ color: "var(--grey-500)" }}>No recent prescriptions</p>
              </div>
            ) : data?.recentPrescriptions.map(rx => (
              <div key={rx.id} className="p-4" style={cardStyle}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>{rx.prescriptionNo}</p>
                    <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{rx.patient.firstName} {rx.patient.lastName} &middot; {rx.patient.patientIdNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{
                      background: rx.status === "active" ? "#ecfdf5" : "#f5f5f4",
                      color: rx.status === "active" ? "#059669" : "#78716c",
                    }}>{rx.status}</span>
                    <p className="text-[12px] mt-1" style={{ color: "var(--grey-400)" }}>{formatDate(rx.date)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rx.medicines.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 text-[12px] font-medium rounded" style={{ background: "#faf3e6", color: "#8b6914" }}>{m}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <Link href="/patients" className="p-4 text-center hover:opacity-80 transition-opacity" style={{ ...cardStyle, borderTop: "3px solid #2d6a4f" }}>
            <svg className="w-6 h-6 mx-auto mb-2" style={{ color: "#2d6a4f" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <p className="text-[14px] font-semibold" style={{ color: "#2d6a4f" }}>View Patients</p>
          </Link>
          <Link href="/appointments" className="p-4 text-center hover:opacity-80 transition-opacity" style={{ ...cardStyle, borderTop: "3px solid #b68d40" }}>
            <svg className="w-6 h-6 mx-auto mb-2" style={{ color: "#b68d40" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-[14px] font-semibold" style={{ color: "#b68d40" }}>Appointments</p>
          </Link>
        </div>

        {/* ═══════ My Performance ═══════ */}
        <MyPerformanceSection userId={user?.id || null} />

        {/* ═══════ My Leave ═══════ */}
        <MyLeaveSection userId={user?.id || null} />
      </main>
    </div>
  );
}

// ─── My Performance Section ────────────────────────────────────────────────
function MyPerformanceSection({ userId }: { userId: string | null }) {
  const [perf, setPerf] = useState<{
    total: number; completed: number; completionRate: number;
    uniquePatients: number; totalRevenue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/staff/${userId}/performance?period=month`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.metrics) setPerf(data.metrics);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const cardStyle = { background: "var(--white, #fff)", border: "1px solid var(--grey-300, #d6d3d1)", borderRadius: "var(--radius, 10px)", boxShadow: "var(--shadow-card, 0 1px 3px rgba(0,0,0,0.06))" };

  return (
    <div className="mt-8">
      <h3 className="text-[17px] font-bold mb-3" style={{ color: "var(--grey-900, #1c1917)" }}>My Performance (This Month)</h3>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100, #f5f5f4)", borderRadius: "10px" }} />
          ))}
        </div>
      ) : !perf ? (
        <div className="p-6 text-center" style={cardStyle}>
          <p className="text-[15px]" style={{ color: "var(--grey-500, #78716c)" }}>Performance data not available</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Appointments", value: perf.total, color: "#2d6a4f", bg: "#f0faf4" },
            { label: "Completion Rate", value: `${perf.completionRate}%`, color: "#059669", bg: "#ecfdf5" },
            { label: "Revenue", value: `$${Math.round(perf.totalRevenue).toLocaleString()}`, color: "#b68d40", bg: "#faf3e6" },
            { label: "Unique Patients", value: perf.uniquePatients, color: "#7c3aed", bg: "#f5f3ff" },
          ].map((item) => (
            <div key={item.label} className="p-4" style={cardStyle}>
              <p className="text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--grey-500, #78716c)" }}>{item.label}</p>
              <p className="text-[22px] font-bold" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── My Leave Section ──────────────────────────────────────────────────────
function MyLeaveSection({ userId }: { userId: string | null }) {
  const [leaves, setLeaves] = useState<Array<{
    id: string; type: string; title: string; startDate: string; endDate: string;
    allDay: boolean; status: string; notes: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: "Annual Leave", startDate: "", endDate: "", notes: "" });

  const cardStyle = { background: "var(--white, #fff)", border: "1px solid var(--grey-300, #d6d3d1)", borderRadius: "var(--radius, 10px)", boxShadow: "var(--shadow-card, 0 1px 3px rgba(0,0,0,0.06))" };
  const inputStyle = { border: "1px solid var(--grey-400, #a8a29e)", borderRadius: "6px", color: "var(--grey-900, #1c1917)", background: "var(--white, #fff)", fontSize: "15px" };

  const fetchLeaves = useCallback(() => {
    if (!userId) { setLoading(false); return; }
    const now = new Date();
    const from = now.toISOString().split("T")[0];
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const to = future.toISOString().split("T")[0];
    fetch(`/api/staff/${userId}/leave?from=${from}&to=${to}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (Array.isArray(data)) setLeaves(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !formData.startDate || !formData.endDate) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/${userId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "leave",
          title: formData.title,
          startDate: formData.startDate,
          endDate: formData.endDate,
          allDay: true,
          status: "pending",
          notes: formData.notes || null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ title: "Annual Leave", startDate: "", endDate: "", notes: "" });
        fetchLeaves();
      }
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      approved: { bg: "#ecfdf5", color: "#059669" },
      pending: { bg: "#fff7ed", color: "#ea580c" },
      rejected: { bg: "#fef2f2", color: "#dc2626" },
    };
    const s = styles[status] || styles.pending;
    return (
      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>
        {status}
      </span>
    );
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[17px] font-bold" style={{ color: "var(--grey-900, #1c1917)" }}>My Leave (Next 30 Days)</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-[13px] font-bold rounded-lg"
          style={{ background: "#2d6a4f", color: "#fff" }}
        >
          {showForm ? "Cancel" : "Request Leave"}
        </button>
      </div>

      {/* Leave Request Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 space-y-3" style={cardStyle}>
          <div>
            <label className="block text-[13px] font-bold mb-1" style={{ color: "var(--grey-600, #57534e)" }}>Leave Type</label>
            <select value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2" style={inputStyle}>
              <option value="Annual Leave">Annual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Personal Leave">Personal Leave</option>
              <option value="Emergency Leave">Emergency Leave</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-bold mb-1" style={{ color: "var(--grey-600, #57534e)" }}>Start Date</label>
              <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-3 py-2" style={inputStyle} required />
            </div>
            <div>
              <label className="block text-[13px] font-bold mb-1" style={{ color: "var(--grey-600, #57534e)" }}>End Date</label>
              <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-3 py-2" style={inputStyle} required />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold mb-1" style={{ color: "var(--grey-600, #57534e)" }}>Notes (optional)</label>
            <input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2" style={inputStyle} placeholder="Reason for leave..." />
          </div>
          <button type="submit" disabled={submitting} className="px-4 py-2 text-[14px] font-bold rounded-lg" style={{ background: "#2d6a4f", color: "#fff", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse" style={{ background: "var(--grey-100, #f5f5f4)", borderRadius: "10px" }} />
          ))}
        </div>
      ) : leaves.length === 0 ? (
        <div className="p-6 text-center" style={cardStyle}>
          <p className="text-[15px]" style={{ color: "var(--grey-500, #78716c)" }}>No upcoming leaves</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaves.map((leave) => (
            <div key={leave.id} className="p-3 flex items-center justify-between" style={cardStyle}>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900, #1c1917)" }}>{leave.title}</p>
                <p className="text-[13px]" style={{ color: "var(--grey-500, #78716c)" }}>
                  {new Date(leave.startDate).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
                  {leave.startDate !== leave.endDate && ` - ${new Date(leave.endDate).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}`}
                  {leave.notes && <> &middot; {leave.notes}</>}
                </p>
              </div>
              {statusBadge(leave.status)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
