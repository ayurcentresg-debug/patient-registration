"use client";

import { useEffect, useState } from "react";
import CommunicationTabs from "@/components/CommunicationTabs";
import { useFlash } from "@/components/FlashCardProvider";
import { PageGuide } from "@/components/HelpTip";
import { TablePageSkeleton } from "@/components/Skeleton";
import { cardStyle, inputStyle } from "@/lib/styles";

const CHANNEL_COLORS: Record<string, string> = { whatsapp: "#25D366", email: "#3b82f6", sms: "#8b5cf6" };
const CHANNEL_BG: Record<string, string> = { whatsapp: "#ecfdf5", email: "#eff6ff", sms: "#f5f3ff" };
const STATUS_COLORS: Record<string, string> = { sent: "var(--green)", failed: "var(--red)", pending: "#37845e" };
const STATUS_BG: Record<string, string> = { sent: "var(--green-light)", failed: "var(--red-light)", pending: "#f0faf4" };

interface Patient { id: string; firstName: string; lastName: string; email: string | null; phone: string; whatsapp: string | null; }
interface Communication {
  id: string; type: string; subject: string | null; message: string; status: string; sentAt: string;
  patient: { firstName: string; lastName: string };
}
interface Template { id: string; name: string; channel: string; subject: string | null; body: string; category: string; }

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return date.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

