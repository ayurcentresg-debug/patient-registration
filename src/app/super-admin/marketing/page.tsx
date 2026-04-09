"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";

// ─── Types ──────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  subject: string | null;
  body: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  status: string;
  createdAt: string;
}

interface SendResult {
  email: string;
  success: boolean;
  error?: string;
}


// ─── Shared Styles ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 14,
  borderRadius: 10,
  border: "1.5px solid #e5e7eb",
  background: "#fafafa",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: "all 0.2s",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 24px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 10,
  border: "none",
  background: "#2d6a4f",
  color: "#fff",
  cursor: "pointer",
  transition: "background 0.2s",
};

const btnSecondary: React.CSSProperties = {
  padding: "10px 24px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 10,
  border: "1.5px solid #e5e7eb",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  transition: "background 0.2s",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #f3f4f6",
  overflow: "hidden",
};

// ─── Main Page ──────────────────────────────────────────────────────────

export default function SuperAdminMarketingPage() {
  const [activeTab, setActiveTab] = useState<"send" | "leads">("send");

  // Send Email state
  const [toEmails, setToEmails] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [senderType, setSenderType] = useState<"transactional" | "marketing">("marketing");
  const [sending, setSending] = useState(false);
  const [sendHistory, setSendHistory] = useState<
    { time: string; to: string; subject: string; successCount: number; failCount: number }[]
  >([]);
  const [sendMessage, setSendMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", email: "", company: "", role: "" });
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Load templates on mount
  useEffect(() => {
    fetch("/api/super-admin/marketing/templates")
      .then((r) => r.json())
      .then((data) => {
        if (data.templates) setTemplates(data.templates);
      })
      .catch(console.error);
  }, []);

  // Load leads when switching to leads tab
  useEffect(() => {
    if (activeTab === "leads") loadLeads();
  }, [activeTab]);

  function loadLeads() {
    setLeadsLoading(true);
    fetch("/api/super-admin/leads")
      .then((r) => r.json())
      .then((data) => {
        if (data.leads) setLeads(data.leads);
      })
      .catch(console.error)
      .finally(() => setLeadsLoading(false));
  }

  // Template selection handler
  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject || "");
      // Convert plain text body to basic HTML for preview
      const htmlContent = tpl.body
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br/>");
      setHtmlBody(`<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 30px; color: #333;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2d6a4f; font-size: 28px; margin: 0;">AyurGate</h1>
    <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0;">Clinic Management for Ayurveda</p>
  </div>
  <div style="background: #f9fafb; border-radius: 12px; padding: 30px; border: 1px solid #e5e7eb;">
    <p>${htmlContent}</p>
  </div>
  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="color: #9ca3af; font-size: 12px;">Ayur Centre Pte Ltd | Singapore</p>
    <p style="color: #9ca3af; font-size: 11px;">You received this email because you may be interested in clinic management solutions.</p>
  </div>
</div>`);
    } else {
      setSubject("");
      setHtmlBody("");
    }
  }

  // Send email handler
  async function handleSend() {
    const recipients = toEmails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      setSendMessage({ type: "error", text: "Please enter at least one recipient email." });
      return;
    }
    if (!subject) {
      setSendMessage({ type: "error", text: "Please enter a subject." });
      return;
    }
    if (!htmlBody) {
      setSendMessage({ type: "error", text: "Please select a template or enter HTML content." });
      return;
    }

    setSending(true);
    setSendMessage(null);

    try {
      const res = await fetch("/api/super-admin/marketing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipients, subject, html: htmlBody, senderType }),
      });
      const data = await res.json();

      if (data.success) {
        setSendMessage({
          type: "success",
          text: `Sent ${data.successCount}/${data.total} emails successfully.${data.failCount > 0 ? ` ${data.failCount} failed.` : ""}`,
        });
        setSendHistory((prev) => [
          {
            time: new Date().toLocaleString(),
            to: recipients.join(", "),
            subject,
            successCount: data.successCount,
            failCount: data.failCount,
          },
          ...prev,
        ]);
      } else {
        setSendMessage({ type: "error", text: data.error || "Failed to send emails." });
      }
    } catch (err) {
      setSendMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSending(false);
    }
  }

  // Add lead handler
  async function handleAddLead() {
    if (!newLead.email) return;
    try {
      const res = await fetch("/api/super-admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLead),
      });
      const data = await res.json();
      if (data.success) {
        setNewLead({ name: "", email: "", company: "", role: "" });
        loadLeads();
      }
    } catch (err) {
      console.error("Failed to add lead:", err);
    }
  }

  // CSV import handler
  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) return;

      // Parse header
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIdx = header.findIndex((h) => h.includes("name"));
      const emailIdx = header.findIndex((h) => h.includes("email"));
      const companyIdx = header.findIndex((h) => h.includes("company") || h.includes("org"));
      const roleIdx = header.findIndex((h) => h.includes("role") || h.includes("title"));

      if (emailIdx === -1) {
        alert("CSV must have an 'email' column.");
        return;
      }

      const leadsToImport = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        return {
          name: nameIdx >= 0 ? cols[nameIdx] || "" : "",
          email: cols[emailIdx] || "",
          company: companyIdx >= 0 ? cols[companyIdx] || "" : "",
          role: roleIdx >= 0 ? cols[roleIdx] || "" : "",
        };
      }).filter((l) => l.email);

      try {
        const res = await fetch("/api/super-admin/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leads: leadsToImport }),
        });
        const data = await res.json();
        if (data.success) {
          alert(`Imported ${data.created} leads (${data.skipped} skipped as duplicates).`);
          loadLeads();
        }
      } catch (err) {
        console.error("CSV import failed:", err);
      }
    };
    reader.readAsText(file);
    // Reset file input so the same file can be re-imported
    if (csvInputRef.current) csvInputRef.current.value = "";
  }

  // Send to selected leads
  function handleSendToLeads() {
    const selectedEmails = leads
      .filter((l) => selectedLeadIds.has(l.id))
      .map((l) => l.email);

    if (selectedEmails.length === 0) return;

    setToEmails(selectedEmails.join(", "));
    setActiveTab("send");
  }

  // Toggle lead selection
  function toggleLeadSelection(id: string) {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllLeads() {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map((l) => l.id)));
    }
  }

  const statusColors: Record<string, { color: string; bg: string }> = {
    new: { color: "#2563eb", bg: "#eff6ff" },
    contacted: { color: "#d97706", bg: "#fffbeb" },
    qualified: { color: "#059669", bg: "#ecfdf5" },
    converted: { color: "#7c3aed", bg: "#f5f3ff" },
    lost: { color: "#dc2626", bg: "#fef2f2" },
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar />

      <div style={{ flex: 1, background: "#f9fafb", overflow: "auto" }}>
        {/* Header */}
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>
            B2B Marketing
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
            Send marketing emails and manage leads
          </p>
        </div>

        {/* Tab Bar */}
        <div
          style={{
            padding: "0 32px",
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            gap: 0,
          }}
        >
          {[
            { key: "send" as const, label: "Send Email", icon: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" },
            { key: "leads" as const, label: "Leads", icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 20px",
                border: "none",
                borderBottom: activeTab === tab.key ? "2px solid #2d6a4f" : "2px solid transparent",
                background: "transparent",
                color: activeTab === tab.key ? "#2d6a4f" : "#6b7280",
                fontWeight: activeTab === tab.key ? 600 : 400,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "24px 32px" }}>
          {/* ─── SEND EMAIL TAB ──────────────────────────────────────── */}
          {activeTab === "send" && (
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {/* Left: Form */}
              <div style={{ flex: "1 1 400px", minWidth: 360 }}>
                <div style={{ ...cardStyle, padding: 24 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: "0 0 20px" }}>
                    Compose Email
                  </h2>

                  {/* To field */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                      To (comma-separated emails)
                    </label>
                    <textarea
                      value={toEmails}
                      onChange={(e) => setToEmails(e.target.value)}
                      placeholder="john@clinic.com, jane@wellness.com"
                      rows={2}
                      style={{ ...inputStyle, resize: "vertical" }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#2d6a4f";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(45,106,79,0.08)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  {/* Template dropdown */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                      Template
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="">-- Select a B2B template --</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject line"
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#2d6a4f";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(45,106,79,0.08)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  {/* Send From toggle */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
                      Send From
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setSenderType("transactional")}
                        style={{
                          flex: 1,
                          padding: "10px 16px",
                          borderRadius: 10,
                          border: senderType === "transactional" ? "2px solid #2d6a4f" : "1.5px solid #e5e7eb",
                          background: senderType === "transactional" ? "#ecfdf5" : "#fff",
                          color: senderType === "transactional" ? "#2d6a4f" : "#6b7280",
                          fontWeight: senderType === "transactional" ? 600 : 400,
                          fontSize: 13,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textAlign: "center",
                        }}
                      >
                        <div>info@ayurgate.com</div>
                        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Transactional</div>
                      </button>
                      <button
                        onClick={() => setSenderType("marketing")}
                        style={{
                          flex: 1,
                          padding: "10px 16px",
                          borderRadius: 10,
                          border: senderType === "marketing" ? "2px solid #2d6a4f" : "1.5px solid #e5e7eb",
                          background: senderType === "marketing" ? "#ecfdf5" : "#fff",
                          color: senderType === "marketing" ? "#2d6a4f" : "#6b7280",
                          fontWeight: senderType === "marketing" ? 600 : 400,
                          fontSize: 13,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textAlign: "center",
                        }}
                      >
                        <div>info@ayurgate.com</div>
                        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Marketing</div>
                      </button>
                    </div>
                  </div>

                  {/* Send message */}
                  {sendMessage && (
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: 10,
                        marginBottom: 16,
                        background: sendMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
                        color: sendMessage.type === "success" ? "#059669" : "#dc2626",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {sendMessage.text}
                    </div>
                  )}

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    style={{
                      ...btnPrimary,
                      width: "100%",
                      opacity: sending ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {sending ? (
                      "Sending..."
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right: Preview + History */}
              <div style={{ flex: "1 1 400px", minWidth: 360, display: "flex", flexDirection: "column", gap: 24 }}>
                {/* HTML Preview */}
                <div style={cardStyle}>
                  <div
                    style={{
                      padding: "16px 20px",
                      borderBottom: "1px solid #f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>
                      Email Preview
                    </h3>
                    {subject && (
                      <span style={{ fontSize: 12, color: "#6b7280" }}>Subject: {subject}</span>
                    )}
                  </div>
                  <div
                    style={{
                      padding: 20,
                      minHeight: 200,
                      maxHeight: 480,
                      overflow: "auto",
                      background: "#fafafa",
                    }}
                  >
                    {htmlBody ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: htmlBody }}
                        style={{ fontSize: 14, lineHeight: 1.7 }}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 200,
                          color: "#9ca3af",
                          fontSize: 14,
                        }}
                      >
                        Select a template to preview
                      </div>
                    )}
                  </div>
                </div>

                {/* Send History */}
                {sendHistory.length > 0 && (
                  <div style={cardStyle}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>
                        Send History (this session)
                      </h3>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#f9fafb" }}>
                            {["Time", "To", "Subject", "Result"].map((h) => (
                              <th
                                key={h}
                                style={{
                                  padding: "10px 14px",
                                  textAlign: "left",
                                  fontWeight: 600,
                                  color: "#6b7280",
                                  fontSize: 11,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sendHistory.map((h, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "10px 14px", color: "#6b7280", whiteSpace: "nowrap" }}>
                                {h.time}
                              </td>
                              <td
                                style={{
                                  padding: "10px 14px",
                                  color: "#374151",
                                  maxWidth: 200,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {h.to}
                              </td>
                              <td style={{ padding: "10px 14px", color: "#374151" }}>{h.subject}</td>
                              <td style={{ padding: "10px 14px" }}>
                                <span
                                  style={{
                                    padding: "3px 10px",
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    background: h.failCount === 0 ? "#ecfdf5" : "#fffbeb",
                                    color: h.failCount === 0 ? "#059669" : "#d97706",
                                  }}
                                >
                                  {h.successCount} sent{h.failCount > 0 ? `, ${h.failCount} failed` : ""}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── LEADS TAB ───────────────────────────────────────────── */}
          {activeTab === "leads" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Add Lead Form */}
              <div style={{ ...cardStyle, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: 0 }}>
                    Add Lead
                  </h2>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCSVImport}
                      style={{ display: "none" }}
                    />
                    <button
                      onClick={() => csvInputRef.current?.click()}
                      style={btnSecondary}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Import CSV
                      </span>
                    </button>
                    {selectedLeadIds.size > 0 && (
                      <button onClick={handleSendToLeads} style={btnPrimary}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                          </svg>
                          Email {selectedLeadIds.size} Lead{selectedLeadIds.size > 1 ? "s" : ""}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={newLead.name}
                      onChange={(e) => setNewLead((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Dr. John Smith"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newLead.email}
                      onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))}
                      placeholder="john@clinic.com"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                      Company
                    </label>
                    <input
                      type="text"
                      value={newLead.company}
                      onChange={(e) => setNewLead((p) => ({ ...p, company: e.target.value }))}
                      placeholder="Wellness Clinic"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                      Role
                    </label>
                    <input
                      type="text"
                      value={newLead.role}
                      onChange={(e) => setNewLead((p) => ({ ...p, role: e.target.value }))}
                      placeholder="Clinic Owner"
                      style={inputStyle}
                    />
                  </div>
                  <button
                    onClick={handleAddLead}
                    disabled={!newLead.email}
                    style={{
                      ...btnPrimary,
                      opacity: newLead.email ? 1 : 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Add Lead
                  </button>
                </div>
              </div>

              {/* Leads Table */}
              <div style={cardStyle}>
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>
                    All Leads ({leads.length})
                  </h3>
                  {leads.length > 0 && (
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {selectedLeadIds.size} selected
                    </span>
                  )}
                </div>

                {leadsLoading ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                    Loading leads...
                  </div>
                ) : leads.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                    No leads yet. Add one above or import a CSV.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          <th style={{ padding: "12px 14px", textAlign: "left", width: 40 }}>
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.size === leads.length && leads.length > 0}
                              onChange={toggleAllLeads}
                              style={{ cursor: "pointer", width: 16, height: 16, accentColor: "#2d6a4f" }}
                            />
                          </th>
                          {["Name", "Email", "Company", "Role", "Status", "Added"].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "12px 14px",
                                textAlign: "left",
                                fontWeight: 600,
                                color: "#6b7280",
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((lead) => {
                          const sc = statusColors[lead.status] || statusColors.new;
                          return (
                            <tr
                              key={lead.id}
                              style={{
                                borderBottom: "1px solid #f3f4f6",
                                background: selectedLeadIds.has(lead.id) ? "#f0fdf4" : "transparent",
                              }}
                            >
                              <td style={{ padding: "12px 14px" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedLeadIds.has(lead.id)}
                                  onChange={() => toggleLeadSelection(lead.id)}
                                  style={{ cursor: "pointer", width: 16, height: 16, accentColor: "#2d6a4f" }}
                                />
                              </td>
                              <td style={{ padding: "12px 14px", fontWeight: 600, color: "#111827" }}>
                                {lead.name || "-"}
                              </td>
                              <td style={{ padding: "12px 14px", color: "#374151" }}>{lead.email}</td>
                              <td style={{ padding: "12px 14px", color: "#6b7280" }}>{lead.company || "-"}</td>
                              <td style={{ padding: "12px 14px", color: "#6b7280" }}>{lead.role || "-"}</td>
                              <td style={{ padding: "12px 14px" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "3px 10px",
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    background: sc.bg,
                                    color: sc.color,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {lead.status}
                                </span>
                              </td>
                              <td style={{ padding: "12px 14px", color: "#9ca3af", whiteSpace: "nowrap", fontSize: 13 }}>
                                {new Date(lead.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
