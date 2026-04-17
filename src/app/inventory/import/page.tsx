"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import InventoryTabs from "@/components/InventoryTabs";
import { useFlash } from "@/components/FlashCardProvider";
import { cardStyle, btnPrimary, inputStyle } from "@/lib/styles";

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const sectionTitle = { color: "var(--grey-900)", fontSize: "17px", fontWeight: 700 as const };

// ─── Column definitions for mapping ─────────────────────────────────────────
const MAPPABLE_COLUMNS = [
  { key: "name", label: "Name", required: true },
  { key: "category", label: "Category", required: true },
  { key: "subcategory", label: "Subcategory", required: false },
  { key: "unit", label: "Unit", required: false },
  { key: "packing", label: "Packing", required: false },
  { key: "manufacturerCode", label: "Manufacturer Code", required: false },
  { key: "costPrice", label: "Cost Price", required: false },
  { key: "unitPrice", label: "Selling Price / MRP", required: false },
  { key: "gstPercent", label: "GST %", required: false },
  { key: "currentStock", label: "Current Stock", required: false },
  { key: "reorderLevel", label: "Reorder Level", required: false },
  { key: "manufacturer", label: "Manufacturer", required: false },
  { key: "batchNumber", label: "Batch Number", required: false },
] as const;

// ─── Sample CSV template ────────────────────────────────────────────────────
const SAMPLE_CSV = `Name,Category,Subcategory,Unit,Packing,Manufacturer Code,Cost Price,Selling Price,GST %,Current Stock,Reorder Level,Manufacturer,Batch Number
Dasamoolarishtam,medicine,Arishtam,bottle,450ML,FGA001,120,150,12,50,10,Kottakkal Arya Vaidya Sala,BATCH-2026-001
Triphala Churnam,medicine,Churnam,pkt,100GM,,80,110,5,100,20,Kottakkal Arya Vaidya Sala,
Dhanwantharam Thailam,oil,Tailam,bottle,200ML,OIL045,200,280,12,30,5,Kottakkal Arya Vaidya Sala,BATCH-2026-003
Cotton Roll,consumable,,nos,,,15,25,18,200,50,,
Nasyam Table,equipment,,nos,,,5000,7500,18,2,1,,`;

// ─── Auto-detect column mapping ─────────────────────────────────────────────
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "item name", "item", "product", "product name", "medicine name", "medicine"],
  category: ["category", "type", "item type", "product type"],
  subcategory: ["subcategory", "sub category", "sub-category", "subtype", "sub type"],
  unit: ["unit", "uom", "unit of measure", "measurement"],
  packing: ["packing", "pack", "pack size", "size", "packaging"],
  manufacturerCode: ["manufacturer code", "mfr code", "mfr. code", "code", "product code", "item code"],
  costPrice: ["cost price", "cost", "purchase price", "basic price", "buy price", "cp"],
  unitPrice: ["selling price", "mrp", "price", "sell price", "retail price", "sp", "selling price / mrp", "selling price/mrp", "unit price"],
  gstPercent: ["gst %", "gst", "gst percent", "tax %", "tax", "gst%", "tax%"],
  currentStock: ["current stock", "stock", "qty", "quantity", "opening stock", "available"],
  reorderLevel: ["reorder level", "reorder", "min stock", "minimum stock", "min qty", "reorder point"],
  manufacturer: ["manufacturer", "mfr", "brand", "company", "maker"],
  batchNumber: ["batch number", "batch", "batch no", "lot", "lot number"],
};

function detectColumnMapping(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const header = normalizedHeaders[i];
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(header)) {
        mapping[i] = key;
        break;
      }
    }
  }

  return mapping;
}

// ─── CSV Parsing (built-in, no dependencies) ────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current);
        current = "";
      } else if (char === "\n" || (char === "\r" && next === "\n")) {
        row.push(current);
        current = "";
        if (row.some((cell) => cell.trim() !== "")) {
          rows.push(row);
        }
        row = [];
        if (char === "\r") i++;
      } else {
        current += char;
      }
    }
  }

  // Last field / row
  row.push(current);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
type ImportPhase = "upload" | "preview" | "importing" | "done";

interface ImportResult {
  created: number;
  failed: { name: string; error: string }[];
  total: number;
}

