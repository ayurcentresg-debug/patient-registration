"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import CommunicationTabs from "@/components/CommunicationTabs";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useFlash } from "@/components/FlashCardProvider";
import { cardStyle, inputStyle } from "@/lib/styles";

const CHANNEL_COLORS: Record<string, string> = { whatsapp: "#25D366", email: "#3b82f6", sms: "#8b5cf6" };
const CHANNEL_BG: Record<string, string> = { whatsapp: "#ecfdf5", email: "#eff6ff", sms: "#f5f3ff" };

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "appointment_reminder", label: "Appointment Reminder" },
  { value: "follow_up", label: "Follow Up" },
  { value: "payment_reminder", label: "Payment Reminder" },
  { value: "medication", label: "Medication" },
  { value: "welcome", label: "Welcome" },
  { value: "birthday", label: "Birthday" },
  { value: "marketing", label: "Marketing" },
  { value: "newsletter", label: "Newsletter" },
  { value: "custom", label: "Custom" },
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  appointment_reminder: { bg: "#dbeafe", color: "#1d4ed8" },
  follow_up: { bg: "#ecfdf5", color: "#047857" },
  payment_reminder: { bg: "#d1f2e0", color: "#2d6a4f" },
  medication: { bg: "#fce7f3", color: "#be185d" },
  welcome: { bg: "#ede9fe", color: "#7c3aed" },
  birthday: { bg: "#fff1f2", color: "#e11d48" },
  marketing: { bg: "#f0fdf4", color: "#14532d" },
  newsletter: { bg: "#fef3c7", color: "#92400e" },
  custom: { bg: "var(--grey-100)", color: "var(--grey-700)" },
};

const VARIABLES = ["patientName", "appointmentDate", "appointmentTime", "doctorName", "clinicName", "amount", "treatmentName"];

interface Template {
  id: string; name: string; channel: string; subject: string | null; body: string;
  category: string; isActive: boolean; createdAt: string; updatedAt: string;
}

