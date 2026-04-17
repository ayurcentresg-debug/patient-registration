"use client";

import { useState, useEffect, useCallback } from "react";
import { useFlash } from "@/components/FlashCardProvider";
import AdminTabs from "@/components/AdminTabs";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AuditEntry {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string | null;
  ipAddress: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const ACTION_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  create: { bg: "#ecfdf5", color: "#059669", label: "Create" },
  update: { bg: "#f0faf4", color: "#37845e", label: "Update" },
  delete: { bg: "#fef2f2", color: "#dc2626", label: "Delete" },
};

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};
const inputStyle: React.CSSProperties = {
  border: "1px solid var(--grey-400)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-900)",
  background: "var(--white)",
  fontSize: "15px",
};

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AuditLogPage() {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Expandable details
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { showFlash } = useFlash();

  useEffect(() => { setMounted(true); }, []);

  const fetchEntries = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (search) params.set("search", search);
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (entityFilter !== "all") params.set("entityType", entityFilter);
    if (userFilter) params.set("user", userFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    fetch(`/api/audit-logs?${params}`)
      .then(r => r.json())
      .then(data => {
        const arr = data.entries || data.logs || data;
        setEntries(Array.isArray(arr) ? arr : []);
        setTotalCount(data.total || data.totalCount || (Array.isArray(arr) ? arr.length : 0));
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [search, actionFilter, entityFilter, userFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    const timeout = setTimeout(fetchEntries, 300);
    return () => clearTimeout(timeout);
  }, [fetchEntries]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, actionFilter, entityFilter, userFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-56 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-16 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Audit Log</h1>
        <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
          {totalCount} entr{totalCount !== 1 ? "ies" : "y"} &middot; Track all system changes and user actions
        </p>
      </div>

      <AdminTabs />

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search audit entries..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-[15px]" style={inputStyle} />
          </div>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2 text-[15px]" style={{ ...inputStyle, minWidth: 140 }}>
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
          <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="px-3 py-2 text-[15px]" style={{ ...inputStyle, minWidth: 150 }}>
            <option value="all">All Entities</option>
            <option value="patient">Patient</option>
            <option value="appointment">Appointment</option>
            <option value="invoice">Invoice</option>
            <option value="treatment">Treatment</option>
            <option value="doctor">Doctor</option>
            <option value="user">User</option>
            <option value="branch">Branch</option>
            <option value="settings">Settings</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Filter by user..." value={userFilter} onChange={e => setUserFilter(e.target.value)} className="px-3 py-2 text-[15px]" style={{ ...inputStyle, minWidth: 180 }} />
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold" style={{ color: "var(--grey-600)" }}>From:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 text-[15px]" style={inputStyle} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold" style={{ color: "var(--grey-600)" }}>To:</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 text-[15px]" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Audit Entries */}
      {loading ? (
        <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-16 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No audit entries found</p>
          <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>Adjust your filters or check back later</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => {
            const ac = ACTION_COLORS[entry.action] || ACTION_COLORS.update;
            const isExpanded = expandedId === entry.id;
            return (
              <div key={entry.id} className="p-4 transition-shadow hover:shadow-sm" style={cardStyle}>
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  {/* Timestamp */}
                  <span className="text-[13px] font-mono flex-shrink-0 w-40" style={{ color: "var(--grey-500)" }}>
                    {formatTimestamp(entry.timestamp)}
                  </span>

                  {/* User */}
                  <span className="text-[14px] font-semibold flex-shrink-0 w-32" style={{ color: "var(--grey-800)" }}>
                    {entry.userName}
                  </span>

                  {/* Action badge */}
                  <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide rounded flex-shrink-0" style={{ background: ac.bg, color: ac.color, borderRadius: "var(--radius-sm)" }}>
                    {ac.label}
                  </span>

                  {/* Entity */}
                  <span className="text-[14px] flex-1 min-w-0" style={{ color: "var(--grey-700)" }}>
                    <span className="font-semibold capitalize">{entry.entityType}</span>
                    <span className="ml-1 font-mono text-[13px]" style={{ color: "var(--grey-500)" }}>#{entry.entityId.slice(0, 8)}</span>
                  </span>

                  {/* IP & expand */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {entry.ipAddress && (
                      <span className="text-[12px] font-mono px-2 py-0.5 rounded" style={{ background: "var(--grey-100)", color: "var(--grey-500)", borderRadius: "var(--radius-sm)" }}>
                        {entry.ipAddress}
                      </span>
                    )}
                    {entry.details && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="p-1 rounded hover:opacity-70 transition-transform"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                      >
                        <svg className="w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && entry.details && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--grey-200)" }}>
                    <pre className="text-[13px] p-3 rounded overflow-x-auto whitespace-pre-wrap" style={{ background: "var(--grey-50)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)", fontFamily: "monospace" }}>
                      {entry.details}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: "1px solid var(--grey-200)" }}>
          <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>
            Page {page} of {totalPages} &middot; {totalCount} total entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-[14px] font-semibold rounded disabled:opacity-40"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)" }}
            >
              Previous
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className="w-8 h-8 text-[14px] font-semibold rounded"
                  style={{
                    background: page === pageNum ? "var(--blue-500)" : "var(--white)",
                    color: page === pageNum ? "var(--white)" : "var(--grey-700)",
                    border: page === pageNum ? "1px solid var(--blue-500)" : "1px solid var(--grey-300)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-[14px] font-semibold rounded disabled:opacity-40"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
