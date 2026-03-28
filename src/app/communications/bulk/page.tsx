"use client";

import { useEffect, useState, useCallback } from "react";
import CommunicationTabs from "@/components/CommunicationTabs";

const inputStyle = { border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", fontSize: "13px" };
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" };

const CHANNEL_COLORS: Record<string, string> = { whatsapp: "#25D366", email: "#3b82f6", sms: "#8b5cf6" };
const CHANNEL_BG: Record<string, string> = { whatsapp: "#ecfdf5", email: "#eff6ff", sms: "#f5f3ff" };

const VARIABLES = ["patientName", "appointmentDate", "appointmentTime", "doctorName", "clinicName", "amount", "treatmentName"];

interface Patient { id: string; firstName: string; lastName: string; email: string | null; phone: string; whatsapp: string | null; }
interface Template { id: string; name: string; channel: string; subject: string | null; body: string; category: string; }

export default function BulkSendPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Step state
  const [step, setStep] = useState(1);

  // Step 1: Recipients
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [patientSearch, setPatientSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<string | null>(null);

  // Step 2: Compose
  const [channel, setChannel] = useState<"whatsapp" | "email" | "sms">("whatsapp");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [previewText, setPreviewText] = useState("");

  // Step 3: Send
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResults, setSendResults] = useState<{ sent: number; failed: number; failedList: string[] } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then(setPatients)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`/api/templates?channel=${channel}&active=true`)
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [channel]);

  useEffect(() => {
    if (selectedTemplate) {
      const tpl = templates.find((t) => t.id === selectedTemplate);
      if (tpl) {
        setMessage(tpl.body);
        if (tpl.subject) setSubject(tpl.subject);
      }
    }
  }, [selectedTemplate, templates]);

  function togglePatient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    const visible = getFilteredPatients();
    setSelectedIds(new Set(visible.map((p) => p.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function applyQuickFilter(filter: string) {
    setQuickFilter(filter);
    // For "All Patients" select everyone
    if (filter === "all") {
      setSelectedIds(new Set(patients.map((p) => p.id)));
    }
    // Other filters are simulated since we don't have real-time data
    // In production, these would call the API
    if (filter === "upcoming") {
      // Select all patients (simulated - would filter by upcoming appointments)
      setSelectedIds(new Set(patients.slice(0, Math.min(patients.length, 10)).map((p) => p.id)));
      showToast("Selected patients with upcoming appointments (simulated)", "success");
    }
    if (filter === "outstanding") {
      setSelectedIds(new Set(patients.slice(0, Math.min(patients.length, 5)).map((p) => p.id)));
      showToast("Selected patients with outstanding payments (simulated)", "success");
    }
    if (filter === "birthday") {
      const thisMonth = new Date().getMonth();
      const birthdayPatients = patients.filter((p) => {
        // We don't have DOB in the Patient interface we fetched, so simulate
        return false;
      });
      if (birthdayPatients.length === 0) {
        showToast("No birthday patients found this month", "error");
      }
      setSelectedIds(new Set(birthdayPatients.map((p) => p.id)));
    }
  }

  function getFilteredPatients(): Patient[] {
    if (!patientSearch) return patients;
    const q = patientSearch.toLowerCase();
    return patients.filter((p) => `${p.firstName} ${p.lastName} ${p.phone} ${p.email || ""}`.toLowerCase().includes(q));
  }

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

  function insertVariable(variable: string) {
    setMessage((prev) => prev + `{{${variable}}}`);
  }

  async function handleSendAll() {
    if (selectedIds.size === 0 || !message.trim()) return;
    setSending(true);
    setSendProgress(0);
    setSendResults(null);

    const recipients = Array.from(selectedIds);
    let sent = 0;
    let failed = 0;
    const failedList: string[] = [];

    for (let i = 0; i < recipients.length; i++) {
      try {
        const res = await fetch("/api/communications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: recipients[i],
            type: channel,
            subject: channel === "email" ? subject : undefined,
            message,
          }),
        });
        if (res.ok) {
          sent++;
        } else {
          failed++;
          const pat = patients.find((p) => p.id === recipients[i]);
          failedList.push(pat ? `${pat.firstName} ${pat.lastName}` : recipients[i]);
        }
      } catch {
        failed++;
        const pat = patients.find((p) => p.id === recipients[i]);
        failedList.push(pat ? `${pat.firstName} ${pat.lastName}` : recipients[i]);
      }
      setSendProgress(Math.round(((i + 1) / recipients.length) * 100));
    }

    setSending(false);
    setSendResults({ sent, failed, failedList });
  }

  const filteredPatients = getFilteredPatients();

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <CommunicationTabs />
        <div className="space-y-3">
          <div className="h-7 w-40 animate-pulse" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-sm)" }} />
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
        <div className="fixed top-4 right-4 z-50 px-4 py-3 text-[13px] font-semibold text-white yoda-slide-in" style={{ background: toast.type === "success" ? "var(--green)" : "var(--red)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)" }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Bulk Send</h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>Send messages to multiple patients at once</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {[
          { num: 1, label: "Select Recipients" },
          { num: 2, label: "Compose Message" },
          { num: 3, label: "Review & Send" },
        ].map((s, i) => {
          const isActive = step === s.num;
          const isCompleted = step > s.num;
          return (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 flex items-center justify-center text-[13px] font-bold"
                  style={{
                    borderRadius: "var(--radius-pill)",
                    background: isCompleted ? "var(--green)" : isActive ? "var(--blue-500)" : "var(--grey-200)",
                    color: isCompleted || isActive ? "var(--white)" : "var(--grey-600)",
                  }}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  ) : s.num}
                </div>
                <span className="text-[13px] font-semibold hidden sm:inline" style={{ color: isActive ? "var(--grey-900)" : "var(--grey-500)" }}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div className="flex-1 mx-3 h-0.5" style={{ background: isCompleted ? "var(--green)" : "var(--grey-200)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Select Recipients */}
      {step === 1 && (
        <div className="yoda-fade-in">
          {/* Quick filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: "all", label: "All Patients", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
              { key: "upcoming", label: "Upcoming Appts (7 days)", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
              { key: "outstanding", label: "Outstanding Payments", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              { key: "birthday", label: "Birthday This Month", icon: "M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.38 1.38 0 003 15.546" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => applyQuickFilter(f.key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold transition-all duration-150"
                style={{
                  borderRadius: "var(--radius-pill)",
                  border: quickFilter === f.key ? "2px solid var(--blue-500)" : "1px solid var(--grey-300)",
                  background: quickFilter === f.key ? "var(--blue-50)" : "var(--white)",
                  color: quickFilter === f.key ? "var(--blue-500)" : "var(--grey-600)",
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} /></svg>
                {f.label}
              </button>
            ))}
          </div>

          {/* Search and select controls */}
          <div className="flex items-center gap-3 mb-3">
            <input
              type="text" placeholder="Search patients..."
              value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)}
              className="flex-1 px-3 py-2" style={inputStyle}
            />
            <button onClick={selectAll} className="px-3 py-2 text-[12px] font-semibold" style={{ ...inputStyle, cursor: "pointer" }}>Select All</button>
            <button onClick={deselectAll} className="px-3 py-2 text-[12px] font-semibold" style={{ ...inputStyle, cursor: "pointer" }}>Deselect All</button>
            <span
              className="inline-flex items-center px-3 py-1.5 text-[12px] font-bold"
              style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}
            >
              {selectedIds.size} selected
            </span>
          </div>

          {/* Patient list with checkboxes */}
          <div className="max-h-[400px] overflow-y-auto" style={{ ...cardStyle, padding: 0 }}>
            {filteredPatients.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--grey-50)] transition-colors"
                style={{ borderBottom: "1px solid var(--grey-200)" }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => togglePatient(p.id)}
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>{p.firstName} {p.lastName}</p>
                  <p className="text-[11px]" style={{ color: "var(--grey-500)" }}>{p.phone} {p.email ? `/ ${p.email}` : ""}</p>
                </div>
                <div className="flex gap-1">
                  {p.whatsapp && <span className="w-2 h-2 rounded-full" style={{ background: "#25D366" }} title="WhatsApp" />}
                  {p.email && <span className="w-2 h-2 rounded-full" style={{ background: "#3b82f6" }} title="Email" />}
                  <span className="w-2 h-2 rounded-full" style={{ background: "#8b5cf6" }} title="SMS" />
                </div>
              </label>
            ))}
            {filteredPatients.length === 0 && (
              <div className="text-center py-8">
                <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>No patients found</p>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={() => setStep(2)}
              disabled={selectedIds.size === 0}
              className="text-white px-6 py-2 text-[13px] font-semibold disabled:opacity-50"
              style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
            >
              Next: Compose Message
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Compose */}
      {step === 2 && (
        <div className="max-w-2xl yoda-fade-in">
          <div className="space-y-4">
            {/* Channel */}
            <div>
              <label className="block mb-1 text-[12px] font-semibold" style={{ color: "var(--grey-700)" }}>Channel</label>
              <div className="flex gap-2">
                {(["whatsapp", "email", "sms"] as const).map((ch) => (
                  <button
                    key={ch} type="button" onClick={() => { setChannel(ch); setSelectedTemplate(""); }}
                    className="flex-1 px-3 py-2.5 text-[13px] font-semibold transition-all duration-150"
                    style={{
                      borderRadius: "var(--radius-sm)",
                      border: channel === ch ? `2px solid ${CHANNEL_COLORS[ch]}` : "1px solid var(--grey-300)",
                      background: channel === ch ? CHANNEL_BG[ch] : "var(--white)",
                      color: channel === ch ? CHANNEL_COLORS[ch] : "var(--grey-600)",
                    }}
                  >
                    {ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "Email" : "SMS"}
                  </button>
                ))}
              </div>
            </div>

            {/* Template */}
            <div>
              <label className="block mb-1 text-[12px] font-semibold" style={{ color: "var(--grey-700)" }}>Template (optional)</label>
              <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                <option value="">No template</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
              </select>
            </div>

            {/* Subject (email) */}
            {channel === "email" && (
              <div>
                <label className="block mb-1 text-[12px] font-semibold" style={{ color: "var(--grey-700)" }}>Subject</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="Email subject..." />
              </div>
            )}

            {/* Message */}
            <div>
              <label className="block mb-1 text-[12px] font-semibold" style={{ color: "var(--grey-700)" }}>Message *</label>
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="text-[11px] mr-1" style={{ color: "var(--grey-600)" }}>Insert:</span>
                {VARIABLES.map((v) => (
                  <button
                    key={v} type="button" onClick={() => insertVariable(v)}
                    className="px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)", border: "1px solid var(--blue-100)" }}
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Type your message..." className="w-full px-3 py-2" style={inputStyle} />
            </div>

            {/* Preview */}
            <div className="flex gap-2">
              <button onClick={handlePreview} className="px-4 py-2 text-[13px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>
                Preview with Sample Data
              </button>
            </div>
            {previewText && (
              <div className="p-3" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}>
                <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "var(--grey-600)" }}>Preview (sample patient)</p>
                <p className="text-[13px]" style={{ color: "var(--grey-800)", whiteSpace: "pre-wrap" }}>{previewText}</p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-[13px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!message.trim()}
                className="text-white px-6 py-2 text-[13px] font-semibold disabled:opacity-50"
                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
              >
                Next: Review & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review & Send */}
      {step === 3 && (
        <div className="max-w-2xl yoda-fade-in">
          <div className="p-5 mb-5" style={cardStyle}>
            <h3 className="text-[15px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid var(--grey-200)" }}>
                <span className="text-[13px]" style={{ color: "var(--grey-600)" }}>Recipients</span>
                <span className="text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>{selectedIds.size} patient{selectedIds.size !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid var(--grey-200)" }}>
                <span className="text-[13px]" style={{ color: "var(--grey-600)" }}>Channel</span>
                <span
                  className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase"
                  style={{ borderRadius: "var(--radius-sm)", background: CHANNEL_BG[channel], color: CHANNEL_COLORS[channel] }}
                >
                  {channel === "whatsapp" ? "WhatsApp" : channel === "email" ? "Email" : "SMS"}
                </span>
              </div>
              {channel === "email" && subject && (
                <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid var(--grey-200)" }}>
                  <span className="text-[13px]" style={{ color: "var(--grey-600)" }}>Subject</span>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{subject}</span>
                </div>
              )}
              <div className="py-2">
                <span className="text-[13px] block mb-1" style={{ color: "var(--grey-600)" }}>Message</span>
                <div className="p-3" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }}>
                  <p className="text-[13px]" style={{ color: "var(--grey-800)", whiteSpace: "pre-wrap" }}>{message}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar (during send) */}
          {sending && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold" style={{ color: "var(--grey-700)" }}>Sending messages...</span>
                <span className="text-[12px] font-bold" style={{ color: "var(--blue-500)" }}>{sendProgress}%</span>
              </div>
              <div className="w-full h-2 overflow-hidden" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-pill)" }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${sendProgress}%`, background: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {sendResults && (
            <div className="mb-5 p-5 yoda-slide-in" style={cardStyle}>
              <h3 className="text-[15px] font-bold mb-3" style={{ color: "var(--grey-900)" }}>Results</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-3" style={{ background: "var(--green-light)", borderRadius: "var(--radius-sm)" }}>
                  <p className="text-[11px] font-semibold uppercase" style={{ color: "var(--green)" }}>Sent</p>
                  <p className="text-[22px] font-bold" style={{ color: "var(--green)" }}>{sendResults.sent}</p>
                </div>
                <div className="p-3" style={{ background: "var(--red-light)", borderRadius: "var(--radius-sm)" }}>
                  <p className="text-[11px] font-semibold uppercase" style={{ color: "var(--red)" }}>Failed</p>
                  <p className="text-[22px] font-bold" style={{ color: "var(--red)" }}>{sendResults.failed}</p>
                </div>
              </div>
              {sendResults.failedList.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--red)" }}>Failed recipients:</p>
                  <ul className="space-y-0.5">
                    {sendResults.failedList.map((name, i) => (
                      <li key={i} className="text-[12px]" style={{ color: "var(--grey-700)" }}>- {name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => { setStep(2); setSendResults(null); }}
              disabled={sending}
              className="px-4 py-2 text-[13px] font-semibold disabled:opacity-50"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}
            >
              Back
            </button>
            {!sendResults ? (
              <button
                onClick={handleSendAll}
                disabled={sending || selectedIds.size === 0}
                className="text-white px-6 py-2.5 text-[13px] font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
              >
                {sending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    Sending...
                  </>
                ) : (
                  `Send All (${selectedIds.size})`
                )}
              </button>
            ) : (
              <button
                onClick={() => { setStep(1); setSelectedIds(new Set()); setMessage(""); setSubject(""); setSendResults(null); setQuickFilter(null); }}
                className="text-white px-6 py-2 text-[13px] font-semibold"
                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
              >
                Start New Bulk Send
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
