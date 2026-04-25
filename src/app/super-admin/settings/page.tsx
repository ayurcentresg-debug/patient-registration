"use client";

import { useEffect, useState } from "react";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";

interface Settings {
  trialDurationDays: number;
  trialMaxUsers: number;
  trialMaxPatients: number;
  starterMaxUsers: number;
  starterMaxPatients: number;
  proMaxUsers: number;
  proMaxPatients: number;
  enterpriseMaxUsers: number;
  enterpriseMaxPatients: number;
  starterMonthlyPrice: number;
  starterAnnualPrice: number;
  proMonthlyPrice: number;
  proAnnualPrice: number;
  enterpriseMonthlyPrice: number;
  enterpriseAnnualPrice: number;
  enableOnlineBooking: boolean;
  enablePayroll: boolean;
  enableInventory: boolean;
  enablePackages: boolean;
  enableReports: boolean;
  enableMultiBranch: boolean;
  enableCme: boolean;
  enableWhatsApp: boolean;
  enableSMS: boolean;
  enableApiAccess: boolean;
  maintenanceMode: boolean;
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  updatedAt: string;
}

const inputStyle: React.CSSProperties = {
  padding: "9px 14px", fontSize: 13, borderRadius: 8,
  border: "1.5px solid #e5e7eb", background: "#fafafa", outline: "none",
  width: "100%", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [result, setResult] = useState<{ section: string; success?: boolean; error?: string } | null>(null);

  // Form states
  const [trial, setTrial] = useState({ trialDurationDays: 7, trialMaxUsers: 5, trialMaxPatients: 100 });
  const [plans, setPlans] = useState({
    starterMaxUsers: 10, starterMaxPatients: 500,
    proMaxUsers: 25, proMaxPatients: 999999,
    enterpriseMaxUsers: 100, enterpriseMaxPatients: 999999,
  });
  const [pricing, setPricing] = useState({
    starterMonthlyPrice: 0, starterAnnualPrice: 0,
    proMonthlyPrice: 0, proAnnualPrice: 0,
    enterpriseMonthlyPrice: 0, enterpriseAnnualPrice: 0,
  });
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [branding, setBranding] = useState({ platformName: "", supportEmail: "", supportPhone: "" });

  useEffect(() => {
    fetch("/api/super-admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          const s = data.settings;
          setSettings(s);
          setTrial({ trialDurationDays: s.trialDurationDays, trialMaxUsers: s.trialMaxUsers, trialMaxPatients: s.trialMaxPatients });
          setPlans({
            starterMaxUsers: s.starterMaxUsers, starterMaxPatients: s.starterMaxPatients,
            proMaxUsers: s.proMaxUsers, proMaxPatients: s.proMaxPatients,
            enterpriseMaxUsers: s.enterpriseMaxUsers, enterpriseMaxPatients: s.enterpriseMaxPatients,
          });
          setPricing({
            starterMonthlyPrice: s.starterMonthlyPrice / 100,
            starterAnnualPrice: s.starterAnnualPrice / 100,
            proMonthlyPrice: s.proMonthlyPrice / 100,
            proAnnualPrice: s.proAnnualPrice / 100,
            enterpriseMonthlyPrice: s.enterpriseMonthlyPrice / 100,
            enterpriseAnnualPrice: s.enterpriseAnnualPrice / 100,
          });
          setFeatures({
            enableOnlineBooking: s.enableOnlineBooking, enablePayroll: s.enablePayroll,
            enableInventory: s.enableInventory, enablePackages: s.enablePackages,
            enableReports: s.enableReports, enableMultiBranch: s.enableMultiBranch,
            enableCme: s.enableCme, enableWhatsApp: s.enableWhatsApp, enableSMS: s.enableSMS,
            enableApiAccess: s.enableApiAccess, maintenanceMode: s.maintenanceMode,
          });
          setBranding({ platformName: s.platformName, supportEmail: s.supportEmail, supportPhone: s.supportPhone });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function saveSection(section: string, data: Record<string, unknown>) {
    setSaving(section);
    setResult(null);
    try {
      const res = await fetch("/api/super-admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, ...data }),
      });
      const json = await res.json();
      if (json.success) {
        setSettings(json.settings);
        setResult({ section, success: true });
      } else {
        setResult({ section, error: json.error });
      }
    } catch {
      setResult({ section, error: "Network error" });
    } finally {
      setSaving(null);
    }
  }

  function ResultBanner({ section }: { section: string }) {
    if (!result || result.section !== section) return null;
    return (
      <div style={{
        marginTop: 12, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
        background: result.success ? "#ecfdf5" : "#fef2f2",
        color: result.success ? "#059669" : "#dc2626",
        border: `1px solid ${result.success ? "#bbf7d0" : "#fecaca"}`,
      }}>
        {result.success ? "Settings saved successfully" : result.error}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <SuperAdminSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar />

      <div style={{ flex: 1, background: "#f9fafb", overflow: "auto" }}>
        {/* Header */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Platform Settings</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>Configure trial, plans, pricing, and feature flags</p>
          </div>
          {settings && (
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              Last updated: {new Date(settings.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        <div style={{ padding: "24px 32px", maxWidth: 900 }}>

          {/* ── Trial Settings ──────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 20, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Trial Configuration</h3>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>Default settings for new clinic trials</p>
              </div>
              <button
                onClick={() => saveSection("trial", trial)}
                disabled={saving === "trial"}
                style={{
                  padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "#14532d", color: "#fff", border: "none", cursor: "pointer",
                  opacity: saving === "trial" ? 0.6 : 1,
                }}
              >
                {saving === "trial" ? "Saving..." : "Save"}
              </button>
            </div>
            <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Trial Duration (days)</label>
                <input type="number" style={inputStyle} value={trial.trialDurationDays}
                  onChange={(e) => setTrial({ ...trial, trialDurationDays: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label style={labelStyle}>Max Users</label>
                <input type="number" style={inputStyle} value={trial.trialMaxUsers}
                  onChange={(e) => setTrial({ ...trial, trialMaxUsers: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label style={labelStyle}>Max Patients</label>
                <input type="number" style={inputStyle} value={trial.trialMaxPatients}
                  onChange={(e) => setTrial({ ...trial, trialMaxPatients: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <ResultBanner section="trial" />
          </div>

          {/* ── Plan Limits ─────────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 20, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Plan Limits</h3>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>User and patient limits per plan</p>
              </div>
              <button
                onClick={() => saveSection("plans", plans)}
                disabled={saving === "plans"}
                style={{
                  padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "#14532d", color: "#fff", border: "none", cursor: "pointer",
                  opacity: saving === "plans" ? 0.6 : 1,
                }}
              >
                {saving === "plans" ? "Saving..." : "Save"}
              </button>
            </div>
            <div style={{ padding: "8px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <th style={{ padding: "10px 24px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: 12 }}>Plan</th>
                    <th style={{ padding: "10px 24px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: 12 }}>Max Users</th>
                    <th style={{ padding: "10px 24px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: 12 }}>Max Patients</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { plan: "Starter", color: "#2563eb", uKey: "starterMaxUsers" as const, pKey: "starterMaxPatients" as const },
                    { plan: "Professional", color: "#7c3aed", uKey: "proMaxUsers" as const, pKey: "proMaxPatients" as const },
                    { plan: "Enterprise", color: "#a855f7", uKey: "enterpriseMaxUsers" as const, pKey: "enterpriseMaxPatients" as const },
                  ].map((row) => (
                    <tr key={row.plan} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "12px 24px" }}>
                        <span style={{ fontWeight: 600, color: row.color }}>{row.plan}</span>
                      </td>
                      <td style={{ padding: "12px 24px" }}>
                        <input type="number" style={{ ...inputStyle, width: 100 }}
                          value={plans[row.uKey]}
                          onChange={(e) => setPlans({ ...plans, [row.uKey]: parseInt(e.target.value) || 0 })} />
                      </td>
                      <td style={{ padding: "12px 24px" }}>
                        <input type="number" style={{ ...inputStyle, width: 120 }}
                          value={plans[row.pKey]}
                          onChange={(e) => setPlans({ ...plans, [row.pKey]: parseInt(e.target.value) || 0 })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ResultBanner section="plans" />
          </div>

          {/* ── Pricing ─────────────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 20, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Plan Pricing</h3>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>Monthly and annual pricing (in base currency)</p>
              </div>
              <button
                onClick={() => saveSection("pricing", pricing)}
                disabled={saving === "pricing"}
                style={{
                  padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "#14532d", color: "#fff", border: "none", cursor: "pointer",
                  opacity: saving === "pricing" ? 0.6 : 1,
                }}
              >
                {saving === "pricing" ? "Saving..." : "Save"}
              </button>
            </div>
            <div style={{ padding: "8px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <th style={{ padding: "10px 24px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: 12 }}>Plan</th>
                    <th style={{ padding: "10px 24px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: 12 }}>Monthly</th>
                    <th style={{ padding: "10px 24px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: 12 }}>Annual</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { plan: "Starter", color: "#2563eb", mKey: "starterMonthlyPrice" as const, aKey: "starterAnnualPrice" as const },
                    { plan: "Professional", color: "#7c3aed", mKey: "proMonthlyPrice" as const, aKey: "proAnnualPrice" as const },
                    { plan: "Enterprise", color: "#a855f7", mKey: "enterpriseMonthlyPrice" as const, aKey: "enterpriseAnnualPrice" as const },
                  ].map((row) => (
                    <tr key={row.plan} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "12px 24px" }}>
                        <span style={{ fontWeight: 600, color: row.color }}>{row.plan}</span>
                      </td>
                      <td style={{ padding: "12px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 12, color: "#6b7280" }}>INR</span>
                          <input type="number" step="0.01" style={{ ...inputStyle, width: 120 }}
                            value={pricing[row.mKey]}
                            onChange={(e) => setPricing({ ...pricing, [row.mKey]: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </td>
                      <td style={{ padding: "12px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 12, color: "#6b7280" }}>INR</span>
                          <input type="number" step="0.01" style={{ ...inputStyle, width: 120 }}
                            value={pricing[row.aKey]}
                            onChange={(e) => setPricing({ ...pricing, [row.aKey]: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ResultBanner section="pricing" />
          </div>

          {/* ── Feature Flags ───────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 20, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Feature Flags</h3>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>Enable or disable platform features globally</p>
              </div>
              <button
                onClick={() => saveSection("features", features)}
                disabled={saving === "features"}
                style={{
                  padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "#14532d", color: "#fff", border: "none", cursor: "pointer",
                  opacity: saving === "features" ? 0.6 : 1,
                }}
              >
                {saving === "features" ? "Saving..." : "Save"}
              </button>
            </div>
            <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              {[
                { key: "enableOnlineBooking", label: "Online Booking", desc: "Allow patients to book appointments online" },
                { key: "enablePayroll", label: "Payroll Module", desc: "CPF, EPF, SOCSO calculations" },
                { key: "enableInventory", label: "Inventory Management", desc: "Stock tracking, purchase orders, transfers" },
                { key: "enablePackages", label: "Treatment Packages", desc: "Multi-session treatment packages" },
                { key: "enableReports", label: "Reports & Analytics", desc: "Revenue, appointment, and staff reports" },
                { key: "enableMultiBranch", label: "Multi-Branch", desc: "Multiple clinic locations" },
                { key: "enableWhatsApp", label: "WhatsApp Integration", desc: "Send reminders via WhatsApp" },
                { key: "enableSMS", label: "SMS Notifications", desc: "SMS appointment reminders" },
                { key: "enableApiAccess", label: "API Access", desc: "REST API for third-party integrations" },
                { key: "maintenanceMode", label: "Maintenance Mode", desc: "Show maintenance page to all tenants", danger: true },
              ].map((flag) => (
                <div key={flag.key} style={{
                  padding: "14px 0", borderBottom: "1px solid #f3f4f6",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginRight: 24,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: flag.danger ? "#dc2626" : "#111827" }}>{flag.label}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{flag.desc}</div>
                  </div>
                  <button
                    onClick={() => setFeatures({ ...features, [flag.key]: !features[flag.key] })}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                      background: features[flag.key]
                        ? (flag.danger ? "#dc2626" : "#14532d")
                        : "#e5e7eb",
                      position: "relative", transition: "background 0.2s", flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", background: "#fff",
                      position: "absolute", top: 3,
                      left: features[flag.key] ? 23 : 3,
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }} />
                  </button>
                </div>
              ))}
            </div>
            <ResultBanner section="features" />
          </div>

          {/* ── Branding ────────────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 20, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Platform Branding</h3>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>Platform name and support contact info</p>
              </div>
              <button
                onClick={() => saveSection("branding", branding)}
                disabled={saving === "branding"}
                style={{
                  padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "#14532d", color: "#fff", border: "none", cursor: "pointer",
                  opacity: saving === "branding" ? 0.6 : 1,
                }}
              >
                {saving === "branding" ? "Saving..." : "Save"}
              </button>
            </div>
            <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Platform Name</label>
                <input type="text" style={inputStyle} value={branding.platformName}
                  onChange={(e) => setBranding({ ...branding, platformName: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Support Email</label>
                <input type="email" style={inputStyle} value={branding.supportEmail}
                  onChange={(e) => setBranding({ ...branding, supportEmail: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Support Phone</label>
                <input type="tel" style={inputStyle} value={branding.supportPhone}
                  onChange={(e) => setBranding({ ...branding, supportPhone: e.target.value })} />
              </div>
            </div>
            <ResultBanner section="branding" />
          </div>

          {/* ═══════════════════ Demo Data ═══════════════════ */}
          <DemoSeedSection />

        </div>
      </div>
    </div>
  );
}

// ─── Demo Seed Section (one-click populate demo clinic) ────────────────

function DemoSeedSection() {
  const [loading, setLoading] = useState(false);
  const [patientSeedLoading, setPatientSeedLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [resetPwLoading, setResetPwLoading] = useState(false);
  const [result, setResult] = useState<null | {
    ok: boolean;
    alreadyExists?: boolean;
    email?: string;
    password?: string;
    message?: string;
    error?: string;
    summary?: string;
    created?: string[];
    skipped?: string[];
  }>(null);

  async function handleSeed() {
    if (!confirm("Create demo clinic with sample data?\n\nThis creates:\n• Demo Clinic Singapore\n• 9 staff (2 doctors, 5 therapists, 1 receptionist, 1 admin)\n• 7 patients (family + individuals)\n• 10 appointments, 15 inventory items, 3 invoices\n\nIdempotent — running twice does nothing if it already exists.")) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/super-admin/seed-demo", { method: "POST" });
      const data = await res.json();
      if (res.ok) setResult(data);
      else setResult({ ok: false, error: data.error || data.details || "Seed failed" });
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Network error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedPatientsOnly() {
    if (!confirm("Additively add the 7 demo patients to Demo Clinic?\n\n• Menon family of 4 (Ravi, Lakshmi, Arjun, Priya)\n• Sarah Chen, Muhammad Hassan, Emily Tan\n\nSkips any that already exist by patient ID. Does NOT delete or modify existing patients.\n\nUse this if /seed-demo said 'already exists' but patients are missing.")) return;
    setPatientSeedLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/super-admin/seed-demo-patients", { method: "POST" });
      const data = await res.json();
      if (res.ok) setResult({ ok: true, message: data.summary, created: data.created, skipped: data.skipped });
      else setResult({ ok: false, error: data.error || "Seed failed" });
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Network error" });
    } finally {
      setPatientSeedLoading(false);
    }
  }

  async function handleResetPasswords() {
    if (!confirm("Reset ALL demo clinic staff passwords to Demo2026!?\n\nThis affects:\n• Demo Admin\n• 2 doctors\n• 5 therapists\n• 1 receptionist\n\nUse this if logging in as demo@ayurgate.com (or any demo staff) is failing. Idempotent — safe to run repeatedly.")) return;
    setResetPwLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/super-admin/reset-demo-passwords", { method: "POST" });
      const data = await res.json();
      if (res.ok) setResult({ ok: true, message: data.summary });
      else setResult({ ok: false, error: data.error || "Reset failed" });
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Network error" });
    } finally {
      setResetPwLoading(false);
    }
  }

  async function handleBackfillFamily() {
    if (!confirm("Heal one-way family links across ALL clinics?\n\nFor every linked relative (e.g. Ravi → Arjun as 'child'), the system will create the missing reverse row (Arjun → Ravi as 'parent') if it doesn't already exist.\n\nFree-text family members (no linked patient) are untouched. Idempotent — safe to run multiple times.")) return;
    setBackfillLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/super-admin/backfill-family-reciprocals", { method: "POST" });
      const data = await res.json();
      if (res.ok) setResult({ ok: true, message: data.summary });
      else setResult({ ok: false, error: data.error || "Backfill failed" });
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Network error" });
    } finally {
      setBackfillLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 32, padding: 24, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#111827" }}>
        🌱 Demo Clinic
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
        Create a fully-populated demo clinic to test all features. Credentials will be shown below after seeding.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={handleSeed}
          disabled={loading || patientSeedLoading}
          style={{
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            background: (loading || patientSeedLoading) ? "#9ca3af" : "#2d6a4f",
            border: "none",
            borderRadius: 8,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Seeding…" : "🌱 Seed Demo Clinic"}
        </button>
        <button
          onClick={handleSeedPatientsOnly}
          disabled={loading || patientSeedLoading || backfillLoading}
          title="Use when clinic exists but 7 dummy patients are missing (e.g. after DB reset)"
          style={{
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            color: "#14532d",
            background: (loading || patientSeedLoading || backfillLoading) ? "#f3f4f6" : "#f0fdf4",
            border: "1.5px solid #bbf7d0",
            borderRadius: 8,
            cursor: patientSeedLoading ? "wait" : "pointer",
          }}
        >
          {patientSeedLoading ? "Adding…" : "👥 Add 7 Demo Patients"}
        </button>
        <button
          onClick={handleBackfillFamily}
          disabled={loading || patientSeedLoading || backfillLoading || resetPwLoading}
          title="Heal one-way family links across all clinics — adds missing reverse rows so children see their parents and vice-versa"
          style={{
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            color: "#1e3a8a",
            background: (loading || patientSeedLoading || backfillLoading || resetPwLoading) ? "#f3f4f6" : "#eff6ff",
            border: "1.5px solid #bfdbfe",
            borderRadius: 8,
            cursor: backfillLoading ? "wait" : "pointer",
          }}
        >
          {backfillLoading ? "Healing…" : "🔁 Backfill Family Links"}
        </button>
        <button
          onClick={handleResetPasswords}
          disabled={loading || patientSeedLoading || backfillLoading || resetPwLoading}
          title="Reset all demo clinic staff passwords back to Demo2026! — fixes 'invalid password' on login"
          style={{
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            color: "#7c2d12",
            background: (loading || patientSeedLoading || backfillLoading || resetPwLoading) ? "#f3f4f6" : "#fff7ed",
            border: "1.5px solid #fed7aa",
            borderRadius: 8,
            cursor: resetPwLoading ? "wait" : "pointer",
          }}
        >
          {resetPwLoading ? "Resetting…" : "🔑 Reset Demo Passwords"}
        </button>
      </div>

      {result && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 8,
            background: result.ok ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${result.ok ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          {result.ok ? (
            <>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#14532d" }}>
                {result.email
                  ? (result.alreadyExists ? "✓ Demo clinic already exists" : "✓ Demo clinic created!")
                  : "✓ Done"}
              </p>
              <p style={{ margin: "8px 0 12px", fontSize: 13, color: "#166534" }}>
                {result.message}
              </p>
              {result.email && (
                <div
                  style={{
                    padding: 12,
                    background: "#fff",
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: "monospace",
                    border: "1px solid #d1fae5",
                  }}
                >
                  <div>📧 Email: <strong>{result.email}</strong></div>
                  <div>🔑 Password: <strong>{result.password}</strong></div>
                  <div style={{ marginTop: 8 }}>
                    <a href="/login" target="_blank" style={{ color: "#2d6a4f", fontWeight: 600 }}>
                      Open login page →
                    </a>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#991b1b" }}>
                ✗ Seed failed
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#b91c1c", fontFamily: "monospace" }}>
                {result.error}
              </p>
            </>
          )}
        </div>
      )}

      <DemoCredentialsPanel />
    </div>
  );
}

// ─── All Demo Login Credentials Panel ──────────────────────────────────

const DEMO_LOGINS: { role: string; name: string; email: string }[] = [
  { role: "🏥 Clinic Admin", name: "Demo Admin",        email: "demo@ayurgate.com" },
  { role: "👨‍⚕️ Doctor",        name: "Dr. Priya Nair",   email: "priya@demo-clinic.sg" },
  { role: "👨‍⚕️ Doctor",        name: "Dr. Rajan Kumar",  email: "rajan@demo-clinic.sg" },
  { role: "💆 Therapist",      name: "Aisha Fernandez",  email: "aisha@demo-clinic.sg" },
  { role: "💆 Therapist",      name: "Lim Wei Jie",      email: "weijie@demo-clinic.sg" },
  { role: "💆 Therapist",      name: "Meera Sharma",     email: "meera@demo-clinic.sg" },
  { role: "💆 Therapist",      name: "Ahmad Bin Ismail", email: "ahmad@demo-clinic.sg" },
  { role: "💆 Therapist",      name: "Sushila Tamang",   email: "sushila@demo-clinic.sg" },
  { role: "📞 Receptionist",   name: "Tan Mei Ling",     email: "meiling@demo-clinic.sg" },
];
const DEMO_PASSWORD = "Demo2026!";

function DemoCredentialsPanel() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(c => (c === key ? null : c)), 1500);
  }

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px dashed #e5e7eb" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 600,
          color: "#1e3a8a",
          background: open ? "#dbeafe" : "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 6,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{open ? "▼" : "▶"}</span>
        <span>{open ? "Hide" : "Show"} all demo login credentials</span>
        <span style={{ background: "#1e40af", color: "#fff", fontSize: 11, padding: "1px 6px", borderRadius: 10, marginLeft: 4 }}>
          {DEMO_LOGINS.length}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 12, padding: 16, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4b5563" }}>
            All staff use the same password: <code style={{ background: "#fff", padding: "2px 8px", borderRadius: 4, border: "1px solid #d1d5db", fontWeight: 700 }}>{DEMO_PASSWORD}</code>
            <button
              type="button"
              onClick={() => copy(DEMO_PASSWORD, "pw")}
              style={{ marginLeft: 8, padding: "2px 8px", fontSize: 11, fontWeight: 600, background: "#fff", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer" }}
            >
              {copied === "pw" ? "✓ Copied" : "Copy"}
            </button>
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fff", borderBottom: "1.5px solid #e5e7eb" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151" }}>Role</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151" }}>Name</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151" }}>Email</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_LOGINS.map((u) => (
                  <tr key={u.email} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 10px" }}>{u.role}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 600, color: "#111827" }}>{u.name}</td>
                    <td style={{ padding: "8px 10px", color: "#374151", fontFamily: "monospace", fontSize: 12 }}>{u.email}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <button
                        type="button"
                        onClick={() => copy(u.email, u.email)}
                        style={{ padding: "2px 8px", fontSize: 11, fontWeight: 600, background: "#fff", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", color: "#374151" }}
                      >
                        {copied === u.email ? "✓ Copied" : "Copy email"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#6b7280" }}>
            🔑 Super Admin (this panel): <code style={{ background: "#fff", padding: "1px 6px", borderRadius: 3 }}>info@ayurgate.com</code> /{" "}
            <code style={{ background: "#fff", padding: "1px 6px", borderRadius: 3 }}>Veda@2026</code> ·{" "}
            Login URL: <a href="/login" target="_blank" style={{ color: "#1d4ed8", fontWeight: 600 }}>/login</a>
          </p>
        </div>
      )}
    </div>
  );
}
