"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";

interface ClinicDetail {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  zipCode: string | null;
  website: string | null;
  currency: string;
  timezone: string;
  isActive: boolean;
  onboardingComplete: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  maxUsers: number;
  maxPatients: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
}

interface ClinicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

interface RecentPatient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalPatients: number;
  totalAppointments: number;
  todayAppointments: number;
  completedAppointments: number;
  totalRevenue: number;
  appointmentsByStatus: { status: string; count: number }[];
}

interface ClinicData {
  clinic: ClinicDetail;
  subscription: Subscription | null;
  users: ClinicUser[];
  stats: Stats;
  recentPatients: RecentPatient[];
}

const PLAN_COLORS: Record<string, { bg: string; color: string }> = {
  trial: { bg: "#ecfdf5", color: "#059669" },
  starter: { bg: "#eff6ff", color: "#2563eb" },
  professional: { bg: "#f5f3ff", color: "#7c3aed" },
  enterprise: { bg: "#fdf4ff", color: "#a855f7" },
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: "#ecfdf5", color: "#059669" },
  expired: { bg: "#fef2f2", color: "#dc2626" },
  suspended: { bg: "#fff7ed", color: "#ea580c" },
  cancelled: { bg: "#f3f4f6", color: "#6b7280" },
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#2563eb",
  doctor: "#059669",
  therapist: "#7c3aed",
  receptionist: "#ea580c",
  pharmacist: "#0891b2",
  staff: "#6b7280",
};

