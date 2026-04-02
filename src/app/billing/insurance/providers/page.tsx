"use client";

import { useEffect, useState, useCallback } from "react";
import BillingTabs from "@/components/BillingTabs";
import ConfirmDialog from "@/components/ConfirmDialog";

// ─── Types ──────────────────────────────────────────────────────────────────
interface InsuranceProvider {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  panelType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProviderForm {
  name: string;
  code: string;
  panelType: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

const EMPTY_FORM: ProviderForm = { name: "", code: "", panelType: "private", contactPerson: "", phone: "", email: "", address: "" };

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" };
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)" };
const chipBase = "inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide";

const PANEL_COLORS: Record<string, { bg: string; color: string }> = {
  private: { bg: "var(--blue-50)", color: "var(--blue-500)" },
  corporate: { bg: "#fff3e0", color: "#f57c00" },
  government: { bg: "#e8f5e9", color: "var(--green)" },
};

const PANEL_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "corporate", label: "Corporate" },
  { value: "government", label: "Government" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function InsuranceProvidersPage() {
  const [mounted, setMounted] = useState(false);
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; confirmLabel: string; variant: "danger" | "warning" | "default"; onConfirm: () => void }>({ open: false, title: "", message: "", confirmLabel: "Confirm", variant: "default", onConfirm: () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProviderForm>(EMPTY_FORM);

  useEffect(() => { setMounted(true); }, []);

  // ─── Fetch Providers ──────────────────────────────────────────────────
  const fetchProviders = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch("/api/insurance/providers")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data) => {
        setProviders(Array.isArray(data) ? data : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  // ─── Form Handlers ────────────────────────────────────────────────────
  function openAddForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(provider: InsuranceProvider) {
    setForm({
      name: provider.name,
      code: provider.code,
      panelType: provider.panelType,
      contactPerson: provider.contactPerson || "",
      phone: provider.phone || "",
      email: provider.email || "",
      address: provider.address || "",
    });
    setEditingId(provider.id);
    setFormError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function updateField(field: keyof ProviderForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) {
      setFormError("Name and Code are required.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const url = editingId ? `/api/insurance/providers/${editingId}` : "/api/insurance/providers";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          panelType: form.panelType,
          contactPerson: form.contactPerson.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      cancelForm();
      fetchProviders();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save provider");
    } finally {
      setSaving(false);
    }
  }

  // ─── Toggle Active ────────────────────────────────────────────────────
  async function toggleActive(provider: InsuranceProvider) {
    try {
      const res = await fetch(`/api/insurance/providers/${provider.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !provider.isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      fetchProviders();
    } catch {
      setError("Failed to update provider status");
    }
  }

  // ─── Delete (Soft) ────────────────────────────────────────────────────
  function handleDelete(provider: InsuranceProvider) {
    setConfirmDialog({
      open: true,
      title: "Deactivate Provider",
      message: `Deactivate "${provider.name}"? This will hide the provider from new claims.`,
      confirmLabel: "Deactivate",
      variant: "warning",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`/api/insurance/providers/${provider.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed");
          fetchProviders();
        } catch {
          setError("Failed to deactivate provider");
        } finally {
          setConfirmLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  }

  function getPanelStyle(panelType: string) {
    return PANEL_COLORS[panelType] || PANEL_COLORS.private;
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-48 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      </div>
    );
  }

  const inputStyle = { border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" };

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* ── Tab Navigation ─────────────────────────────────────── */}
      <BillingTabs />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Insurance Providers</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {providers.length} provider{providers.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openAddForm}
            className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
            style={btnPrimary}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Provider
          </button>
        )}
      </div>

      {/* ── Add/Edit Form ────────────────────────────────────────── */}
      {showForm && (
        <div className="mb-6 p-5" style={cardStyle}>
          <h2 className="text-[17px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>
            {editingId ? "Edit Provider" : "Add New Provider"}
          </h2>

          {formError && (
            <div className="mb-4 px-4 py-2" style={{ background: "#ffebee", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
              <p className="text-[15px] font-medium">{formError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[13px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--grey-600)" }}>
                Name <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. AIA Singapore"
                className="w-full px-3 py-2 text-[15px]"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--grey-600)" }}>
                Code <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => updateField("code", e.target.value)}
                placeholder="e.g. AIA"
                className="w-full px-3 py-2 text-[15px] uppercase"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--grey-600)" }}>
                Panel Type
              </label>
              <select
                value={form.panelType}
                onChange={(e) => updateField("panelType", e.target.value)}
                className="w-full px-3 py-2 text-[15px]"
                style={inputStyle}
              >
                {PANEL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--grey-600)" }}>
                Contact Person
              </label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => updateField("contactPerson", e.target.value)}
                placeholder="Contact name"
                className="w-full px-3 py-2 text-[15px]"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--grey-600)" }}>
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+65 xxxx xxxx"
                className="w-full px-3 py-2 text-[15px]"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--grey-600)" }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="claims@provider.com"
                className="w-full px-3 py-2 text-[15px]"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-[13px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--grey-600)" }}>
              Address
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Full address"
              className="w-full px-3 py-2 text-[15px]"
              style={inputStyle}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150 disabled:opacity-50"
              style={btnPrimary}
            >
              {saving ? "Saving..." : editingId ? "Update Provider" : "Add Provider"}
            </button>
            <button
              onClick={cancelForm}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-[15px] font-semibold transition-colors duration-150"
              style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Error State ─────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 flex items-center justify-between" style={{ background: "#ffebee", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="text-[15px] font-medium">{error}</p>
          <button onClick={() => { setError(null); fetchProviders(); }} className="text-[14px] font-semibold underline">Retry</button>
        </div>
      )}

      {/* ── Loading State ───────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      ) : providers.length === 0 ? (
        /* ── Empty State ─────────────────────────────────────────── */
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No insurance providers found</p>
          <button
            onClick={openAddForm}
            className="text-[14px] font-semibold mt-2 hover:underline"
            style={{ color: "var(--blue-500)" }}
          >
            Add your first provider
          </button>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ─────────────────────────────────────── */}
          <div className="hidden md:block overflow-hidden" style={cardStyle}>
            <table className="w-full" role="table">
              <thead style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                <tr>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Name</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Code</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Panel Type</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Contact</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Phone</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Email</th>
                  <th className="text-center px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Active</th>
                  <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider, i) => {
                  const panelStyle = getPanelStyle(provider.panelType);
                  return (
                    <tr
                      key={provider.id}
                      className="transition-colors duration-100 group"
                      style={{
                        borderBottom: i < providers.length - 1 ? "1px solid var(--grey-200)" : "none",
                        opacity: provider.isActive ? 1 : 0.55,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{provider.name}</td>
                      <td className="px-4 py-3 text-[14px] font-mono font-bold" style={{ color: "var(--grey-700)" }}>{provider.code}</td>
                      <td className="px-4 py-3">
                        <span
                          className={chipBase}
                          style={{ borderRadius: "var(--radius-sm)", background: panelStyle.bg, color: panelStyle.color }}
                        >
                          {provider.panelType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{provider.contactPerson || "\u2014"}</td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{provider.phone || "\u2014"}</td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{provider.email || "\u2014"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActive(provider)}
                          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200"
                          style={{ background: provider.isActive ? "var(--green)" : "var(--grey-300)" }}
                          aria-label={provider.isActive ? "Deactivate provider" : "Activate provider"}
                        >
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200"
                            style={{ transform: provider.isActive ? "translateX(18px)" : "translateX(3px)" }}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditForm(provider)}
                            className="text-[14px] font-semibold hover:underline"
                            style={{ color: "var(--blue-500)" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(provider)}
                            className="text-[14px] font-semibold hover:underline"
                            style={{ color: "var(--red)" }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ───────────────────────────────────────── */}
          <div className="md:hidden space-y-2">
            {providers.map((provider) => {
              const panelStyle = getPanelStyle(provider.panelType);
              return (
                <div
                  key={provider.id}
                  className="p-4 transition-shadow duration-150"
                  style={{ ...cardStyle, boxShadow: "var(--shadow-sm)", opacity: provider.isActive ? 1 : 0.55 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[16px] font-semibold" style={{ color: "var(--grey-900)" }}>{provider.name}</p>
                      <p className="text-[13px] font-mono font-bold" style={{ color: "var(--grey-500)" }}>{provider.code}</p>
                    </div>
                    <span
                      className={chipBase}
                      style={{ borderRadius: "var(--radius-sm)", background: panelStyle.bg, color: panelStyle.color }}
                    >
                      {provider.panelType}
                    </span>
                  </div>

                  {provider.contactPerson && (
                    <p className="text-[14px] mb-1" style={{ color: "var(--grey-600)" }}>
                      <span className="font-medium">Contact:</span> {provider.contactPerson}
                    </p>
                  )}
                  {provider.phone && (
                    <p className="text-[14px] mb-1" style={{ color: "var(--grey-600)" }}>
                      <span className="font-medium">Phone:</span> {provider.phone}
                    </p>
                  )}
                  {provider.email && (
                    <p className="text-[14px] mb-1" style={{ color: "var(--grey-600)" }}>
                      <span className="font-medium">Email:</span> {provider.email}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--grey-200)" }}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(provider)}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200"
                        style={{ background: provider.isActive ? "var(--green)" : "var(--grey-300)" }}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200"
                          style={{ transform: provider.isActive ? "translateX(18px)" : "translateX(3px)" }}
                        />
                      </button>
                      <span className="text-[13px] font-medium" style={{ color: provider.isActive ? "var(--green)" : "var(--grey-500)" }}>
                        {provider.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEditForm(provider)}
                        className="text-[14px] font-semibold hover:underline"
                        style={{ color: "var(--blue-500)" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(provider)}
                        className="text-[14px] font-semibold hover:underline"
                        style={{ color: "var(--red)" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
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
