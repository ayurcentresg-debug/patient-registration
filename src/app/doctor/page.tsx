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

  const fetchDashboard = useCallback(async () => {
    try {
      const r = await fetch("/api/doctor/dashboard");
      if (r.ok) setData(await r.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

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
          <p className="text-[13px] font-medium" style={{ color: "#6b7280" }}>Loading portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#fefbf6" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between" style={{ background: "#2d6a4f", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center font-bold text-[14px]" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: "10px" }}>
            {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "DR"}
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white">Doctor Portal</h1>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>{user?.name || "Doctor"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/security" className="px-3 py-1.5 text-[11px] font-medium rounded-lg" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Settings
          </Link>
          <button onClick={logout} className="px-3 py-1.5 text-[11px] font-medium rounded-lg" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
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
          <p className="text-[13px]" style={{ color: "var(--grey-500, #78716c)" }}>
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
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--grey-500, #78716c)" }}>{stat.label}</span>
                <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: stat.bg }}>
                  <svg className="w-4 h-4" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} /></svg>
                </div>
              </div>
              <p className="text-[24px] font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--grey-100, #f5f5f4)" }}>
          {[
            { key: "today" as const, label: `Today's Schedule (${data?.todayAppointments.length || 0})` },
            { key: "upcoming" as const, label: `Upcoming (${data?.upcomingAppointments.length || 0})` },
            { key: "prescriptions" as const, label: `Recent Rx (${data?.recentPrescriptions.length || 0})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2 text-[12px] font-semibold rounded-md transition-all"
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
                <p className="text-[14px] font-medium" style={{ color: "var(--grey-500)" }}>No appointments scheduled for today</p>
                <p className="text-[12px] mt-1" style={{ color: "var(--grey-400)" }}>Your schedule is clear. Enjoy your day!</p>
              </div>
            ) : data?.todayAppointments.map(appt => (
              <div key={appt.id} className="flex items-center gap-4 p-4" style={{ ...cardStyle, borderLeft: `4px solid ${appt.status === "completed" ? "#059669" : appt.status === "cancelled" ? "#dc2626" : "#2d6a4f"}` }}>
                <div className="text-center flex-shrink-0" style={{ minWidth: 50 }}>
                  <p className="text-[18px] font-bold" style={{ color: "#2d6a4f" }}>{appt.time}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/patients/${appt.patient?.patientIdNumber ? "" : ""}${appt.id}`} className="text-[14px] font-bold hover:underline" style={{ color: "var(--grey-900)" }}>
                    {appt.patient?.firstName} {appt.patient?.lastName}
                  </Link>
                  <p className="text-[11px]" style={{ color: "var(--grey-500)" }}>
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
                      <button onClick={() => updateStatus(appt.id, "completed")} className="px-2 py-1 text-[10px] font-bold rounded" style={{ background: "#ecfdf5", color: "#059669" }} title="Mark Complete">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      </button>
                      <button onClick={() => updateStatus(appt.id, "cancelled")} className="px-2 py-1 text-[10px] font-bold rounded" style={{ background: "#fef2f2", color: "#dc2626" }} title="Cancel">
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
                <p className="text-[14px] font-medium" style={{ color: "var(--grey-500)" }}>No upcoming appointments</p>
              </div>
            ) : data?.upcomingAppointments.map(appt => (
              <div key={appt.id} className="flex items-center gap-4 p-4" style={cardStyle}>
                <div className="text-center flex-shrink-0 px-3 py-1.5 rounded-lg" style={{ background: "#f0faf4", minWidth: 70 }}>
                  <p className="text-[11px] font-bold" style={{ color: "#2d6a4f" }}>{formatDay(appt.date as unknown as string)}</p>
                  <p className="text-[15px] font-bold" style={{ color: "#2d6a4f" }}>{appt.time}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>{appt.patient?.firstName} {appt.patient?.lastName}</p>
                  <p className="text-[11px]" style={{ color: "var(--grey-500)" }}>
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
                <p className="text-[14px] font-medium" style={{ color: "var(--grey-500)" }}>No recent prescriptions</p>
              </div>
            ) : data?.recentPrescriptions.map(rx => (
              <div key={rx.id} className="p-4" style={cardStyle}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>{rx.prescriptionNo}</p>
                    <p className="text-[11px]" style={{ color: "var(--grey-500)" }}>{rx.patient.firstName} {rx.patient.lastName} &middot; {rx.patient.patientIdNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{
                      background: rx.status === "active" ? "#ecfdf5" : "#f5f5f4",
                      color: rx.status === "active" ? "#059669" : "#78716c",
                    }}>{rx.status}</span>
                    <p className="text-[10px] mt-1" style={{ color: "var(--grey-400)" }}>{formatDate(rx.date)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rx.medicines.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 text-[10px] font-medium rounded" style={{ background: "#faf3e6", color: "#8b6914" }}>{m}</span>
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
            <p className="text-[12px] font-semibold" style={{ color: "#2d6a4f" }}>View Patients</p>
          </Link>
          <Link href="/appointments" className="p-4 text-center hover:opacity-80 transition-opacity" style={{ ...cardStyle, borderTop: "3px solid #b68d40" }}>
            <svg className="w-6 h-6 mx-auto mb-2" style={{ color: "#b68d40" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-[12px] font-semibold" style={{ color: "#b68d40" }}>Appointments</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
