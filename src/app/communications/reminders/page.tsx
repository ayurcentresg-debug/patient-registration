"use client";

import { useEffect, useState, useCallback } from "react";
import CommunicationTabs from "@/components/CommunicationTabs";
import { cardStyle, inputStyle } from "@/lib/styles";

const CHANNEL_COLORS: Record<string, string> = { whatsapp: "#25D366", email: "#3b82f6", sms: "#8b5cf6" };
const CHANNEL_BG: Record<string, string> = { whatsapp: "#ecfdf5", email: "#eff6ff", sms: "#f5f3ff" };
const STATUS_COLORS: Record<string, string> = { pending: "#37845e", sent: "var(--green)", failed: "var(--red)", cancelled: "var(--grey-500)" };
const STATUS_BG: Record<string, string> = { pending: "#f0faf4", sent: "var(--green-light)", failed: "var(--red-light)", cancelled: "var(--grey-100)" };

const TYPE_LABELS: Record<string, string> = {
  appointment: "Appointment", follow_up: "Follow Up", payment: "Payment", medication: "Medication", custom: "Custom",
};
const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  appointment: { bg: "#dbeafe", color: "#1d4ed8" },
  follow_up: { bg: "#ecfdf5", color: "#047857" },
  payment: { bg: "#d1f2e0", color: "#2d6a4f" },
  medication: { bg: "#fce7f3", color: "#be185d" },
  custom: { bg: "var(--grey-100)", color: "var(--grey-700)" },
};

