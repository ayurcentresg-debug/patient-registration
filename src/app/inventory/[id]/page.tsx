"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Toast from "@/components/Toast";
import { cardStyle, inputStyle, chipBase } from "@/lib/styles";

// ─── Types ──────────────────────────────────────────────────────────────────
interface InventoryVariant {
  id: string;
  manufacturerCode: string | null;
  packing: string;
  unitPrice: number;
  costPrice: number;
  currentStock: number;
  gstPercent: number;
  status: string;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string | null;
  unit: string;
  packing: string | null;
  manufacturerCode: string | null;
  batchNumber: string | null;
  manufacturer: string | null;
  supplier: string | null;
  location: string | null;
  hsnCode: string | null;
  description: string | null;
  costPrice: number | null;
  unitPrice: number | null;
  gstPercent: number | null;
  currentStock: number;
  reorderLevel: number;
  expiryDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  variants?: InventoryVariant[];
}

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  unitPrice: number | null;
  totalAmount: number | null;
  previousStock: number;
  newStock: number;
  reference: string | null;
  notes: string | null;
  performedBy: string | null;
  date: string;
  createdAt: string;
  invoiceId?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  poId?: string | null;
}

interface MovementDay {
  date: string;
  stockIn: number;
  stockOut: number;
  netChange: number;
  closingStock: number;
}

interface MovementSummary {
  totalIn: number;
  totalOut: number;
  netChange: number;
  avgDailyOut: number;
  daysOfStock: number;
  peakStock: number;
  lowestStock: number;
}

interface MovementData {
  itemName: string;
  period: number;
  reorderLevel: number;
  currentStock: number;
  movements: MovementDay[];
  summary: MovementSummary;
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
  medicine: ["Arishtam", "Asavam", "Bhasmam", "Bhasmam & Ksharam", "Churnam", "Classical Tablet", "Cream", "Gel", "Ghritam", "Ghritam & Sneham", "Granule", "Gulika", "Gulika & Tablet", "Gutika", "Kashayam", "Ksharam", "Kuzhampu", "Lehyam", "Lehyam & Rasayanam", "Liniment", "Mashi", "Oil", "Oil & Tailam", "Ointment", "Proprietary Medicine", "Proprietary Syrup", "Proprietary Tablet", "Rasakriya", "Rasayanam", "Sneham", "Soft Gel", "Tailam", "Other"],
  herb: [], oil: ["Tailam", "Oil & Tailam", "Sneham"], consumable: [], equipment: [],
};

const UNITS = ["bottle", "nos", "jar", "pkt", "container", "tube", "ml", "gm", "kg", "litre", "box"];

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const inputErrorStyle = { ...inputStyle, border: "1px solid var(--red)", background: "#fff5f5" };
const sectionTitle = { color: "var(--grey-900)", fontSize: "17px", fontWeight: 700 as const };

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
  sale: { label: "Sale", color: "var(--red)", bg: "#ffebee", sign: "" },
  issue: { label: "Issue/Sale", color: "var(--red)", bg: "#ffebee", sign: "-" },
  adjustment: { label: "Adjustment", color: "#f57c00", bg: "#fff3e0", sign: "" },
  adjust: { label: "Adjustment", color: "#f57c00", bg: "#fff3e0", sign: "" },
  return: { label: "Return", color: "var(--blue-500)", bg: "var(--blue-50)", sign: "+" },
  expired: { label: "Expired", color: "#7b1fa2", bg: "#f3e5f5", sign: "" },
  damaged: { label: "Damaged", color: "var(--red)", bg: "#ffebee", sign: "" },
};

// ─── Profile Row (view mode) ────────────────────────────────────────────────
function ProfileRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <tr>
      <td className="py-[8px] pr-4 text-[15px] font-normal text-right whitespace-nowrap align-top" style={{ color: "var(--grey-600)", width: 180 }}>{label} :</td>
      <td className="py-[8px] pl-2 text-[15px] font-medium align-top" style={{ color: "var(--grey-900)" }}>{String(value)}</td>
    </tr>
  );
}

// ─── Form Row (edit mode) ───────────────────────────────────────────────────
function FormRow({ label, required, children, error }: { label: string; required?: boolean; children: React.ReactNode; error?: string }) {
  return (
    <tr>
      <td className="py-[8px] pr-4 text-[15px] font-normal text-right whitespace-nowrap align-top" style={{ color: "var(--grey-600)", width: 180 }}>
        {label}{required && <span style={{ color: "var(--red)" }}> *</span>} :
      </td>
      <td className="py-[8px] pl-2">
        {children}
        {error && <p className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{error}</p>}
      </td>
    </tr>
  );
}

