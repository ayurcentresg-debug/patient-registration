"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SectionNote } from "@/components/HelpTip";
import Toast from "@/components/Toast";

// ─── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "medicine", label: "Medicine" },
  { value: "herb", label: "Herb (Raw herbs & powders)" },
  { value: "oil", label: "Oil (Therapeutic oils - Thailam)" },
  { value: "consumable", label: "Consumable (Disposables, cotton, etc.)" },
  { value: "equipment", label: "Equipment (Treatment tables, vessels, etc.)" },
];

const SUBCATEGORIES: Record<string, string[]> = {
  medicine: ["Arishtam", "Asavam", "Bhasmam", "Bhasmam & Ksharam", "Churnam", "Classical Tablet", "Cream", "Gel", "Ghritam", "Ghritam & Sneham", "Granule", "Gulika", "Gulika & Tablet", "Gutika", "Kashayam", "Ksharam", "Kuzhampu", "Lehyam", "Lehyam & Rasayanam", "Liniment", "Mashi", "Oil", "Oil & Tailam", "Ointment", "Proprietary Medicine", "Proprietary Syrup", "Proprietary Tablet", "Rasakriya", "Rasayanam", "Sneham", "Soft Gel", "Tailam", "Other"],
  herb: [],
  oil: ["Tailam", "Oil & Tailam", "Sneham"],
  consumable: [],
  equipment: [],
};

const UNITS = ["bottle", "nos", "jar", "pkt", "container", "tube", "ml", "gm", "kg", "litre", "box"];

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const inputStyle = {
  border: "1px solid var(--grey-400)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-900)",
  background: "var(--white)",
  fontSize: "15px",
};
const inputErrorStyle = {
  ...inputStyle,
  border: "1px solid var(--red)",
  background: "#fff5f5",
};
const cardStyle = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)" as const,
  boxShadow: "var(--shadow-card)" as const,
};
const sectionTitle = { color: "var(--grey-900)", fontSize: "17px", fontWeight: 700 as const };

// ─── Field Error ────────────────────────────────────────────────────────────
function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{error}</p>;
}

