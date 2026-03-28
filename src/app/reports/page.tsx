"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

function formatCurrency(amount: number): string {
  return `S$${(amount ?? 0).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PERIOD_OPTIONS = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "revenue", label: "Revenue" },
  { id: "doctors", label: "Doctors" },
  { id: "patients", label: "Patients" },
  { id: "treatments", label: "Treatments" },
  { id: "inventory", label: "Inventory" },
  { id: "insurance", label: "Insurance" },
  { id: "aging", label: "Outstanding" },
  { id: "appointments", label: "Appointments" },
];

const STATUS_COLORS: Record<string, string> = {
  completed: "#16a34a", cancelled: "#dc2626", "no-show": "#f59e0b",
  scheduled: "#3b82f6", confirmed: "#8b5cf6", "in-progress": "#06b6d4",
};

const TYPE_COLORS: Record<string, string> = {
  consultation: "#3b82f6", therapy: "#8b5cf6", medicine: "#16a34a",
  procedure: "#f59e0b", lab: "#06b6d4", other: "#6b7280",
  panchakarma: "#e11d48", massage: "#d946ef", detox: "#14b8a6", specialty: "#f97316",
};

const METHOD_COLORS: Record<string, string> = {
  cash: "#16a34a", card: "#3b82f6", upi: "#8b5cf6",
  insurance: "#f59e0b", bank_transfer: "#06b6d4", mixed: "#6b7280",
};

const HEATMAP_COLORS = ["#fef3c7", "#fde68a", "#fbbf24", "#d97706", "#b45309", "#92400e"];

interface ReportData {
  period: { from: string; to: string; label: string };
  revenue: {
    total: number; previousTotal: number; change: number; billed: number;
    discount: number; gst: number; outstanding: number; invoiceCount: number;
    trend: Array<{ date: string; amount: number }>;
    paymentMethods: Array<{ method: string; total: number }>;
    byCategory: Array<{ type: string; count: number; revenue: number }>;
    gstSummary?: { totalTaxable: number; totalCgst: number; totalSgst: number; totalIgst: number; totalGst: number };
    collectionEfficiency?: number;
    averageInvoiceValue?: number;
  };
  doctors: Array<{
    id: string; name: string; role: string; specialization: string;
    totalAppointments: number; completed: number; cancelled: number; noShow: number;
    revenue: number; uniquePatients: number;
  }>;
  patients: { total: number; new: number; previousNew: number; growth: number };
  treatments: Array<{ name: string; category: string; count: number; revenue: number }>;
  aging: {
    summary: { current: number; days30: number; days60: number; over90: number; total: number };
    invoices: Array<{ id: string; invoiceNumber: string; patientName: string; totalAmount: number; balanceAmount: number; date: string; daysOverdue: number; bucket: string }>;
  };
  appointments: {
    total: number; previousTotal: number; completed: number; cancelled: number;
    noShow: number; walkins: number; completionRate: number; noShowRate: number;
    byType: Array<{ type: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
    trend: Array<{ date: string; count: number }>;
    peakHours?: Array<{ day: number; hour: number; count: number }>;
  };
}

interface InventoryData {
  totalItems: number;
  lowStock: number;
  expiringSoon: number;
  expired: number;
  stockValue: number;
  lowStockItems: Array<{ id: string; name: string; category: string; currentStock: number; minStock: number; unit: string }>;
  expiringItems: Array<{ id: string; name: string; expiryDate: string; daysUntilExpiry: number; quantity: number }>;
  topSelling: Array<{ name: string; sold: number }>;
  categoryBreakdown: Array<{ category: string; count: number; value: number }>;
}

interface InsuranceData {
  totalClaims: number;
  claimAmount: number;
  approved: number;
  settled: number;
  approvalRate: number;
  pipeline: { submitted: number; approved: number; settled: number };
  monthlyTrend: Array<{ month: string; claims: number; amount: number }>;
  providers: Array<{ name: string; claims: number; approved: number; approvalRate: number; totalAmount: number }>;
  recentClaims: Array<{ id: string; patientName: string; provider: string; amount: number; status: string; date: string }>;
}

/* ─── CSV Export Utility ─── */
function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ─── Stat Card ─── */
function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: string }) {
  return (
    <div className="p-4" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
          <svg className="w-5 h-5" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>{label}</p>
          <p className="text-[20px] font-bold leading-tight" style={{ color: "var(--grey-900)" }}>{value}</p>
          {sub && <p className="text-[11px] font-medium mt-0.5" style={{ color }}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}

/* ─── Change Badge ─── */
function ChangeBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-bold rounded-full"
      style={{ background: up ? "#dcfce7" : "#fee2e2", color: up ? "#16a34a" : "#dc2626" }}>
      {up ? "\u2191" : "\u2193"} {Math.abs(value)}%
    </span>
  );
}

/* ─── Simple Bar (for inline charts) ─── */
function Bar({ value, max, color, label, subLabel }: { value: number; max: number; color: string; label: string; subLabel?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-28 text-right flex-shrink-0">
        <p className="text-[12px] font-semibold capitalize truncate" style={{ color: "var(--grey-800)" }}>{label}</p>
        {subLabel && <p className="text-[10px]" style={{ color: "var(--grey-500)" }}>{subLabel}</p>}
      </div>
      <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: "var(--grey-100)" }}>
        <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
          style={{ width: `${Math.max(pct, 2)}%`, background: color }}>
          {pct > 15 && <span className="text-[10px] font-bold text-white">{formatCurrency(value)}</span>}
        </div>
      </div>
      {pct <= 15 && <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--grey-700)" }}>{formatCurrency(value)}</span>}
    </div>
  );
}

/* ─── Count Bar (for non-currency values) ─── */
function CountBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-28 text-right flex-shrink-0">
        <p className="text-[12px] font-semibold capitalize truncate" style={{ color: "var(--grey-800)" }}>{label}</p>
      </div>
      <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: "var(--grey-100)" }}>
        <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
          style={{ width: `${Math.max(pct, 2)}%`, background: color }}>
          {pct > 15 && <span className="text-[10px] font-bold text-white">{value}</span>}
        </div>
      </div>
      {pct <= 15 && <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--grey-700)" }}>{value}</span>}
    </div>
  );
}

/* ─── Mini bar chart (daily trend) ─── */
function TrendChart({ data, valueKey, labelKey, color, height = 120 }: { data: Array<Record<string, unknown>>; valueKey: string; labelKey: string; color: string; height?: number }) {
  if (data.length === 0) return <p className="text-[12px] text-center py-6" style={{ color: "var(--grey-400)" }}>No data for this period</p>;
  const max = Math.max(...data.map(d => (d[valueKey] as number) || 0), 1);
  const barW = Math.max(Math.min(Math.floor(600 / data.length) - 2, 32), 4);
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-[2px] justify-center" style={{ height, minWidth: data.length * (barW + 2) }}>
        {data.map((d, i) => {
          const val = (d[valueKey] as number) || 0;
          const h = Math.max((val / max) * (height - 20), 2);
          const dateStr = (d[labelKey] as string) || "";
          const dayLabel = dateStr.length >= 10 ? dateStr.substring(8, 10) : dateStr;
          return (
            <div key={i} className="flex flex-col items-center" style={{ width: barW }}>
              <div className="rounded-t-sm transition-all duration-300 relative group cursor-default"
                style={{ width: barW, height: h, background: color, opacity: 0.85 }}
                title={`${dateStr}: ${typeof val === "number" ? formatCurrency(val) : val}`}>
              </div>
              {barW >= 12 && <span className="text-[8px] mt-0.5" style={{ color: "var(--grey-400)" }}>{dayLabel}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Mini sparkline (for overview cards) ─── */
function Sparkline({ data, color, width = 80, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

/* ─── Donut slice for simple pie-like display ─── */
function DonutBreakdown({ items, colors }: { items: Array<{ label: string; value: number }>; colors: Record<string, string> }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return <p className="text-[12px] text-center py-4" style={{ color: "var(--grey-400)" }}>No data</p>;
  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        const c = colors[item.label.toLowerCase()] || colors[item.label] || "var(--grey-500)";
        return (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c }} />
            <span className="text-[12px] font-medium capitalize flex-1" style={{ color: "var(--grey-700)" }}>{item.label.replace("_", " ")}</span>
            <span className="text-[12px] font-bold" style={{ color: "var(--grey-800)" }}>{formatCurrency(item.value)}</span>
            <span className="text-[10px] font-medium w-10 text-right" style={{ color: "var(--grey-500)" }}>{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Circular Progress Indicator ─── */
function CircularProgress({ value, color, size = 80, strokeWidth = 6 }: { value: number; color: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--grey-100)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      </svg>
      <span className="absolute text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>{Math.round(value)}%</span>
    </div>
  );
}

/* ─── Section wrapper ─── */
function Section({ title, children, onExportCSV }: { title: string; children: React.ReactNode; onExportCSV?: () => void }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{title}</h2>
        {onExportCSV && (
          <button onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors"
            style={{ background: "var(--white)", color: "var(--grey-600)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}>
            <span>\u2193</span> Export CSV
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-4 ${className}`} style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)" }}>
      {children}
    </div>
  );
}