// ─── Stock Movement Chart (pure SVG) ───────────────────────────────────────
function StockMovementChart({ movements, reorderLevel, period }: { movements: MovementDay[]; reorderLevel: number; period: number }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: MovementDay } | null>(null);

  if (movements.length === 0) {
    return <p className="text-center py-8 text-[15px]" style={{ color: "var(--grey-500)" }}>No data available</p>;
  }

  // Chart dimensions
  const margin = { top: 20, right: 20, bottom: 50, left: 50 };
  const width = 800;
  const height = 320;
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  // Data ranges
  const maxStock = Math.max(...movements.map((m) => m.closingStock), reorderLevel, 1);
  const maxBar = Math.max(...movements.map((m) => Math.max(m.stockIn, m.stockOut)), 1);
  const yMax = Math.max(maxStock, maxBar) * 1.15;

  // Scale helpers
  const xScale = (i: number) => margin.left + (i / Math.max(movements.length - 1, 1)) * chartW;
  const yScale = (v: number) => margin.top + chartH - (v / yMax) * chartH;

  // Build polyline points for stock level
  const stockPoints = movements.map((m, i) => `${xScale(i)},${yScale(m.closingStock)}`).join(" ");

  // Build fill area under the stock line
  const areaPoints = `${xScale(0)},${yScale(0)} ${stockPoints} ${xScale(movements.length - 1)},${yScale(0)}`;

  // Bar width
  const barW = Math.max(2, Math.min(12, (chartW / movements.length) * 0.35));

  // Y-axis grid lines
  const yTicks: number[] = [];
  const tickStep = Math.max(1, Math.ceil(yMax / 5));
  for (let v = 0; v <= yMax; v += tickStep) yTicks.push(v);

  // X-axis labels — show a subset to avoid crowding
  const labelInterval = period <= 7 ? 1 : period <= 30 ? 5 : period <= 60 ? 10 : 15;
  const xLabelIndices = movements.map((_, i) => i).filter((i) => i % labelInterval === 0 || i === movements.length - 1);

  return (
    <div className="w-full overflow-x-auto" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: period > 60 ? 700 : "auto", maxHeight: 360 }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={margin.left} y1={yScale(v)} x2={width - margin.right} y2={yScale(v)} stroke="var(--grey-200)" strokeWidth={1} />
            <text x={margin.left - 8} y={yScale(v) + 4} textAnchor="end" fontSize={11} fill="var(--grey-500)">{v}</text>
          </g>
        ))}

        {/* X-axis line */}
        <line x1={margin.left} y1={margin.top + chartH} x2={width - margin.right} y2={margin.top + chartH} stroke="var(--grey-300)" strokeWidth={1} />

        {/* X-axis labels */}
        {xLabelIndices.map((idx) => {
          const m = movements[idx];
          const d = new Date(m.date);
          const label = `${d.getDate()}/${d.getMonth() + 1}`;
          return (
            <text key={idx} x={xScale(idx)} y={margin.top + chartH + 18} textAnchor="middle" fontSize={11} fill="var(--grey-500)">
              {label}
            </text>
          );
        })}

        {/* Reorder level dashed line */}
        {reorderLevel > 0 && (
          <g>
            <line
              x1={margin.left}
              y1={yScale(reorderLevel)}
              x2={width - margin.right}
              y2={yScale(reorderLevel)}
              stroke="#ff9800"
              strokeWidth={1.5}
              strokeDasharray="6,4"
            />
            <text x={width - margin.right + 4} y={yScale(reorderLevel) + 4} fontSize={10} fill="#ff9800" fontWeight={600}>
              Reorder
            </text>
          </g>
        )}

        {/* Stock In/Out bars */}
        {movements.map((m, i) => {
          const cx = xScale(i);
          return (
            <g key={`bars-${i}`}>
              {m.stockIn > 0 && (
                <rect
                  x={cx - barW - 1}
                  y={yScale(m.stockIn)}
                  width={barW}
                  height={yScale(0) - yScale(m.stockIn)}
                  fill="var(--green)"
                  opacity={0.5}
                  rx={1}
                />
              )}
              {m.stockOut > 0 && (
                <rect
                  x={cx + 1}
                  y={yScale(m.stockOut)}
                  width={barW}
                  height={yScale(0) - yScale(m.stockOut)}
                  fill="var(--red)"
                  opacity={0.5}
                  rx={1}
                />
              )}
            </g>
          );
        })}

        {/* Stock level area fill */}
        <polygon points={areaPoints} fill="var(--blue-500)" opacity={0.08} />

        {/* Stock level line */}
        <polyline
          points={stockPoints}
          fill="none"
          stroke="var(--blue-500)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data point dots */}
        {movements.map((m, i) => (
          <circle
            key={`dot-${i}`}
            cx={xScale(i)}
            cy={yScale(m.closingStock)}
            r={movements.length <= 31 ? 3 : 1.5}
            fill="var(--blue-500)"
            stroke="var(--white)"
            strokeWidth={1.5}
          />
        ))}

        {/* Invisible hover targets */}
        {movements.map((m, i) => (
          <rect
            key={`hover-${i}`}
            x={xScale(i) - (chartW / movements.length) / 2}
            y={margin.top}
            width={chartW / movements.length}
            height={chartH}
            fill="transparent"
            onMouseEnter={(e) => {
              const svg = e.currentTarget.ownerSVGElement;
              if (!svg) return;
              const pt = svg.createSVGPoint();
              pt.x = e.clientX;
              pt.y = e.clientY;
              const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
              setTooltip({ x: svgPt.x, y: svgPt.y - 10, day: m });
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {/* Tooltip */}
        {tooltip && (() => {
          const d = new Date(tooltip.day.date);
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const dateStr = `${d.getDate()} ${months[d.getMonth()]}`;
          const tipW = 140;
          const tipH = 80;
          const tx = Math.max(margin.left, Math.min(tooltip.x - tipW / 2, width - margin.right - tipW));
          const ty = Math.max(margin.top, tooltip.y - tipH - 8);
          return (
            <g>
              <rect x={tx} y={ty} width={tipW} height={tipH} rx={6} fill="var(--grey-900)" opacity={0.92} />
              <text x={tx + 10} y={ty + 18} fontSize={12} fill="#fff" fontWeight={700}>{dateStr}</text>
              <text x={tx + 10} y={ty + 34} fontSize={11} fill="#81c784">In: +{tooltip.day.stockIn}</text>
              <text x={tx + 80} y={ty + 34} fontSize={11} fill="#ef9a9a">Out: -{tooltip.day.stockOut}</text>
              <text x={tx + 10} y={ty + 50} fontSize={11} fill="var(--blue-200)">Net: {tooltip.day.netChange > 0 ? "+" : ""}{tooltip.day.netChange}</text>
              <text x={tx + 10} y={ty + 66} fontSize={12} fill="#fff" fontWeight={600}>Stock: {tooltip.day.closingStock}</text>
            </g>
          );
        })()}

        {/* Legend */}
        <g transform={`translate(${margin.left}, ${height - 10})`}>
          <rect x={0} y={-6} width={10} height={10} fill="var(--blue-500)" rx={2} />
          <text x={14} y={3} fontSize={11} fill="var(--grey-600)">Stock Level</text>
          <rect x={90} y={-6} width={10} height={10} fill="var(--green)" opacity={0.6} rx={2} />
          <text x={104} y={3} fontSize={11} fill="var(--grey-600)">Stock In</text>
          <rect x={165} y={-6} width={10} height={10} fill="var(--red)" opacity={0.6} rx={2} />
          <text x={179} y={3} fontSize={11} fill="var(--grey-600)">Stock Out</text>
          {reorderLevel > 0 && (
            <>
              <line x1={240} y1={0} x2={260} y2={0} stroke="#ff9800" strokeWidth={1.5} strokeDasharray="4,3" />
              <text x={264} y={3} fontSize={11} fill="var(--grey-600)">Reorder Level</text>
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

// ─── Movement Table ────────────────────────────────────────────────────────
function MovementTable({ movements }: { movements: MovementDay[] }) {
  const activeDays = movements.filter((m) => m.stockIn > 0 || m.stockOut > 0);

  if (activeDays.length === 0) {
    return <p className="text-center py-6 text-[15px]" style={{ color: "var(--grey-500)" }}>No stock movements in this period</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="table" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--grey-200)" }}>
            <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Date</th>
            <th className="text-right px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--green)" }}>Stock In</th>
            <th className="text-right px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--red)" }}>Stock Out</th>
            <th className="text-right px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Net</th>
            <th className="text-right px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Closing Stock</th>
          </tr>
        </thead>
        <tbody>
          {[...activeDays].reverse().map((m, i) => {
            const d = new Date(m.date);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const dateLabel = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
            return (
              <tr key={m.date} style={{ borderBottom: i < activeDays.length - 1 ? "1px solid var(--grey-100)" : "none" }}>
                <td className="px-4 py-2.5 text-[14px] font-medium" style={{ color: "var(--grey-700)" }}>{dateLabel}</td>
                <td className="px-4 py-2.5 text-[15px] font-semibold text-right" style={{ color: m.stockIn > 0 ? "var(--green)" : "var(--grey-400)" }}>
                  {m.stockIn > 0 ? `+${m.stockIn}` : "\u2014"}
                </td>
                <td className="px-4 py-2.5 text-[15px] font-semibold text-right" style={{ color: m.stockOut > 0 ? "var(--red)" : "var(--grey-400)" }}>
                  {m.stockOut > 0 ? `-${m.stockOut}` : "\u2014"}
                </td>
                <td className="px-4 py-2.5 text-[15px] font-bold text-right" style={{ color: m.netChange > 0 ? "var(--green)" : m.netChange < 0 ? "var(--red)" : "var(--grey-500)" }}>
                  {m.netChange > 0 ? "+" : ""}{m.netChange}
                </td>
                <td className="px-4 py-2.5 text-[15px] font-semibold text-right" style={{ color: "var(--grey-800)" }}>
                  {m.closingStock}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
  const [actionVariantId, setActionVariantId] = useState("");
  const [actionQty, setActionQty] = useState("");
  const [actionUnitPrice, setActionUnitPrice] = useState("");
  const [actionReference, setActionReference] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Sub-tab navigation
  const [activeTab, setActiveTab] = useState<"overview" | "actions" | "transactions" | "movement">("overview");

  // Movement tab state
  const [movementPeriod, setMovementPeriod] = useState(30);
  const [movementData, setMovementData] = useState<MovementData | null>(null);
  const [movementLoading, setMovementLoading] = useState(false);

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

  // ─── Fetch Movement Data ─────────────────────────────────────────────────
  const fetchMovement = useCallback(() => {
    if (!id) return;
    setMovementLoading(true);
    fetch(`/api/inventory/${id}/movement?period=${movementPeriod}`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((data: MovementData) => setMovementData(data))
      .catch(() => setMovementData(null))
      .finally(() => setMovementLoading(false));
  }, [id, movementPeriod]);

  useEffect(() => {
    if (activeTab === "movement") fetchMovement();
  }, [activeTab, fetchMovement]);

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
      unitPrice: item.unitPrice != null ? String(item.unitPrice) : "",
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
    if (editForm.unitPrice && (isNaN(Number(editForm.unitPrice)) || Number(editForm.unitPrice) < 0)) errors.unitPrice = "Must be a positive number";
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
        unitPrice: editForm.unitPrice ? Number(editForm.unitPrice) : null,
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
    setActionVariantId("");
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
      // Map UI action types to API types
      const typeMap: Record<string, string> = { purchase: "purchase", issue: "sale", adjust: "adjustment", return: "return" };
      const body: Record<string, unknown> = {
        type: typeMap[activeAction!] || activeAction,
        quantity: Number(actionQty),
        unitPrice: actionUnitPrice ? Number(actionUnitPrice) : null,
        reference: actionReference.trim() || null,
        notes: actionNotes.trim() || null,
      };
      if (actionVariantId) {
        body.variantId = actionVariantId;
      }
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
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>{error || "Item not found"}</p>
          <button onClick={fetchItem} className="text-[14px] font-semibold mt-2 hover:underline" style={{ color: "var(--blue-500)" }}>Retry</button>
          <div className="mt-3">
            <Link href="/inventory" className="text-[14px] font-semibold hover:underline" style={{ color: "var(--grey-500)" }}>Back to Inventory</Link>
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

      {/* ── Back Link ─────────────────────────────────────────────── */}
      <Link href="/inventory" className="inline-flex items-center gap-1 text-[15px] font-semibold hover:underline mb-4" style={{ color: "var(--blue-500)" }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Inventory
      </Link>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>{item.name}</h1>
            <span className={chipBase} style={{
              borderRadius: "var(--radius-sm)",
              background: item.status === "active" ? "#e8f5e9" : item.status === "discontinued" ? "#ffebee" : "var(--grey-200)",
              color: item.status === "active" ? "var(--green)" : item.status === "discontinued" ? "var(--red)" : "var(--grey-600)",
            }}>{item.status}</span>
          </div>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            SKU: {item.sku} &middot; {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
            {item.subcategory && ` / ${item.subcategory}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <>
              <button
                onClick={enterEditMode}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[15px] font-semibold transition-colors"
                style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[15px] font-semibold transition-colors"
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
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[15px] font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ borderRadius: "var(--radius-sm)", background: "var(--blue-500)" }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 text-[15px] font-semibold transition-colors"
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
          <p className="text-[15px] font-medium" style={{ color: "var(--red)" }}>Are you sure you want to delete this item? This action cannot be undone.</p>
          <div className="flex gap-2 ml-4 flex-shrink-0">
            <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 text-[14px] font-semibold text-white" style={{ background: "var(--red)", borderRadius: "var(--radius-sm)" }}>
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-[14px] font-semibold" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-600)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Sub-Tab Navigation ─────────────────────────────────── */}
      {!editMode && (
        <div
          className="flex gap-0 mb-6 overflow-x-auto"
          style={{ borderBottom: "2px solid var(--grey-200)" }}
        >
          {([
            { key: "overview" as const, label: "Overview" },
            { key: "actions" as const, label: "Stock Actions" },
            { key: "transactions" as const, label: "Transactions" },
            { key: "movement" as const, label: "Movement" },
          ]).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-5 py-2.5 text-[15px] font-semibold whitespace-nowrap transition-colors duration-150"
                style={{
                  color: active ? "var(--blue-500)" : "var(--grey-600)",
                  borderBottom: active ? "2px solid var(--blue-500)" : "2px solid transparent",
                  marginBottom: "-2px",
                  background: active ? "var(--blue-50, rgba(33,150,243,0.04))" : "transparent",
                  borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                  border: "none",
                  borderBottomStyle: "solid",
                  borderBottomWidth: "2px",
                  borderBottomColor: active ? "var(--blue-500)" : "transparent",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Item Info Card ───────────────────────────────────────── */}
      {(editMode || activeTab === "overview") && (
      <div className="mb-6 p-6" style={cardStyle}>
        {!editMode ? (
          <>
            {/* Stock Level Indicator */}
            <div className="mb-5 pb-5" style={{ borderBottom: "1px solid var(--grey-200)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px] font-semibold" style={{ color: "var(--grey-700)" }}>Stock Level</span>
                <span className="text-[16px] font-bold" style={{ color: stockColor }}>
                  {item.currentStock} {item.unit}
                  {item.reorderLevel > 0 && (
                    <span className="text-[13px] font-normal ml-1" style={{ color: "var(--grey-500)" }}>(reorder at {item.reorderLevel})</span>
                  )}
                </span>
              </div>
              <div className="w-full h-3" style={{ background: "var(--grey-100)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${stockPercent}%`, height: "100%", background: stockColor, borderRadius: 6, transition: "width 0.5s ease" }} />
              </div>
              {expiryDays !== null && (
                <p className="mt-2 text-[14px] font-medium" style={{ color: expiryDays <= 30 ? "var(--red)" : expiryDays <= 90 ? "#f57c00" : "var(--grey-600)" }}>
                  {expiryDays <= 0 ? "EXPIRED" : `Expires in ${expiryDays} day${expiryDays !== 1 ? "s" : ""}`}
                  {item.expiryDate && ` (${formatDate(item.expiryDate)})`}
                </p>
              )}
            </div>

            {/* Details table */}
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <tbody>
                <ProfileRow label="SKU" value={item.sku} />
                {item.manufacturerCode && <ProfileRow label="Mfr. Code" value={item.manufacturerCode} />}
                <ProfileRow label="Category" value={CATEGORIES.find(c => c.value === item.category)?.label || item.category} />
                {item.subcategory && <ProfileRow label="Subcategory" value={item.subcategory} />}
                <ProfileRow label="Unit" value={item.unit} />
                {item.packing && <ProfileRow label="Packing" value={item.packing} />}
                <ProfileRow label="Batch Number" value={item.batchNumber} />
                <ProfileRow label="Manufacturer" value={item.manufacturer} />
                <ProfileRow label="Supplier" value={item.supplier} />
                <ProfileRow label="Location" value={item.location} />
                <ProfileRow label="HSN Code" value={item.hsnCode} />
                <ProfileRow label="Description" value={item.description} />
                <ProfileRow label="Cost Price" value={item.costPrice != null ? `S$${item.costPrice.toLocaleString("en-SG")}` : null} />
                <ProfileRow label="Selling Price" value={item.unitPrice != null ? `S$${item.unitPrice.toLocaleString("en-SG")}` : null} />
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
                  <input type="text" value={editForm.name || ""} onChange={(e) => updateEditField("name", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={editErrors.name ? inputErrorStyle : inputStyle} />
                </FormRow>
                <FormRow label="Category" required error={editErrors.category}>
                  <select value={editForm.category || ""} onChange={(e) => { updateEditField("category", e.target.value); updateEditField("subcategory", ""); }} className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle}>
                    <option value="">Select</option>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </FormRow>
                {editSubcategoryOptions.length > 0 && (
                  <FormRow label="Subcategory">
                    <select value={editForm.subcategory || ""} onChange={(e) => updateEditField("subcategory", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle}>
                      <option value="">Select</option>
                      {editSubcategoryOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormRow>
                )}
                <FormRow label="Unit" required error={editErrors.unit}>
                  <select value={editForm.unit || ""} onChange={(e) => updateEditField("unit", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle}>
                    <option value="">Select</option>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </FormRow>
                <FormRow label="Packing">
                  <input type="text" value={editForm.packing || ""} onChange={(e) => updateEditField("packing", e.target.value)} placeholder="e.g., 450ML, 10GM, 100Nos" className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Mfr. Code">
                  <input type="text" value={editForm.manufacturerCode || ""} onChange={(e) => updateEditField("manufacturerCode", e.target.value)} placeholder="e.g., FGA001" className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Batch Number">
                  <input type="text" value={editForm.batchNumber || ""} onChange={(e) => updateEditField("batchNumber", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Manufacturer">
                  <input type="text" value={editForm.manufacturer || ""} onChange={(e) => updateEditField("manufacturer", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Supplier">
                  <input type="text" value={editForm.supplier || ""} onChange={(e) => updateEditField("supplier", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Location">
                  <input type="text" value={editForm.location || ""} onChange={(e) => updateEditField("location", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </FormRow>
                <FormRow label="HSN Code">
                  <input type="text" value={editForm.hsnCode || ""} onChange={(e) => updateEditField("hsnCode", e.target.value)} className="w-full max-w-md px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Description">
                  <textarea value={editForm.description || ""} onChange={(e) => updateEditField("description", e.target.value)} rows={3} className="w-full max-w-md px-2.5 py-1.5 text-[15px] resize-y" style={inputStyle} />
                </FormRow>
                <FormRow label="Cost Price" error={editErrors.costPrice}>
                  <div className="relative max-w-[200px]">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: "var(--grey-500)" }}>{"\u20B9"}</span>
                    <input type="text" value={editForm.costPrice || ""} onChange={(e) => updateEditField("costPrice", e.target.value)} className="w-full pl-7 pr-2.5 py-1.5 text-[15px]" style={inputStyle} />
                  </div>
                </FormRow>
                <FormRow label="Selling Price" error={editErrors.unitPrice}>
                  <div className="relative max-w-[200px]">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px]" style={{ color: "var(--grey-500)" }}>{"\u20B9"}</span>
                    <input type="text" value={editForm.unitPrice || ""} onChange={(e) => updateEditField("unitPrice", e.target.value)} className="w-full pl-7 pr-2.5 py-1.5 text-[15px]" style={inputStyle} />
                  </div>
                </FormRow>
                <FormRow label="GST %">
                  <input type="text" value={editForm.gstPercent || ""} onChange={(e) => updateEditField("gstPercent", e.target.value)} className="max-w-[120px] px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Reorder Level">
                  <input type="text" value={editForm.reorderLevel || ""} onChange={(e) => updateEditField("reorderLevel", e.target.value)} className="max-w-[150px] px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Expiry Date">
                  <input type="date" value={editForm.expiryDate || ""} onChange={(e) => updateEditField("expiryDate", e.target.value)} className="max-w-[200px] px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </FormRow>
                <FormRow label="Status">
                  <select value={editForm.status || ""} onChange={(e) => updateEditField("status", e.target.value)} className="max-w-[200px] px-2.5 py-1.5 text-[15px]" style={inputStyle}>
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
      )}

      {/* ── Variants ──────────────────────────────────────────────── */}
      {!editMode && activeTab === "overview" && item.variants && item.variants.length > 0 && (
        <div className="mb-6 p-6" style={cardStyle}>
          <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>
            Size Variants <span className="text-[14px] font-normal" style={{ color: "var(--grey-500)" }}>({item.variants.length})</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--grey-200)" }}>
                  <th className="text-left px-3 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Packing</th>
                  <th className="text-left px-3 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Mfr. Code</th>
                  <th className="text-right px-3 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>MRP</th>
                  <th className="text-right px-3 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Cost</th>
                  <th className="text-right px-3 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>GST</th>
                  <th className="text-right px-3 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {item.variants.map((v, i) => (
                  <tr key={v.id} style={{ borderBottom: i < item.variants!.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                    <td className="px-3 py-2 text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{v.packing}</td>
                    <td className="px-3 py-2 text-[14px] font-mono" style={{ color: "var(--grey-600)" }}>{v.manufacturerCode || "\u2014"}</td>
                    <td className="px-3 py-2 text-[15px] text-right" style={{ color: "var(--grey-800)" }}>S${v.unitPrice.toLocaleString("en-SG")}</td>
                    <td className="px-3 py-2 text-[14px] text-right" style={{ color: "var(--grey-600)" }}>S${v.costPrice.toLocaleString("en-SG")}</td>
                    <td className="px-3 py-2 text-[14px] text-right" style={{ color: "var(--grey-600)" }}>{v.gstPercent}%</td>
                    <td className="px-3 py-2 text-[15px] text-right font-semibold" style={{ color: "var(--grey-800)" }}>{v.currentStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Stock Actions ────────────────────────────────────────── */}
      {!editMode && activeTab === "actions" && (
        <div className="mb-6 p-6" style={cardStyle}>
          <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Stock Actions</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => openAction("purchase")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[15px] font-semibold transition-colors"
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
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[15px] font-semibold transition-colors"
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
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[15px] font-semibold transition-colors"
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
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[15px] font-semibold transition-colors"
              style={{
                borderRadius: "var(--radius-sm)",
                border: activeAction === "return" ? "1.5px solid var(--blue-500)" : "1px solid var(--grey-300)",
                background: activeAction === "return" ? "var(--blue-50)" : "var(--white)",
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
                <h3 className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>
                  {activeAction === "purchase" && "Purchase Stock"}
                  {activeAction === "issue" && "Issue / Sale"}
                  {activeAction === "adjust" && "Adjust Stock"}
                  {activeAction === "return" && "Return Stock"}
                </h3>
                <button onClick={() => setActiveAction(null)} className="text-[13px] font-semibold" style={{ color: "var(--grey-500)" }}>Cancel</button>
              </div>
              {item.variants && item.variants.length > 0 && (
                <div className="mb-3">
                  <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Select Size</label>
                  <select value={actionVariantId} onChange={(e) => setActionVariantId(e.target.value)} className="w-full max-w-xs px-2.5 py-1.5 text-[15px]" style={inputStyle}>
                    <option value="">Base — {item.packing || "Standard"} (Stock: {item.currentStock})</option>
                    {item.variants.map((v) => (
                      <option key={v.id} value={v.id}>{v.packing} (Stock: {v.currentStock})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Quantity *</label>
                  <input type="number" value={actionQty} onChange={(e) => setActionQty(e.target.value)} placeholder="0" min="1" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </div>
                {activeAction === "purchase" && (
                  <div>
                    <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Unit Price ({"\u20B9"})</label>
                    <input type="number" value={actionUnitPrice} onChange={(e) => setActionUnitPrice(e.target.value)} placeholder="0.00" step="0.01" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                  </div>
                )}
                <div>
                  <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Reference</label>
                  <input type="text" value={actionReference} onChange={(e) => setActionReference(e.target.value)} placeholder="Invoice/PO number" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Notes</label>
                  <input type="text" value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} placeholder="Optional notes" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                </div>
              </div>
              <div className="mt-3">
                <button
                  onClick={submitStockAction}
                  disabled={actionSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[15px] font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ borderRadius: "var(--radius-sm)", background: "var(--blue-500)" }}
                >
                  {actionSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Movement Tab ────────────────────────────────────────── */}
      {!editMode && activeTab === "movement" && (
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold" style={{ color: "var(--grey-600)" }}>Period:</span>
            {[7, 30, 60, 90].map((p) => (
              <button
                key={p}
                onClick={() => setMovementPeriod(p)}
                className="px-3 py-1.5 text-[14px] font-semibold transition-colors"
                style={{
                  borderRadius: "var(--radius-sm)",
                  border: movementPeriod === p ? "1.5px solid var(--blue-500)" : "1px solid var(--grey-300)",
                  background: movementPeriod === p ? "var(--blue-50, rgba(33,150,243,0.06))" : "var(--white)",
                  color: movementPeriod === p ? "var(--blue-500)" : "var(--grey-600)",
                  cursor: "pointer",
                }}
              >
                {p}D
              </button>
            ))}
          </div>

          {movementLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
                ))}
              </div>
              <div className="h-72 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
            </div>
          ) : movementData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4" style={{ color: "var(--green)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Total In</span>
                  </div>
                  <p className="text-[24px] font-bold" style={{ color: "var(--green)" }}>{movementData.summary.totalIn}</p>
                </div>
                <div className="p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4" style={{ color: "var(--red)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Total Out</span>
                  </div>
                  <p className="text-[24px] font-bold" style={{ color: "var(--red)" }}>{movementData.summary.totalOut}</p>
                </div>
                <div className="p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4" style={{ color: "var(--blue-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Net Change</span>
                  </div>
                  <p className="text-[24px] font-bold" style={{ color: "var(--blue-500)" }}>
                    {movementData.summary.netChange > 0 ? "+" : ""}{movementData.summary.netChange}
                  </p>
                </div>
                <div className="p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4" style={{ color: "var(--grey-600)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Days of Stock</span>
                  </div>
                  <p className="text-[24px] font-bold" style={{ color: "var(--grey-800)" }}>
                    {movementData.summary.daysOfStock >= 999 ? "\u221E" : movementData.summary.daysOfStock}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--grey-500)" }}>
                    avg {movementData.summary.avgDailyOut}/day out
                  </p>
                </div>
              </div>

              {/* SVG Chart */}
              <div className="p-6" style={cardStyle}>
                <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>
                  Stock Movement — Last {movementData.period} Days
                </h2>
                <StockMovementChart
                  movements={movementData.movements}
                  reorderLevel={movementData.reorderLevel}
                  period={movementData.period}
                />
              </div>

              {/* Movement Table */}
              <div className="p-6" style={cardStyle}>
                <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>
                  Daily Movement
                  <span className="text-[14px] font-normal ml-2" style={{ color: "var(--grey-500)" }}>
                    (days with activity only)
                  </span>
                </h2>
                <MovementTable movements={movementData.movements} />
              </div>
            </>
          ) : (
            <div className="text-center py-12 p-6" style={cardStyle}>
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>Failed to load movement data</p>
              <button onClick={fetchMovement} className="text-[14px] font-semibold mt-2 hover:underline" style={{ color: "var(--blue-500)" }}>Retry</button>
            </div>
          )}
        </div>
      )}

      {/* ── Transaction History ───────────────────────────────────── */}
      {!editMode && activeTab === "transactions" && (
        <div className="p-6" style={cardStyle}>
          <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Transaction History</h2>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No transactions recorded yet</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full" role="table">
                  <thead style={{ borderBottom: "1px solid var(--grey-200)" }}>
                    <tr>
                      <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Date</th>
                      <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Type</th>
                      <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Reference</th>
                      <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Patient</th>
                      <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Qty</th>
                      <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Stock After</th>
                      <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn, i) => {
                      const cfg = TXN_TYPE_CONFIG[txn.type] || TXN_TYPE_CONFIG.adjust;
                      return (
                        <tr key={txn.id} style={{ borderBottom: i < transactions.length - 1 ? "1px solid var(--grey-100)" : "none" }}>
                          <td className="px-4 py-2.5 text-[14px]" style={{ color: "var(--grey-700)" }}>{formatDateTime(txn.createdAt)}</td>
                          <td className="px-4 py-2.5">
                            <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          </td>
                          <td className="px-4 py-2.5 text-[14px]" style={{ color: "var(--grey-600)" }}>
                            {txn.invoiceId ? (
                              <Link href={`/billing/${txn.invoiceId}`} className="font-medium hover:underline" style={{ color: "var(--blue-500)" }}>{txn.reference || "\u2014"}</Link>
                            ) : txn.poId ? (
                              <Link href={`/inventory/purchase-orders/${txn.poId}`} className="font-medium hover:underline" style={{ color: "var(--blue-500)" }}>{txn.reference || "\u2014"}</Link>
                            ) : (
                              txn.reference || "\u2014"
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[14px]" style={{ color: "var(--grey-600)" }}>
                            {txn.patientId ? (
                              <Link href={`/patients/${txn.patientId}`} className="font-medium hover:underline" style={{ color: "var(--blue-500)" }}>{txn.patientName || "\u2014"}</Link>
                            ) : "\u2014"}
                          </td>
                          <td className="px-4 py-2.5 text-[15px] font-bold" style={{ color: cfg.color }}>
                            {cfg.sign}{txn.quantity} {item.unit}
                            {txn.unitPrice != null && (
                              <span className="text-[13px] font-normal ml-1" style={{ color: "var(--grey-500)" }}>@ {"\u20B9"}{txn.unitPrice}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[15px] font-medium" style={{ color: "var(--grey-800)" }}>{txn.newStock}</td>
                          <td className="px-4 py-2.5 text-[14px]" style={{ color: "var(--grey-600)" }}>{txn.notes || "\u2014"}</td>
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
                        <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>{formatDateTime(txn.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[16px] font-bold" style={{ color: cfg.color }}>{cfg.sign}{txn.quantity} {item.unit}</span>
                        <span className="text-[14px]" style={{ color: "var(--grey-600)" }}>Stock: {txn.newStock}</span>
                      </div>
                      {txn.reference && (
                        <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>
                          Ref:{" "}
                          {txn.invoiceId ? (
                            <Link href={`/billing/${txn.invoiceId}`} className="font-medium hover:underline" style={{ color: "var(--blue-500)" }}>{txn.reference}</Link>
                          ) : txn.poId ? (
                            <Link href={`/inventory/purchase-orders/${txn.poId}`} className="font-medium hover:underline" style={{ color: "var(--blue-500)" }}>{txn.reference}</Link>
                          ) : txn.reference}
                        </p>
                      )}
                      {txn.patientId && txn.patientName && (
                        <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                          Patient:{" "}
                          <Link href={`/patients/${txn.patientId}`} className="font-medium hover:underline" style={{ color: "var(--blue-500)" }}>{txn.patientName}</Link>
                        </p>
                      )}
                      {txn.notes && <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{txn.notes}</p>}
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
