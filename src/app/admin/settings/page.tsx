"use client";

import { useState, useEffect, useCallback } from "react";
import AdminTabs from "@/components/AdminTabs";

// ─── Types ──────────────────────────────────────────────────────────────────
interface ClinicSettingsData {
  clinicName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  gstNumber: string;
  taxTerms: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  defaultAppointmentDuration: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: ClinicSettingsData = {
  clinicName: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  website: "",
  gstNumber: "",
  taxTerms: "",
  currency: "SGD",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  defaultAppointmentDuration: "30",
  workingHoursStart: "08:00",
  workingHoursEnd: "18:00",
  workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
};

const ALL_DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};
const inputStyle: React.CSSProperties = {
  border: "1px solid var(--grey-400)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-900)",
  background: "var(--white)",
  fontSize: "13px",
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function ClinicSettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<ClinicSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchSettings = useCallback(() => {
    setLoading(true);
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        // Map API field names to frontend field names
        const numToDayMap: Record<number, string> = { 0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday", 6: "saturday" };
        let workingDays = DEFAULT_SETTINGS.workingDays;
        try {
          const parsed = JSON.parse(data.workingDays || "[]");
          if (Array.isArray(parsed)) workingDays = parsed.map((n: number) => numToDayMap[n] || "monday");
        } catch { /* use default */ }
        setSettings({
          clinicName: data.clinicName || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          zip: data.zipCode || "",
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
          gstNumber: data.gstRegistrationNo || "",
          taxTerms: data.termsAndConditions || "",
          currency: data.currency || "SGD",
          dateFormat: data.dateFormat || "DD/MM/YYYY",
          timeFormat: data.timeFormat || "12h",
          defaultAppointmentDuration: String(data.appointmentDuration || 30),
          workingHoursStart: data.workingHoursStart || "09:00",
          workingHoursEnd: data.workingHoursEnd || "18:00",
          workingDays,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSave = () => {
    setSaving(true);
    // Map frontend field names to API field names
    const dayMap: Record<string, number> = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
    const payload = {
      clinicName: settings.clinicName,
      address: settings.address,
      city: settings.city,
      state: settings.state,
      zipCode: settings.zip,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      gstRegistrationNo: settings.gstNumber,
      termsAndConditions: settings.taxTerms,
      currency: settings.currency,
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      appointmentDuration: parseInt(settings.defaultAppointmentDuration) || 30,
      workingHoursStart: settings.workingHoursStart,
      workingHoursEnd: settings.workingHoursEnd,
      workingDays: JSON.stringify(settings.workingDays.map(d => dayMap[d] ?? 1)),
    };
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to save settings");
        return r.json();
      })
      .then(() => setToast({ message: "Clinic settings saved successfully", type: "success" }))
      .catch(() => setToast({ message: "Failed to save settings. Please try again.", type: "error" }))
      .finally(() => setSaving(false));
  };

  const updateField = (field: keyof ClinicSettingsData, value: string | string[]) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const toggleDay = (dayKey: string) => {
    setSettings(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(dayKey)
        ? prev.workingDays.filter(d => d !== dayKey)
        : [...prev.workingDays, dayKey],
    }));
  };

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-56 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-48 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[200] px-4 py-3 rounded shadow-lg yoda-slide-in" style={{ background: toast.type === "success" ? "#e8f5e9" : "#ffebee", color: toast.type === "success" ? "#2e7d32" : "var(--red)", border: `1px solid ${toast.type === "success" ? "#a5d6a7" : "#ef9a9a"}` }}>
          <p className="text-[13px] font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Clinic Settings</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            Configure your clinic information, tax settings, and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 text-white px-5 py-2 text-[13px] font-semibold rounded disabled:opacity-50"
          style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Save Changes
            </>
          )}
        </button>
      </div>

      <AdminTabs />

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-48 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      ) : (
        <div className="space-y-6">
          {/* ── Clinic Information ──────────────────────────────────────── */}
          <div className="p-5" style={cardStyle}>
            <h2 className="text-[15px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Clinic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Clinic Name</label>
                <input type="text" value={settings.clinicName} onChange={e => updateField("clinicName", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="Ayurveda Wellness Clinic" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Address</label>
                <input type="text" value={settings.address} onChange={e => updateField("address", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="123 Wellness Street" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>City</label>
                <input type="text" value={settings.city} onChange={e => updateField("city", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="Singapore" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>State</label>
                <input type="text" value={settings.state} onChange={e => updateField("state", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="Singapore" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Zip / Postal Code</label>
                <input type="text" value={settings.zip} onChange={e => updateField("zip", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="123456" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Phone</label>
                <input type="text" value={settings.phone} onChange={e => updateField("phone", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="+65 1234 5678" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Email</label>
                <input type="email" value={settings.email} onChange={e => updateField("email", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="clinic@example.com" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Website</label>
                <input type="text" value={settings.website} onChange={e => updateField("website", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="https://www.example.com" />
              </div>
            </div>
          </div>

          {/* ── GST & Tax ──────────────────────────────────────────────── */}
          <div className="p-5" style={cardStyle}>
            <h2 className="text-[15px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>GST & Tax</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>GST Number</label>
                <input type="text" value={settings.gstNumber} onChange={e => updateField("gstNumber", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="GST-XXXXXXXXX" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Tax Terms & Conditions</label>
                <textarea value={settings.taxTerms} onChange={e => updateField("taxTerms", e.target.value)} className="w-full px-3 py-2" rows={3} style={{ ...inputStyle, resize: "vertical" as const }} placeholder="Enter tax-related terms and conditions..." />
              </div>
            </div>
          </div>

          {/* ── Preferences ────────────────────────────────────────────── */}
          <div className="p-5" style={cardStyle}>
            <h2 className="text-[15px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Currency</label>
                <select value={settings.currency} onChange={e => updateField("currency", e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                  <option value="SGD">S$ — SGD</option>
                  <option value="USD">$ — USD</option>
                  <option value="INR">&#8377; — INR</option>
                  <option value="MYR">RM — MYR</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Date Format</label>
                <select value={settings.dateFormat} onChange={e => updateField("dateFormat", e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Time Format</label>
                <select value={settings.timeFormat} onChange={e => updateField("timeFormat", e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                  <option value="12h">12-hour</option>
                  <option value="24h">24-hour</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Default Appointment Duration</label>
                <select value={settings.defaultAppointmentDuration} onChange={e => updateField("defaultAppointmentDuration", e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Working Hours Start</label>
                <input type="time" value={settings.workingHoursStart} onChange={e => updateField("workingHoursStart", e.target.value)} className="w-full px-3 py-2" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Working Hours End</label>
                <input type="time" value={settings.workingHoursEnd} onChange={e => updateField("workingHoursEnd", e.target.value)} className="w-full px-3 py-2" style={inputStyle} />
              </div>
            </div>

            {/* Working Days */}
            <div className="mt-5">
              <label className="block text-[12px] font-semibold mb-2" style={{ color: "var(--grey-700)" }}>Working Days</label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map(day => {
                  const active = settings.workingDays.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      onClick={() => toggleDay(day.key)}
                      className="px-4 py-2 text-[12px] font-semibold rounded transition-colors"
                      style={{
                        background: active ? "var(--blue-500)" : "var(--grey-100)",
                        color: active ? "var(--white)" : "var(--grey-600)",
                        border: active ? "1px solid var(--blue-500)" : "1px solid var(--grey-300)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 text-white px-6 py-2.5 text-[13px] font-semibold rounded disabled:opacity-50"
              style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
