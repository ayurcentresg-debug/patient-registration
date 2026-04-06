"use client";

import { useState, useRef } from "react";
import Link from "next/link";

/* ─── Types ─── */
interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  errors: string[];
}

type ImportType = "patients" | "treatments" | "medicines" | "staff";

const IMPORT_TYPES: { key: ImportType; label: string; desc: string; icon: string; templateUrl: string; apiUrl: string; arrayKey: string; color: string }[] = [
  {
    key: "patients",
    label: "Patients",
    desc: "Import patient records with contact, medical history, and demographics",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    templateUrl: "/api/patients/import",
    apiUrl: "/api/patients/import",
    arrayKey: "patients",
    color: "#2d6a4f",
  },
  {
    key: "treatments",
    label: "Treatments & Services",
    desc: "Import consultation types, therapies, and treatment services",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    templateUrl: "/api/treatments/import",
    apiUrl: "/api/treatments/import",
    arrayKey: "treatments",
    color: "#7c3aed",
  },
  {
    key: "medicines",
    label: "Medicines & Inventory",
    desc: "Import medicines, herbs, oils, and consumables with stock levels",
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    templateUrl: "/api/inventory/import/template",
    apiUrl: "/api/inventory/import",
    arrayKey: "items",
    color: "#d97706",
  },
  {
    key: "staff",
    label: "Staff & Doctors",
    desc: "Import doctors, therapists, receptionists, and other staff members",
    icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
    templateUrl: "/admin/staff",
    apiUrl: "/admin/staff",
    arrayKey: "staff",
    color: "#0284c7",
  },
];

