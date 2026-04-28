"use client";

/**
 * Custom Report Builder — pick a data source, drag fields into the columns
 * panel, set filters, run the report. Export to CSV.
 *
 * Route: /reports/custom
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { downloadCSV } from "@/lib/csv-export";

interface FieldDef {
  key: string; label: string;
  type: "string" | "number" | "date" | "boolean" | "enum";
  enumValues?: string[];
}
interface SourceMeta {
  fields: FieldDef[];
  defaultColumns: string[];
  supportsBranch: boolean;
}

const SOURCE_LABELS: Record<string, { label: string; icon: string }> = {
  appointments: { label: "Appointments", icon: "📅" },
  invoices:     { label: "Invoices",     icon: "💰" },
  patients:     { label: "Patients",     icon: "🏥" },
};

function fmt(v: unknown, type: FieldDef["type"]): string {
  if (v === null || v === undefined || v === "") return "—";
  if (type === "date") return new Date(v as string).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
  if (type === "boolean") return v ? "Yes" : "No";
  if (type === "number") {
    const n = Number(v);
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  }
  return String(v);
}

export default function CustomReportBuilder() {
  const [meta, setMeta] = useState<Record<string, SourceMeta>>({});
  const [source, setSource] = useState<string>("appointments");
  const [columns, setColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupBy, setGroupBy] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows, setRows] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Fetch source meta on mount
  useEffect(() => {
    fetch("/api/reports/custom").then(r => r.json()).then(d => {
      setMeta(d.sources || {});
    });
  }, []);

  // When source changes, reset columns to defaults
  useEffect(() => {
    if (meta[source]) setColumns(meta[source].defaultColumns);
    setFilters({});
    setRows([]);
  }, [source, meta]);

  const sourceMeta = meta[source];

  const availableFields = useMemo(() => {
    if (!sourceMeta) return [];
    return sourceMeta.fields.filter(f => !columns.includes(f.key));
  }, [sourceMeta, columns]);

  function addColumn(key: string) {
    setColumns(prev => prev.includes(key) ? prev : [...prev, key]);
  }
  function removeColumn(key: string) {
    setColumns(prev => prev.filter(k => k !== key));
  }
  function moveColumn(idx: number, dir: -1 | 1) {
    setColumns(prev => {
      const arr = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return arr;
    });
  }

  // Drag-and-drop reorder of selected columns
  function handleDragStart(e: React.DragEvent, key: string) {
    e.dataTransfer.setData("text/plain", key);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function handleDrop(e: React.DragEvent, targetKey: string) {
    e.preventDefault();
    const sourceKey = e.dataTransfer.getData("text/plain");
    if (!sourceKey || sourceKey === targetKey) return;
    setColumns(prev => {
      const arr = prev.filter(k => k !== sourceKey);
      const targetIdx = arr.indexOf(targetKey);
      arr.splice(targetIdx, 0, sourceKey);
      return arr;
    });
  }

  async function runReport() {
    setRunning(true); setError("");
    try {
      const res = await fetch("/api/reports/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, columns, filters, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, groupBy: groupBy || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Report failed"); setRows([]); return; }
      setRows(data.rows || []);
      setResultColumns(data.columns || columns);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally { setRunning(false); }
  }

  function exportCSV() {
    if (!rows.length) return;
    const colDefs = resultColumns.map(c => sourceMeta?.fields.find(f => f.key === c) || { key: c, label: c, type: "string" as const });
    // Format values into a simple object per row for downloadCSV
    const data = rows.map(r => {
      const out: Record<string, unknown> = {};
      for (const c of colDefs) {
        const v = r[c.key];
        out[c.key] = v === null || v === undefined ? "" : (c.type === "date" && v ? new Date(v as string).toISOString().slice(0, 10) : String(v));
      }
      return out;
    });
    downloadCSV(data, colDefs.map(c => ({ key: c.key, label: c.label })), `custom-${source}-${new Date().toISOString().slice(0, 10)}`);
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link href="/reports" className="text-[12px] font-semibold inline-flex items-center gap-1 mb-1" style={{ color: "var(--blue-500)" }}>
            ← Back to Reports
          </Link>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
            🛠 Custom Report Builder
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>
            Pick fields, set filters, run. Drag to reorder columns. Export to CSV.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Left: data source + field picker */}
        <aside className="space-y-3">
          <div className="p-3 rounded-md" style={{ background: "var(--white)", border: "1px solid var(--grey-200)" }}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--grey-500)" }}>Data Source</p>
            <div className="space-y-1">
              {Object.entries(SOURCE_LABELS).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setSource(key)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[13px] font-semibold transition-colors hover:bg-gray-100"
                  style={{
                    background: source === key ? "#dcfce7" : "transparent",
                    color: source === key ? "#166534" : "var(--grey-700)",
                  }}
                >
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-md" style={{ background: "var(--white)", border: "1px solid var(--grey-200)" }}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--grey-500)" }}>Available Fields</p>
            <p className="text-[11px] mb-2" style={{ color: "var(--grey-400)" }}>Click + to add as column</p>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {availableFields.map(f => (
                <button
                  key={f.key}
                  onClick={() => addColumn(f.key)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-[12px] font-medium hover:bg-gray-100"
                  style={{ color: "var(--grey-700)" }}
                >
                  <span className="truncate">{f.label}</span>
                  <span style={{ color: "var(--blue-500)" }}>+</span>
                </button>
              ))}
              {availableFields.length === 0 && (
                <p className="text-[12px] italic px-2 py-2" style={{ color: "var(--grey-400)" }}>All fields added.</p>
              )}
            </div>
          </div>
        </aside>

        {/* Right: builder */}
        <main className="space-y-3">
          {/* Selected columns */}
          <div className="p-3 rounded-md" style={{ background: "var(--white)", border: "1px solid var(--grey-200)" }}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--grey-500)" }}>
              Selected Columns ({columns.length}) <span className="font-normal opacity-70 normal-case">— drag chips to reorder</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {columns.map((c, i) => {
                const f = sourceMeta?.fields.find(x => x.key === c);
                return (
                  <span
                    key={c}
                    draggable
                    onDragStart={(e) => handleDragStart(e, c)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, c)}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded cursor-move text-[12px] font-semibold"
                    style={{ background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe" }}
                  >
                    <span className="opacity-50">⋮⋮</span>
                    <span>{f?.label || c}</span>
                    <button onClick={() => moveColumn(i, -1)} className="px-0.5 hover:opacity-70" title="Move left">←</button>
                    <button onClick={() => moveColumn(i, 1)} className="px-0.5 hover:opacity-70" title="Move right">→</button>
                    <button onClick={() => removeColumn(c)} className="px-1 hover:bg-red-100 rounded" style={{ color: "#dc2626" }} title="Remove">✕</button>
                  </span>
                );
              })}
              {columns.length === 0 && (
                <p className="text-[12px] italic" style={{ color: "var(--grey-400)" }}>No columns selected. Pick from the left.</p>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="p-3 rounded-md" style={{ background: "var(--white)", border: "1px solid var(--grey-200)" }}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--grey-500)" }}>Filters</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] font-semibold mb-0.5" style={{ color: "var(--grey-600)" }}>From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-2 py-1 text-[12px] rounded" style={{ border: "1px solid var(--grey-300)" }} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-0.5" style={{ color: "var(--grey-600)" }}>To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-2 py-1 text-[12px] rounded" style={{ border: "1px solid var(--grey-300)" }} />
              </div>
              {/* Per-source enum filters */}
              {sourceMeta?.fields.filter(f => f.type === "enum").slice(0, 2).map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] font-semibold mb-0.5" style={{ color: "var(--grey-600)" }}>{f.label}</label>
                  <select
                    value={filters[f.key] || ""}
                    onChange={(e) => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-2 py-1 text-[12px] rounded"
                    style={{ border: "1px solid var(--grey-300)" }}
                  >
                    <option value="">All</option>
                    {f.enumValues?.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Group-by + Run */}
          <div className="p-3 rounded-md flex items-center gap-3 flex-wrap" style={{ background: "var(--white)", border: "1px solid var(--grey-200)" }}>
            <div>
              <label className="block text-[11px] font-semibold mb-0.5" style={{ color: "var(--grey-600)" }}>Group By (optional)</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="px-2 py-1 text-[12px] rounded"
                style={{ border: "1px solid var(--grey-300)", minWidth: 150 }}
              >
                <option value="">(none — show all rows)</option>
                {columns.map(c => {
                  const f = sourceMeta?.fields.find(x => x.key === c);
                  return <option key={c} value={c}>{f?.label || c}</option>;
                })}
              </select>
            </div>
            <button
              onClick={runReport}
              disabled={running || columns.length === 0}
              className="px-4 py-1.5 text-[13px] font-bold text-white rounded disabled:opacity-50 ml-auto"
              style={{ background: "var(--blue-500)" }}
            >
              {running ? "Running…" : "Run Report"}
            </button>
            <button
              onClick={exportCSV}
              disabled={rows.length === 0}
              className="px-3 py-1.5 text-[13px] font-semibold rounded disabled:opacity-50"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}
            >
              ⬇ Export CSV
            </button>
          </div>

          {/* Results */}
          {error && (
            <div className="p-3 rounded-md text-[13px]" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
              {error}
            </div>
          )}

          {rows.length > 0 && (
            <div className="p-3 rounded-md" style={{ background: "var(--white)", border: "1px solid var(--grey-200)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--grey-500)" }}>
                Results ({rows.length} row{rows.length !== 1 ? "s" : ""})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead style={{ background: "var(--grey-50)" }}>
                    <tr style={{ borderBottom: "2px solid var(--grey-200)" }}>
                      {resultColumns.map(c => {
                        const f = sourceMeta?.fields.find(x => x.key === c);
                        return <th key={c} className="text-left py-2 px-2 font-bold uppercase text-[10px]" style={{ color: "var(--grey-600)" }}>{f?.label || c}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--grey-100)" }}>
                        {resultColumns.map(c => {
                          const f = sourceMeta?.fields.find(x => x.key === c);
                          return <td key={c} className="py-1.5 px-2" style={{ color: "var(--grey-800)" }}>{fmt(r[c], f?.type || "string")}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!running && rows.length === 0 && !error && (
            <div className="p-6 rounded-md text-center text-[13px] italic" style={{ background: "var(--white)", border: "1px dashed var(--grey-300)", color: "var(--grey-400)" }}>
              Pick columns, set filters, click <strong>Run Report</strong>.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
