"use client";

import { useEffect, useState, useCallback } from "react";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";

interface BackupFile {
  filename: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  timestamp: string;
}

interface BackupData {
  backups: BackupFile[];
  meta: {
    clinics: number;
    users: number;
    patients: number;
    appointments: number;
    invoices: number;
    _backupSize: number;
    _timestamp: string;
  } | null;
  totalBackups: number;
  totalSize: string;
  latestBackup: BackupFile | null;
}

export default function BackupPage() {
  const [data, setData] = useState<BackupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ success?: boolean; error?: string; alerts?: string[] } | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/backup");
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const triggerBackup = async () => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await fetch("/api/super-admin/backup", { method: "POST" });
      const json = await res.json();
      setTriggerResult(json);
      fetchBackups();
    } catch {
      setTriggerResult({ error: "Network error" });
    } finally {
      setTriggering(false);
    }
  };

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb" }}>
      <SuperAdminSidebar />
      <div style={{ flex: 1, padding: "32px 40px", maxWidth: 900 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>Database Backups</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>Automated backup system with integrity monitoring</p>
          </div>
          <button
            onClick={triggerBackup}
            disabled={triggering}
            style={{
              padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: triggering ? "#9ca3af" : "#14532d", color: "#fff",
              border: "none", cursor: triggering ? "wait" : "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            {triggering ? (
              <>
                <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                Running Backup...
              </>
            ) : (
              <>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                </svg>
                Run Backup Now
              </>
            )}
          </button>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Trigger Result */}
        {triggerResult && (
          <div style={{
            padding: "16px 20px", borderRadius: 12, marginBottom: 20,
            background: triggerResult.success ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${triggerResult.success ? "#bbf7d0" : "#fecaca"}`,
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: triggerResult.success ? "#16a34a" : "#dc2626" }}>
              {triggerResult.success ? "Backup completed successfully!" : triggerResult.error || "Backup failed"}
            </p>
            {triggerResult.alerts && triggerResult.alerts.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {triggerResult.alerts.map((a, i) => (
                  <p key={i} style={{ fontSize: 13, color: "#b91c1c", margin: "4px 0" }}>{a}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>Loading backup status...</div>
        ) : !data ? (
          <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>Failed to load backup status</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", margin: 0, textTransform: "uppercase" }}>Total Backups</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: "4px 0 0" }}>{data.totalBackups}</p>
              </div>
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", margin: 0, textTransform: "uppercase" }}>Storage Used</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: "4px 0 0" }}>{data.totalSize}</p>
              </div>
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", margin: 0, textTransform: "uppercase" }}>Last Backup</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: data.latestBackup ? "#059669" : "#dc2626", margin: "4px 0 0" }}>
                  {data.latestBackup ? timeSince(data.latestBackup.createdAt) : "Never"}
                </p>
              </div>
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", margin: 0, textTransform: "uppercase" }}>Integrity</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: "#059669", margin: "4px 0 0" }}>
                  {data.meta ? "Passed" : "N/A"}
                </p>
              </div>
            </div>

            {/* Data Snapshot */}
            {data.meta && (
              <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #e5e7eb", marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Latest Data Snapshot</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                  {[
                    { label: "Clinics", value: data.meta.clinics, color: "#2d6a4f" },
                    { label: "Users", value: data.meta.users, color: "#0284c7" },
                    { label: "Patients", value: data.meta.patients, color: "#7c3aed" },
                    { label: "Appointments", value: data.meta.appointments, color: "#ea580c" },
                    { label: "Invoices", value: data.meta.invoices, color: "#dc2626" },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: "center", padding: "16px 8px", background: "#f9fafb", borderRadius: 10 }}>
                      <p style={{ fontSize: 24, fontWeight: 800, color: item.color, margin: 0 }}>{item.value?.toLocaleString()}</p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0", fontWeight: 500 }}>{item.label}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "12px 0 0", textAlign: "right" }}>
                  Last checked: {data.meta._timestamp ? new Date(data.meta._timestamp).toLocaleString("en-SG") : "N/A"}
                </p>
              </div>
            )}

            {/* Backup History */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Backup History</h3>
              {data.backups.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
                  <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                  </svg>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>No backups yet</p>
                  <p style={{ fontSize: 13 }}>Click &quot;Run Backup Now&quot; to create your first backup</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Backup File</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Size</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Created</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.backups.map((backup, i) => (
                      <tr key={backup.filename} style={{ borderBottom: "1px solid #f3f4f6", background: i === 0 ? "#f0fdf4" : "transparent" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <svg width="16" height="16" fill="none" stroke={i === 0 ? "#059669" : "#9ca3af"} viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                            </svg>
                            <span style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: "#374151", fontFamily: "monospace" }}>{backup.filename}</span>
                            {i === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#dcfce7", padding: "2px 6px", borderRadius: 4 }}>LATEST</span>}
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{backup.sizeFormatted}</td>
                        <td style={{ padding: "12px 14px", fontSize: 13, color: "#6b7280" }}>
                          {new Date(backup.createdAt).toLocaleString("en-SG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td style={{ padding: "12px 14px", fontSize: 13, color: "#6b7280" }}>{timeSince(backup.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Setup Guide */}
            <div style={{ background: "#fffbeb", borderRadius: 14, padding: 24, border: "1px solid #fde68a", marginTop: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#92400e", margin: "0 0 8px" }}>Automated Daily Backup Setup</h3>
              <p style={{ fontSize: 13, color: "#a16207", margin: "0 0 12px" }}>
                Set up a free cron service to run daily backups automatically:
              </p>
              <div style={{ background: "#fff", borderRadius: 8, padding: 14, fontFamily: "monospace", fontSize: 12, color: "#374151", wordBreak: "break-all" }}>
                <strong>URL:</strong> https://www.ayurgate.com/api/cron/backup?secret={"{CRON_SECRET}"}<br />
                <strong>Method:</strong> GET<br />
                <strong>Schedule:</strong> Daily at 2:00 AM SGT<br />
                <strong>Service:</strong> <a href="https://cron-job.org" target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>cron-job.org</a> (free) or <a href="https://easycron.com" target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>EasyCron</a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
