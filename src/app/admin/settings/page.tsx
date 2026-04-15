"use client";

import { useState, useEffect, useCallback } from "react";
import AdminTabs from "@/components/AdminTabs";

// ─── Types ──────────────────────────────────────────────────────────────────
interface ClinicSettingsData {
  clinicName: string;
  logoUrl: string;
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
  logoUrl: "",
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
  fontSize: "15px",
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
          logoUrl: data.logoUrl || "",
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
      logoUrl: settings.logoUrl,
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

  // Resize image to max 512x512 and compress to JPEG/PNG data URL
  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setToast({ message: "Please select an image file (PNG, JPG, SVG)", type: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: "Image too large. Max 5MB.", type: "error" });
      return;
    }
    // For SVG, store as-is (already tiny)
    if (file.type === "image/svg+xml") {
      const text = await file.text();
      const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
      setSettings(prev => ({ ...prev, logoUrl: dataUrl }));
      setToast({ message: "Logo uploaded. Click Save Changes to apply.", type: "success" });
      return;
    }
    // For raster images: resize via canvas to max 512x512, export PNG
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 512;
        let w = img.width;
        let h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * (MAX / w)); w = MAX; }
          else { w = Math.round(w * (MAX / h)); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/png");
        setSettings(prev => ({ ...prev, logoUrl: dataUrl }));
        setToast({ message: "Logo uploaded. Click Save Changes to apply.", type: "success" });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setSettings(prev => ({ ...prev, logoUrl: "" }));
    setToast({ message: "Logo removed. Click Save Changes to apply.", type: "success" });
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
          <p className="text-[15px] font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Clinic Settings</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            Configure your clinic information, tax settings, and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 text-white px-5 py-2 text-[15px] font-semibold rounded disabled:opacity-50"
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
          {/* ── Branding ────────────────────────────────────────────────── */}
          <div id="branding" className="p-5" style={cardStyle}>
            <h2 className="text-[17px] font-bold mb-1" style={{ color: "var(--grey-900)" }}>Branding</h2>
            <p className="text-[13px] mb-4" style={{ color: "var(--grey-600)" }}>
              Your clinic logo appears in the top-right avatar, on invoices, prescriptions, and patient-facing emails.
            </p>
            <div className="flex items-center gap-5">
              {/* Preview */}
              <div style={{
                width: 96, height: 96, borderRadius: 12,
                border: "1px dashed var(--grey-400)",
                background: "var(--grey-50, #fafafa)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0
              }}>
                {settings.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.logoUrl} alt="Clinic logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ fontSize: 12, color: "var(--grey-500)", textAlign: "center", padding: 8 }}>No logo</div>
                )}
              </div>
              {/* Controls */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 mb-2">
                  <label
                    className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-semibold cursor-pointer"
                    style={{ background: "var(--blue-500)", color: "#fff", borderRadius: "var(--radius-sm)" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    {settings.logoUrl ? "Replace logo" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {settings.logoUrl && (
                    <button
                      onClick={removeLogo}
                      className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-semibold"
                      style={{ background: "transparent", color: "var(--red, #dc2626)", border: "1px solid var(--red, #dc2626)", borderRadius: "var(--radius-sm)" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[12px]" style={{ color: "var(--grey-600)" }}>
                  PNG, JPG, SVG or WebP. Max 5MB. Square images work best — large images are auto-resized to 512×512.
                </p>
              </div>
            </div>
          </div>

          {/* ── Clinic Information ──────────────────────────────────────── */}
          <div className="p-5" style={cardStyle}>
            <h2 className="text-[17px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Clinic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Clinic Name</label>
                <input type="text" value={settings.clinicName} onChange={e => updateField("clinicName", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="Ayur Centre Pte. Ltd." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Address</label>
                <input type="text" value={settings.address} onChange={e => updateField("address", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="123 Wellness Street" />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>City</label>
                <input type="text" value={settings.city} onChange={e => updateField("city", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="Singapore" />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>State</label>
                <input type="text" value={settings.state} onChange={e => updateField("state", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="Singapore" />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Zip / Postal Code</label>
                <input type="text" value={settings.zip} onChange={e => updateField("zip", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="123456" />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Phone</label>
                <input type="text" value={settings.phone} onChange={e => updateField("phone", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="+65 1234 5678" />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Email</label>
                <input type="email" value={settings.email} onChange={e => updateField("email", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="clinic@example.com" />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Website</label>
                <input type="text" value={settings.website} onChange={e => updateField("website", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="https://www.example.com" />
              </div>
            </div>
          </div>

          {/* ── GST & Tax ──────────────────────────────────────────────── */}
          <div className="p-5" style={cardStyle}>
            <h2 className="text-[17px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>GST & Tax</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>GST Number</label>
                <input type="text" value={settings.gstNumber} onChange={e => updateField("gstNumber", e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="GST-XXXXXXXXX" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Tax Terms & Conditions</label>
                <textarea value={settings.taxTerms} onChange={e => updateField("taxTerms", e.target.value)} className="w-full px-3 py-2" rows={3} style={{ ...inputStyle, resize: "vertical" as const }} placeholder="Enter tax-related terms and conditions..." />
              </div>
            </div>
          </div>

          {/* ── Preferences ────────────────────────────────────────────── */}
          <div className="p-5" style={cardStyle}>
            <h2 className="text-[17px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Currency</label>
                <select value={settings.currency} onChange={e => updateField("currency", e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                  <option value="SGD">S$ — SGD</option>
                  <option value="USD">$ — USD</option>
                  <option value="INR">&#8377; — INR</option>
                  <option value="MYR">RM — MYR</option>
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Date Format</label>
                <select value={settings.dateFormat} onChange={e => updateField("dateFormat", e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Time Format</label>
                <select value={settings.timeFormat} onChange={e => updateField("timeFormat", e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                  <option value="12h">12-hour</option>
                  <option value="24h">24-hour</option>
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Default Appointment Duration</label>
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
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Working Hours Start</label>
                <input type="time" value={settings.workingHoursStart} onChange={e => updateField("workingHoursStart", e.target.value)} className="w-full px-3 py-2" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Working Hours End</label>
                <input type="time" value={settings.workingHoursEnd} onChange={e => updateField("workingHoursEnd", e.target.value)} className="w-full px-3 py-2" style={inputStyle} />
              </div>
            </div>

            {/* Working Days */}
            <div className="mt-5">
              <label className="block text-[14px] font-semibold mb-2" style={{ color: "var(--grey-700)" }}>Working Days</label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map(day => {
                  const active = settings.workingDays.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      onClick={() => toggleDay(day.key)}
                      className="px-4 py-2 text-[14px] font-semibold rounded transition-colors"
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
              className="inline-flex items-center gap-2 text-white px-6 py-2.5 text-[15px] font-semibold rounded disabled:opacity-50"
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
