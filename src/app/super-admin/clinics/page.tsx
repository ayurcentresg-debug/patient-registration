"use client";

import { useEffect, useState } from "react";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";
import { CLINIC_TYPES } from "@/lib/country-data";

interface ClinicData {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  country: string;
  city: string | null;
  clinicType: string | null;
  createdAt: string;
  subscription: {
    plan: string;
    status: string;
    trialEndsAt: string | null;
    maxUsers: number;
    maxPatients: number;
  } | null;
  stats: {
    users: number;
    patients: number;
    appointments: number;
  };
}

function getTrialInfo(sub: ClinicData["subscription"]): { label: string; color: string; bgColor: string } {
  if (!sub) return { label: "No Plan", color: "#6b7280", bgColor: "#f3f4f6" };

  if (sub.plan !== "trial") {
    const colors: Record<string, { color: string; bgColor: string }> = {
      starter: { color: "#2563eb", bgColor: "#eff6ff" },
      professional: { color: "#7c3aed", bgColor: "#f5f3ff" },
      enterprise: { color: "#be185d", bgColor: "#fdf2f8" },
    };
    const c = colors[sub.plan] || { color: "#374151", bgColor: "#f3f4f6" };
    return { label: sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1), ...c };
  }

  if (!sub.trialEndsAt) return { label: "Trial", color: "#059669", bgColor: "#ecfdf5" };

  const now = new Date();
  const ends = new Date(sub.trialEndsAt);
  const daysLeft = Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return { label: "Expired", color: "#dc2626", bgColor: "#fef2f2" };
  if (daysLeft <= 2) return { label: `${daysLeft}d left`, color: "#ea580c", bgColor: "#fff7ed" };
  return { label: `${daysLeft}d left`, color: "#059669", bgColor: "#ecfdf5" };
}

