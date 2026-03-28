"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────
interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string | null;
  unit: string;
  batchNumber: string | null;
  manufacturer: string | null;
  supplier: string | null;
  location: string | null;
  hsnCode: string | null;
  description: string | null;
  costPrice: number | null;
  sellingPrice: number | null;
  gstPercent: number | null;
  currentStock: number;
  reorderLevel: number;
  expiryDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  unitPrice: number | null;
  stockAfter: number;
  reference: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

type StockActionType = "purchase" | "issue" | "adjust" | "return";

// ─── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "medicine", label: "Medicine" },
  { value: "herb", label: "Herb" },
  { value: "oil", label: "Oil (Thailam)" },
  { value: "consumable", label: "Consumable" },
  { value: "equipment", label: "Equipment" },
];

const SUBCATEGORIES: Record<string, string[]> = {
  medicine: ["Kashayam", "Arishtam", "Choornam", "Thailam", "Ghritam", "Leham", "Gulika", "Vatika", "Bhasmam", "Rasayanam", "Other"],
  herb: [], oil: [], consumable: [], equipment: [],
};

const UNITS = ["nos", "ml", "gm", "kg", "litre", "bottle", "packet", "box"];

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const inputStyle = { border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", fontSize: "13px" };
const inputErrorStyle = { ...inputStyle, border: "1px solid var(--red)", background: "#fff5f5" };
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)" as const, boxShadow: "var(--shadow-card)" as const };
const sectionTitle = { color: "var(--grey-900)", fontSize: "15px", fontWeight: 700 as const };
const chipBase = "inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}, ${h}:${m}`;
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getStockColor(stock: number, reorderLevel: number): string {
  if (stock <= reorderLevel) return "var(--red)";
  if (stock <= reorderLevel * 2) return "#f57c00";
  return "var(--green)";
}

function getStockPercent(stock: number, reorderLevel: number): number {
  if (reorderLevel === 0) return stock > 0 ? 100 : 0;
  const max = reorderLevel * 5;
  return Math.min(100, Math.max(0, (stock / max) * 100));
}

const TXN_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; sign: string }> = {
  purchase: { label: "Purchase", color: "var(--green)", bg: "#e8f5e9", sign: "+" },
  issue: { label: "Issue/Sale", color: "var(--red)", bg: "#ffebee", sign: "-" },
  adjust: { label: "Adjustment", color: "#f57c00", bg: "#fff3e0", sign: "" },
  return: { label: "Return", color: "var(--blue-500)", bg: "#e3f2fd", sign: "+" },
};

// ─── Toast ──────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 text-[13px] font-semibold yoda-slide-in" role="alert"
      style={{ background: type === "success" ? "var(--green)" : "var(--red)", color: "#fff", borderRadius: "var(--radius-sm)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", minWidth: 260 }}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {type === "success" ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />}
      </svg>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100">&times;</button>
    </div>
  );
}

// ─── Profile Row (view mode) ────────────────────────────────────────────────
function ProfileRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <tr>
      <td className="py-[8px] pr-4 text-[13px] font-normal text-right whitespace-nowrap align-top" style={{ color: "var(--grey-600)", width: 180 }}>{label} :</td>
      <td className="py-[8px] pl-2 text-[13px] font-medium align-top" style={{ color: "var(--grey-900)" }}>{String(value)}</td>
    </tr>
  );
}

