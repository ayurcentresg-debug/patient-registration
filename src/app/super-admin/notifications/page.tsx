"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AudienceStats {
  total: number;
  trial: number;
  starter: number;
  professional: number;
  enterprise: number;
}

interface ClinicOption {
  id: string;
  name: string;
  email: string;
  plan: string;
}

interface HistoryEntry {
  id: string;
  type: string;
  subject: string;
  message: string;
  audience: string;
  sentTo: number;
  sent: number;
  failed: number;
  sentAt: string;
  clinicNames: string[];
}

const TEMPLATES = [
  {
    type: "feature",
    label: "New Feature",
    icon: "🚀",
    subject: "New Feature: [Feature Name]",
    message: "We're excited to announce a new feature in AYUR GATE!\n\n[Description of the feature and how it helps your clinic]\n\nHow to use it:\n1. [Step 1]\n2. [Step 2]\n3. [Step 3]\n\nTry it now in your dashboard!",
  },
  {
    type: "update",
    label: "System Update",
    icon: "🔄",
    subject: "System Update: Performance Improvements",
    message: "We've made several improvements to AYUR GATE:\n\n• Faster appointment loading\n• Improved search accuracy\n• Better mobile experience\n\nNo action needed — updates are applied automatically.",
  },
  {
    type: "tip",
    label: "Tip of the Week",
    icon: "💡",
    subject: "Tip: [Feature] can save you time",
    message: "Did you know?\n\n[Describe the tip and its benefit]\n\nHere's how to set it up:\n1. Go to [location]\n2. Click [button]\n3. [Result]\n\nThis feature helps clinics save an average of [X] hours per week!",
  },
  {
    type: "maintenance",
    label: "Maintenance Notice",
    icon: "🔧",
    subject: "Scheduled Maintenance: [Date]",
    message: "We'll be performing scheduled maintenance on [Date] from [Start Time] to [End Time] SGT.\n\nDuring this time:\n• The system may be briefly unavailable (estimated 10-15 minutes)\n• Your data is safe and will not be affected\n\nWe apologize for any inconvenience.",
  },
  {
    type: "announcement",
    label: "General Announcement",
    icon: "📢",
    subject: "",
    message: "",
  },
];

const FEATURE_TEMPLATES = [
  {
    subject: "New Feature: Online Patient Booking is LIVE!",
    message: "Your patients can now book appointments 24/7 — directly from your website, WhatsApp, or social media!\n\nYour unique booking link:\nhttps://www.ayurgate.com/book/[your-clinic-slug]\n\nHow it works:\n1. Patients choose their preferred doctor\n2. Pick an available date and time\n3. Enter their details and confirm\n4. Both you and the patient get a confirmation email\n\nShare this link on your website, Google Business profile, and social media to reduce phone calls and fill empty slots!",
  },
  {
    subject: "New Feature: Country-Specific Payroll",
    message: "Generate accurate payroll for Singapore, India, or Malaysia in one click!\n\nSupported calculations:\n🇸🇬 Singapore: CPF, SDL, SHG Fund\n🇮🇳 India: EPF, ESI, Professional Tax, TDS\n🇲🇾 Malaysia: EPF, SOCSO, EIS, PCB\n\nGo to Admin → Payroll to set up salary configs and generate your first payroll run.",
  },
  {
    subject: "New Feature: Staff Performance Dashboard",
    message: "Track your clinic's top performers with our new analytics dashboard!\n\nNow you can see:\n• Revenue per doctor/therapist\n• Appointment completion rates\n• Monthly trends and rankings\n• Peak hours and busy days\n\nGo to Admin → Staff → Performance to view your team's stats.",
  },
];