export default function SuperAdminClinicsPage() {
  const [clinics, setClinics] = useState<ClinicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState("all");

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkDays, setBulkDays] = useState(7);
  const [bulkPlan, setBulkPlan] = useState("starter");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ message: string; results?: { name: string; success: boolean; message: string }[] } | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadClinics = () => {
    setLoading(true);
    fetch("/api/clinic/list")
      .then((r) => r.json())
      .then((data) => {
        if (data.clinics) setClinics(data.clinics);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadClinics(); }, []);

  const filtered = clinics.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.city || "").toLowerCase().includes(search.toLowerCase());
    const matchesPlan =
      planFilter === "all" ||
      (planFilter === "trial" && c.subscription?.plan === "trial") ||
      (planFilter === "expired" && c.subscription?.plan === "trial" && c.subscription?.trialEndsAt && new Date(c.subscription.trialEndsAt) < new Date()) ||
      (planFilter === "starter" && c.subscription?.plan === "starter") ||
      (planFilter === "professional" && c.subscription?.plan === "professional") ||
      (planFilter === "enterprise" && c.subscription?.plan === "enterprise") ||
      (planFilter === "none" && !c.subscription);
    return matchesSearch && matchesPlan;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds(new Set());
    setBulkAction(null);
    setBulkResult(null);
  };

  const executeBulk = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const payload: Record<string, unknown> = { action: bulkAction, clinicIds: Array.from(selectedIds) };
      if (bulkAction === "extend_trial") payload.days = bulkDays;
      if (bulkAction === "change_plan") payload.plan = bulkPlan;
      if (bulkAction === "activate") { payload.action = "toggle_active"; payload.active = true; }
      if (bulkAction === "deactivate") { payload.action = "toggle_active"; payload.active = false; }

      const res = await fetch("/api/super-admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setBulkResult({ message: data.message, results: data.results });
        loadClinics();
      } else {
        setBulkResult({ message: data.error || "Operation failed" });
      }
    } catch {
      setBulkResult({ message: "Network error" });
    } finally {
      setBulkLoading(false);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/super-admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_csv" }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clinics-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const planCounts = {
    all: clinics.length,
    trial: clinics.filter((c) => c.subscription?.plan === "trial").length,
    expired: clinics.filter((c) => c.subscription?.plan === "trial" && c.subscription?.trialEndsAt && new Date(c.subscription.trialEndsAt) < new Date()).length,
    starter: clinics.filter((c) => c.subscription?.plan === "starter").length,
    professional: clinics.filter((c) => c.subscription?.plan === "professional").length,
    enterprise: clinics.filter((c) => c.subscription?.plan === "enterprise").length,
    none: clinics.filter((c) => !c.subscription).length,
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <SuperAdminSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Loading clinics...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar />

      <div style={{ flex: 1, background: "#f9fafb", overflow: "auto" }}>
        {/* Header */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Clinics</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
              {clinics.length} registered clinic{clinics.length !== 1 ? "s" : ""}
              {selectedIds.size > 0 && <span style={{ color: "#14532d", fontWeight: 600 }}> &middot; {selectedIds.size} selected</span>}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={exportCSV}
              disabled={exporting}
              style={{
                padding: "10px 18px", fontSize: 13, fontWeight: 600, borderRadius: 10,
                border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151",
                cursor: exporting ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
            <button
              onClick={() => bulkMode ? exitBulkMode() : setBulkMode(true)}
              style={{
                padding: "10px 18px", fontSize: 13, fontWeight: 600, borderRadius: 10,
                border: bulkMode ? "1.5px solid #dc2626" : "1.5px solid #14532d",
                background: bulkMode ? "#fef2f2" : "#14532d",
                color: bulkMode ? "#dc2626" : "#fff",
                cursor: "pointer",
              }}
            >
              {bulkMode ? "Cancel Bulk" : "Bulk Actions"}
            </button>
            <input
              type="text"
              placeholder="Search clinics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "10px 16px", fontSize: 14, borderRadius: 10,
                border: "1.5px solid #e5e7eb", background: "#fafafa",
                outline: "none", width: 220, boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#2d6a4f"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(45,106,79,0.08)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>
        </div>

        {/* Plan Filter Chips */}
        <div style={{ padding: "16px 32px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {([
            { key: "all", label: "All" },
            { key: "trial", label: "Trial" },
            { key: "expired", label: "Expired" },
            { key: "starter", label: "Starter" },
            { key: "professional", label: "Professional" },
            { key: "enterprise", label: "Enterprise" },
            { key: "none", label: "No Plan" },
          ] as { key: string; label: string }[]).map((f) => (
            <button
              key={f.key}
              onClick={() => setPlanFilter(f.key)}
              style={{
                padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 20,
                border: planFilter === f.key ? "1.5px solid #14532d" : "1.5px solid #e5e7eb",
                background: planFilter === f.key ? "#ecfdf5" : "#fff",
                color: planFilter === f.key ? "#14532d" : "#6b7280",
                cursor: "pointer",
              }}
            >
              {f.label} ({planCounts[f.key as keyof typeof planCounts] || 0})
            </button>
          ))}
        </div>

        {/* Bulk Action Bar */}
        {bulkMode && (
          <div style={{ margin: "16px 32px 0", padding: "16px 20px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button
              onClick={selectAll}
              style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1px solid #86efac", background: "#fff", color: "#14532d", cursor: "pointer" }}
            >
              {selectedIds.size === filtered.length ? "Deselect All" : "Select All"}
            </button>

            <div style={{ height: 24, width: 1, background: "#bbf7d0" }} />

            <select
              value={bulkAction || ""}
              onChange={(e) => { setBulkAction(e.target.value || null); setBulkResult(null); }}
              style={{ padding: "6px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #86efac", background: "#fff", color: "#111", cursor: "pointer" }}
            >
              <option value="">Choose action...</option>
              <option value="extend_trial">Extend Trial</option>
              <option value="change_plan">Change Plan</option>
              <option value="activate">Activate</option>
              <option value="deactivate">Deactivate</option>
            </select>

            {bulkAction === "extend_trial" && (
              <select
                value={bulkDays}
                onChange={(e) => setBulkDays(parseInt(e.target.value))}
                style={{ padding: "6px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #86efac", background: "#fff" }}
              >
                {[7, 14, 30, 60, 90].map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            )}

            {bulkAction === "change_plan" && (
              <select
                value={bulkPlan}
                onChange={(e) => setBulkPlan(e.target.value)}
                style={{ padding: "6px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #86efac", background: "#fff" }}
              >
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            )}

            {bulkAction && selectedIds.size > 0 && (
              <button
                onClick={executeBulk}
                disabled={bulkLoading}
                style={{
                  padding: "8px 20px", fontSize: 13, fontWeight: 700, borderRadius: 8,
                  border: "none", background: "#14532d", color: "#fff",
                  cursor: bulkLoading ? "wait" : "pointer", opacity: bulkLoading ? 0.6 : 1,
                }}
              >
                {bulkLoading ? "Processing..." : `Apply to ${selectedIds.size} clinic${selectedIds.size > 1 ? "s" : ""}`}
              </button>
            )}

            {bulkResult && (
              <div style={{ fontSize: 13, fontWeight: 600, color: bulkResult.results?.some((r) => !r.success) ? "#ea580c" : "#059669" }}>
                {bulkResult.message}
              </div>
            )}
          </div>
        )}

        {/* Bulk Results Detail */}
        {bulkResult?.results && (
          <div style={{ margin: "12px 32px 0", padding: "12px 16px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, maxHeight: 200, overflow: "auto" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>Results:</div>
            {bulkResult.results.map((r, i) => (
              <div key={i} style={{ fontSize: 13, padding: "4px 0", display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: r.success ? "#059669" : "#dc2626", fontWeight: 700 }}>{r.success ? "\u2713" : "\u2717"}</span>
                <span style={{ fontWeight: 600, color: "#111" }}>{r.name}</span>
                <span style={{ color: "#6b7280" }}>{r.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Clinics List */}
        <div style={{ padding: "20px 32px 32px" }}>
          {filtered.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              {search ? "No clinics match your search." : "No clinics registered yet."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Column Headers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: bulkMode ? "36px 2fr 1fr 1.5fr 1fr 1fr 1fr 0.8fr 40px" : "2fr 1fr 1.5fr 1fr 1fr 1fr 0.8fr 40px",
                gap: 16, padding: "0 24px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px",
              }}>
                {bulkMode && <div />}
                <div>Clinic</div>
                <div>Type</div>
                <div>Contact</div>
                <div>Plan</div>
                <div>Usage</div>
                <div>Appts</div>
                <div>Joined</div>
                <div />
              </div>

              {filtered.map((clinic) => {
                const trial = getTrialInfo(clinic.subscription);
                const isExpanded = expandedId === clinic.id;
                const isSelected = selectedIds.has(clinic.id);

                return (
                  <div
                    key={clinic.id}
                    style={{
                      background: isSelected ? "#f0fdf4" : "#fff",
                      borderRadius: 14,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      border: isSelected ? "1.5px solid #86efac" : "1px solid #f3f4f6",
                      overflow: "hidden",
                      transition: "all 0.2s",
                    }}
                  >
                    {/* Clinic Row */}
                    <div
                      style={{
                        padding: "18px 24px",
                        display: "grid",
                        gridTemplateColumns: bulkMode ? "36px 2fr 1fr 1.5fr 1fr 1fr 1fr 0.8fr 40px" : "2fr 1fr 1.5fr 1fr 1fr 1fr 0.8fr 40px",
                        alignItems: "center",
                        gap: 16,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        if (bulkMode) {
                          toggleSelect(clinic.id);
                        } else {
                          setExpandedId(isExpanded ? null : clinic.id);
                        }
                      }}
                    >
                      {/* Checkbox */}
                      {bulkMode && (
                        <div onClick={(e) => { e.stopPropagation(); toggleSelect(clinic.id); }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 6,
                            border: isSelected ? "2px solid #14532d" : "2px solid #d1d5db",
                            background: isSelected ? "#14532d" : "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", transition: "all 0.15s",
                          }}>
                            {isSelected && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Name + Email */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{clinic.name}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{clinic.email}</div>
                      </div>

                      {/* Type */}
                      <div>
                        {clinic.clinicType ? (
                          <span style={{
                            display: "inline-block", padding: "3px 10px", borderRadius: 20,
                            fontSize: 11, fontWeight: 600, background: "#f0fdf4", color: "#14532d",
                          }}>
                            {CLINIC_TYPES.find(t => t.value === clinic.clinicType)?.label?.replace(" Clinic", "").replace(" Centre", "").replace(" Therapy", "") || clinic.clinicType}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#d1d5db" }}>-</span>
                        )}
                      </div>

                      {/* Phone + Location */}
                      <div>
                        <div style={{ fontSize: 13, color: "#374151" }}>{clinic.phone || "-"}</div>
                        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                          {[clinic.city, clinic.country].filter(Boolean).join(", ")}
                        </div>
                      </div>

                      {/* Plan */}
                      <div>
                        <span style={{
                          display: "inline-block", padding: "4px 12px", borderRadius: 20,
                          fontSize: 11, fontWeight: 700, background: trial.bgColor, color: trial.color,
                        }}>
                          {trial.label}
                        </span>
                      </div>

                      {/* Usage */}
                      <div style={{ fontSize: 13, color: "#374151" }}>
                        <div>{clinic.stats.users} users</div>
                        <div style={{ color: "#9ca3af", marginTop: 2, fontSize: 12 }}>{clinic.stats.patients} patients</div>
                      </div>

                      {/* Appointments */}
                      <div style={{ fontSize: 13, color: "#374151" }}>{clinic.stats.appointments}</div>

                      {/* Registered */}
                      <div style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>
                        {new Date(clinic.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>

                      {/* Expand arrow */}
                      {!bulkMode && (
                        <div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}
                            style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </div>
                      )}
                      {bulkMode && <div />}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && !bulkMode && (
                      <div style={{ padding: "20px 24px", borderTop: "1px solid #f3f4f6", background: "#fafafa", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Clinic Details
                          </div>
                          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                            <div><strong>Slug:</strong> {clinic.slug}</div>
                            <div><strong>Email:</strong> {clinic.email}</div>
                            <div><strong>Phone:</strong> {clinic.phone || "-"}</div>
                            <div><strong>Location:</strong> {[clinic.city, clinic.country].filter(Boolean).join(", ") || "-"}</div>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Subscription
                          </div>
                          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                            <div><strong>Plan:</strong> {clinic.subscription?.plan || "None"}</div>
                            <div><strong>Status:</strong> {clinic.subscription?.status || "N/A"}</div>
                            <div><strong>Max Users:</strong> {clinic.subscription?.maxUsers ?? "-"}</div>
                            <div><strong>Max Patients:</strong> {clinic.subscription?.maxPatients ?? "-"}</div>
                            {clinic.subscription?.trialEndsAt && (
                              <div>
                                <strong>Trial Ends:</strong>{" "}
                                {new Date(clinic.subscription.trialEndsAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Usage
                          </div>
                          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                            <div><strong>Users:</strong> {clinic.stats.users}</div>
                            <div><strong>Patients:</strong> {clinic.stats.patients}</div>
                            <div><strong>Appointments:</strong> {clinic.stats.appointments}</div>
                            <div><strong>Registered:</strong> {new Date(clinic.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
                          </div>
                        </div>
                        <div style={{ gridColumn: "1 / -1", paddingTop: 12, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
                          <a
                            href={`/super-admin/clinics/${clinic.id}`}
                            style={{
                              padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                              background: "#14532d", color: "#fff", textDecoration: "none",
                            }}
                          >
                            View Details & Manage
                          </a>
                        </div>
                      </div>
                    )}
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