export default function InventoryImportPage() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<ImportPhase>("upload");
  const { showFlash } = useFlash();
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsed data
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});

  // Import progress
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── File handling ───────────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "txt") {
      showFlash({ type: "error", title: "Error", message: "Please upload a .csv file. Excel (.xlsx) files should be exported as CSV first." });
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text || !text.trim()) {
        showFlash({ type: "error", title: "Error", message: "File appears to be empty." });
        return;
      }

      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        showFlash({ type: "error", title: "Error", message: "File must have a header row and at least one data row." });
        return;
      }

      const fileHeaders = parsed[0].map((h) => h.trim());
      const dataRows = parsed.slice(1);

      setHeaders(fileHeaders);
      setRows(dataRows);

      // Auto-detect column mapping
      const detected = detectColumnMapping(fileHeaders);
      setColumnMapping(detected);

      setPhase("preview");
    };
    reader.onerror = () => {
      showFlash({ type: "error", title: "Error", message: "Failed to read file." });
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  // ── Column mapping change ──────────────────────────────────────────────
  const updateMapping = useCallback((colIndex: number, mapTo: string) => {
    setColumnMapping((prev) => {
      const next = { ...prev };
      if (mapTo === "") {
        delete next[colIndex];
      } else {
        // Remove any existing mapping to this field
        for (const key of Object.keys(next)) {
          if (next[Number(key)] === mapTo) {
            delete next[Number(key)];
          }
        }
        next[colIndex] = mapTo;
      }
      return next;
    });
  }, []);

  // ── Build items from mapping ──────────────────────────────────────────
  function buildItems(): Record<string, string | number | null>[] {
    const mappedFields = Object.entries(columnMapping);
    return rows.map((row) => {
      const item: Record<string, string | number | null> = {};
      for (const [colIndexStr, field] of mappedFields) {
        const colIndex = Number(colIndexStr);
        const value = row[colIndex]?.trim() || "";
        if (value) {
          if (["costPrice", "unitPrice", "gstPercent"].includes(field)) {
            item[field] = parseFloat(value) || null;
          } else if (["currentStock", "reorderLevel"].includes(field)) {
            item[field] = parseInt(value, 10) || null;
          } else {
            item[field] = value;
          }
        }
      }
      return item;
    });
  }

  // ── Import ─────────────────────────────────────────────────────────────
  async function handleImport() {
    // Validate mapping has required fields
    const mappedKeys = Object.values(columnMapping);
    if (!mappedKeys.includes("name")) {
      showFlash({ type: "error", title: "Error", message: "Please map the Name column (required)." });
      return;
    }
    if (!mappedKeys.includes("category")) {
      showFlash({ type: "error", title: "Error", message: "Please map the Category column (required)." });
      return;
    }

    const allItems = buildItems();
    if (allItems.length === 0) {
      showFlash({ type: "error", title: "Error", message: "No items to import." });
      return;
    }

    setPhase("importing");
    setProgress(0);

    const BATCH_SIZE = 25;
    let totalCreated = 0;
    const allFailed: { name: string; error: string }[] = [];

    for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
      const batch = allItems.slice(i, i + BATCH_SIZE);

      try {
        const res = await fetch("/api/inventory/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: batch }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          // Mark all batch items as failed
          batch.forEach((item, idx) => {
            allFailed.push({
              name: (item.name as string) || `Row ${i + idx + 1}`,
              error: data.error || `Server error (${res.status})`,
            });
          });
        } else {
          const data = await res.json();
          totalCreated += data.created || 0;
          if (data.failed && data.failed.length > 0) {
            allFailed.push(...data.failed);
          }
        }
      } catch {
        batch.forEach((item, idx) => {
          allFailed.push({
            name: (item.name as string) || `Row ${i + idx + 1}`,
            error: "Network error",
          });
        });
      }

      setProgress(Math.min(Math.round(((i + BATCH_SIZE) / allItems.length) * 100), 100));
    }

    setResult({
      created: totalCreated,
      failed: allFailed,
      total: allItems.length,
    });
    setProgress(100);
    setPhase("done");
  }

  // ── Download sample CSV ───────────────────────────────────────────────
  function downloadSampleCSV() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Reset ──────────────────────────────────────────────────────────────
  function handleReset() {
    setPhase("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setColumnMapping({});
    setProgress(0);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-64 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="h-96 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
      </div>
    );
  }

  // ── Preview row count ─────────────────────────────────────────────────
  const previewRows = rows.slice(0, 10);
  const hasNameMapping = Object.values(columnMapping).includes("name");
  const hasCategoryMapping = Object.values(columnMapping).includes("category");

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* ── Back Link ─────────────────────────────────────────────── */}
      <Link href="/inventory" className="inline-flex items-center gap-1 text-[15px] font-semibold hover:underline mb-4" style={{ color: "var(--blue-500)" }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Inventory
      </Link>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Bulk Import Inventory</h1>
        <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Import inventory items from a CSV file</p>
      </div>

      <InventoryTabs />

      {/* ═══ PHASE: UPLOAD ═══ */}
      {phase === "upload" && (
        <div className="space-y-6">
          {/* Instructions card */}
          <div className="p-5" style={cardStyle}>
            <h2 className="mb-3 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>How to Import</h2>
            <ol className="space-y-2 text-[15px]" style={{ color: "var(--grey-700)" }}>
              <li className="flex gap-2">
                <span className="font-bold" style={{ color: "var(--blue-500)" }}>1.</span>
                Download the sample CSV template or prepare your own CSV file with headers.
              </li>
              <li className="flex gap-2">
                <span className="font-bold" style={{ color: "var(--blue-500)" }}>2.</span>
                Fill in your inventory data. <strong>Name</strong> and <strong>Category</strong> columns are required.
              </li>
              <li className="flex gap-2">
                <span className="font-bold" style={{ color: "var(--blue-500)" }}>3.</span>
                Valid categories: <span className="font-mono text-[13px]" style={{ color: "var(--grey-600)" }}>medicine, herb, oil, consumable, equipment</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold" style={{ color: "var(--blue-500)" }}>4.</span>
                Upload the file, review the column mapping, then click Import.
              </li>
            </ol>
            <div className="mt-4">
              <button
                onClick={downloadSampleCSV}
                className="inline-flex items-center gap-2 px-4 py-2 text-[15px] font-semibold transition-colors"
                style={{
                  color: "var(--blue-500)",
                  border: "1px solid var(--blue-500)",
                  borderRadius: "var(--radius-sm)",
                  background: "transparent",
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
                </svg>
                Download Sample CSV Template
              </button>
            </div>
          </div>

          {/* Drop zone */}
          <div
            className="p-5"
            style={cardStyle}
          >
            <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Upload File</h2>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 p-10 cursor-pointer transition-colors"
              style={{
                border: `2px dashed ${dragActive ? "var(--blue-500)" : "var(--grey-300)"}`,
                borderRadius: "var(--radius)",
                background: dragActive ? "var(--blue-50)" : "var(--grey-50)",
              }}
            >
              <svg className="w-12 h-12" style={{ color: dragActive ? "var(--blue-500)" : "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div className="text-center">
                <p className="text-[15px] font-semibold" style={{ color: "var(--grey-800)" }}>
                  {dragActive ? "Drop your file here" : "Drag & drop your CSV file here"}
                </p>
                <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>
                  or click to browse. Accepts .csv files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ PHASE: PREVIEW ═══ */}
      {phase === "preview" && (
        <div className="space-y-6">
          {/* File info bar */}
          <div className="flex items-center justify-between p-4" style={cardStyle}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" style={{ color: "var(--green)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{fileName}</p>
                <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                  {rows.length} data row{rows.length !== 1 ? "s" : ""} found, {headers.length} columns
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-[13px] font-semibold transition-colors"
              style={{ color: "var(--grey-600)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}
            >
              Choose Different File
            </button>
          </div>

          {/* Column Mapping */}
          <div className="p-5" style={cardStyle}>
            <h2 className="mb-1" style={sectionTitle}>Column Mapping</h2>
            <p className="text-[13px] mb-4" style={{ color: "var(--grey-500)" }}>
              Map your CSV columns to inventory fields. Required fields are marked with <span style={{ color: "var(--red)" }}>*</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {headers.map((header, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium" style={{ color: "var(--grey-600)" }}>
                    CSV Column: <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{header}</span>
                  </label>
                  <select
                    value={columnMapping[idx] || ""}
                    onChange={(e) => updateMapping(idx, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-[15px]"
                    style={inputStyle}
                  >
                    <option value="">-- Skip this column --</option>
                    {MAPPABLE_COLUMNS.map((col) => {
                      const alreadyMapped = Object.entries(columnMapping).some(
                        ([k, v]) => v === col.key && Number(k) !== idx
                      );
                      return (
                        <option key={col.key} value={col.key} disabled={alreadyMapped}>
                          {col.label}{col.required ? " *" : ""}{alreadyMapped ? " (already mapped)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ))}
            </div>

            {(!hasNameMapping || !hasCategoryMapping) && (
              <div
                className="mt-4 px-4 py-3 text-[13px] font-medium flex items-center gap-2"
                style={{
                  background: "#fff8e1",
                  border: "1px solid #ffe082",
                  borderRadius: "var(--radius-sm)",
                  color: "#f57f17",
                }}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {!hasNameMapping && !hasCategoryMapping
                  ? "Please map both Name and Category columns (required)."
                  : !hasNameMapping
                    ? "Please map the Name column (required)."
                    : "Please map the Category column (required)."}
              </div>
            )}
          </div>

          {/* Preview Table */}
          <div className="p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <h2 style={sectionTitle}>
                Data Preview
                <span className="text-[13px] font-normal ml-2" style={{ color: "var(--grey-500)" }}>
                  (showing first {Math.min(rows.length, 10)} of {rows.length} rows)
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)" }}>
              <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--grey-50, #f9fafb)" }}>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: "var(--grey-500)", borderBottom: "1px solid var(--grey-200)" }}>
                      #
                    </th>
                    {headers.map((header, idx) => {
                      const mappedTo = columnMapping[idx];
                      const mappedLabel = mappedTo ? MAPPABLE_COLUMNS.find((c) => c.key === mappedTo)?.label : null;
                      return (
                        <th
                          key={idx}
                          className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                          style={{
                            color: mappedTo ? "var(--grey-900)" : "var(--grey-400)",
                            borderBottom: "1px solid var(--grey-200)",
                          }}
                        >
                          <div>{header}</div>
                          {mappedLabel && (
                            <div className="text-[11px] font-medium mt-0.5" style={{ color: "var(--blue-500)" }}>
                              &rarr; {mappedLabel}
                            </div>
                          )}
                          {!mappedTo && (
                            <div className="text-[11px] font-normal mt-0.5" style={{ color: "var(--grey-400)" }}>
                              (skipped)
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIdx) => (
                    <tr key={rowIdx} style={{ borderBottom: "1px solid var(--grey-100)" }}>
                      <td className="px-3 py-2" style={{ color: "var(--grey-400)" }}>{rowIdx + 1}</td>
                      {headers.map((_, colIdx) => {
                        const mappedTo = columnMapping[colIdx];
                        return (
                          <td
                            key={colIdx}
                            className="px-3 py-2 whitespace-nowrap"
                            style={{ color: mappedTo ? "var(--grey-800)" : "var(--grey-400)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}
                          >
                            {row[colIdx] || ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={!hasNameMapping || !hasCategoryMapping}
              className="inline-flex items-center justify-center gap-2 text-white px-6 py-2.5 text-[15px] font-semibold transition-opacity duration-150 disabled:opacity-50"
              style={btnPrimary}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import {rows.length} Item{rows.length !== 1 ? "s" : ""}
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 text-[15px] font-semibold transition-colors duration-150"
              style={{ color: "var(--grey-600)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ═══ PHASE: IMPORTING ═══ */}
      {phase === "importing" && (
        <div className="p-8" style={cardStyle}>
          <div className="flex flex-col items-center gap-5 max-w-md mx-auto">
            <svg className="w-10 h-10 animate-spin" style={{ color: "var(--blue-500)" }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div className="text-center">
              <h2 style={sectionTitle}>Importing Items...</h2>
              <p className="text-[15px] mt-1" style={{ color: "var(--grey-500)" }}>
                Please wait while your inventory items are being created.
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-full">
              <div className="flex justify-between text-[13px] mb-1.5" style={{ color: "var(--grey-600)" }}>
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div
                className="w-full h-3 overflow-hidden"
                style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: "var(--blue-500)",
                    borderRadius: "var(--radius-sm)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PHASE: DONE ═══ */}
      {phase === "done" && result && (
        <div className="space-y-6">
          {/* Summary card */}
          <div className="p-6" style={cardStyle}>
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 flex items-center justify-center flex-shrink-0"
                style={{
                  background: result.created > 0 ? "var(--green)" : "var(--red)",
                  borderRadius: "50%",
                  color: "var(--white)",
                }}
              >
                {result.created > 0 ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-[20px] font-bold" style={{ color: "var(--grey-900)" }}>
                  Import {result.created > 0 ? "Complete" : "Failed"}
                </h2>
                <div className="mt-3 flex gap-6">
                  <div>
                    <p className="text-[28px] font-bold" style={{ color: "var(--green)" }}>{result.created}</p>
                    <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Items Created</p>
                  </div>
                  <div>
                    <p className="text-[28px] font-bold" style={{ color: result.failed.length > 0 ? "var(--red)" : "var(--grey-400)" }}>
                      {result.failed.length}
                    </p>
                    <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Failed</p>
                  </div>
                  <div>
                    <p className="text-[28px] font-bold" style={{ color: "var(--grey-600)" }}>{result.total}</p>
                    <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Total Rows</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Failed items table */}
          {result.failed.length > 0 && (
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-3 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)", color: "var(--red)" }}>
                Failed Items ({result.failed.length})
              </h2>
              <div className="overflow-x-auto" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)" }}>
                <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--grey-50, #f9fafb)" }}>
                      <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--grey-600)", borderBottom: "1px solid var(--grey-200)" }}>Item</th>
                      <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--grey-600)", borderBottom: "1px solid var(--grey-200)" }}>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.failed.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--grey-100)" }}>
                        <td className="px-3 py-2 font-medium" style={{ color: "var(--grey-900)" }}>{item.name}</td>
                        <td className="px-3 py-2" style={{ color: "var(--red)" }}>{item.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/inventory"
              className="inline-flex items-center justify-center gap-2 text-white px-6 py-2.5 text-[15px] font-semibold"
              style={btnPrimary}
            >
              View Inventory
            </Link>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 text-[15px] font-semibold transition-colors duration-150"
              style={{ color: "var(--grey-600)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