export default function NotificationsPage() {
  const [stats, setStats] = useState<AudienceStats | null>(null);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [tab, setTab] = useState<"compose" | "templates" | "history">("compose");
  const [type, setType] = useState("feature");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [selectedClinics, setSelectedClinics] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; sent?: number; failed?: number; error?: string } | null>(null);

  useEffect(() => {
    fetch("/api/super-admin/notifications")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.audienceStats);
        setClinics(data.clinics || []);
        setHistory(data.history || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function applyTemplate(template: typeof TEMPLATES[0]) {
    setType(template.type);
    setSubject(template.subject);
    setMessage(template.message);
    setTab("compose");
  }

  function applyFeatureTemplate(ft: typeof FEATURE_TEMPLATES[0]) {
    setType("feature");
    setSubject(ft.subject);
    setMessage(ft.message);
    setTab("compose");
  }

  async function handleSend() {
    if (!subject || !message) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/super-admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          subject,
          message,
          audience,
          clinicIds: audience === "specific" ? selectedClinics : undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        // Refresh history
        const refresh = await fetch("/api/super-admin/notifications").then((r) => r.json());
        setHistory(refresh.history || []);
      }
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setSending(false);
    }
  }

  const audienceCount =
    audience === "all" ? stats?.total || 0 :
    audience === "specific" ? selectedClinics.length :
    stats?.[audience as keyof AudienceStats] || 0;

  return (
    <div className="min-h-screen" style={{ background: "#fefbf6" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #e5e7eb", background: "white" }}>
        <div className="flex items-center gap-3">
          <Link href="/super-admin" className="text-[14px] font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100" style={{ color: "#6b7280" }}>
            ← Back
          </Link>
          <h1 className="text-[18px] font-bold" style={{ color: "#111827" }}>Notifications</h1>
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-[12px]" style={{ color: "#6b7280" }}>
            <span><strong>{stats.total}</strong> clinics</span>
            <span><strong>{stats.trial}</strong> trial</span>
            <span><strong>{stats.starter}</strong> starter</span>
            <span><strong>{stats.professional}</strong> pro</span>
          </div>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: "#f3f4f6" }}>
          {(["compose", "templates", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-md text-[13px] font-semibold transition-all"
              style={{
                background: tab === t ? "white" : "transparent",
                color: tab === t ? "#111827" : "#6b7280",
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {t === "compose" ? "📝 Compose" : t === "templates" ? "📋 Templates" : "📨 History"}
            </button>
          ))}
        </div>

        {/* Compose Tab */}
        {tab === "compose" && (
          <div className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: "#374151" }}>Notification Type</label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => setType(t.type)}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                    style={{
                      background: type === t.type ? "#14532d" : "white",
                      color: type === t.type ? "white" : "#374151",
                      border: type === t.type ? "1.5px solid #14532d" : "1.5px solid #e5e7eb",
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audience */}
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: "#374151" }}>Send To</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  { key: "all", label: `All Clinics (${stats?.total || 0})` },
                  { key: "trial", label: `Trial (${stats?.trial || 0})` },
                  { key: "starter", label: `Starter (${stats?.starter || 0})` },
                  { key: "professional", label: `Professional (${stats?.professional || 0})` },
                  { key: "specific", label: "Specific Clinics" },
                ].map((a) => (
                  <button
                    key={a.key}
                    onClick={() => setAudience(a.key)}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                    style={{
                      background: audience === a.key ? "#14532d" : "white",
                      color: audience === a.key ? "white" : "#374151",
                      border: audience === a.key ? "1.5px solid #14532d" : "1.5px solid #e5e7eb",
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              {audience === "specific" && (
                <div className="mt-2 p-3 rounded-lg max-h-40 overflow-y-auto" style={{ background: "white", border: "1px solid #e5e7eb" }}>
                  {clinics.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedClinics.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedClinics([...selectedClinics, c.id]);
                          else setSelectedClinics(selectedClinics.filter((id) => id !== c.id));
                        }}
                        className="rounded"
                      />
                      <span className="text-[13px]" style={{ color: "#374151" }}>{c.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#f3f4f6", color: "#6b7280" }}>{c.plan}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Notification subject..."
                className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
                style={{ border: "1.5px solid #e5e7eb", background: "white" }}
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your notification message..."
                rows={8}
                className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none resize-none"
                style={{ border: "1.5px solid #e5e7eb", background: "white" }}
              />
            </div>

            {/* Send */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[13px]" style={{ color: "#6b7280" }}>
                Will send to <strong>{audienceCount}</strong> clinic{audienceCount !== 1 ? "s" : ""}
              </span>
              <button
                onClick={handleSend}
                disabled={sending || !subject || !message || audienceCount === 0}
                className="px-6 py-2.5 rounded-lg text-white font-semibold text-[14px] transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "#14532d" }}
              >
                {sending ? "Sending..." : `Send Notification`}
              </button>
            </div>

            {result && (
              <div className="p-4 rounded-lg" style={{ background: result.success ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.success ? "#bbf7d0" : "#fecaca"}` }}>
                {result.success ? (
                  <p className="text-[14px]" style={{ color: "#16a34a" }}>
                    <strong>Sent!</strong> {result.sent} delivered, {result.failed} failed
                  </p>
                ) : (
                  <p className="text-[14px]" style={{ color: "#dc2626" }}>{result.error}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {tab === "templates" && (
          <div className="space-y-4">
            <h2 className="text-[16px] font-bold mb-2" style={{ color: "#111827" }}>Quick Templates</h2>
            <div className="grid gap-3">
              {TEMPLATES.filter((t) => t.subject).map((t) => (
                <button
                  key={t.type}
                  onClick={() => applyTemplate(t)}
                  className="text-left p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ background: "white", border: "1px solid #e5e7eb" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[16px]">{t.icon}</span>
                    <span className="text-[14px] font-bold" style={{ color: "#111827" }}>{t.label}</span>
                  </div>
                  <p className="text-[13px]" style={{ color: "#6b7280" }}>{t.subject}</p>
                </button>
              ))}
            </div>

            <h2 className="text-[16px] font-bold mt-6 mb-2" style={{ color: "#111827" }}>Feature Announcements</h2>
            <div className="grid gap-3">
              {FEATURE_TEMPLATES.map((ft, i) => (
                <button
                  key={i}
                  onClick={() => applyFeatureTemplate(ft)}
                  className="text-left p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ background: "white", border: "1px solid #e5e7eb" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[16px]">🚀</span>
                    <span className="text-[14px] font-bold" style={{ color: "#111827" }}>{ft.subject}</span>
                  </div>
                  <p className="text-[13px] line-clamp-2" style={{ color: "#6b7280" }}>{ft.message.substring(0, 120)}...</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {tab === "history" && (
          <div>
            {history.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[14px]" style={{ color: "#6b7280" }}>No notifications sent yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="p-4 rounded-xl" style={{ background: "white", border: "1px solid #e5e7eb" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] px-2 py-0.5 rounded-full font-medium" style={{
                          background: h.type === "feature" ? "#d1fae5" : h.type === "maintenance" ? "#fee2e2" : "#f3f4f6",
                          color: h.type === "feature" ? "#065f46" : h.type === "maintenance" ? "#dc2626" : "#374151",
                        }}>
                          {h.type}
                        </span>
                        <span className="text-[14px] font-bold" style={{ color: "#111827" }}>{h.subject}</span>
                      </div>
                      <span className="text-[12px]" style={{ color: "#9ca3af" }}>
                        {new Date(h.sentAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[13px] mb-2 line-clamp-2" style={{ color: "#6b7280" }}>{h.message}</p>
                    <div className="flex items-center gap-4 text-[12px]" style={{ color: "#6b7280" }}>
                      <span>Audience: <strong>{h.audience}</strong></span>
                      <span style={{ color: "#16a34a" }}>✓ {h.sent} sent</span>
                      {h.failed > 0 && <span style={{ color: "#dc2626" }}>✗ {h.failed} failed</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