function categoryLabel(cat: string): string {
  return CATEGORIES.find((c) => c.value === cat)?.label || cat;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formChannel, setFormChannel] = useState<"whatsapp" | "email" | "sms">("whatsapp");
  const [formCategory, setFormCategory] = useState("appointment_reminder");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [previewText, setPreviewText] = useState("");

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; confirmLabel: string; variant: "danger" | "warning" | "default"; onConfirm: () => void }>({ open: false, title: "", message: "", confirmLabel: "Confirm", variant: "default", onConfirm: () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Seed loading
  const [seeding, setSeeding] = useState(false);

  // HTML upload ref
  const htmlFileInputRef = useRef<HTMLInputElement>(null);

  function handleHtmlUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const htmlContent = evt.target?.result as string;
      setFormBody(htmlContent);
      setFormChannel("email");
      setFormName(file.name.replace(/\.html?$/i, ""));
      setShowForm(true);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  }

  const { showFlash } = useFlash();

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      setTemplates(data);
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to load templates" });
    } finally {
      setLoading(false);
    }
  }, [showFlash]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  async function handleSeedTemplates() {
    setSeeding(true);
    try {
      const res = await fetch("/api/templates/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showFlash({ type: "success", title: "Success", message: `${data.created} templates added (${data.skipped} already existed)` });
        fetchTemplates();
      } else {
        showFlash({ type: "error", title: "Error", message: data.error || "Failed to seed templates" });
      }
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to seed templates" });
    }
    setSeeding(false);
  }

  function openNewForm() {
    setEditingTemplate(null);
    setFormName(""); setFormChannel("whatsapp"); setFormCategory("appointment_reminder");
    setFormSubject(""); setFormBody(""); setPreviewText("");
    setShowForm(true);
  }

  function openEditForm(tpl: Template) {
    setEditingTemplate(tpl);
    setFormName(tpl.name); setFormChannel(tpl.channel as "whatsapp" | "email" | "sms");
    setFormCategory(tpl.category); setFormSubject(tpl.subject || ""); setFormBody(tpl.body);
    setPreviewText("");
    setShowForm(true);
  }

  function insertVariable(variable: string) {
    setFormBody((prev) => prev + `{{${variable}}}`);
  }

  async function handlePreview() {
    if (!formBody.trim()) return;
    try {
      const res = await fetch("/api/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: formBody }),
      });
      const data = await res.json();
      setPreviewText(data.preview || formBody);
    } catch {
      setPreviewText(formBody);
    }
  }

  async function handleSave() {
    if (!formName.trim() || !formBody.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: formName,
        channel: formChannel,
        subject: formChannel === "email" ? formSubject : null,
        body: formBody,
        category: formCategory,
      };

      let res: Response;
      if (editingTemplate) {
        res = await fetch(`/api/templates/${editingTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        showFlash({ type: "success", title: "Success", message: editingTemplate ? "Template updated" : "Template created" });
        setShowForm(false);
        fetchTemplates();
      } else {
        const err = await res.json();
        showFlash({ type: "error", title: "Error", message: err.error || "Failed to save template" });
      }
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to save template" });
    }
    setSaving(false);
  }

  function handleDelete(id: string) {
    setConfirmDialog({
      open: true,
      title: "Delete Template",
      message: "Remove this message template? This cannot be undone.",
      confirmLabel: "Delete Template",
      variant: "danger",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
          if (res.ok) {
            showFlash({ type: "success", title: "Success", message: "Template deleted" });
            setTemplates((prev) => prev.filter((t) => t.id !== id));
          } else {
            showFlash({ type: "error", title: "Error", message: "Failed to delete template" });
          }
        } catch {
          showFlash({ type: "error", title: "Error", message: "Failed to delete template" });
        } finally {
          setConfirmLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  }

  async function handleToggleActive(tpl: Template) {
    try {
      const res = await fetch(`/api/templates/${tpl.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tpl.isActive }),
      });
      if (res.ok) {
        setTemplates((prev) => prev.map((t) => t.id === tpl.id ? { ...t, isActive: !t.isActive } : t));
      }
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to update template" });
    }
  }

  // Extract variable tags from a template body
  function extractVariables(body: string): string[] {
    const matches = body.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches)];
  }

  // Filtered templates
  const filtered = templates.filter((t) => {
    if (filterChannel !== "all" && t.channel !== filterChannel) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <CommunicationTabs />
        <div className="space-y-3">
          <div className="h-7 w-48 animate-pulse" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-sm)" }} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-40 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      <CommunicationTabs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Message Templates</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Create and manage reusable message templates</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeedTemplates}
            disabled={seeding}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-[15px] font-semibold transition-colors duration-150 disabled:opacity-50"
            style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}
            onMouseEnter={(e) => { if (!seeding) { e.currentTarget.style.background = "var(--grey-100)"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--white)"; }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {seeding ? "Loading..." : "Load Defaults"}
          </button>
          <input
            type="file"
            accept=".html,.htm"
            ref={htmlFileInputRef}
            onChange={handleHtmlUpload}
            className="hidden"
          />
          <button
            onClick={() => htmlFileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-[15px] font-semibold transition-colors duration-150"
            style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-100)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--white)"; }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Upload HTML
          </button>
          <button
            onClick={openNewForm}
            className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
            style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--blue-700)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--blue-500)"; }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            + New Template
          </button>
        </div>
      </div>

      {/* Filter Tabs: Channel */}
      <div className="flex gap-2 mb-4">
        {["all", "whatsapp", "email", "sms"].map((ch) => (
          <button
            key={ch}
            onClick={() => setFilterChannel(ch)}
            className="px-4 py-1.5 text-[14px] font-semibold transition-all duration-150"
            style={{
              borderRadius: "var(--radius-pill)",
              border: filterChannel === ch ? `2px solid ${ch === "all" ? "var(--blue-500)" : CHANNEL_COLORS[ch]}` : "1px solid var(--grey-300)",
              background: filterChannel === ch ? (ch === "all" ? "var(--blue-50)" : CHANNEL_BG[ch]) : "var(--white)",
              color: filterChannel === ch ? (ch === "all" ? "var(--blue-500)" : CHANNEL_COLORS[ch]) : "var(--grey-600)",
            }}
          >
            {ch === "all" ? "All" : ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "Email" : "SMS"}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className="px-3 py-1 text-[13px] font-semibold transition-all duration-150"
            style={{
              borderRadius: "var(--radius-pill)",
              border: filterCategory === cat.value ? "1px solid var(--blue-500)" : "1px solid var(--grey-300)",
              background: filterCategory === cat.value ? "var(--blue-50)" : "var(--white)",
              color: filterCategory === cat.value ? "var(--blue-500)" : "var(--grey-600)",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 yoda-slide-in" style={{ ...cardStyle, boxShadow: "var(--shadow-lg)" }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-bold" style={{ color: "var(--grey-900)" }}>
                  {editingTemplate ? "Edit Template" : "New Template"}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-1" style={{ color: "var(--grey-500)" }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Template Name *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="e.g. Appointment Reminder" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Channel *</label>
                    <div className="flex gap-2">
                      {(["whatsapp", "email", "sms"] as const).map((ch) => (
                        <button
                          key={ch} type="button" onClick={() => setFormChannel(ch)}
                          className="flex-1 px-2 py-2 text-[14px] font-semibold transition-all duration-150"
                          style={{
                            borderRadius: "var(--radius-sm)",
                            border: formChannel === ch ? `2px solid ${CHANNEL_COLORS[ch]}` : "1px solid var(--grey-300)",
                            background: formChannel === ch ? CHANNEL_BG[ch] : "var(--white)",
                            color: formChannel === ch ? CHANNEL_COLORS[ch] : "var(--grey-600)",
                          }}
                        >
                          {ch === "whatsapp" ? "WhatsApp" : ch === "email" ? "Email" : "SMS"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Category *</label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                      {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formChannel === "email" && (
                  <div>
                    <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Subject</label>
                    <input type="text" value={formSubject} onChange={(e) => setFormSubject(e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="Email subject line..." />
                  </div>
                )}

                <div>
                  <label className="block mb-1 text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Body *</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-[13px] mr-1" style={{ color: "var(--grey-600)" }}>Insert:</span>
                    {VARIABLES.map((v) => (
                      <button
                        key={v} type="button" onClick={() => insertVariable(v)}
                        className="px-2 py-0.5 text-[12px] font-semibold transition-colors"
                        style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)", border: "1px solid var(--blue-100)" }}
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={formBody} onChange={(e) => setFormBody(e.target.value)}
                    rows={6} placeholder="Type your template message... Use {{variableName}} for dynamic content."
                    className="w-full px-3 py-2" style={inputStyle}
                  />
                </div>

                {/* Live Preview */}
                {(previewText || formBody) && (
                  <div className="p-3" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}>
                    <p className="text-[13px] font-semibold uppercase mb-1" style={{ color: "var(--grey-600)" }}>Preview</p>
                    <p className="text-[15px]" style={{ color: "var(--grey-800)", whiteSpace: "pre-wrap" }}>
                      {previewText || formBody}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={handlePreview} className="px-4 py-2 text-[15px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>
                    Preview
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[15px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !formName.trim() || !formBody.trim()}
                    className="flex-1 text-white px-5 py-2 text-[15px] font-semibold disabled:opacity-50"
                    style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
                  >
                    {saving ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={cardStyle}>
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No templates found</p>
          <button onClick={openNewForm} className="text-[14px] font-semibold mt-2 hover:underline" style={{ color: "var(--blue-500)" }}>Create your first template</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tpl) => {
            const vars = extractVariables(tpl.body);
            const catColor = CATEGORY_COLORS[tpl.category] || CATEGORY_COLORS.custom;
            return (
              <div key={tpl.id} className="p-4 transition-shadow duration-150 hover:shadow-md" style={cardStyle}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-bold truncate" style={{ color: "var(--grey-900)" }}>{tpl.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="inline-flex items-center px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide"
                        style={{ borderRadius: "var(--radius-sm)", background: CHANNEL_BG[tpl.channel], color: CHANNEL_COLORS[tpl.channel] }}
                      >
                        {tpl.channel === "whatsapp" ? "WhatsApp" : tpl.channel === "email" ? "Email" : "SMS"}
                      </span>
                      <span
                        className="inline-flex items-center px-2 py-0.5 text-[12px] font-bold tracking-wide"
                        style={{ borderRadius: "var(--radius-sm)", background: catColor.bg, color: catColor.color }}
                      >
                        {categoryLabel(tpl.category)}
                      </span>
                    </div>
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={() => handleToggleActive(tpl)}
                    className="flex items-center gap-1 px-2 py-1 text-[13px] font-semibold"
                    style={{
                      borderRadius: "var(--radius-pill)",
                      background: tpl.isActive ? "var(--green-light)" : "var(--grey-100)",
                      color: tpl.isActive ? "var(--green)" : "var(--grey-500)",
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: tpl.isActive ? "var(--green)" : "var(--grey-400)" }} />
                    {tpl.isActive ? "Active" : "Inactive"}
                  </button>
                </div>

                {/* Body preview */}
                <p className="text-[15px] mt-2 line-clamp-3" style={{ color: "var(--grey-600)" }}>
                  {tpl.body.length > 100 ? tpl.body.slice(0, 100) + "..." : tpl.body}
                </p>

                {/* Variable chips */}
                {vars.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {vars.map((v) => (
                      <span
                        key={v}
                        className="px-1.5 py-0.5 text-[12px] font-semibold"
                        style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--grey-200)" }}>
                  <button
                    onClick={() => openEditForm(tpl)}
                    className="px-3 py-1.5 text-[14px] font-semibold transition-colors"
                    style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="px-3 py-1.5 text-[14px] font-semibold transition-colors"
                    style={{ border: "1px solid var(--red-light)", borderRadius: "var(--radius-sm)", color: "var(--red)", background: "var(--red-light)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        loading={confirmLoading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => { setConfirmDialog(prev => ({ ...prev, open: false })); setConfirmLoading(false); }}
      />
    </div>
  );
}