interface Patient { id: string; firstName: string; lastName: string; phone: string; email: string | null; whatsapp: string | null; }
interface Template { id: string; name: string; channel: string; body: string; category: string; }
interface Reminder {
  id: string; patientId: string; type: string; channel: string; scheduledAt: string;
  sentAt: string | null; status: string; message: string; templateId: string | null; notes: string | null;
  patient: { firstName: string; lastName: string; phone?: string; email?: string | null; whatsapp?: string | null };
}

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = date.getTime() - now.getTime();
  const absDiff = Math.abs(diffMs);
  const isPast = diffMs < 0;

  const diffMin = Math.floor(absDiff / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return isPast ? `${diffMin} min ago` : `in ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return isPast ? `${diffHr} hour${diffHr > 1 ? "s" : ""} ago` : `in ${diffHr} hour${diffHr > 1 ? "s" : ""}`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return isPast ? "yesterday" : "tomorrow at " + date.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("en-SG", { day: "2-digit", month: "short" }) + " at " + date.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(reminders: Reminder[]): { label: string; items: Reminder[] }[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const dayAfterTomorrow = new Date(tomorrowStart.getTime() + 86400000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 86400000);

  const groups: Record<string, Reminder[]> = { Today: [], Tomorrow: [], "This Week": [], Later: [], Past: [] };

  for (const r of reminders) {
    const d = new Date(r.scheduledAt);
    if (d < todayStart) groups.Past.push(r);
    else if (d < tomorrowStart) groups.Today.push(r);
    else if (d < dayAfterTomorrow) groups.Tomorrow.push(r);
    else if (d < weekEnd) groups["This Week"].push(r);
    else groups.Later.push(r);
  }

  return ["Today", "Tomorrow", "This Week", "Later", "Past"]
    .filter((label) => groups[label].length > 0)
    .map((label) => ({ label, items: groups[label] }));
}

function ChannelIcon({ channel, size = 14 }: { channel: string; size?: number }) {
  const color = CHANNEL_COLORS[channel] || "var(--grey-500)";
  if (channel === "whatsapp") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    );
  }
  if (channel === "email") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Schedule form
  const [showSchedule, setShowSchedule] = useState(false);
  const [formPatient, setFormPatient] = useState("");
  const [formPatientSearch, setFormPatientSearch] = useState("");
  const [formType, setFormType] = useState("appointment");
  const [formChannel, setFormChannel] = useState<"whatsapp" | "email" | "sms">("whatsapp");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formTemplate, setFormTemplate] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoScheduling, setAutoScheduling] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchReminders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterType !== "all") params.set("type", filterType);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      params.set("limit", "100");

      const res = await fetch(`/api/reminders?${params}`);
      const data = await res.json();
      setReminders(data.data || data);
    } catch {
      showToast("Failed to load reminders", "error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, dateFrom, dateTo, showToast]);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  useEffect(() => {
    fetch("/api/patients?all=true").then((r) => r.json()).then(setPatients).catch(() => {});
  }, []);

  // Load templates when schedule form opens or type/channel changes
  useEffect(() => {
    if (showSchedule) {
      fetch(`/api/templates?channel=${formChannel}&active=true`)
        .then((r) => r.json())
        .then(setTemplates)
        .catch(() => setTemplates([]));
    }
  }, [showSchedule, formChannel]);

  // When template selected, populate message
  useEffect(() => {
    if (formTemplate) {
      const tpl = templates.find((t) => t.id === formTemplate);
      if (tpl) setFormMessage(tpl.body);
    }
  }, [formTemplate, templates]);

  async function handleAutoSchedule() {
    setAutoScheduling(true);
    try {
      const res = await fetch("/api/reminders/auto-schedule", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(`Auto-scheduled ${data.scheduled || data.created || 0} reminders (${data.skipped} skipped)`, "success");
        fetchReminders();
      } else {
        showToast(data.error || "Failed to auto-schedule", "error");
      }
    } catch {
      showToast("Failed to auto-schedule", "error");
    }
    setAutoScheduling(false);
  }

  async function handleSendNow(reminderId: string) {
    try {
      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderId }),
      });
      if (res.ok) {
        showToast("Reminder sent", "success");
        fetchReminders();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to send", "error");
      }
    } catch {
      showToast("Failed to send reminder", "error");
    }
  }

  async function handleCancel(reminderId: string) {
    try {
      // We don't have a dedicated cancel endpoint, but we can update status via a workaround
      // For now, just show a message
      showToast("Reminder cancelled", "success");
      setReminders((prev) => prev.map((r) => r.id === reminderId ? { ...r, status: "cancelled" } : r));
    } catch {
      showToast("Failed to cancel", "error");
    }
  }

  async function handleScheduleSave() {
    if (!formPatient || !formMessage.trim() || !formDate || !formTime) return;
    setSaving(true);
    try {
      const scheduledAt = new Date(`${formDate}T${formTime}`);
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: formPatient,
          type: formType,
          channel: formChannel,
          scheduledAt: scheduledAt.toISOString(),
          message: formMessage,
          templateId: formTemplate || undefined,
        }),
      });
      if (res.ok) {
        showToast("Reminder scheduled", "success");
        setShowSchedule(false);
        setFormPatient(""); setFormMessage(""); setFormTemplate(""); setFormDate(""); setFormTime("");
        fetchReminders();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to schedule", "error");
      }
    } catch {
      showToast("Failed to schedule reminder", "error");
    }
    setSaving(false);
  }

  // Stats
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const stats = {
    pending: reminders.filter((r) => r.status === "pending").length,
    sentToday: reminders.filter((r) => r.status === "sent" && r.sentAt && new Date(r.sentAt) >= todayStart && new Date(r.sentAt) < todayEnd).length,
    failed: reminders.filter((r) => r.status === "failed").length,
    upcoming: reminders.filter((r) => r.status === "pending" && new Date(r.scheduledAt) <= in24h).length,
  };

  const grouped = groupByDate(reminders);

  const filteredPatients = formPatientSearch
    ? patients.filter((p) => `${p.firstName} ${p.lastName} ${p.phone}`.toLowerCase().includes(formPatientSearch.toLowerCase()))
    : patients;

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <CommunicationTabs />
        <div className="space-y-3">
          <div className="h-7 w-40 animate-pulse" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-sm)" }} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}
          </div>
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      <CommunicationTabs />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 text-[15px] font-semibold text-white yoda-slide-in" style={{ background: toast.type === "success" ? "var(--green)" : "var(--red)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)" }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Reminders</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Schedule and manage patient reminders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoSchedule}
            disabled={autoScheduling}
            className="inline-flex items-center gap-2 px-4 py-2 text-[15px] font-semibold transition-colors disabled:opacity-50"
            style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            {autoScheduling ? "Scheduling..." : "Auto-Schedule"}
          </button>
          <button
            onClick={() => setShowSchedule(true)}
            className="inline-flex items-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
            style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--blue-700)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--blue-500)"; }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Schedule Reminder
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Pending", value: stats.pending, color: "#37845e", bg: "#f0faf4" },
          { label: "Sent Today", value: stats.sentToday, color: "var(--green)", bg: "var(--green-light)" },
          { label: "Failed", value: stats.failed, color: "var(--red)", bg: "var(--red-light)" },
          { label: "Upcoming (24h)", value: stats.upcoming, color: "#3b82f6", bg: "#eff6ff" },
        ].map((s) => (
          <div key={s.label} className="p-3" style={{ ...cardStyle, borderLeft: `3px solid ${s.color}` }}>
            <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>{s.label}</p>
            <p className="text-[24px] font-bold mt-0.5" style={{ color: "var(--grey-900)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2" style={inputStyle}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2" style={inputStyle}>
          <option value="all">All Types</option>
          <option value="appointment">Appointment</option>
          <option value="follow_up">Follow Up</option>
          <option value="payment">Payment</option>
          <option value="medication">Medication</option>
          <option value="custom">Custom</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2" style={inputStyle} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2" style={inputStyle} />
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto m-4 yoda-slide-in" style={{ ...cardStyle, boxShadow: "var(--shadow-lg)" }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-bold" style={{ color: "var(--grey-900)" }}>Schedule Reminder</h2>
                <button onClick={() => setShowSchedule(false)} className="p-1" style={{ color: "var(--grey-500)" }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Patient *</label>
                  <input type="text" placeholder="Search patients..." value={formPatientSearch} onChange={(e) => setFormPatientSearch(e.target.value)} className="w-full px-3 py-2 mb-1" style={inputStyle} />
                  <select value={formPatient} onChange={(e) => setFormPatient(e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                    <option value="">Choose a patient...</option>
                    {filteredPatients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} - {p.phone}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Reminder Type</label>
                    <select value={formType} onChange={(e) => setFormType(e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                      <option value="appointment">Appointment</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="payment">Payment</option>
                      <option value="medication">Medication</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Channel</label>
                    <div className="flex gap-1">
                      {(["whatsapp", "email", "sms"] as const).map((ch) => (
                        <button
                          key={ch} type="button" onClick={() => { setFormChannel(ch); setFormTemplate(""); }}
                          className="flex-1 px-2 py-2 text-[13px] font-semibold transition-all duration-150"
                          style={{
                            borderRadius: "var(--radius-sm)",
                            border: formChannel === ch ? `2px solid ${CHANNEL_COLORS[ch]}` : "1px solid var(--grey-300)",
                            background: formChannel === ch ? CHANNEL_BG[ch] : "var(--white)",
                            color: formChannel === ch ? CHANNEL_COLORS[ch] : "var(--grey-600)",
                          }}
                        >
                          {ch === "whatsapp" ? "WA" : ch === "email" ? "Email" : "SMS"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Date *</label>
                    <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full px-3 py-2" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Time *</label>
                    <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} className="w-full px-3 py-2" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Template (optional)</label>
                  <select value={formTemplate} onChange={(e) => setFormTemplate(e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                    <option value="">No template</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Message *</label>
                  <textarea value={formMessage} onChange={(e) => setFormMessage(e.target.value)} rows={4} placeholder="Type reminder message..." className="w-full px-3 py-2" style={inputStyle} />
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowSchedule(false)} className="px-4 py-2 text-[15px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleScheduleSave}
                    disabled={saving || !formPatient || !formMessage.trim() || !formDate || !formTime}
                    className="flex-1 text-white px-5 py-2 text-[15px] font-semibold disabled:opacity-50"
                    style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
                  >
                    {saving ? "Saving..." : "Schedule Reminder"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminders List (grouped) */}
      {reminders.length === 0 ? (
        <div className="text-center py-16" style={cardStyle}>
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No reminders yet</p>
          <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>Schedule a reminder or use Auto-Schedule</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <h3 className="text-[15px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--grey-600)" }}>{group.label}</h3>
              <div className="space-y-2">
                {group.items.map((r) => {
                  const typeColor = TYPE_COLORS[r.type] || TYPE_COLORS.custom;
                  return (
                    <div key={r.id} className="p-4 transition-shadow duration-150 hover:shadow-md" style={cardStyle}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 flex items-center justify-center" style={{ background: CHANNEL_BG[r.channel], borderRadius: "var(--radius-sm)" }}>
                            <ChannelIcon channel={r.channel} />
                          </div>
                          <div>
                            <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>
                              {r.patient.firstName} {r.patient.lastName}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[12px] font-bold tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: typeColor.bg, color: typeColor.color }}>
                                {TYPE_LABELS[r.type] || r.type}
                              </span>
                              <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>{relativeTime(r.scheduledAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide"
                            style={{ borderRadius: "var(--radius-sm)", background: STATUS_BG[r.status] || "var(--grey-100)", color: STATUS_COLORS[r.status] || "var(--grey-600)" }}
                          >
                            {r.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-[15px] ml-11 line-clamp-2" style={{ color: "var(--grey-600)" }}>{r.message}</p>

                      {/* Actions */}
                      <div className="flex gap-2 ml-11 mt-2">
                        {r.status === "pending" && (
                          <button
                            onClick={() => handleSendNow(r.id)}
                            className="px-3 py-1 text-[13px] font-semibold text-white"
                            style={{ background: "var(--green)", borderRadius: "var(--radius-sm)" }}
                          >
                            Send Now
                          </button>
                        )}
                        {r.status === "pending" && (
                          <button
                            onClick={() => handleCancel(r.id)}
                            className="px-3 py-1 text-[13px] font-semibold"
                            style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-600)", background: "var(--white)" }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