// ─── Form Row (edit mode) ───────────────────────────────────────────────────
function FormRow({ label, required, children, error }: { label: string; required?: boolean; children: React.ReactNode; error?: string }) {
  return (
    <tr>
      <td className="py-[8px] pr-4 text-[13px] font-normal text-right whitespace-nowrap align-top" style={{ color: "var(--grey-600)", width: 180 }}>
        {label}{required && <span style={{ color: "var(--red)" }}> *</span>} :
      </td>
      <td className="py-[8px] pl-2">
        {children}
        {error && <p className="mt-0.5 text-[11px] font-medium" style={{ color: "var(--red)" }}>{error}</p>}
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function InventoryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Stock action
  const [activeAction, setActiveAction] = useState<StockActionType | null>(null);
  const [actionQty, setActionQty] = useState("");
  const [actionUnitPrice, setActionUnitPrice] = useState("");
  const [actionReference, setActionReference] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ─── Fetch Item ───────────────────────────────────────────────────────────
  const fetchItem = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/inventory/${id}`)
      .then((r) => { if (!r.ok) throw new Error(`Not found (${r.status})`); return r.json(); })
      .then((data) => {
        setItem(data.item || data);
        setTransactions(data.transactions || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { if (id) fetchItem(); }, [id, fetchItem]);

  // ─── Enter edit mode ──────────────────────────────────────────────────────
  function enterEditMode() {
    if (!item) return;
    setEditForm({
      name: item.name,
      category: item.category,
      subcategory: item.subcategory || "",
      unit: item.unit,
      batchNumber: item.batchNumber || "",
      manufacturer: item.manufacturer || "",
      supplier: item.supplier || "",
      location: item.location || "",
      hsnCode: item.hsnCode || "",
      description: item.description || "",
      costPrice: item.costPrice != null ? String(item.costPrice) : "",
      sellingPrice: item.sellingPrice != null ? String(item.sellingPrice) : "",
      gstPercent: item.gstPercent != null ? String(item.gstPercent) : "",
      currentStock: String(item.currentStock),
      reorderLevel: String(item.reorderLevel),
      expiryDate: item.expiryDate ? item.expiryDate.split("T")[0] : "",
      status: item.status,
    });
    setEditErrors({});
    setEditMode(true);
  }

  function updateEditField(name: string, value: string) {
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  const editSubcategoryOptions = editForm.category ? (SUBCATEGORIES[editForm.category] || []) : [];

  function validateEdit(): boolean {
    const errors: Record<string, string> = {};
    if (!editForm.name?.trim()) errors.name = "Required";
    if (!editForm.category) errors.category = "Required";
    if (!editForm.unit) errors.unit = "Required";
    if (editForm.costPrice && (isNaN(Number(editForm.costPrice)) || Number(editForm.costPrice) < 0)) errors.costPrice = "Must be a positive number";
    if (editForm.sellingPrice && (isNaN(Number(editForm.sellingPrice)) || Number(editForm.sellingPrice) < 0)) errors.sellingPrice = "Must be a positive number";
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleEditSubmit() {
    if (!validateEdit()) return;
    setSaving(true);
    try {
      const body = {
        name: editForm.name.trim(),
        category: editForm.category,
        subcategory: editForm.subcategory || null,
        unit: editForm.unit,
        batchNumber: editForm.batchNumber.trim() || null,
        manufacturer: editForm.manufacturer.trim() || null,
        supplier: editForm.supplier.trim() || null,
        location: editForm.location.trim() || null,
        hsnCode: editForm.hsnCode.trim() || null,
        description: editForm.description.trim() || null,
        costPrice: editForm.costPrice ? Number(editForm.costPrice) : null,
        sellingPrice: editForm.sellingPrice ? Number(editForm.sellingPrice) : null,
        gstPercent: editForm.gstPercent ? Number(editForm.gstPercent) : null,
        currentStock: Number(editForm.currentStock),
        reorderLevel: editForm.reorderLevel ? Number(editForm.reorderLevel) : 0,
        expiryDate: editForm.expiryDate || null,
        status: editForm.status,
      };
      const res = await fetch(`/api/inventory/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed to update");
      setToast({ message: "Item updated successfully!", type: "success" });
      setEditMode(false);
      fetchItem();
    } catch {
      setToast({ message: "Failed to update item", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  // ─── Stock Actions ────────────────────────────────────────────────────────
  function openAction(type: StockActionType) {
    setActiveAction(type);
    setActionQty("");
    setActionUnitPrice("");
    setActionReference("");
    setActionNotes("");
  }

  async function submitStockAction() {
    if (!actionQty || isNaN(Number(actionQty)) || Number(actionQty) <= 0) {
      setToast({ message: "Please enter a valid quantity", type: "error" });
      return;
    }
    setActionSubmitting(true);
    try {
      const body = {
        type: activeAction,
        quantity: Number(actionQty),
        unitPrice: actionUnitPrice ? Number(actionUnitPrice) : null,
        reference: actionReference.trim() || null,
        notes: actionNotes.trim() || null,
      };
      const res = await fetch(`/api/inventory/${id}/transactions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      setToast({ message: "Stock updated successfully!", type: "success" });
      setActiveAction(null);
      fetchItem();
    } catch {
      setToast({ message: "Failed to update stock", type: "error" });
    } finally {
      setActionSubmitting(false);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setToast({ message: "Item deleted", type: "success" });
      setTimeout(() => router.push("/inventory"), 1000);
    } catch {
      setToast({ message: "Failed to delete item", type: "error" });
      setDeleting(false);
    }
  }

  // ─── Hydration-safe loading ───────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-64 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="h-96 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-48 animate-pulse mb-4" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-6 md:p-8">
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "#ffebee", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--red)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>{error || "Item not found"}</p>
          <button onClick={fetchItem} className="text-[12px] font-semibold mt-2 hover:underline" style={{ color: "var(--blue-500)" }}>Retry</button>
          <div className="mt-3">
            <Link href="/inventory" className="text-[12px] font-semibold hover:underline" style={{ color: "var(--grey-500)" }}>Back to Inventory</Link>
          </div>
        </div>
      </div>
    );
  }

  const stockColor = getStockColor(item.currentStock, item.reorderLevel);
  const stockPercent = getStockPercent(item.currentStock, item.reorderLevel);
  const expiryDays = item.expiryDate ? daysUntil(item.expiryDate) : null;

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="w-8 h-8 flex items-center justify-center transition-colors flex-shrink-0"
            style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-600)" }}
            aria-label="Back to inventory"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>{item.name}</h1>
              <span className={chipBase} style={{
                borderRadius: "var(--radius-sm)",
                background: item.status === "active" ? "#e8f5e9" : item.status === "discontinued" ? "#ffebee" : "var(--grey-200)",
                color: item.status === "active" ? "var(--green)" : item.status === "discontinued" ? "var(--red)" : "var(--grey-600)",
              }}>{item.status}</span>
            </div>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>
              SKU: {item.sku} &middot; {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
              {item.subcategory && ` / ${item.subcategory}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <>
              <button
                onClick={enterEditMode}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold transition-colors"
                style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold transition-colors"
                style={{ borderRadius: "var(--radius-sm)", border: "1px solid #ffcdd2", color: "var(--red)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEditSubmit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ borderRadius: "var(--radius-sm)", background: "var(--blue-500)" }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 text-[13px] font-semibold transition-colors"
                style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-600)" }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation ──────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="mb-4 p-4 flex items-center justify-between" style={{ background: "#ffebee", borderRadius: "var(--radius-sm)", border: "1px solid #ffcdd2" }}>
          <p className="text-[13px] font-medium" style={{ color: "var(--red)" }}>Are you sure you want to delete this item? This action cannot be undone.</p>
          <div className="flex gap-2 ml-4 flex-shrink-0">
            <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: "var(--red)", borderRadius: "var(--radius-sm)" }}>
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-[12px] font-semibold" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-600)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Item Info Card ───────────────────────────────────────── */}
      <div className="mb-6 p-6" style={cardStyle}>
        {!editMode ? (
          <>
            {/* Stock Level Indicator */}
            <div className="mb-5 pb-5" style={{ borderBottom: "1px solid var(--grey-200)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold" style={{ color: "var(--grey-700)" }}>Stock Level</span>
                <span className="text-[14px] font-bold" style={{ color: stockColor }}>
                  {item.currentStock} {item.unit}
                  {item.reorderLevel > 0 && (
                    <span className="text-[11px] font-normal ml-1" style={{ color: "var(--grey-500)" }}>(reorder at {item.reorderLevel})</span>
                  )}
                </span>
              </div>
              <div className="w-full h-3" style={{ background: "var(--grey-100)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${stockPercent}%`, height: "100%", background: stockColor, borderRadius: 6, transition: "width 0.5s ease" }} />
              </div>
              {expiryDays !== null && (
                <p className="mt-2 text-[12px] font-medium" style={{ color: expiryDays <= 30 ? "var(--red)" : expiryDays <= 90 ? "#f57c00" : "var(--grey-600)" }}>
                  {expiryDays <= 0 ? "EXPIRED" : `Expires in ${expiryDays} day${expiryDays !== 1 ? "s" : ""}`}
                  {item.expiryDate && ` (${formatDate(item.expiryDate)})`}
                </p>
              )}
            </div>

            {/* Details table */}
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <tbody>
                <ProfileRow label="SKU" value={item.sku} />
                <ProfileRow label="Category" value={CATEGORIES.find(c => c.value === item.category)?.label || item.category} />
                {item.subcategory && <ProfileRow label="Subcategory" value={item.subcategory} />}
                <ProfileRow label="Unit" value={item.unit} />
                <ProfileRow label="Batch Number" value={item.batchNumber} />
                <ProfileRow label="Manufacturer" value={item.manufacturer} />
                <ProfileRow label="Supplier" value={item.supplier} />
                <ProfileRow label="Location" value={item.location} />
                <ProfileRow label="HSN Code" value={item.hsnCode} />
                <ProfileRow label="Description" value={item.description} />
                <ProfileRow label="Cost Price" value={item.costPrice != null ? `S$${item.costPrice.toLocaleString("en-SG")}` : null} />
                <ProfileRow label="Selling Price" value={item.sellingPrice != null ? `S$${item.sellingPrice.toLocaleString("en-SG")}` : null} />
                <ProfileRow label="GST" value={item.gstPercent != null ? `${item.gstPercent}%` : null} />
                <ProfileRow label="Created" value={formatDate(item.createdAt)} />
                <ProfileRow label="Last Updated" value={formatDate(item.updatedAt)} />
              </tbody>
            </table>
          </>
        ) : (
          /* ── Edit Form ─────────────────────────────────────────── */
          <>
            <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Edit Item</h2>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <tbody>
                <FormRow label="Name" required error={editErrors.name}>
                  <input type="text" value={editForm.name || ""} onChange={(e) => updateEditField("name", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[13px]" style={editErrors.name ? inputErrorStyle : inputStyle} />
                </FormRow>
                <FormRow label="Category" required error={editErrors.category}>
                  <select value={editForm.category || ""} onChange={(e) => { updateEditField("category", e.target.value); updateEditField("subcategory", ""); }} className="w-full max-w-md px-2.5 py-1.5 text-[13px]" style={inputStyle}>
                    <option value="">Select</option>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </FormRow>
                {editSubcategoryOptions.length > 0 && (
                  <FormRow label="Subcategory">
                    <select value={editForm.subcategory || ""} onChange={(e) => updateEditField("subcategory", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[13px]" style={inputStyle}>
                      <option value="">Select</option>
                      {editSubcategoryOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormRow>
                )}
                <FormRow label="Unit" required error={editErrors.unit}>
                  <select value={editForm.unit || ""} onChange={(e) => updateEditField("unit", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[13px]" style={inputStyle}>
                    <option value="">Select</option>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </FormRow>
                <FormRow label="Batch Number">
                  <input type="text" value={editForm.batchNumber || ""} onChange={(e) => updateEditField("batchNumber", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Manufacturer">
                  <input type="text" value={editForm.manufacturer || ""} onChange={(e) => updateEditField("manufacturer", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Supplier">
                  <input type="text" value={editForm.supplier || ""} onChange={(e) => updateEditField("supplier", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Location">
                  <input type="text" value={editForm.location || ""} onChange={(e) => updateEditField("location", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                </FormRow>
                <FormRow label="HSN Code">
                  <input type="text" value={editForm.hsnCode || ""} onChange={(e) => updateEditField("hsnCode", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Description">
                  <textarea value={editForm.description || ""} onChange={(e) => updateEditField("description", e.target.value)} rows={3} className="w-full max-w-md px-2.5 py-1.5 text-[13px] resize-y" style={inputStyle} />
                </FormRow>
                <FormRow label="Cost Price" error={editErrors.costPrice}>
                  <div className="relative max-w-[200px]">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px]" style={{ color: "var(--grey-500)" }}>{"\u20B9"}</span>
                    <input type="text" value={editForm.costPrice || ""} onChange={(e) => updateEditField("costPrice", e.target.value)} className="w-full pl-7 pr-2.5 py-1.5 text-[13px]" style={inputStyle} />
                  </div>
                </FormRow>
                <FormRow label="Selling Price" error={editErrors.sellingPrice}>
                  <div className="relative max-w-[200px]">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px]" style={{ color: "var(--grey-500)" }}>{"\u20B9"}</span>
                    <input type="text" value={editForm.sellingPrice || ""} onChange={(e) => updateEditField("sellingPrice", e.target.value)} className="w-full pl-7 pr-2.5 py-1.5 text-[13px]" style={inputStyle} />
                  </div>
                </FormRow>
                <FormRow label="GST %">
                  <input type="text" value={editForm.gstPercent || ""} onChange={(e) => updateEditField("gstPercent", e.target.value)} className="max-w-[120px] px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Reorder Level">
                  <input type="text" value={editForm.reorderLevel || ""} onChange={(e) => updateEditField("reorderLevel", e.target.value)} className="max-w-[150px] px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Expiry Date">
                  <input type="date" value={editForm.expiryDate || ""} onChange={(e) => updateEditField("expiryDate", e.target.value)} className="max-w-[200px] px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Status">
                  <select value={editForm.status || ""} onChange={(e) => updateEditField("status", e.target.value)} className="max-w-[200px] px-2.5 py-1.5 text-[13px]" style={inputStyle}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </FormRow>
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ── Stock Actions ────────────────────────────────────────── */}
      {!editMode && (
        <div className="mb-6 p-6" style={cardStyle}>
          <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Stock Actions</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => openAction("purchase")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold transition-colors"
              style={{
                borderRadius: "var(--radius-sm)",
                border: activeAction === "purchase" ? "1.5px solid var(--green)" : "1px solid var(--grey-300)",
                background: activeAction === "purchase" ? "#e8f5e9" : "var(--white)",
                color: activeAction === "purchase" ? "var(--green)" : "var(--grey-700)",
              }}
            >
              {"\uD83D\uDCE5"} Purchase Stock
            </button>
            <button
              onClick={() => openAction("issue")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold transition-colors"
              style={{
                borderRadius: "var(--radius-sm)",
                border: activeAction === "issue" ? "1.5px solid var(--red)" : "1px solid var(--grey-300)",
                background: activeAction === "issue" ? "#ffebee" : "var(--white)",
                color: activeAction === "issue" ? "var(--red)" : "var(--grey-700)",
              }}
            >
              {"\uD83D\uDCE4"} Issue/Sale
            </button>
            <button
              onClick={() => openAction("adjust")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold transition-colors"
              style={{
                borderRadius: "var(--radius-sm)",
                border: activeAction === "adjust" ? "1.5px solid #f57c00" : "1px solid var(--grey-300)",
                background: activeAction === "adjust" ? "#fff3e0" : "var(--white)",
                color: activeAction === "adjust" ? "#f57c00" : "var(--grey-700)",
              }}
            >
              {"\uD83D\uDD04"} Adjust Stock
            </button>
            <button
              onClick={() => openAction("return")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold transition-colors"
              style={{
                borderRadius: "var(--radius-sm)",
                border: activeAction === "return" ? "1.5px solid var(--blue-500)" : "1px solid var(--grey-300)",
                background: activeAction === "return" ? "#e3f2fd" : "var(--white)",
                color: activeAction === "return" ? "var(--blue-500)" : "var(--grey-700)",
              }}
            >
              {"\u21A9\uFE0F"} Return
            </button>
          </div>

          {/* Inline Action Form */}
          {activeAction && (
            <div className="p-4 mb-2" style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>
                  {activeAction === "purchase" && "Purchase Stock"}
                  {activeAction === "issue" && "Issue / Sale"}
                  {activeAction === "adjust" && "Adjust Stock"}
                  {activeAction === "return" && "Return Stock"}
                </h3>
                <button onClick={() => setActiveAction(null)} className="text-[11px] font-semibold" style={{ color: "var(--grey-500)" }}>Cancel</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Quantity *</label>
                  <input type="number" value={actionQty} onChange={(e) => setActionQty(e.target.value)} placeholder="0" min="1" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                </div>
                {activeAction === "purchase" && (
                  <div>
                    <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Unit Price ({"\u20B9"})</label>
                    <input type="number" value={actionUnitPrice} onChange={(e) => setActionUnitPrice(e.target.value)} placeholder="0.00" step="0.01" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Reference</label>
                  <input type="text" value={actionReference} onChange={(e) => setActionReference(e.target.value)} placeholder="Invoice/PO number" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Notes</label>
                  <input type="text" value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} placeholder="Optional notes" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                </div>
              </div>
              <div className="mt-3">
                <button
                  onClick={submitStockAction}
                  disabled={actionSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ borderRadius: "var(--radius-sm)", background: "var(--blue-500)" }}
                >
                  {actionSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Transaction History ───────────────────────────────────── */}
      {!editMode && (
        <div className="p-6" style={cardStyle}>
          <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Transaction History</h2>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>No transactions recorded yet</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full" role="table">
                  <thead style={{ borderBottom: "1px solid var(--grey-200)" }}>
                    <tr>
                      <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Date</th>
                      <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Type</th>
                      <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Qty</th>
                      <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Stock After</th>
                      <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Reference</th>
                      <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Notes</th>
                      <th className="text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn, i) => {
                      const cfg = TXN_TYPE_CONFIG[txn.type] || TXN_TYPE_CONFIG.adjust;
                      return (
                        <tr key={txn.id} style={{ borderBottom: i < transactions.length - 1 ? "1px solid var(--grey-100)" : "none" }}>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: "var(--grey-700)" }}>{formatDateTime(txn.createdAt)}</td>
                          <td className="px-4 py-2.5">
                            <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          </td>
                          <td className="px-4 py-2.5 text-[13px] font-bold" style={{ color: cfg.color }}>
                            {cfg.sign}{txn.quantity} {item.unit}
                            {txn.unitPrice != null && (
                              <span className="text-[11px] font-normal ml-1" style={{ color: "var(--grey-500)" }}>@ {"\u20B9"}{txn.unitPrice}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[13px] font-medium" style={{ color: "var(--grey-800)" }}>{txn.stockAfter}</td>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: "var(--grey-600)" }}>{txn.reference || "\u2014"}</td>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: "var(--grey-600)" }}>{txn.notes || "\u2014"}</td>
                          <td className="px-4 py-2.5 text-[12px]" style={{ color: "var(--grey-600)" }}>{txn.createdBy || "\u2014"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {transactions.map((txn) => {
                  const cfg = TXN_TYPE_CONFIG[txn.type] || TXN_TYPE_CONFIG.adjust;
                  return (
                    <div key={txn.id} className="p-3" style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-100)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>{formatDateTime(txn.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-bold" style={{ color: cfg.color }}>{cfg.sign}{txn.quantity} {item.unit}</span>
                        <span className="text-[12px]" style={{ color: "var(--grey-600)" }}>Stock: {txn.stockAfter}</span>
                      </div>
                      {txn.reference && <p className="text-[11px] mt-1" style={{ color: "var(--grey-500)" }}>Ref: {txn.reference}</p>}
                      {txn.notes && <p className="text-[11px]" style={{ color: "var(--grey-500)" }}>{txn.notes}</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