// ─── Practo-Style Form Row ──────────────────────────────────────────────────
function FormRow({ label, required, children, error }: { label: string; required?: boolean; children: React.ReactNode; error?: string }) {
  return (
    <tr>
      <td className="py-[8px] pr-4 text-[15px] font-normal text-right whitespace-nowrap align-top" style={{ color: "var(--grey-600)", width: 180 }}>
        {label}{required && <span style={{ color: "var(--red)" }}> *</span>} :
      </td>
      <td className="py-[8px] pl-2">
        {children}
        {error && <FieldError error={error} />}
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function NewInventoryItemPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [unit, setUnit] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [supplier, setSupplier] = useState("");
  const [location, setLocation] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [description, setDescription] = useState("");

  const [packing, setPacking] = useState("");
  const [manufacturerCode, setManufacturerCode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [gstPercent, setGstPercent] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // Reset subcategory when category changes
  useEffect(() => { setSubcategory(""); }, [category]);

  const subcategoryOptions = category ? (SUBCATEGORIES[category] || []) : [];

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Item name is required";
    if (!category) errors.category = "Category is required";
    if (!unit) errors.unit = "Unit is required";
    if (!currentStock.trim()) errors.currentStock = "Current stock is required";
    if (costPrice && (isNaN(Number(costPrice)) || Number(costPrice) < 0)) errors.costPrice = "Must be a positive number";
    if (sellingPrice && (isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0)) errors.sellingPrice = "Must be a positive number";
    if (gstPercent && (isNaN(Number(gstPercent)) || Number(gstPercent) < 0)) errors.gstPercent = "Must be a positive number";
    if (currentStock && isNaN(Number(currentStock))) errors.currentStock = "Must be a number";
    if (reorderLevel && isNaN(Number(reorderLevel))) errors.reorderLevel = "Must be a number";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        category,
        subcategory: subcategory || null,
        unit,
        packing: packing.trim() || null,
        manufacturerCode: manufacturerCode.trim() || null,
        batchNumber: batchNumber.trim() || null,
        manufacturer: manufacturer.trim() || null,
        supplier: supplier.trim() || null,
        location: location.trim() || null,
        hsnCode: hsnCode.trim() || null,
        description: description.trim() || null,
        costPrice: costPrice ? Number(costPrice) : null,
        unitPrice: sellingPrice ? Number(sellingPrice) : null,
        gstPercent: gstPercent ? Number(gstPercent) : null,
        currentStock: Number(currentStock),
        reorderLevel: reorderLevel ? Number(reorderLevel) : 0,
        expiryDate: expiryDate || null,
      };

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      setToast({ message: "Inventory item added successfully!", type: "success" });
      setTimeout(() => router.push("/inventory"), 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-64 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="h-96 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Back Link ─────────────────────────────────────────────── */}
      <Link href="/inventory" className="inline-flex items-center gap-1 text-[15px] font-semibold hover:underline mb-4" style={{ color: "var(--blue-500)" }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Inventory
      </Link>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Add Inventory Item</h1>
        <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Add a new item to your Ayurveda clinic inventory</p>
      </div>

      <SectionNote type="tip" text="Fill in the item details below. SKU is auto-generated. Required fields are marked with *. Set a reorder level so you get alerts when stock is low." />

      <form ref={formRef} onSubmit={handleSubmit}>
        {/* ── Section: Item Details ───────────────────────────────── */}
        <div className="mb-6 p-6" style={cardStyle}>
          <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Item Details</h2>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <tbody>
              <FormRow label="Name" required error={fieldErrors.name}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Dasamoolarishtam, Triphala Choornam"
                  className="w-full max-w-md px-2.5 py-1.5 text-[15px]"
                  style={fieldErrors.name ? inputErrorStyle : inputStyle}
                />
              </FormRow>

              <FormRow label="Category" required error={fieldErrors.category}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full max-w-md px-2.5 py-1.5 text-[15px]"
                  style={fieldErrors.category ? inputErrorStyle : inputStyle}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </FormRow>

              {subcategoryOptions.length > 0 && (
                <FormRow label="Subcategory">
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full max-w-md px-2.5 py-1.5 text-[15px]"
                    style={inputStyle}
                  >
                    <option value="">Select subcategory</option>
                    {subcategoryOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormRow>
              )}

              <FormRow label="Unit" required error={fieldErrors.unit}>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full max-w-md px-2.5 py-1.5 text-[15px]"
                  style={fieldErrors.unit ? inputErrorStyle : inputStyle}
                >
                  <option value="">Select unit</option>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </FormRow>

              <FormRow label="Packing">
                <input type="text" value={packing} onChange={(e) => setPacking(e.target.value)} placeholder="e.g., 450ML, 10GM, 100Nos" className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
              </FormRow>

              <FormRow label="Mfr. Code">
                <input type="text" value={manufacturerCode} onChange={(e) => setManufacturerCode(e.target.value)} placeholder="e.g., FGA001 (Kottakkal code)" className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
              </FormRow>

              <FormRow label="Batch Number">
                <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g., BATCH-2026-001" className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
              </FormRow>

              <FormRow label="Manufacturer">
                <input type="text" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="e.g., Kottakkal Arya Vaidya Sala" className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
              </FormRow>

              <FormRow label="Supplier">
                <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
              </FormRow>

              <FormRow label="Location">
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Shelf A, Room 2" className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
              </FormRow>

              <FormRow label="HSN Code">
                <input type="text" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} placeholder="e.g., 3004" className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
              </FormRow>

              <FormRow label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description or notes"
                  rows={3}
                  className="w-full max-w-md px-2.5 py-1.5 text-[15px] resize-y"
                  style={inputStyle}
                />
              </FormRow>
            </tbody>
          </table>
        </div>

        {/* ── Section: Pricing & Stock ────────────────────────────── */}
        <div className="mb-6 p-6" style={cardStyle}>
          <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Pricing &amp; Stock</h2>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <tbody>
              <FormRow label="Cost Price" error={fieldErrors.costPrice}>
                <div className="relative max-w-[200px]">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: "var(--grey-500)" }}>{"\u20B9"}</span>
                  <input type="text" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0.00" className="w-full pl-7 pr-2.5 py-1.5 text-[15px]" style={fieldErrors.costPrice ? inputErrorStyle : inputStyle} />
                </div>
              </FormRow>

              <FormRow label="Selling Price" error={fieldErrors.sellingPrice}>
                <div className="relative max-w-[200px]">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: "var(--grey-500)" }}>{"\u20B9"}</span>
                  <input type="text" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="0.00" className="w-full pl-7 pr-2.5 py-1.5 text-[15px]" style={fieldErrors.sellingPrice ? inputErrorStyle : inputStyle} />
                </div>
              </FormRow>

              <FormRow label="GST %" error={fieldErrors.gstPercent}>
                <div className="relative max-w-[120px]">
                  <input type="text" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} placeholder="e.g., 5" className="w-full px-2.5 py-1.5 text-[15px]" style={fieldErrors.gstPercent ? inputErrorStyle : inputStyle} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: "var(--grey-500)" }}>%</span>
                </div>
              </FormRow>

              <FormRow label="Current Stock" required error={fieldErrors.currentStock}>
                <input type="text" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} placeholder="0" className="max-w-[150px] px-2.5 py-1.5 text-[15px]" style={fieldErrors.currentStock ? inputErrorStyle : inputStyle} />
              </FormRow>

              <FormRow label="Reorder Level" error={fieldErrors.reorderLevel}>
                <input type="text" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} placeholder="Minimum stock before alert" className="max-w-[200px] px-2.5 py-1.5 text-[15px]" style={fieldErrors.reorderLevel ? inputErrorStyle : inputStyle} />
              </FormRow>

              <FormRow label="Expiry Date">
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="max-w-[200px] px-2.5 py-1.5 text-[15px]" style={inputStyle} />
              </FormRow>
            </tbody>
          </table>
        </div>

        {/* ── Submit ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 text-white px-6 py-2.5 text-[15px] font-semibold transition-opacity duration-150 disabled:opacity-50"
            style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Saving...
              </>
            ) : "Save Item"}
          </button>
          <Link
            href="/inventory"
            className="px-6 py-2.5 text-[15px] font-semibold transition-colors duration-150"
            style={{ color: "var(--grey-600)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