export default function ClinicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clinicId = params.id as string;

  const [data, setData] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "users" | "patients" | "actions">("overview");

  // Action states
  const [extendDays, setExtendDays] = useState(7);
  const [newPlan, setNewPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [actionResult, setActionResult] = useState<{ success?: boolean; message?: string; error?: string; tempPassword?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchClinic();
  }, [clinicId]);

  async function fetchClinic() {
    try {
      const res = await fetch(`/api/super-admin/clinics/${clinicId}`);
      const json = await res.json();
      if (json.clinic) {
        setData(json);
        setNotes(json.subscription?.notes || "");
        setNewPlan(json.subscription?.plan || "trial");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function doAction(action: string, extra: Record<string, unknown> = {}) {
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fetch(`/api/super-admin/clinics/${clinicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      setActionResult(json);
      if (json.success) fetchClinic();
    } catch {
      setActionResult({ error: "Network error" });
    } finally {
      setActionLoading(false);
    }
  }

  function getTrialDays(sub: Subscription | null): number | null {
    if (!sub?.trialEndsAt) return null;
    const diff = new Date(sub.trialEndsAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <SuperAdminSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Loading clinic...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <SuperAdminSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
          <div style={{ fontSize: 16, color: "#dc2626" }}>Clinic not found</div>
        </div>
      </div>
    );
  }

  const { clinic, subscription, users, stats, recentPatients } = data;
  const trialDays = getTrialDays(subscription);
  const planColor = PLAN_COLORS[subscription?.plan || "trial"] || PLAN_COLORS.trial;
  const statusColor = STATUS_COLORS[subscription?.status || "active"] || STATUS_COLORS.active;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar />

      <div style={{ flex: 1, background: "#f9fafb", overflow: "auto" }}>
        {/* Header */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <button
              onClick={() => router.push("/super-admin/clinics")}
              style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 14,
                color: "#6b7280", display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back to Clinics
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>{clinic.name}</h1>
                <span style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: clinic.isActive ? "#ecfdf5" : "#fef2f2",
                  color: clinic.isActive ? "#059669" : "#dc2626",
                }}>
                  {clinic.isActive ? "Active" : "Deactivated"}
                </span>
              </div>
              <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
                {clinic.email} {clinic.phone ? `| ${clinic.phone}` : ""} | {[clinic.city, clinic.country].filter(Boolean).join(", ")}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{
                padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                background: planColor.bg, color: planColor.color,
              }}>
                {(subscription?.plan || "No Plan").charAt(0).toUpperCase() + (subscription?.plan || "no plan").slice(1)}
              </span>
              <span style={{
                padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                background: statusColor.bg, color: statusColor.color,
              }}>
                {subscription?.status || "N/A"}
              </span>
              {subscription?.plan === "trial" && trialDays !== null && (
                <span style={{
                  padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                  background: trialDays <= 0 ? "#fef2f2" : trialDays <= 2 ? "#fff7ed" : "#ecfdf5",
                  color: trialDays <= 0 ? "#dc2626" : trialDays <= 2 ? "#ea580c" : "#059669",
                }}>
                  {trialDays <= 0 ? "Trial Expired" : `${trialDays}d left`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: "0 32px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
          <div style={{ display: "flex", gap: 0 }}>
            {(["overview", "users", "patients", "actions"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "14px 20px", fontSize: 14, fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? "#14532d" : "#6b7280",
                  background: "none", border: "none", borderBottom: tab === t ? "2px solid #14532d" : "2px solid transparent",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {t === "overview" ? "Overview" : t === "users" ? `Users (${stats.totalUsers})` : t === "patients" ? `Patients (${stats.totalPatients})` : "Actions"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "24px 32px" }}>
          {/* ── Overview Tab ─────────────────────────────────────── */}
          {tab === "overview" && (
            <div>
              {/* Stats Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Total Users", value: stats.totalUsers, color: "#2563eb" },
                  { label: "Active Users", value: stats.activeUsers, color: "#059669" },
                  { label: "Total Patients", value: stats.totalPatients, color: "#7c3aed" },
                  { label: "Appointments", value: stats.totalAppointments, color: "#ea580c" },
                  { label: "Today", value: stats.todayAppointments, color: "#0891b2" },
                  { label: "Revenue", value: stats.totalRevenue, color: "#16a34a", prefix: clinic.currency + " " },
                ].map((s) => (
                  <div key={s.label} style={{
                    background: "#fff", borderRadius: 14, padding: "20px", border: "1px solid #f3f4f6",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, marginBottom: 8 }}>{s.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#111827" }}>
                      {s.prefix || ""}{typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Clinic Info + Subscription side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                {/* Clinic Info */}
                <div style={{ background: "#fff", borderRadius: 14, padding: "24px", border: "1px solid #f3f4f6" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Clinic Details</h3>
                  {[
                    ["Slug", clinic.slug],
                    ["Email", clinic.email],
                    ["Phone", clinic.phone || "-"],
                    ["Address", [clinic.address, clinic.city, clinic.state, clinic.zipCode].filter(Boolean).join(", ") || "-"],
                    ["Country", clinic.country],
                    ["Currency", clinic.currency],
                    ["Timezone", clinic.timezone],
                    ["Website", clinic.website || "-"],
                    ["Email Verified", clinic.emailVerified ? "Yes" : "No"],
                    ["Onboarding", clinic.onboardingComplete ? "Complete" : "Pending"],
                    ["Registered", new Date(clinic.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f9fafb" }}>
                      <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
                      <span style={{ fontSize: 13, color: "#111827", fontWeight: 500, textAlign: "right", maxWidth: "60%", wordBreak: "break-all" }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Subscription Info */}
                <div style={{ background: "#fff", borderRadius: 14, padding: "24px", border: "1px solid #f3f4f6" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Subscription</h3>
                  {subscription ? (
                    <>
                      {[
                        ["Plan", subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)],
                        ["Status", subscription.status],
                        ["Max Users", subscription.maxUsers.toString()],
                        ["Max Patients", subscription.maxPatients >= 999999 ? "Unlimited" : subscription.maxPatients.toString()],
                        ["Trial Ends", subscription.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"],
                        ["Stripe Customer", subscription.stripeCustomerId || "None"],
                        ["Payment Method", subscription.paymentMethod || "None"],
                        ["Created", new Date(subscription.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })],
                      ].map(([label, value]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f9fafb" }}>
                          <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
                          <span style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{value}</span>
                        </div>
                      ))}
                      {subscription.notes && (
                        <div style={{ marginTop: 12, padding: "12px", background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                          <strong>Notes:</strong> {subscription.notes}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: "#9ca3af", fontSize: 14, padding: 20, textAlign: "center" }}>No subscription found</div>
                  )}
                </div>
              </div>

              {/* Appointment Status Breakdown */}
              {stats.appointmentsByStatus.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 14, padding: "24px", border: "1px solid #f3f4f6" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Appointments by Status (Last 6 Months)</h3>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {stats.appointmentsByStatus.map((s) => (
                      <div key={s.status} style={{
                        padding: "12px 20px", borderRadius: 10, background: "#f9fafb",
                        border: "1px solid #f3f4f6", minWidth: 120,
                      }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{s.count}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>{s.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Users Tab ────────────────────────────────────────── */}
          {tab === "users" && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f3f4f6", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Name", "Email", "Role", "Status", "Last Login", "Joined", ""].map((h) => (
                      <th key={h} style={{
                        padding: "12px 16px", textAlign: "left", fontWeight: 600,
                        color: "#6b7280", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "#111827" }}>{user.name}</td>
                      <td style={{ padding: "14px 16px", color: "#6b7280" }}>{user.email}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: (ROLE_COLORS[user.role] || "#6b7280") + "15",
                          color: ROLE_COLORS[user.role] || "#6b7280",
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                          background: user.isActive ? "#059669" : "#dc2626", marginRight: 6,
                        }} />
                        {user.isActive ? "Active" : "Inactive"}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: 13 }}>
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: 13 }}>
                        {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          onClick={() => {
                            if (confirm(`Reset password for ${user.name}?`)) {
                              doAction("reset_password", { userId: user.id });
                            }
                          }}
                          style={{
                            padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                            background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa",
                            cursor: "pointer",
                          }}
                        >
                          Reset Pwd
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No users found</div>
              )}
            </div>
          )}

          {/* ── Patients Tab ─────────────────────────────────────── */}
          {tab === "patients" && (
            <div>
              <div style={{ marginBottom: 16, fontSize: 14, color: "#6b7280" }}>
                Showing last 10 patients out of {stats.totalPatients} total
              </div>
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f3f4f6", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Name", "Email", "Phone", "Registered"].map((h) => (
                        <th key={h} style={{
                          padding: "12px 16px", textAlign: "left", fontWeight: 600,
                          color: "#6b7280", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: "#111827" }}>{p.name}</td>
                        <td style={{ padding: "14px 16px", color: "#6b7280" }}>{p.email || "-"}</td>
                        <td style={{ padding: "14px 16px", color: "#6b7280" }}>{p.phone || "-"}</td>
                        <td style={{ padding: "14px 16px", color: "#6b7280", fontSize: 13 }}>
                          {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recentPatients.length === 0 && (
                  <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No patients yet</div>
                )}
              </div>
            </div>
          )}

          {/* ── Actions Tab ──────────────────────────────────────── */}
          {tab === "actions" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Extend Trial */}
              <div style={{ background: "#fff", borderRadius: 14, padding: "24px", border: "1px solid #f3f4f6" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Extend Trial</h3>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
                  {subscription?.plan === "trial" && trialDays !== null
                    ? trialDays > 0
                      ? `Current trial: ${trialDays} days remaining`
                      : "Trial has expired"
                    : "Clinic is on a paid plan"}
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {[7, 14, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setExtendDays(d)}
                      style={{
                        padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        background: extendDays === d ? "#14532d" : "#f3f4f6",
                        color: extendDays === d ? "#fff" : "#374151",
                        border: "none",
                      }}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => doAction("extend_trial", { days: extendDays })}
                  disabled={actionLoading}
                  style={{
                    padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                    background: "#059669", color: "#fff", border: "none", cursor: "pointer",
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {actionLoading ? "Extending..." : `Extend by ${extendDays} days`}
                </button>
              </div>

              {/* Change Plan */}
              <div style={{ background: "#fff", borderRadius: 14, padding: "24px", border: "1px solid #f3f4f6" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Change Plan</h3>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
                  Current: <strong>{subscription?.plan || "None"}</strong>
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  {["trial", "starter", "professional", "enterprise"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewPlan(p)}
                      style={{
                        padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        background: newPlan === p ? "#14532d" : "#f3f4f6",
                        color: newPlan === p ? "#fff" : "#374151",
                        border: "none", textTransform: "capitalize",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Change plan to "${newPlan}"? This will update limits.`)) {
                      doAction("change_plan", { plan: newPlan });
                    }
                  }}
                  disabled={actionLoading || newPlan === subscription?.plan}
                  style={{
                    padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                    background: "#2563eb", color: "#fff", border: "none", cursor: "pointer",
                    opacity: actionLoading || newPlan === subscription?.plan ? 0.5 : 1,
                  }}
                >
                  {actionLoading ? "Changing..." : `Change to ${newPlan}`}
                </button>
              </div>

              {/* Toggle Active */}
              <div style={{ background: "#fff", borderRadius: 14, padding: "24px", border: "1px solid #f3f4f6" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
                  {clinic.isActive ? "Deactivate Clinic" : "Activate Clinic"}
                </h3>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
                  {clinic.isActive
                    ? "Deactivating will suspend the clinic. Users won't be able to log in."
                    : "Activating will restore access for all users."}
                </p>
                <button
                  onClick={() => {
                    if (confirm(`${clinic.isActive ? "Deactivate" : "Activate"} "${clinic.name}"?`)) {
                      doAction("toggle_active");
                    }
                  }}
                  disabled={actionLoading}
                  style={{
                    padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                    background: clinic.isActive ? "#dc2626" : "#059669",
                    color: "#fff", border: "none", cursor: "pointer",
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {clinic.isActive ? "Deactivate Clinic" : "Activate Clinic"}
                </button>
              </div>

              {/* Notes */}
              <div style={{ background: "#fff", borderRadius: 14, padding: "24px", border: "1px solid #f3f4f6" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Admin Notes</h3>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>Internal notes about this clinic</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  style={{
                    width: "100%", padding: "10px 14px", fontSize: 13, borderRadius: 10,
                    border: "1.5px solid #e5e7eb", background: "#fafafa", outline: "none",
                    resize: "vertical", boxSizing: "border-box", fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={() => doAction("update_notes", { notes })}
                  disabled={actionLoading}
                  style={{
                    marginTop: 8, padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                    background: "#374151", color: "#fff", border: "none", cursor: "pointer",
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  Save Notes
                </button>
              </div>

              {/* Action Result */}
              {actionResult && (
                <div style={{
                  gridColumn: "1 / -1",
                  padding: "16px 20px", borderRadius: 12,
                  background: actionResult.success ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${actionResult.success ? "#bbf7d0" : "#fecaca"}`,
                }}>
                  <p style={{
                    fontSize: 14, fontWeight: 600, margin: 0,
                    color: actionResult.success ? "#16a34a" : "#dc2626",
                  }}>
                    {actionResult.success ? actionResult.message : actionResult.error}
                  </p>
                  {actionResult.tempPassword && (
                    <div style={{ marginTop: 8, padding: "12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                      <p style={{ fontSize: 13, color: "#92400e", margin: 0 }}>
                        Temporary password: <strong style={{ fontFamily: "monospace", fontSize: 14 }}>{actionResult.tempPassword}</strong>
                      </p>
                      <p style={{ fontSize: 12, color: "#a16207", margin: "4px 0 0" }}>
                        Share this with the user securely. They should change it after logging in.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