function ChannelIcon({ channel, size = 16 }: { channel: string; size?: number }) {
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
  // SMS
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

const ITEMS_PER_PAGE = 10;

export default function MessagesPage() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);

  // Filters
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Compose form
  const [selectedPatient, setSelectedPatient] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [msgChannel, setMsgChannel] = useState<"whatsapp" | "email" | "sms">("whatsapp");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [previewText, setPreviewText] = useState("");

  // Expand
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const { showFlash } = useFlash();

  useEffect(() => {
    Promise.all([
      fetch("/api/communications").then((r) => r.json()),
      fetch("/api/patients?all=true").then((r) => r.json()),
    ])
      .then(([commsRes, pats]) => {
        setCommunications(Array.isArray(commsRes) ? commsRes : commsRes.data || []);
        setPatients(Array.isArray(pats) ? pats : pats.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load templates when channel changes in compose
  useEffect(() => {
    if (showCompose) {
      fetch(`/api/templates?channel=${msgChannel}&active=true`)
        .then((r) => r.json())
        .then(setTemplates)
        .catch(() => setTemplates([]));
    }
  }, [showCompose, msgChannel]);

  // When template selected, populate message body
  useEffect(() => {
    if (selectedTemplate) {
      const tpl = templates.find((t) => t.id === selectedTemplate);
      if (tpl) {
        setMessage(tpl.body);
        if (tpl.subject) setSubject(tpl.subject);
      }
    }
  }, [selectedTemplate, templates]);

  async function handlePreview() {
    if (!message.trim()) return;
    try {
      const res = await fetch("/api/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message }),
      });
      const data = await res.json();
      setPreviewText(data.preview || message);
    } catch {
      setPreviewText(message);
    }
  }

  async function handleSend() {
    if (!selectedPatient || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatient, type: msgChannel, subject: subject || undefined, message }),
      });
      if (res.ok) {
        const comm = await res.json();
        const pat = patients.find((p) => p.id === selectedPatient);
        setCommunications((prev) => [{ ...comm, patient: { firstName: pat?.firstName || "", lastName: pat?.lastName || "" } }, ...prev]);
        setMessage(""); setSubject(""); setSelectedPatient(""); setSelectedTemplate(""); setPreviewText("");
        setShowCompose(false);
        showFlash({ type: "success", title: "Success", message: "Message sent successfully" });
      } else {
        const err = await res.json();
        showFlash({ type: "error", title: "Error", message: err.error || "Failed to send message" });
      }
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to send message" });
    }
    setSending(false);
  }

  // Filtered messages
  const filtered = communications.filter((c) => {
    if (filterChannel !== "all" && c.type !== filterChannel) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = `${c.patient.firstName} ${c.patient.lastName}`.toLowerCase();
      if (!name.includes(q) && !c.message.toLowerCase().includes(q) && !(c.subject || "").toLowerCase().includes(q)) return false;
    }
    if (dateFrom && new Date(c.sentAt) < new Date(dateFrom)) return false;
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(c.sentAt) > to) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Stats
  const stats = {
    total: communications.length,
    whatsapp: communications.filter((c) => c.type === "whatsapp").length,
    email: communications.filter((c) => c.type === "email").length,
    sms: communications.filter((c) => c.type === "sms").length,
    failed: communications.filter((c) => c.status === "failed").length,
  };

  // Patient search filtering
  const filteredPatients = patientSearch
    ? patients.filter((p) => `${p.firstName} ${p.lastName} ${p.phone}`.toLowerCase().includes(patientSearch.toLowerCase()))
    : patients;

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <CommunicationTabs />
        <TablePageSkeleton columns={4} rows={5} filters={3} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      <CommunicationTabs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Messages</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Send and track patient communications</p>
        </div>
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
          style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--blue-700)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--blue-500)"; }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Message
        </button>
      </div>

      <PageGuide
        storageKey="communications"
        title="Communications Guide"
        subtitle="Send messages and reminders to patients via WhatsApp, SMS, or Email."
        steps={[
          { icon: "💬", title: "Send Message", description: "Click 'New Message' to send a WhatsApp, SMS, or Email to any patient. Select the patient and type." },
          { icon: "📋", title: "Templates", description: "Go to Templates tab to create reusable message templates for appointment reminders, follow-ups, etc." },
          { icon: "⏰", title: "Reminders", description: "Set up automatic appointment reminders in the Reminders tab. Choose timing (1 day before, 1 hour before)." },
          { icon: "📢", title: "Bulk Messaging", description: "Use Bulk tab to send messages to multiple patients at once — great for announcements or promotions." },
          { icon: "📊", title: "Delivery Status", description: "Track sent, delivered, and failed messages. Failed messages can be retried." },
          { icon: "📱", title: "WhatsApp Integration", description: "WhatsApp messages require a connected business number. Contact admin to set up the integration." },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Sent", value: stats.total, color: "var(--blue-500)", bg: "var(--blue-50)" },
          { label: "WhatsApp", value: stats.whatsapp, color: "#25D366", bg: "#ecfdf5" },
          { label: "Email", value: stats.email, color: "#3b82f6", bg: "#eff6ff" },
          { label: "SMS", value: stats.sms, color: "#8b5cf6", bg: "#f5f3ff" },
          { label: "Failed", value: stats.failed, color: "var(--red)", bg: "var(--red-light)" },
        ].map((s) => (
          <div key={s.label} className="p-3" style={{ ...cardStyle, borderLeft: `3px solid ${s.color}` }}>
            <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>{s.label}</p>
            <p className="text-[24px] font-bold mt-0.5" style={{ color: "var(--grey-900)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filterChannel} onChange={(e) => { setFilterChannel(e.target.value); setCurrentPage(1); }} className="px-3 py-2" style={inputStyle}>
          <option value="all">All Channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-3 py-2" style={inputStyle}>
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
        <input
          type="text" placeholder="Search patient or message..." value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 min-w-[200px]" style={inputStyle}
        />
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} className="px-3 py-2" style={inputStyle} />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} className="px-3 py-2" style={inputStyle} />
      </div>

      {/* Compose Modal/Drawer */}
      {showCompose && (
        <div className="fixed inset-0 z-40 flex justify-end" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="w-full max-w-lg h-full overflow-y-auto yoda-slide-in-right" style={{ background: "var(--white)" }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-bold" style={{ color: "var(--grey-900)" }}>New Message</h2>
                <button onClick={() => { setShowCompose(false); setPreviewText(""); }} className="p-1" style={{ color: "var(--grey-500)" }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Patient Select */}
                <div>
                  <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Select Patient *</label>
                  <input
                    type="text" placeholder="Search patients..."
                    value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full px-3 py-2 mb-1" style={inputStyle}
                  />
                  <select
                    value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full px-3 py-2" style={inputStyle} size={Math.min(filteredPatients.length + 1, 6)}
                  >
                    <option value="">Choose a patient...</option>
                    {filteredPatients.map((p) => (
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName} - {p.phone}</option>
                    ))}
                  </select>
                </div>

                {/* Channel Toggle */}
                <div>
                  <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Channel</label>
                  <div className="flex gap-2">
                    {(["whatsapp", "email", "sms"] as const).map((ch) => (
                      <button
                        key={ch} type="button" onClick={() => { setMsgChannel(ch); setSelectedTemplate(""); }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-[15px] font-semibold transition-all duration-150"
                        style={{
                          borderRadius: "var(--radius-sm)",
                          border: msgChannel === ch ? `2px solid ${CHANNEL_COLORS[ch]}` : "1px solid var(--grey-300)",
                          background: msgChannel === ch ? CHANNEL_BG[ch] : "var(--white)",
                          color: msgChannel === ch ? CHANNEL_COLORS[ch] : "var(--grey-600)",
                        }}
                      >
                        <ChannelIcon channel={ch} size={14} />
                        {ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "Email" : "SMS"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Template */}
                <div>
                  <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Template (optional)</label>
                  <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                    <option value="">No template</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
                  </select>
                </div>

                {/* Subject (email only) */}
                {msgChannel === "email" && (
                  <div>
                    <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Subject</label>
                    <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="Email subject line..." />
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Message *</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Type your message here..." className="w-full px-3 py-2" style={inputStyle} />
                </div>

                {/* Preview */}
                {previewText && (
                  <div className="p-3" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}>
                    <p className="text-[13px] font-semibold uppercase mb-1" style={{ color: "var(--grey-600)" }}>Preview</p>
                    <p className="text-[15px]" style={{ color: "var(--grey-800)", whiteSpace: "pre-wrap" }}>{previewText}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handlePreview}
                    className="px-4 py-2 text-[15px] font-semibold transition-colors"
                    style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}
                  >
                    Preview
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !selectedPatient || !message.trim()}
                    className="flex-1 text-white px-5 py-2 text-[15px] font-semibold transition-colors disabled:opacity-50"
                    style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
                  >
                    {sending ? "Sending..." : "Send Message"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={cardStyle}>
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>
            {communications.length === 0 ? "No messages sent yet" : "No messages match your filters"}
          </p>
          {communications.length === 0 && (
            <button onClick={() => setShowCompose(true)} className="text-[14px] font-semibold mt-2 hover:underline" style={{ color: "var(--blue-500)" }}>Send your first message</button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((c) => {
            const isExpanded = expandedId === c.id;
            return (
              <div
                key={c.id}
                className="p-4 transition-shadow duration-150 hover:shadow-md cursor-pointer"
                style={cardStyle}
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center" style={{ background: CHANNEL_BG[c.type] || "var(--grey-100)", borderRadius: "var(--radius-sm)" }}>
                      <ChannelIcon channel={c.type} size={16} />
                    </div>
                    <div>
                      <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>
                        {c.patient.firstName} {c.patient.lastName}
                      </span>
                      <span
                        className="inline-flex items-center ml-2 px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-wide"
                        style={{
                          borderRadius: "var(--radius-sm)",
                          background: CHANNEL_BG[c.type] || "var(--grey-100)",
                          color: CHANNEL_COLORS[c.type] || "var(--grey-600)",
                        }}
                      >
                        {c.type === "whatsapp" ? "WhatsApp" : c.type === "email" ? "Email" : "SMS"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide"
                      style={{
                        borderRadius: "var(--radius-sm)",
                        background: STATUS_BG[c.status] || "var(--grey-100)",
                        color: STATUS_COLORS[c.status] || "var(--grey-600)",
                      }}
                    >
                      {c.status}
                    </span>
                    <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>{relativeTime(c.sentAt)}</span>
                  </div>
                </div>
                {c.subject && <p className="text-[15px] font-semibold mb-0.5 ml-11" style={{ color: "var(--grey-800)" }}>{c.subject}</p>}
                <p className={`text-[15px] ml-11 ${isExpanded ? "" : "line-clamp-2"}`} style={{ color: "var(--grey-600)", whiteSpace: isExpanded ? "pre-wrap" : undefined }}>
                  {c.message}
                </p>
                {!isExpanded && c.message.length > 120 && (
                  <p className="text-[13px] font-semibold ml-11 mt-1" style={{ color: "var(--blue-500)" }}>Click to expand</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-[14px] font-semibold disabled:opacity-40"
              style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
              Math.max(0, currentPage - 3),
              Math.min(totalPages, currentPage + 2)
            ).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className="px-3 py-1.5 text-[14px] font-semibold"
                style={{
                  border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)",
                  background: p === currentPage ? "var(--blue-500)" : "var(--white)",
                  color: p === currentPage ? "var(--white)" : "var(--grey-700)",
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-[14px] font-semibold disabled:opacity-40"
              style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
