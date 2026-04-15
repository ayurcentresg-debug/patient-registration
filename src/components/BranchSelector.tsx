"use client";

/**
 * BranchSelector — header dropdown for clinics with multiple branches.
 *
 * Hidden when the clinic has 0 or 1 branches (no point picking from one).
 * Selection persists per-tab via useSelectedBranch (localStorage + event bus).
 */

import { useEffect, useRef, useState } from "react";
import { getSelectedBranchId, setSelectedBranchId } from "@/lib/use-selected-branch";

interface Branch {
  id: string;
  name: string;
  code: string;
  isMainBranch?: boolean;
  isActive?: boolean;
}

export default function BranchSelector() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/branches?active=true")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Branch[]) => {
        if (Array.isArray(data)) setBranches(data);
      })
      .catch(() => {});
    setSelectedId(getSelectedBranchId());
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Hide entirely only when there are zero branches (clinic not yet set up).
  // With 1 branch we still show the pill so admins can see their current
  // branch context and discover the "Add branch" action.
  if (branches.length === 0) return null;

  const selected = branches.find((b) => b.id === selectedId);
  const label = branches.length === 1
    ? (branches[0].name)
    : (selected ? selected.name : "All branches");

  function pick(id: string | null) {
    setSelectedId(id);
    setSelectedBranchId(id);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          backgroundColor: open ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 16,
          fontSize: 12,
          fontWeight: 600,
          maxWidth: 200,
          minWidth: 120,
          transition: "background 0.15s",
        }}
        title="Switch branch"
      >
        <svg style={{ width: 13, height: 13, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
        <svg style={{ width: 12, height: 12, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 220,
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
            border: "1px solid #e5e7eb",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {branches.length > 1 ? "Switch branch" : "Your branch"}
          </div>
          {branches.length > 1 && (
            <>
              <button
                onClick={() => pick(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "8px 14px",
                  border: "none",
                  background: selectedId === null ? "#f0fdf4" : "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#111",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => { if (selectedId !== null) e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={(e) => { if (selectedId !== null) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontWeight: 600 }}>All branches</span>
                {selectedId === null && (
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div style={{ height: 1, background: "#e5e7eb", margin: "2px 0" }} />
            </>
          )}
          {branches.map((b) => {
            const active = selectedId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => pick(b.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  width: "100%",
                  padding: "8px 14px",
                  border: "none",
                  background: active ? "#f0fdf4" : "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#111",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {b.name}
                    {b.isMainBranch && (
                      <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#92400e", background: "#fef3c7", padding: "1px 6px", borderRadius: 999 }}>
                        Main
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{b.code}</div>
                </span>
                {active && (
                  <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
          <div style={{ height: 1, background: "#e5e7eb", margin: "2px 0" }} />
          <a
            href="/admin/branches"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#14532d",
              fontWeight: 600,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f0fdf4"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {branches.length === 1 ? "Add branch" : "Manage branches"}
          </a>
        </div>
      )}
    </div>
  );
}
