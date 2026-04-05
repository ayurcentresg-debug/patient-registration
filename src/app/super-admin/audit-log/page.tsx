"use client";

import { useEffect, useState, useCallback } from "react";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  entityName: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  login:             { label: "Login",           color: "#059669", bg: "#ecfdf5", icon: "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" },
  login_failed:      { label: "Login Failed",    color: "#dc2626", bg: "#fef2f2", icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" },
  extend_trial:      { label: "Extend Trial",    color: "#2563eb", bg: "#eff6ff", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
  change_plan:       { label: "Change Plan",     color: "#7c3aed", bg: "#f5f3ff", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
  toggle_active:     { label: "Toggle Active",   color: "#ea580c", bg: "#fff7ed", icon: "M5.636 5.636a9 9 0 1012.728 0M12 3v9" },
  reset_password:    { label: "Reset Password",  color: "#dc2626", bg: "#fef2f2", icon: "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" },
  update_notes:      { label: "Update Notes",    color: "#6b7280", bg: "#f3f4f6", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" },
  send_notification: { label: "Send Notification", color: "#0891b2", bg: "#ecfeff", icon: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" },
  send_marketing:    { label: "Send Marketing",  color: "#a855f7", bg: "#faf5ff", icon: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" },
};

const DEFAULT_CONFIG = { label: "Action", color: "#6b7280", bg: "#f3f4f6", icon: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" };

function formatDetails(details: Record<string, unknown> | null, action: string): string {
  if (!details) return "";
  if (action === "extend_trial") return `Extended by ${details.days} days`;
  if (action === "change_plan") return `${details.from || "none"} → ${details.to}`;
  if (action === "toggle_active") return details.isActive ? "Activated" : "Deactivated";
  if (action === "reset_password") return `User: ${details.userEmail || "unknown"}`;
  if (action === "send_notification") return `"${details.subject}" to ${details.total} clinics (${details.sent} sent)`;
  if (action === "send_marketing") return `"${details.subject}" to ${details.total} recipients`;
  if (action === "login_failed") return `Email: ${details.email}`;
  if (action === "login") return `IP: ${details.ip || "unknown"}`;
  return Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(", ");
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState<{ actions: string[]; entities: string[] }>({ actions: [], entities: [] });
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filterAction) params.set("action", filterAction);
      if (filterEntity) params.set("entity", filterEntity);
      if (search) params.set("search", search);

      const res = await fetch(`/api/super-admin/audit-log?${params}`);
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
        setPagination(data.pagination);
        setFilters(data.filters);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterEntity, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function handleFilterChange(action: string, entity: string) {
    setFilterAction(action);
    setFilterEntity(entity);
    setPage(1);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar />

      <div style={{ flex: 1, background: "#f9fafb", overflow: "auto" }}>
        {/* Header */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Audit Log</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
              {pagination.total} total actions recorded
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#ecfdf5", color: "#059669", border: "1px solid #bbf7d0" }}>
              Live Tracking
            </span>
          </div>
        </div>

        <div style={{ padding: "24px 32px" }}>
          {/* Filters Bar */}
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "16px 20px",
            marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            {/* Search */}
            <div style={{ flex: "1 1 240px" }}>
              <input
                type="text"
                placeholder="Search by name, action, details..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{
                  width: "100%", padding: "9px 14px", fontSize: 13, borderRadius: 8,
                  border: "1.5px solid #e5e7eb", background: "#fafafa", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Action Filter */}
            <select
              value={filterAction}
              onChange={(e) => handleFilterChange(e.target.value, filterEntity)}
              style={{
                padding: "9px 12px", fontSize: 13, borderRadius: 8,
                border: "1.5px solid #e5e7eb", background: "#fafafa", outline: "none",
                color: filterAction ? "#111827" : "#9ca3af", cursor: "pointer",
              }}
            >
              <option value="">All Actions</option>
              {filters.actions.map((a) => (
                <option key={a} value={a}>{ACTION_CONFIG[a]?.label || a}</option>
              ))}
            </select>

            {/* Entity Filter */}
            <select
              value={filterEntity}
              onChange={(e) => handleFilterChange(filterAction, e.target.value)}
              style={{
                padding: "9px 12px", fontSize: 13, borderRadius: 8,
                border: "1.5px solid #e5e7eb", background: "#fafafa", outline: "none",
                color: filterEntity ? "#111827" : "#9ca3af", cursor: "pointer",
              }}
            >
              <option value="">All Entities</option>
              {filters.entities.map((e) => (
                <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
              ))}
            </select>

            {/* Clear */}
            {(filterAction || filterEntity || search) && (
              <button
                onClick={() => { setFilterAction(""); setFilterEntity(""); setSearch(""); setPage(1); }}
                style={{
                  padding: "9px 14px", fontSize: 13, fontWeight: 600, borderRadius: 8,
                  border: "none", background: "#f3f4f6", color: "#6b7280", cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Audit Log Table */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["", "Action", "Target", "Details", "IP Address", "Timestamp"].map((h) => (
                    <th key={h} style={{
                      padding: "11px 16px", textAlign: "left", fontWeight: 600,
                      color: "#6b7280", fontSize: 11, textTransform: "uppercase",
                      letterSpacing: "0.5px", borderBottom: "1px solid #e5e7eb",
                      whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No audit entries found</td></tr>
                ) : (
                  logs.map((log, i) => {
                    const config = ACTION_CONFIG[log.action] || DEFAULT_CONFIG;
                    const isFailure = log.action === "login_failed";
                    return (
                      <tr key={log.id} style={{
                        borderBottom: i < logs.length - 1 ? "1px solid #f3f4f6" : "none",
                        background: isFailure ? "#fef2f210" : "transparent",
                      }}>
                        {/* Icon */}
                        <td style={{ padding: "12px 8px 12px 16px", width: 40 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, background: config.bg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                            </svg>
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                            background: config.bg, color: config.color, whiteSpace: "nowrap",
                          }}>
                            {config.label}
                          </span>
                        </td>

                        {/* Target */}
                        <td style={{ padding: "12px 16px" }}>
                          {log.entityName ? (
                            <div>
                              <div style={{ fontWeight: 600, color: "#111827" }}>
                                {log.entityId ? (
                                  <a href={`/super-admin/clinics/${log.entityId}`} style={{ color: "#111827", textDecoration: "none" }}>
                                    {log.entityName}
                                  </a>
                                ) : log.entityName}
                              </div>
                              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{log.entity}</div>
                            </div>
                          ) : (
                            <span style={{ color: "#9ca3af", textTransform: "capitalize" }}>{log.entity}</span>
                          )}
                        </td>

                        {/* Details */}
                        <td style={{ padding: "12px 16px", color: "#374151", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {formatDetails(log.details, log.action)}
                        </td>

                        {/* IP */}
                        <td style={{ padding: "12px 16px", color: "#9ca3af", fontFamily: "monospace", fontSize: 12 }}>
                          {log.ipAddress || "-"}
                        </td>

                        {/* Timestamp */}
                        <td style={{ padding: "12px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>
                          <div>{new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginTop: 16, padding: "0 4px",
            }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>
                Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, pagination.total)} of {pagination.total}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: "1px solid #e5e7eb", background: "#fff", color: page === 1 ? "#d1d5db" : "#374151",
                    cursor: page === 1 ? "default" : "pointer",
                  }}
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let p: number;
                  if (pagination.totalPages <= 5) {
                    p = i + 1;
                  } else if (page <= 3) {
                    p = i + 1;
                  } else if (page >= pagination.totalPages - 2) {
                    p = pagination.totalPages - 4 + i;
                  } else {
                    p = page - 2 + i;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        width: 36, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600,
                        border: p === page ? "1.5px solid #14532d" : "1px solid #e5e7eb",
                        background: p === page ? "#14532d" : "#fff",
                        color: p === page ? "#fff" : "#374151",
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                  disabled={page === pagination.totalPages}
                  style={{
                    padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: "1px solid #e5e7eb", background: "#fff",
                    color: page === pagination.totalPages ? "#d1d5db" : "#374151",
                    cursor: page === pagination.totalPages ? "default" : "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
