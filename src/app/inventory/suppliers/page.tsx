"use client";

import { useEffect, useState, useCallback } from "react";
import InventoryTabs from "@/components/InventoryTabs";
import { useFlash } from "@/components/FlashCardProvider";
import { cardStyle, inputStyle } from "@/lib/styles";
import { formatCurrency } from "@/lib/formatters";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  status: "active" | "inactive";
  totalOrders?: number;
  totalValue?: number;
  createdAt: string;
}

interface SupplierForm {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
}

// ─── Design Tokens ──────────────────────────────────────────────────────────
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)", color: "white" };

const emptyForm: SupplierForm = { name: "", contactPerson: "", phone: "", email: "", address: "", gstNumber: "" };

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function SuppliersPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const { showFlash } = useFlash();
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);

  useEffect(() => { setMounted(true); }, []);

  const fetchSuppliers = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/suppliers")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data) => setSuppliers(Array.isArray(data) ? data : data.suppliers || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(supplier: Supplier) {
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      gstNumber: supplier.gstNumber || "",
    });
    setEditingId(supplier.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showFlash({ type: "error", title: "Error", message: "Supplier name is required" });
      return;
    }

    setActionLoading(true);
    try {
      const url = editingId ? `/api/suppliers/${editingId}` : "/api/suppliers";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      showFlash({ type: "success", title: "Success", message: `Supplier ${editingId ? "updated" : "added"} successfully` });
      closeForm();
      fetchSuppliers();
    } catch {
      showFlash({ type: "error", title: "Error", message: `Failed to ${editingId ? "update" : "add"} supplier` });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate(supplier: Supplier) {
    const newStatus = supplier.status === "active" ? "inactive" : "active";
    setActionLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...supplier, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      showFlash({ type: "success", title: "Success", message: `Supplier ${newStatus === "active" ? "activated" : "deactivated"}` });
      fetchSuppliers();
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to update supplier status" });
    } finally {
      setActionLoading(false);
    }
  }

  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-48 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Inventory</h1>
        <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Manage stock and supplies</p>
      </div>

      <InventoryTabs />

      {/* ── Sub Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Suppliers</h2>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>{suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
          style={btnPrimary}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </button>
      </div>

      {/* ── Error State ──────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 flex items-center justify-between" style={{ background: "#ffebee", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="text-[15px] font-medium">Failed to load suppliers: {error}</p>
          <button onClick={fetchSuppliers} className="text-[14px] font-semibold underline">Retry</button>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No suppliers found</p>
          <button onClick={openAddForm} className="text-[14px] font-semibold mt-2 hover:underline" style={{ color: "var(--blue-500)" }}>
            Add your first supplier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="p-5 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>{supplier.name}</p>
                  {supplier.contactPerson && <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-700)" }}>{supplier.contactPerson}</p>}
                </div>
                <span
                  className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: supplier.status === "active" ? "#dcfce7" : "var(--grey-200)",
                    color: supplier.status === "active" ? "var(--green)" : "var(--grey-600)",
                  }}
                >
                  {supplier.status}
                </span>
              </div>

              <div className="space-y-1 mb-3">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-[14px]" style={{ color: "var(--grey-600)" }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-[14px]" style={{ color: "var(--grey-600)" }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {supplier.email}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-4 mb-3 py-2" style={{ borderTop: "1px solid var(--grey-200)", borderBottom: "1px solid var(--grey-200)" }}>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Orders</p>
                  <p className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{supplier.totalOrders || 0}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Total Value</p>
                  <p className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(supplier.totalValue || 0)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => openEditForm(supplier)}
                  className="flex-1 px-3 py-1.5 text-[14px] font-semibold text-center transition-colors duration-150"
                  style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeactivate(supplier)}
                  disabled={actionLoading}
                  className="flex-1 px-3 py-1.5 text-[14px] font-semibold text-center transition-colors duration-150 disabled:opacity-50"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    border: supplier.status === "active" ? "1px solid #fecaca" : "1px solid #bbf7d0",
                    color: supplier.status === "active" ? "var(--red)" : "var(--green)",
                    background: supplier.status === "active" ? "#fef2f2" : "#f0fdf4",
                  }}
                >
                  {supplier.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add/Edit Modal ───────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-lg mx-4 yoda-fade-in" style={{ ...cardStyle, boxShadow: "var(--shadow-lg)" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--grey-200)" }}>
              <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>
                {editingId ? "Edit Supplier" : "Add New Supplier"}
              </h3>
              <button onClick={closeForm} className="w-8 h-8 flex items-center justify-center" style={{ color: "var(--grey-500)" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Supplier name"
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Contact Person</label>
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                    placeholder="Contact name"
                    className="w-full px-3 py-2 text-[15px]"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+65 xxxx xxxx"
                    className="w-full px-3 py-2 text-[15px]"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="supplier@example.com"
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Full address"
                  rows={2}
                  className="w-full px-3 py-2 text-[15px] resize-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>GST Registration Number</label>
                <input
                  type="text"
                  value={form.gstNumber}
                  onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
                  placeholder="GST number"
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                />
              </div>
            </div>
            <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: "1px solid var(--grey-200)" }}>
              <button onClick={closeForm} className="px-4 py-2 text-[15px] font-semibold" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}>Cancel</button>
              <button onClick={handleSave} disabled={actionLoading} className="px-4 py-2 text-[15px] font-semibold text-white disabled:opacity-50" style={btnPrimary}>
                {actionLoading ? "Saving..." : editingId ? "Update" : "Add Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