/* ─── Peak Hours Heatmap ─── */
function PeakHoursHeatmap({ data }: { data: Array<{ day: number; hour: number; count: number }> }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm
  const maxCount = Math.max(...data.map(d => d.count), 1);

  const getCount = (day: number, hour: number) => {
    const entry = data.find(d => d.day === day && d.hour === hour);
    return entry ? entry.count : 0;
  };

  const getColor = (count: number) => {
    if (count === 0) return "var(--grey-50)";
    const intensity = Math.min(Math.floor((count / maxCount) * (HEATMAP_COLORS.length - 1)), HEATMAP_COLORS.length - 1);
    return HEATMAP_COLORS[intensity];
  };

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 520 }}>
        {/* Hour headers */}
        <div className="flex items-center gap-[2px] mb-[2px]">
          <div className="w-10 flex-shrink-0" />
          {hours.map(h => (
            <div key={h} className="flex-1 text-center text-[9px] font-semibold" style={{ color: "var(--grey-500)" }}>
              {h > 12 ? `${h - 12}p` : h === 12 ? "12p" : `${h}a`}
            </div>
          ))}
        </div>
        {/* Grid rows */}
        {days.map((dayLabel, dayIndex) => (
          <div key={dayLabel} className="flex items-center gap-[2px] mb-[2px]">
            <div className="w-10 text-[10px] font-semibold text-right pr-2 flex-shrink-0" style={{ color: "var(--grey-600)" }}>
              {dayLabel}
            </div>
            {hours.map(hour => {
              const count = getCount(dayIndex + 1, hour);
              return (
                <div key={hour} className="flex-1 rounded-sm cursor-default"
                  style={{ background: getColor(count), height: 28, minWidth: 32 }}
                  title={`${dayLabel} ${hour}:00 - ${count} appointment${count !== 1 ? "s" : ""}`}>
                  {count > 0 && (
                    <div className="w-full h-full flex items-center justify-center text-[9px] font-bold"
                      style={{ color: count / maxCount > 0.5 ? "#fff" : "var(--grey-700)" }}>
                      {count}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-2">
          <span className="text-[9px]" style={{ color: "var(--grey-500)" }}>Less</span>
          {HEATMAP_COLORS.map((c, i) => (
            <div key={i} className="w-4 h-4 rounded-sm" style={{ background: c }} />
          ))}
          <span className="text-[9px]" style={{ color: "var(--grey-500)" }}>More</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [activeSection, setActiveSection] = useState("overview");

  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryFetched, setInventoryFetched] = useState(false);

  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null);
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [insuranceFetched, setInsuranceFetched] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/reports?period=${period}`;
      if (period === "custom" && customFrom) url += `&from=${customFrom}`;
      if (period === "custom" && customTo) url += `&to=${customTo}`;
      const res = await fetch(url);
      if (res.ok) {
        const raw = await res.json();
        // Map top-level peakHours/hourlyDistribution into appointments for the UI
        if (raw.peakHours || raw.hourlyDistribution) {
          raw.appointments = {
            ...raw.appointments,
            peakHours: (raw.peakHours || []).map((p: Record<string, unknown>) => ({
              day: p.dayOfWeek, hour: p.hour, count: Number(p.count),
            })),
            hourlyDistribution: raw.hourlyDistribution,
          };
        }
        // Map gstSummary + collectionEfficiency + averageInvoiceValue into revenue
        if (raw.gstSummary) {
          raw.revenue = { ...raw.revenue, gstSummary: raw.gstSummary };
        }
        if (raw.collectionEfficiency !== undefined) {
          raw.revenue = { ...raw.revenue, collectionEfficiency: raw.collectionEfficiency };
        }
        if (raw.averageInvoiceValue !== undefined) {
          raw.revenue = { ...raw.revenue, averageInvoiceValue: raw.averageInvoiceValue };
        }
        setData(raw);
      }
    } catch { /* ignore */ }
    setLoading(false);
    // Reset lazy-loaded sections so they refetch on next tab visit
    setInventoryFetched(false);
    setInsuranceFetched(false);
    setInventoryData(null);
    setInsuranceData(null);
  }, [period, customFrom, customTo]);

  const fetchInventory = useCallback(async () => {
    if (inventoryFetched || inventoryLoading) return;
    setInventoryLoading(true);
    try {
      const res = await fetch(`/api/reports/inventory?period=${period}${period === "custom" && customFrom ? `&from=${customFrom}` : ""}${period === "custom" && customTo ? `&to=${customTo}` : ""}`);
      if (res.ok) {
        const raw = await res.json();
        // Map API response to frontend interface
        setInventoryData({
          totalItems: raw.summary?.totalItems ?? 0,
          lowStock: raw.summary?.lowStockItems ?? 0,
          expiringSoon: raw.summary?.expiringItems ?? 0,
          expired: raw.summary?.expiredItems ?? 0,
          stockValue: raw.summary?.totalStockValue ?? 0,
          lowStockItems: (raw.lowStock || []).map((i: Record<string, unknown>) => ({
            id: i.id, name: i.name, category: i.category,
            currentStock: i.currentStock, minStock: i.reorderLevel, unit: i.unit,
          })),
          expiringItems: (raw.expiringSoon || []).map((i: Record<string, unknown>) => ({
            id: i.id, name: i.name, expiryDate: i.expiryDate,
            daysUntilExpiry: i.daysUntilExpiry, quantity: i.currentStock,
          })),
          topSelling: (raw.topSelling || []).map((i: Record<string, unknown>) => ({
            name: i.name, sold: i.totalSold ?? i.revenue ?? 0,
          })),
          categoryBreakdown: (raw.categoryBreakdown || []).map((c: Record<string, unknown>) => ({
            category: c.category, count: c.itemCount, value: c.totalValue,
          })),
        });
        setInventoryFetched(true);
      }
    } catch { /* ignore */ }
    setInventoryLoading(false);
  }, [period, customFrom, customTo, inventoryFetched, inventoryLoading]);

  const fetchInsurance = useCallback(async () => {
    if (insuranceFetched || insuranceLoading) return;
    setInsuranceLoading(true);
    try {
      const res = await fetch(`/api/reports/insurance?period=${period}${period === "custom" && customFrom ? `&from=${customFrom}` : ""}${period === "custom" && customTo ? `&to=${customTo}` : ""}`);
      if (res.ok) {
        const raw = await res.json();
        const submitted = (raw.claimsByStatus || []).reduce((s: number, c: Record<string, unknown>) => s + (Number(c.count) || 0), 0);
        const approvedCount = (raw.claimsByStatus || []).filter((c: Record<string, unknown>) => c.status === "approved" || c.status === "settled").reduce((s: number, c: Record<string, unknown>) => s + (Number(c.count) || 0), 0);
        const settledCount = (raw.claimsByStatus || []).filter((c: Record<string, unknown>) => c.status === "settled").reduce((s: number, c: Record<string, unknown>) => s + (Number(c.count) || 0), 0);
        setInsuranceData({
          totalClaims: raw.summary?.totalClaims ?? 0,
          claimAmount: raw.summary?.totalClaimAmount ?? 0,
          approved: raw.summary?.approvedAmount ?? 0,
          settled: raw.summary?.settledAmount ?? 0,
          approvalRate: raw.summary?.approvalRate ?? 0,
          pipeline: { submitted, approved: approvedCount, settled: settledCount },
          monthlyTrend: (raw.claimsTrend || []).map((t: Record<string, unknown>) => ({
            month: t.month, claims: t.submitted, amount: (Number(t.approved) || 0) + (Number(t.settled) || 0),
          })),
          providers: (raw.providerPerformance || []).map((p: Record<string, unknown>) => ({
            name: p.name, claims: p.totalClaims, approved: p.approvedClaims,
            approvalRate: p.approvalRate, totalAmount: p.settledAmount,
          })),
          recentClaims: (raw.recentClaims || []).map((c: Record<string, unknown>) => ({
            id: c.id, patientName: c.patientName, provider: c.providerName,
            amount: c.amount, status: c.status, date: c.submittedDate,
          })),
        });
        setInsuranceFetched(true);
      }
    } catch { /* ignore */ }
    setInsuranceLoading(false);
  }, [period, customFrom, customTo, insuranceFetched, insuranceLoading]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Lazy-load inventory/insurance when their tab is selected
  useEffect(() => {
    if (activeSection === "inventory") fetchInventory();
    if (activeSection === "insurance") fetchInsurance();
  }, [activeSection, fetchInventory, fetchInsurance]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !printRef.current) return;
    printWindow.document.write(`
      <html><head><title>Clinic Reports</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #1a1a1a; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 15px; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
        h3 { font-size: 13px; margin-top: 12px; margin-bottom: 6px; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
        .stat-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; }
        .stat-label { font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; }
        .stat-value { font-size: 16px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { font-size: 10px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; padding: 6px; text-align: left; }
        td { font-size: 11px; border-bottom: 1px solid #f3f4f6; padding: 6px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  }, []);

  /* ─── CSV Export Handlers ─── */
  const exportOverviewCSV = useCallback(() => {
    if (!data) return;
    const collectionEff = data.revenue.billed > 0 ? ((data.revenue.total / data.revenue.billed) * 100).toFixed(1) : "0.0";
    downloadCSV("overview-report", ["Metric", "Value"], [
      ["Total Revenue", formatCurrency(data.revenue.total)],
      ["Total Billed", formatCurrency(data.revenue.billed)],
      ["Outstanding", formatCurrency(data.revenue.outstanding)],
      ["New Patients", String(data.patients.new)],
      ["Total Appointments", String(data.appointments.total)],
      ["Completion Rate", `${data.appointments.completionRate}%`],
      ["No-Show Rate", `${data.appointments.noShowRate}%`],
      ["Collection Efficiency", `${collectionEff}%`],
    ]);
  }, [data]);

  const exportRevenueCSV = useCallback(() => {
    if (!data) return;
    downloadCSV("revenue-report",
      ["Date", "Amount"],
      data.revenue.trend.map(t => [t.date, String(t.amount)])
    );
  }, [data]);

  const exportDoctorsCSV = useCallback(() => {
    if (!data) return;
    downloadCSV("doctors-report",
      ["Name", "Role", "Specialization", "Appointments", "Completed", "Cancelled", "No-Show", "Patients", "Revenue"],
      data.doctors.map(d => [d.name, d.role, d.specialization, String(d.totalAppointments), String(d.completed), String(d.cancelled), String(d.noShow), String(d.uniquePatients), String(d.revenue)])
    );
  }, [data]);

  const exportPatientsCSV = useCallback(() => {
    if (!data) return;
    downloadCSV("patients-report", ["Metric", "Value"], [
      ["Total Patients", String(data.patients.total)],
      ["New This Period", String(data.patients.new)],
      ["Previous Period", String(data.patients.previousNew)],
      ["Growth", `${data.patients.growth}%`],
    ]);
  }, [data]);

  const exportTreatmentsCSV = useCallback(() => {
    if (!data) return;
    downloadCSV("treatments-report",
      ["Treatment", "Category", "Sessions", "Revenue"],
      data.treatments.map(t => [t.name, t.category, String(t.count), String(t.revenue)])
    );
  }, [data]);

  const exportInventoryCSV = useCallback(() => {
    if (!inventoryData) return;
    downloadCSV("inventory-report",
      ["Item", "Category", "Current Stock", "Min Stock", "Unit"],
      inventoryData.lowStockItems.map(i => [i.name, i.category, String(i.currentStock), String(i.minStock), i.unit])
    );
  }, [inventoryData]);

  const exportInsuranceCSV = useCallback(() => {
    if (!insuranceData) return;
    downloadCSV("insurance-report",
      ["Provider", "Claims", "Approved", "Approval Rate", "Total Amount"],
      insuranceData.providers.map(p => [p.name, String(p.claims), String(p.approved), `${p.approvalRate}%`, String(p.totalAmount)])
    );
  }, [insuranceData]);

  const exportAgingCSV = useCallback(() => {
    if (!data) return;
    downloadCSV("outstanding-report",
      ["Invoice", "Patient", "Total", "Balance", "Days Overdue", "Bucket"],
      data.aging.invoices.map(inv => [inv.invoiceNumber, inv.patientName, String(inv.totalAmount), String(inv.balanceAmount), String(inv.daysOverdue), inv.bucket])
    );
  }, [data]);

  const exportAppointmentsCSV = useCallback(() => {
    if (!data) return;
    downloadCSV("appointments-report",
      ["Date", "Count"],
      data.appointments.trend.map(t => [t.date, String(t.count)])
    );
  }, [data]);

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--blue-500)", borderTopColor: "transparent" }} />
        <p className="text-[13px] font-medium" style={{ color: "var(--grey-500)" }}>Loading reports...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="p-6 text-center">
      <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>Failed to load reports. Please try again.</p>
      <button onClick={fetchReport} className="mt-3 px-4 py-2 text-[13px] font-semibold text-white" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>Retry</button>
    </div>
  );

  // Derived overview stats
  const collectionEfficiency = data.revenue.billed > 0 ? (data.revenue.total / data.revenue.billed) * 100 : 0;
  const avgInvoiceValue = data.revenue.invoiceCount > 0 ? data.revenue.total / data.revenue.invoiceCount : 0;
  const gstRate = 0.09; // 9% GST
  const estimatedGST = data.revenue.gst || data.revenue.total * gstRate;
  const cgst = estimatedGST / 2;
  const sgst = estimatedGST / 2;

  return (
    <div className="p-4 md:p-6" style={{ background: "var(--background)", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Reports & Analytics</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>
            {new Date(data.period.from).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
            {" \u2014 "}
            {new Date(data.period.to).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold transition-colors"
            style={{ background: "var(--white)", color: "var(--grey-600)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}>
            Print Report
          </button>
          {PERIOD_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)}
              className="px-3 py-1.5 text-[12px] font-semibold transition-colors"
              style={{
                background: period === opt.value ? "var(--blue-500)" : "var(--white)",
                color: period === opt.value ? "#fff" : "var(--grey-600)",
                border: `1px solid ${period === opt.value ? "var(--blue-500)" : "var(--grey-300)"}`,
                borderRadius: "var(--radius-sm)",
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range */}
      {period === "custom" && (
        <div className="flex items-center gap-3 mb-4">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
            className="px-3 py-1.5 text-[13px]" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-800)" }} />
          <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>to</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
            className="px-3 py-1.5 text-[13px]" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-800)" }} />
          <button onClick={fetchReport} className="px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>Apply</button>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className="px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors"
            style={{
              background: activeSection === s.id ? "var(--grey-900)" : "transparent",
              color: activeSection === s.id ? "#fff" : "var(--grey-600)",
              borderRadius: "var(--radius-sm)",
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW SECTION ═══ */}
      {activeSection === "overview" && (
        <Section title="Overview Dashboard" onExportCSV={exportOverviewCSV}>
          {/* 8 stat cards in 2 rows */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="p-4" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>Total Revenue</p>
                  <p className="text-[20px] font-bold leading-tight" style={{ color: "var(--grey-900)" }}>{formatCurrency(data.revenue.total)}</p>
                  {data.revenue.change !== 0 && <ChangeBadge value={data.revenue.change} />}
                </div>
                <Sparkline data={data.revenue.trend.slice(-7).map(t => t.amount)} color="#16a34a" />
              </div>
            </div>
            <StatCard label="Total Billed" value={formatCurrency(data.revenue.billed)} color="#3b82f6"
              icon="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            <StatCard label="Outstanding" value={formatCurrency(data.revenue.outstanding)} color="#f59e0b"
              sub={data.revenue.billed > 0 ? `${((data.revenue.outstanding / data.revenue.billed) * 100).toFixed(1)}% of billed` : undefined}
              icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="New Patients" value={String(data.patients.new)}
              sub={data.patients.growth !== 0 ? `${data.patients.growth > 0 ? "+" : ""}${data.patients.growth}% vs prev` : undefined}
              color={data.patients.growth >= 0 ? "#16a34a" : "#dc2626"}
              icon="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard label="Total Appointments" value={String(data.appointments.total)}
              sub={data.appointments.previousTotal > 0 ? `${data.appointments.total >= data.appointments.previousTotal ? "+" : ""}${Math.round(((data.appointments.total - data.appointments.previousTotal) / data.appointments.previousTotal) * 100)}% vs prev` : undefined}
              color="#3b82f6"
              icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            <StatCard label="Completion Rate" value={`${data.appointments.completionRate}%`} color="#16a34a"
              icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="No-Show Rate" value={`${data.appointments.noShowRate}%`} color="#f59e0b"
              icon="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            <StatCard label="Collection Efficiency" value={`${collectionEfficiency.toFixed(1)}%`} color="#8b5cf6"
              icon="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </div>

          {/* Quick summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Revenue Trend (Last 7)</h3>
              <TrendChart data={data.revenue.trend.slice(-7) as unknown as Array<Record<string, unknown>>} valueKey="amount" labelKey="date" color="#b45309" height={100} />
            </Card>
            <Card>
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Payment Methods</h3>
              <DonutBreakdown
                items={data.revenue.paymentMethods.map(p => ({ label: p.method, value: p.total }))}
                colors={METHOD_COLORS}
              />
            </Card>
            <Card>
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Appointment Status</h3>
              <div className="space-y-2">
                {data.appointments.byStatus.map((s) => {
                  const pct = data.appointments.total > 0 ? (s.count / data.appointments.total) * 100 : 0;
                  return (
                    <div key={s.status} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[s.status] || "#6b7280" }} />
                      <span className="text-[12px] font-medium capitalize flex-1" style={{ color: "var(--grey-700)" }}>{s.status.replace("-", " ")}</span>
                      <span className="text-[12px] font-bold" style={{ color: "var(--grey-800)" }}>{s.count}</span>
                      <span className="text-[10px] w-10 text-right" style={{ color: "var(--grey-500)" }}>{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </Section>
      )}

      {/* ═══ REVENUE SECTION ═══ */}
      {activeSection === "revenue" && (
        <Section title="Revenue Analytics" onExportCSV={exportRevenueCSV}>
          {/* Top stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard label="Total Revenue" value={formatCurrency(data.revenue.total)}
              sub={data.revenue.change !== 0 ? `${data.revenue.change > 0 ? "+" : ""}${data.revenue.change}% vs prev period` : undefined}
              color={data.revenue.change >= 0 ? "#16a34a" : "#dc2626"}
              icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="Total Billed" value={formatCurrency(data.revenue.billed)} color="#3b82f6"
              icon="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            <StatCard label="Outstanding" value={formatCurrency(data.revenue.outstanding)} color="#f59e0b"
              icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="Avg Invoice Value" value={formatCurrency(avgInvoiceValue)} color="#8b5cf6"
              sub={`${data.revenue.invoiceCount} invoices`}
              icon="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </div>

          {/* GST Summary + Collection Efficiency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>GST Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-medium" style={{ color: "var(--grey-600)" }}>CGST (4.5%)</span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--grey-800)" }}>{formatCurrency(cgst)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-medium" style={{ color: "var(--grey-600)" }}>SGST (4.5%)</span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--grey-800)" }}>{formatCurrency(sgst)}</span>
                </div>
                <div className="pt-2 mt-2" style={{ borderTop: "2px solid var(--grey-200)" }}>
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-bold" style={{ color: "var(--grey-700)" }}>Total GST</span>
                    <span className="text-[15px] font-bold" style={{ color: "#b45309" }}>{formatCurrency(estimatedGST)}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col items-center justify-center">
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Collection Efficiency</h3>
              <CircularProgress value={collectionEfficiency} color={collectionEfficiency >= 80 ? "#16a34a" : collectionEfficiency >= 60 ? "#f59e0b" : "#dc2626"} size={90} strokeWidth={7} />
              <p className="text-[11px] font-medium mt-2" style={{ color: "var(--grey-500)" }}>
                {formatCurrency(data.revenue.total)} of {formatCurrency(data.revenue.billed)} collected
              </p>
            </Card>

            <Card>
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Revenue Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-medium" style={{ color: "var(--grey-600)" }}>Invoices</span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--grey-800)" }}>{data.revenue.invoiceCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-medium" style={{ color: "var(--grey-600)" }}>Discounts</span>
                  <span className="text-[13px] font-bold" style={{ color: "#dc2626" }}>{formatCurrency(data.revenue.discount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-medium" style={{ color: "var(--grey-600)" }}>Avg Invoice</span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--grey-800)" }}>{formatCurrency(avgInvoiceValue)}</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Revenue trend */}
            <Card className="md:col-span-2">
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Daily Revenue Trend</h3>
              <TrendChart data={data.revenue.trend as unknown as Array<Record<string, unknown>>} valueKey="amount" labelKey="date" color="#3b82f6" height={140} />
            </Card>

            {/* Payment methods */}
            <Card>
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Payment Methods</h3>
              <DonutBreakdown
                items={data.revenue.paymentMethods.map(p => ({ label: p.method, value: p.total }))}
                colors={METHOD_COLORS}
              />
            </Card>
          </div>

          {/* Revenue by category */}
          {data.revenue.byCategory.length > 0 && (
            <Card className="mt-4">
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Revenue by Service Type</h3>
              {data.revenue.byCategory.map((cat) => (
                <Bar key={cat.type} label={cat.type} value={cat.revenue}
                  max={Math.max(...data.revenue.byCategory.map(c => c.revenue))}
                  color={TYPE_COLORS[cat.type] || "var(--grey-500)"}
                  subLabel={`${cat.count} items`} />
              ))}
            </Card>
          )}
        </Section>
      )}

      {/* ═══ DOCTORS SECTION ═══ */}
      {activeSection === "doctors" && (
        <Section title="Doctor & Therapist Performance" onExportCSV={exportDoctorsCSV}>
          {data.doctors.length === 0 ? (
            <Card><p className="text-[13px] text-center py-4" style={{ color: "var(--grey-400)" }}>No appointment data for this period</p></Card>
          ) : (
            <div className="space-y-3">
              {data.doctors.map((doc) => {
                const completionRate = doc.totalAppointments > 0 ? Math.round((doc.completed / doc.totalAppointments) * 100) : 0;
                return (
                  <Card key={doc.id}>
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      {/* Doctor info */}
                      <div className="flex items-center gap-3 md:w-56 flex-shrink-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
                          style={{ background: doc.role === "therapist" ? "#d946ef" : "var(--blue-500)" }}>
                          {doc.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>{doc.name}</p>
                          <p className="text-[11px] capitalize" style={{ color: "var(--grey-500)" }}>{doc.role} · {doc.specialization}</p>
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div className="flex-1 grid grid-cols-3 md:grid-cols-6 gap-3">
                        <div className="text-center">
                          <p className="text-[18px] font-bold" style={{ color: "var(--grey-900)" }}>{doc.totalAppointments}</p>
                          <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>Total</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[18px] font-bold" style={{ color: "#16a34a" }}>{doc.completed}</p>
                          <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>Done</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[18px] font-bold" style={{ color: "#dc2626" }}>{doc.cancelled + doc.noShow}</p>
                          <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>Cancel/NS</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[18px] font-bold" style={{ color: "#3b82f6" }}>{doc.uniquePatients}</p>
                          <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>Patients</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[18px] font-bold" style={{ color: "var(--grey-900)" }}>{completionRate}%</p>
                          <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[18px] font-bold" style={{ color: "#16a34a" }}>{formatCurrency(doc.revenue)}</p>
                          <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>Revenue</p>
                        </div>
                      </div>
                    </div>

                    {/* Completion bar */}
                    <div className="mt-2.5 h-2 rounded-full overflow-hidden flex" style={{ background: "var(--grey-100)" }}>
                      <div style={{ width: `${(doc.completed / Math.max(doc.totalAppointments, 1)) * 100}%`, background: "#16a34a" }} />
                      <div style={{ width: `${(doc.cancelled / Math.max(doc.totalAppointments, 1)) * 100}%`, background: "#dc2626" }} />
                      <div style={{ width: `${(doc.noShow / Math.max(doc.totalAppointments, 1)) * 100}%`, background: "#f59e0b" }} />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* ═══ PATIENTS SECTION ═══ */}
      {activeSection === "patients" && (
        <Section title="Patient Statistics" onExportCSV={exportPatientsCSV}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard label="Total Patients" value={String(data.patients.total)} color="#3b82f6"
              icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            <StatCard label="New This Period" value={String(data.patients.new)}
              sub={data.patients.growth !== 0 ? `${data.patients.growth > 0 ? "+" : ""}${data.patients.growth}% growth` : undefined}
              color={data.patients.growth >= 0 ? "#16a34a" : "#dc2626"}
              icon="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            <StatCard label="Prev Period" value={String(data.patients.previousNew)} color="#6b7280"
              icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="Avg Revenue/Patient" value={formatCurrency(data.patients.new > 0 ? data.revenue.total / data.patients.new : 0)} color="#8b5cf6"
              icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-[13px] font-bold mb-2" style={{ color: "var(--grey-800)" }}>Patient Growth</h3>
              <div className="flex items-center gap-4 py-4">
                <div className="text-center flex-1">
                  <p className="text-[28px] font-bold" style={{ color: "var(--blue-500)" }}>{data.patients.new}</p>
                  <p className="text-[11px] font-medium" style={{ color: "var(--grey-500)" }}>New patients</p>
                </div>
                <div className="text-center flex-1">
                  <ChangeBadge value={data.patients.growth} />
                  <p className="text-[11px] font-medium mt-1" style={{ color: "var(--grey-500)" }}>vs previous period</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-[28px] font-bold" style={{ color: "var(--grey-800)" }}>{data.patients.total}</p>
                  <p className="text-[11px] font-medium" style={{ color: "var(--grey-500)" }}>Total registered</p>
                </div>
              </div>
            </Card>
            <Card>
              <h3 className="text-[13px] font-bold mb-2" style={{ color: "var(--grey-800)" }}>Revenue Per Patient</h3>
              <div className="flex items-center gap-4 py-4">
                <div className="text-center flex-1">
                  <p className="text-[28px] font-bold" style={{ color: "#16a34a" }}>{formatCurrency(data.revenue.total)}</p>
                  <p className="text-[11px] font-medium" style={{ color: "var(--grey-500)" }}>Total collected</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-[28px] font-bold" style={{ color: "#8b5cf6" }}>{formatCurrency(data.patients.total > 0 ? data.revenue.total / data.patients.total : 0)}</p>
                  <p className="text-[11px] font-medium" style={{ color: "var(--grey-500)" }}>Per patient (all time)</p>
                </div>
              </div>
            </Card>
          </div>
        </Section>
      )}

      {/* ═══ TREATMENTS SECTION ═══ */}
      {activeSection === "treatments" && (
        <Section title="Treatment Popularity" onExportCSV={exportTreatmentsCSV}>
          {data.treatments.length === 0 ? (
            <Card><p className="text-[13px] text-center py-4" style={{ color: "var(--grey-400)" }}>No treatment data for this period</p></Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th className="text-left text-[11px] font-bold uppercase tracking-wide py-2 px-3" style={{ color: "var(--grey-500)", borderBottom: "2px solid var(--grey-200)" }}>#</th>
                      <th className="text-left text-[11px] font-bold uppercase tracking-wide py-2 px-3" style={{ color: "var(--grey-500)", borderBottom: "2px solid var(--grey-200)" }}>Treatment</th>
                      <th className="text-left text-[11px] font-bold uppercase tracking-wide py-2 px-3" style={{ color: "var(--grey-500)", borderBottom: "2px solid var(--grey-200)" }}>Category</th>
                      <th className="text-center text-[11px] font-bold uppercase tracking-wide py-2 px-3" style={{ color: "var(--grey-500)", borderBottom: "2px solid var(--grey-200)" }}>Sessions</th>
                      <th className="text-right text-[11px] font-bold uppercase tracking-wide py-2 px-3" style={{ color: "var(--grey-500)", borderBottom: "2px solid var(--grey-200)" }}>Revenue</th>
                      <th className="text-left text-[11px] font-bold uppercase tracking-wide py-2 px-3" style={{ color: "var(--grey-500)", borderBottom: "2px solid var(--grey-200)" }}>Popularity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.treatments.map((t, i) => {
                      const maxCount = data.treatments[0]?.count || 1;
                      return (
                        <tr key={t.name} className="hover:bg-[var(--grey-50)]">
                          <td className="py-2.5 px-3 text-[13px] font-bold" style={{ color: "var(--grey-400)", borderBottom: "1px solid var(--grey-100)" }}>{i + 1}</td>
                          <td className="py-2.5 px-3 text-[13px] font-semibold" style={{ color: "var(--grey-900)", borderBottom: "1px solid var(--grey-100)" }}>{t.name}</td>
                          <td className="py-2.5 px-3" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full"
                              style={{ background: `${TYPE_COLORS[t.category] || "#6b7280"}15`, color: TYPE_COLORS[t.category] || "#6b7280" }}>
                              {t.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[13px] font-bold text-center" style={{ color: "var(--grey-800)", borderBottom: "1px solid var(--grey-100)" }}>{t.count}</td>
                          <td className="py-2.5 px-3 text-[13px] font-bold text-right" style={{ color: "#16a34a", borderBottom: "1px solid var(--grey-100)" }}>{formatCurrency(t.revenue)}</td>
                          <td className="py-2.5 px-3" style={{ borderBottom: "1px solid var(--grey-100)", width: 160 }}>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--grey-100)" }}>
                              <div className="h-full rounded-full" style={{ width: `${(t.count / maxCount) * 100}%`, background: TYPE_COLORS[t.category] || "var(--blue-500)" }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </Section>
      )}

      {/* ═══ INVENTORY SECTION ═══ */}
      {activeSection === "inventory" && (
        <Section title="Inventory Management" onExportCSV={inventoryData ? exportInventoryCSV : undefined}>
          {inventoryLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--blue-500)", borderTopColor: "transparent" }} />
                <p className="text-[13px] font-medium" style={{ color: "var(--grey-500)" }}>Loading inventory data...</p>
              </div>
            </div>
          ) : !inventoryData ? (
            <Card><p className="text-[13px] text-center py-4" style={{ color: "var(--grey-400)" }}>No inventory data available.</p></Card>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                <StatCard label="Total Items" value={String(inventoryData.totalItems)} color="#3b82f6"
                  icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                <StatCard label="Low Stock" value={String(inventoryData.lowStock)} color="#f59e0b"
                  icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                <StatCard label="Expiring Soon" value={String(inventoryData.expiringSoon)} color="#f97316"
                  icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                <StatCard label="Expired" value={String(inventoryData.expired)} color="#dc2626"
                  icon="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                <StatCard label="Stock Value" value={formatCurrency(inventoryData.stockValue)} color="#16a34a"
                  icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Low stock alert table */}
                <Card>
                  <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Low Stock Alerts</h3>
                  {inventoryData.lowStockItems.length === 0 ? (
                    <p className="text-[12px] text-center py-4" style={{ color: "var(--grey-400)" }}>All items adequately stocked</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            {["Item", "Category", "Stock", "Min", "Status"].map(h => (
                              <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wide py-2 px-2" style={{ color: "var(--grey-500)", borderBottom: "2px solid var(--grey-200)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryData.lowStockItems.map((item) => {
                            const ratio = item.minStock > 0 ? item.currentStock / item.minStock : 1;
                            const isRed = ratio <= 0.25;
                            const isAmber = ratio <= 0.5 && !isRed;
                            return (
                              <tr key={item.id} className="hover:bg-[var(--grey-50)]">
                                <td className="py-2 px-2 text-[12px] font-semibold" style={{ color: "var(--grey-900)", borderBottom: "1px solid var(--grey-100)" }}>{item.name}</td>
                                <td className="py-2 px-2 text-[11px] capitalize" style={{ color: "var(--grey-600)", borderBottom: "1px solid var(--grey-100)" }}>{item.category}</td>
                                <td className="py-2 px-2 text-[12px] font-bold" style={{ color: isRed ? "#dc2626" : isAmber ? "#f59e0b" : "var(--grey-800)", borderBottom: "1px solid var(--grey-100)" }}>{item.currentStock} {item.unit}</td>
                                <td className="py-2 px-2 text-[12px]" style={{ color: "var(--grey-500)", borderBottom: "1px solid var(--grey-100)" }}>{item.minStock}</td>
                                <td className="py-2 px-2" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: isRed ? "#dc2626" : isAmber ? "#f59e0b" : "#16a34a" }} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                {/* Expiring items table */}
                <Card>
                  <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Expiring Items</h3>
                  {inventoryData.expiringItems.length === 0 ? (
                    <p className="text-[12px] text-center py-4" style={{ color: "var(--grey-400)" }}>No items expiring soon</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            {["Item", "Qty", "Expiry", "Days Left"].map(h => (
                              <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wide py-2 px-2" style={{ color: "var(--grey-500)", borderBottom: "2px solid var(--grey-200)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...inventoryData.expiringItems].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry).map((item) => (
                            <tr key={item.id} className="hover:bg-[var(--grey-50)]">
                              <td className="py-2 px-2 text-[12px] font-semibold" style={{ color: "var(--grey-900)", borderBottom: "1px solid var(--grey-100)" }}>{item.name}</td>
                              <td className="py-2 px-2 text-[12px]" style={{ color: "var(--grey-700)", borderBottom: "1px solid var(--grey-100)" }}>{item.quantity}</td>
                              <td className="py-2 px-2 text-[12px]" style={{ color: "var(--grey-600)", borderBottom: "1px solid var(--grey-100)" }}>
                                {new Date(item.expiryDate).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
                              </td>
                              <td className="py-2 px-2" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full"
                                  style={{
                                    background: item.daysUntilExpiry <= 7 ? "#fee2e2" : item.daysUntilExpiry <= 30 ? "#fef3c7" : "#dcfce7",
                                    color: item.daysUntilExpiry <= 7 ? "#dc2626" : item.daysUntilExpiry <= 30 ? "#d97706" : "#16a34a",
                                  }}>
                                  {item.daysUntilExpiry <= 0 ? "Expired" : `${item.daysUntilExpiry}d`}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top selling items */}
                <Card>
                  <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Top Selling Items</h3>
                  {inventoryData.topSelling.length === 0 ? (
                    <p className="text-[12px] text-center py-4" style={{ color: "var(--grey-400)" }}>No sales data</p>
                  ) : (
                    <div>
                      {inventoryData.topSelling.map((item) => (
                        <CountBar key={item.name} label={item.name} value={item.sold}
                          max={Math.max(...inventoryData.topSelling.map(i => i.sold))}
                          color="#b45309" />
                      ))}
                    </div>
                  )}
                </Card>

                {/* Category breakdown */}
                <Card>
                  <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Category Breakdown</h3>
                  {inventoryData.categoryBreakdown.length === 0 ? (
                    <p className="text-[12px] text-center py-4" style={{ color: "var(--grey-400)" }}>No category data</p>
                  ) : (
                    <div className="space-y-2">
                      {inventoryData.categoryBreakdown.map((cat, i) => {
                        const maxVal = Math.max(...inventoryData.categoryBreakdown.map(c => c.value));
                        const pct = maxVal > 0 ? (cat.value / maxVal) * 100 : 0;
                        const colors = ["#b45309", "#3b82f6", "#16a34a", "#8b5cf6", "#f59e0b", "#06b6d4", "#e11d48", "#d946ef"];
                        const barColor = colors[i % colors.length];
                        return (
                          <div key={cat.category}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[12px] font-semibold capitalize" style={{ color: "var(--grey-700)" }}>{cat.category}</span>
                              <span className="text-[11px] font-bold" style={{ color: "var(--grey-800)" }}>{cat.count} items · {formatCurrency(cat.value)}</span>
                            </div>
                            <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--grey-100)" }}>
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 2)}%`, background: barColor }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </Section>
      )}

      {/* ═══ INSURANCE SECTION ═══ */}
      {activeSection === "insurance" && (
        <Section title="Insurance Claims" onExportCSV={insuranceData ? exportInsuranceCSV : undefined}>
          {insuranceLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--blue-500)", borderTopColor: "transparent" }} />
                <p className="text-[13px] font-medium" style={{ color: "var(--grey-500)" }}>Loading insurance data...</p>
              </div>
            </div>
          ) : !insuranceData ? (
            <Card><p className="text-[13px] text-center py-4" style={{ color: "var(--grey-400)" }}>No insurance data available.</p></Card>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                <StatCard label="Total Claims" value={String(insuranceData.totalClaims)} color="#3b82f6"
                  icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                <StatCard label="Claim Amount" value={formatCurrency(insuranceData.claimAmount)} color="#8b5cf6"
                  icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1" />
                <StatCard label="Approved" value={String(insuranceData.approved)} color="#16a34a"
                  icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                <StatCard label="Settled" value={String(insuranceData.settled)} color="#06b6d4"
                  icon="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                <StatCard label="Approval Rate" value={`${insuranceData.approvalRate}%`} color="#b45309"
                  icon="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Claims pipeline funnel */}
                <Card>
                  <h3 className="text-[13px] font-bold mb-4" style={{ color: "var(--grey-800)" }}>Claims Pipeline</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Submitted", value: insuranceData.pipeline.submitted, color: "#3b82f6" },
                      { label: "Approved", value: insuranceData.pipeline.approved, color: "#16a34a" },
                      { label: "Settled", value: insuranceData.pipeline.settled, color: "#06b6d4" },
                    ].map((stage, i) => {
                      const maxVal = insuranceData.pipeline.submitted || 1;
                      const widthPct = Math.max((stage.value / maxVal) * 100, 8);
                      return (
                        <div key={stage.label}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-semibold" style={{ color: "var(--grey-600)" }}>{stage.label}</span>
                            <span className="text-[12px] font-bold" style={{ color: "var(--grey-800)" }}>{stage.value}</span>
                          </div>
                          <div className="flex justify-center">
                            <div className="h-10 rounded-lg flex items-center justify-center transition-all duration-500"
                              style={{ width: `${widthPct}%`, background: stage.color, minWidth: 40 }}>
                              <span className="text-[10px] font-bold text-white">{stage.value}</span>
                            </div>
                          </div>
                          {i < 2 && (
                            <div className="flex justify-center my-1">
                              <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: "var(--grey-400)" }}>
                                <path d="M6 2 L6 10 M3 7 L6 10 L9 7" fill="none" stroke="currentColor" strokeWidth="1.5" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Monthly trend */}
                <Card>
                  <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Monthly Trend (Last 6 Months)</h3>
                  <TrendChart
                    data={insuranceData.monthlyTrend as unknown as Array<Record<string, unknown>>}
                    valueKey="amount" labelKey="month" color="#8b5cf6" height={140}
                  />
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Provider performance */}
                <Card>
                  <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Provider Performance</h3>
                  {insuranceData.providers.length === 0 ? (
                    <p className="text-[12px] text-center py-4" style={{ color: "var(--grey-400)" }}>No provider data</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            {["Provider", "Claims", "Approved", "Rate", "Amount"].map(h => (
                              <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wide py-2 px-2" style={{ color: "var(--grey-500)", borderBottom: "2px solid var(--grey-200)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {insuranceData.providers.map((p) => (
                            <tr key={p.name} className="hover:bg-[var(--grey-50)]">
                              <td className="py-2 px-2 text-[12px] font-semibold" style={{ color: "var(--grey-900)", borderBottom: "1px solid var(--grey-100)" }}>{p.name}</td>
                              <td className="py-2 px-2 text-[12px] font-bold" style={{ color: "var(--grey-800)", borderBottom: "1px solid var(--grey-100)" }}>{p.claims}</td>
                              <td className="py-2 px-2 text-[12px] font-bold" style={{ color: "#16a34a", borderBottom: "1px solid var(--grey-100)" }}>{p.approved}</td>
                              <td className="py-2 px-2" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full"
                                  style={{
                                    background: p.approvalRate >= 80 ? "#dcfce7" : p.approvalRate >= 60 ? "#fef3c7" : "#fee2e2",
                                    color: p.approvalRate >= 80 ? "#16a34a" : p.approvalRate >= 60 ? "#d97706" : "#dc2626",
                                  }}>
                                  {p.approvalRate}%
                                </span>
                              </td>
                              <td className="py-2 px-2 text-[12px] font-bold" style={{ color: "var(--grey-800)", borderBottom: "1px solid var(--grey-100)" }}>{formatCurrency(p.totalAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                {/* Recent claims */}
                <Card>
                  <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Recent Claims</h3>
                  {insuranceData.recentClaims.length === 0 ? (
                    <p className="text-[12px] text-center py-4" style={{ color: "var(--grey-400)" }}>No recent claims</p>
                  ) : (
                    <div className="space-y-2">
                      {insuranceData.recentClaims.map((claim) => (
                        <div key={claim.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "var(--grey-50)" }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>{claim.patientName}</p>
                            <p className="text-[10px]" style={{ color: "var(--grey-500)" }}>{claim.provider} · {new Date(claim.date).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[12px] font-bold" style={{ color: "var(--grey-800)" }}>{formatCurrency(claim.amount)}</p>
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-full"
                              style={{
                                background: claim.status === "settled" ? "#dcfce7" : claim.status === "approved" ? "#dbeafe" : claim.status === "rejected" ? "#fee2e2" : "#fef3c7",
                                color: claim.status === "settled" ? "#16a34a" : claim.status === "approved" ? "#3b82f6" : claim.status === "rejected" ? "#dc2626" : "#d97706",
                              }}>
                              {claim.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </Section>
      )}

      {/* ═══ OUTSTANDING / AGING SECTION ═══ */}
      {activeSection === "aging" && (
        <Section title="Outstanding Payments" onExportCSV={exportAgingCSV}>
          {/* Aging summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <StatCard label="0\u201330 Days" value={formatCurrency(data.aging.summary.current)} color="#f59e0b"
              icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="31\u201360 Days" value={formatCurrency(data.aging.summary.days30)} color="#f97316"
              icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="61\u201390 Days" value={formatCurrency(data.aging.summary.days60)} color="#ef4444"
              icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="90+ Days" value={formatCurrency(data.aging.summary.over90)} color="#dc2626"
              icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            <StatCard label="Total Due" value={formatCurrency(data.aging.summary.total)} color="#7c3aed"
              icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </div>

          {/* Aging bar */}
          {data.aging.summary.total > 0 && (
            <Card className="mb-4">
              <h3 className="text-[13px] font-bold mb-2" style={{ color: "var(--grey-800)" }}>Aging Distribution</h3>
              <div className="h-8 rounded-lg overflow-hidden flex" style={{ background: "var(--grey-100)" }}>
                {[
                  { label: "0-30d", value: data.aging.summary.current, color: "#f59e0b" },
                  { label: "31-60d", value: data.aging.summary.days30, color: "#f97316" },
                  { label: "61-90d", value: data.aging.summary.days60, color: "#ef4444" },
                  { label: "90+d", value: data.aging.summary.over90, color: "#dc2626" },
                ].map((seg) => {
                  const pct = data.aging.summary.total > 0 ? (seg.value / data.aging.summary.total) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div key={seg.label} className="h-full flex items-center justify-center" style={{ width: `${pct}%`, background: seg.color }} title={`${seg.label}: ${formatCurrency(seg.value)}`}>
                      {pct > 10 && <span className="text-[10px] font-bold text-white">{seg.label}</span>}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Outstanding invoices table */}
          {data.aging.invoices.length > 0 ? (
            <Card>
              <h3 className="text-[13px] font-bold mb-2" style={{ color: "var(--grey-800)" }}>Unpaid Invoices ({data.aging.invoices.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      {["Invoice", "Patient", "Total", "Balance", "Age", "Bucket"].map((h) => (
                        <th key={h} className="text-left text-[11px] font-bold uppercase tracking-wide py-2 px-3" style={{ color: "var(--grey-500)", borderBottom: "2px solid var(--grey-200)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.aging.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[var(--grey-50)]">
                        <td className="py-2 px-3 text-[12px]" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                          <Link href={`/billing/${inv.id}`} className="font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>{inv.invoiceNumber}</Link>
                        </td>
                        <td className="py-2 px-3 text-[12px] font-medium" style={{ color: "var(--grey-800)", borderBottom: "1px solid var(--grey-100)" }}>{inv.patientName}</td>
                        <td className="py-2 px-3 text-[12px] font-medium" style={{ color: "var(--grey-700)", borderBottom: "1px solid var(--grey-100)" }}>{formatCurrency(inv.totalAmount)}</td>
                        <td className="py-2 px-3 text-[12px] font-bold" style={{ color: "#dc2626", borderBottom: "1px solid var(--grey-100)" }}>{formatCurrency(inv.balanceAmount)}</td>
                        <td className="py-2 px-3 text-[12px] font-medium" style={{ color: "var(--grey-700)", borderBottom: "1px solid var(--grey-100)" }}>{inv.daysOverdue}d</td>
                        <td className="py-2 px-3" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full"
                            style={{ background: inv.daysOverdue > 90 ? "#fee2e2" : inv.daysOverdue > 60 ? "#ffedd5" : inv.daysOverdue > 30 ? "#fef3c7" : "#fefce8",
                              color: inv.daysOverdue > 90 ? "#dc2626" : inv.daysOverdue > 60 ? "#ea580c" : inv.daysOverdue > 30 ? "#d97706" : "#ca8a04" }}>
                            {inv.bucket}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card><p className="text-[13px] text-center py-4" style={{ color: "#16a34a" }}>No outstanding payments! All invoices are settled.</p></Card>
          )}
        </Section>
      )}

      {/* ═══ APPOINTMENTS SECTION ═══ */}
      {activeSection === "appointments" && (
        <Section title="Appointment Analytics" onExportCSV={exportAppointmentsCSV}>
          {/* Top stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard label="Total Appointments" value={String(data.appointments.total)}
              sub={data.appointments.previousTotal > 0 ? `${data.appointments.total > data.appointments.previousTotal ? "+" : ""}${Math.round(((data.appointments.total - data.appointments.previousTotal) / data.appointments.previousTotal) * 100)}% vs prev` : undefined}
              color="#3b82f6"
              icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            <StatCard label="Completion Rate" value={`${data.appointments.completionRate}%`} color="#16a34a"
              icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            <StatCard label="No-Show Rate" value={`${data.appointments.noShowRate}%`} color="#f59e0b"
              icon="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            <StatCard label="Walk-ins" value={String(data.appointments.walkins)} color="#8b5cf6"
              icon="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Appointment trend */}
            <Card className="md:col-span-2">
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Daily Appointments</h3>
              <TrendChart data={data.appointments.trend as unknown as Array<Record<string, unknown>>} valueKey="count" labelKey="date" color="#8b5cf6" height={140} />
            </Card>

            {/* By Status */}
            <Card>
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>By Status</h3>
              <div className="space-y-2">
                {data.appointments.byStatus.map((s) => {
                  const pct = data.appointments.total > 0 ? (s.count / data.appointments.total) * 100 : 0;
                  return (
                    <div key={s.status} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[s.status] || "#6b7280" }} />
                      <span className="text-[12px] font-medium capitalize flex-1" style={{ color: "var(--grey-700)" }}>{s.status.replace("-", " ")}</span>
                      <span className="text-[12px] font-bold" style={{ color: "var(--grey-800)" }}>{s.count}</span>
                      <span className="text-[10px] w-10 text-right" style={{ color: "var(--grey-500)" }}>{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* By Type */}
          {data.appointments.byType.length > 0 && (
            <Card className="mt-4">
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>By Appointment Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.appointments.byType.map((t) => (
                  <div key={t.type} className="text-center p-3 rounded-lg" style={{ background: "var(--grey-50)" }}>
                    <p className="text-[24px] font-bold" style={{ color: TYPE_COLORS[t.type] || "var(--grey-800)" }}>{t.count}</p>
                    <p className="text-[11px] font-medium capitalize" style={{ color: "var(--grey-500)" }}>{t.type.replace("-", " ")}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Peak Hours Heatmap */}
          {data.appointments.peakHours && data.appointments.peakHours.length > 0 && (
            <Card className="mt-4">
              <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--grey-800)" }}>Peak Hours</h3>
              <PeakHoursHeatmap data={data.appointments.peakHours} />

              {/* Hourly distribution bar chart */}
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--grey-200)" }}>
                <h4 className="text-[12px] font-bold mb-2" style={{ color: "var(--grey-700)" }}>Hourly Distribution</h4>
                {(() => {
                  const hourlyTotals: Record<number, number> = {};
                  data.appointments.peakHours!.forEach(d => {
                    hourlyTotals[d.hour] = (hourlyTotals[d.hour] || 0) + d.count;
                  });
                  const hours = Array.from({ length: 13 }, (_, i) => i + 8);
                  const maxHourly = Math.max(...hours.map(h => hourlyTotals[h] || 0), 1);
                  return (
                    <div className="flex items-end gap-[3px] justify-center" style={{ height: 80 }}>
                      {hours.map(h => {
                        const val = hourlyTotals[h] || 0;
                        const barH = Math.max((val / maxHourly) * 60, 2);
                        return (
                          <div key={h} className="flex flex-col items-center" style={{ flex: 1 }}>
                            <div className="rounded-t-sm cursor-default"
                              style={{ width: "100%", maxWidth: 28, height: barH, background: "#b45309", opacity: 0.8 }}
                              title={`${h}:00 - ${val} appointments`} />
                            <span className="text-[8px] mt-0.5" style={{ color: "var(--grey-400)" }}>
                              {h > 12 ? `${h - 12}p` : h === 12 ? "12p" : `${h}a`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </Card>
          )}
        </Section>
      )}

      {/* ═══ PRINT-READY HIDDEN DIV ═══ */}
      <div ref={printRef} style={{ display: "none" }}>
        <h1>Clinic Reports</h1>
        <p>
          {new Date(data.period.from).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
          {" \u2014 "}
          {new Date(data.period.to).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
        </p>

        <h2>Revenue</h2>
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-label">Total Revenue</div><div className="stat-value">{formatCurrency(data.revenue.total)}</div></div>
          <div className="stat-card"><div className="stat-label">Total Billed</div><div className="stat-value">{formatCurrency(data.revenue.billed)}</div></div>
          <div className="stat-card"><div className="stat-label">Outstanding</div><div className="stat-value">{formatCurrency(data.revenue.outstanding)}</div></div>
          <div className="stat-card"><div className="stat-label">Invoices</div><div className="stat-value">{data.revenue.invoiceCount}</div></div>
        </div>
        <p>GST: {formatCurrency(estimatedGST)} (CGST: {formatCurrency(cgst)}, SGST: {formatCurrency(sgst)})</p>
        <p>Collection Efficiency: {collectionEfficiency.toFixed(1)}% | Avg Invoice: {formatCurrency(avgInvoiceValue)}</p>

        <h2>Doctor &amp; Therapist Performance</h2>
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Appointments</th><th>Completed</th><th>Revenue</th></tr></thead>
          <tbody>
            {data.doctors.map(d => (
              <tr key={d.id}><td>{d.name}</td><td>{d.role}</td><td>{d.totalAppointments}</td><td>{d.completed}</td><td>{formatCurrency(d.revenue)}</td></tr>
            ))}
          </tbody>
        </table>

        <h2>Patients</h2>
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{data.patients.total}</div></div>
          <div className="stat-card"><div className="stat-label">New</div><div className="stat-value">{data.patients.new}</div></div>
          <div className="stat-card"><div className="stat-label">Growth</div><div className="stat-value">{data.patients.growth}%</div></div>
        </div>

        <h2>Treatments</h2>
        <table>
          <thead><tr><th>Treatment</th><th>Category</th><th>Sessions</th><th>Revenue</th></tr></thead>
          <tbody>
            {data.treatments.map(t => (
              <tr key={t.name}><td>{t.name}</td><td>{t.category}</td><td>{t.count}</td><td>{formatCurrency(t.revenue)}</td></tr>
            ))}
          </tbody>
        </table>

        <h2>Outstanding Payments</h2>
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-label">0-30 Days</div><div className="stat-value">{formatCurrency(data.aging.summary.current)}</div></div>
          <div className="stat-card"><div className="stat-label">31-60 Days</div><div className="stat-value">{formatCurrency(data.aging.summary.days30)}</div></div>
          <div className="stat-card"><div className="stat-label">61-90 Days</div><div className="stat-value">{formatCurrency(data.aging.summary.days60)}</div></div>
          <div className="stat-card"><div className="stat-label">90+ Days</div><div className="stat-value">{formatCurrency(data.aging.summary.over90)}</div></div>
        </div>
        <table>
          <thead><tr><th>Invoice</th><th>Patient</th><th>Balance</th><th>Days</th></tr></thead>
          <tbody>
            {data.aging.invoices.map(inv => (
              <tr key={inv.id}><td>{inv.invoiceNumber}</td><td>{inv.patientName}</td><td>{formatCurrency(inv.balanceAmount)}</td><td>{inv.daysOverdue}d</td></tr>
            ))}
          </tbody>
        </table>

        <h2>Appointments</h2>
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{data.appointments.total}</div></div>
          <div className="stat-card"><div className="stat-label">Completion Rate</div><div className="stat-value">{data.appointments.completionRate}%</div></div>
          <div className="stat-card"><div className="stat-label">No-Show Rate</div><div className="stat-value">{data.appointments.noShowRate}%</div></div>
          <div className="stat-card"><div className="stat-label">Walk-ins</div><div className="stat-value">{data.appointments.walkins}</div></div>
        </div>
      </div>
    </div>
  );
}