/* ─── CSV Parser ─── */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.every((v) => !v.trim())) continue; // skip empty rows
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h.trim()] = (values[j] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/* ─── Main Page ─── */
export default function ImportPage() {
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const config = IMPORT_TYPES.find((t) => t.key === selectedType);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setResult(null);
    setError("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setError("No data rows found in CSV file");
          return;
        }
        setPreview(rows.slice(0, 5)); // Show first 5 rows
      } catch {
        setError("Failed to parse CSV file");
      }
    };
    reader.readAsText(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === "text/csv" || f.name.endsWith(".csv"))) {
      handleFileSelect(f);
    } else {
      setError("Please upload a .csv file");
    }
  };

  const handleImport = async () => {
    if (!file || !config) return;
    setImporting(true);
    setError("");
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      const res = await fetch(config.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [config.arrayKey]: rows }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error during import");
    }
    setImporting(false);
  };

  const resetImport = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: "#111827" }}>Data Import</h1>
          <p className="text-[14px] mt-1" style={{ color: "#6b7280" }}>
            Import patients, treatments, medicines, or staff from CSV files
          </p>
        </div>
        <Link href="/admin" className="px-4 py-2 rounded-lg text-[13px] font-medium" style={{ color: "#6b7280", border: "1px solid #e5e7eb" }}>
          Back to Admin
        </Link>
      </div>

      {/* ═══ Step 1: Select Type ═══ */}
      {!selectedType && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {IMPORT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                if (t.key === "staff") { window.location.href = "/admin/staff"; return; }
                setSelectedType(t.key);
              }}
              className="rounded-xl p-5 text-left transition-all hover:shadow-lg group"
              style={{ border: "1.5px solid #e5e7eb", background: "white" }}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${t.color}15` }}>
                  <svg className="w-5 h-5" fill="none" stroke={t.color} viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[15px] font-bold" style={{ color: "#111827" }}>{t.label}</h3>
                  <p className="text-[13px] mt-1" style={{ color: "#6b7280" }}>{t.desc}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[12px] font-medium" style={{ color: t.color }}>
                <span>Select</span>
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ═══ Step 2: Upload & Import ═══ */}
      {selectedType && config && (
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => { setSelectedType(null); resetImport(); }} className="text-[13px] font-medium hover:underline" style={{ color: "#2d6a4f" }}>
              Import
            </button>
            <svg className="w-3 h-3" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <span className="text-[13px] font-medium" style={{ color: "#374151" }}>{config.label}</span>
          </div>

          {/* Template download */}
          <div className="rounded-xl p-4 mb-5 flex items-center justify-between" style={{ background: "#f0fdf4", border: "1px solid #d1fae5" }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">📄</span>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "#065f46" }}>Download CSV template</p>
                <p className="text-[12px]" style={{ color: "#047857" }}>Use our template to format your data correctly</p>
              </div>
            </div>
            <a
              href={config.templateUrl}
              download
              className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white"
              style={{ background: config.color }}
            >
              Download Template
            </a>
          </div>

          {/* File upload */}
          {!result && (
            <div
              className="rounded-xl p-10 text-center transition-all cursor-pointer"
              style={{
                border: `2px dashed ${dragOver ? config.color : "#d1d5db"}`,
                background: dragOver ? `${config.color}08` : "#fafafa",
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
              />
              <svg className="w-10 h-10 mx-auto mb-3" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {file ? (
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "#111827" }}>{file.name}</p>
                  <p className="text-[12px] mt-1" style={{ color: "#6b7280" }}>{(file.size / 1024).toFixed(1)} KB · {preview.length > 0 ? `${preview.length}+ rows detected` : "parsing..."}</p>
                </div>
              ) : (
                <div>
                  <p className="text-[14px] font-medium" style={{ color: "#374151" }}>
                    Drag & drop your CSV file here, or <span style={{ color: config.color }}>browse</span>
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: "#9ca3af" }}>Accepts .csv files up to 500 rows</p>
                </div>
              )}
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && !result && (
            <div className="mt-5 rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <p className="text-[13px] font-semibold" style={{ color: "#374151" }}>
                  Preview (first {preview.length} rows)
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={resetImport} className="text-[12px] font-medium hover:underline" style={{ color: "#6b7280" }}>
                    Change file
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th className="px-3 py-2 text-left font-semibold" style={{ color: "#6b7280" }}>#</th>
                      {Object.keys(preview[0]).slice(0, 8).map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: "#6b7280" }}>{h}</th>
                      ))}
                      {Object.keys(preview[0]).length > 8 && (
                        <th className="px-3 py-2 text-left font-semibold" style={{ color: "#9ca3af" }}>+{Object.keys(preview[0]).length - 8} more</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                        <td className="px-3 py-2 font-medium" style={{ color: "#9ca3af" }}>{i + 1}</td>
                        {Object.values(row).slice(0, 8).map((v, j) => (
                          <td key={j} className="px-3 py-2 max-w-[150px] truncate" style={{ color: "#374151" }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-lg text-[13px] font-medium" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
              {error}
            </div>
          )}

          {/* Import button */}
          {file && !result && (
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={handleImport}
                disabled={importing || preview.length === 0}
                className="px-6 py-2.5 rounded-lg text-white text-[14px] font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: config.color }}
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
                    Importing...
                  </span>
                ) : (
                  `Import ${config.label}`
                )}
              </button>
              <button onClick={resetImport} className="px-4 py-2.5 rounded-lg text-[13px] font-medium" style={{ color: "#6b7280", border: "1px solid #e5e7eb" }}>
                Cancel
              </button>
            </div>
          )}

          {/* ═══ Results ═══ */}
          {result && (
            <div className="mt-5 rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
              <div className="p-5" style={{ background: result.imported > 0 ? "#f0fdf4" : "#fef2f2" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: result.imported > 0 ? "#d1fae5" : "#fecaca" }}>
                    {result.imported > 0 ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 10L8.5 13.5L15 6.5" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 14L14 6M6 6l8 8" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" /></svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold" style={{ color: result.imported > 0 ? "#065f46" : "#991b1b" }}>
                      {result.imported > 0 ? "Import Complete" : "Import Failed"}
                    </h3>
                    <p className="text-[13px]" style={{ color: result.imported > 0 ? "#047857" : "#b91c1c" }}>
                      {result.imported} imported, {result.skipped} skipped out of {result.total} rows
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg p-3 text-center" style={{ background: "white", border: "1px solid #e5e7eb" }}>
                    <p className="text-[20px] font-bold" style={{ color: "#059669" }}>{result.imported}</p>
                    <p className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Imported</p>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ background: "white", border: "1px solid #e5e7eb" }}>
                    <p className="text-[20px] font-bold" style={{ color: "#d97706" }}>{result.skipped}</p>
                    <p className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Skipped</p>
                  </div>
                  <div className="rounded-lg p-3 text-center" style={{ background: "white", border: "1px solid #e5e7eb" }}>
                    <p className="text-[20px] font-bold" style={{ color: "#374151" }}>{result.total}</p>
                    <p className="text-[11px] font-medium" style={{ color: "#6b7280" }}>Total</p>
                  </div>
                </div>

                {/* Errors */}
                {result.errors.length > 0 && (
                  <div className="mt-3 rounded-lg p-3" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                    <p className="text-[12px] font-semibold mb-1" style={{ color: "#b91c1c" }}>Errors:</p>
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-[11px]" style={{ color: "#991b1b" }}>{e}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 py-3 flex gap-3" style={{ background: "white", borderTop: "1px solid #e5e7eb" }}>
                <button onClick={() => { resetImport(); }} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white" style={{ background: config.color }}>
                  Import More
                </button>
                <button onClick={() => setSelectedType(null)} className="px-4 py-2 rounded-lg text-[13px] font-medium" style={{ color: "#6b7280", border: "1px solid #e5e7eb" }}>
                  Back to Import Types
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
