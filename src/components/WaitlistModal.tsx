"use client";

import { useEffect, useState, useCallback } from "react";
import { cardStyle, btnPrimary, inputStyle } from "@/lib/styles";

interface WaitlistEntry {
  id: string; patientName: string; patientPhone: string; patientEmail: string | null;
  doctorId: string | null; doctorName: string | null;
  preferredDate: string | null; preferredTime: string | null;
  treatmentName: string | null; reason: string | null;
  priority: number; status: string; notifiedAt: string | null;
  notes: string | null; createdAt: string;
}

interface Stats { waiting: number; notified: number; booked: number; total: number }

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  waiting: { bg: "#fef3c7", color: "#d97706" },
  notified: { bg: "#dbeafe", color: "#2563eb" },
  booked: { bg: "#d1fae5", color: "#059669" },
  expired: { bg: "#f3f4f6", color: "#6b7280" },
  cancelled: { bg: "#fee2e2", color: "#dc2626" },
};

const PRIORITY_LABELS = ["Normal", "High", "Urgent"];
const PRIORITY_COLORS = ["#6b7280", "#f59e0b", "#dc2626"];

function fmtDate(d: string | null) { if (!d) return "Any date"; return new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }); }
function fmtDateTime(d: string) { return new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }

export default function WaitlistModal({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ waiting: 0, notified: 0, booked: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("waiting");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patientName: "", patientPhone: "", patientEmail: "", doctorName: "", preferredDate: "", preferredTime: "", treatmentName: "", reason: "", priority: 0, notes: "" });
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      const r = await fetch(`/api/waitlist?${params}`);
      if (r.ok) {
        const data = await r.json();
        setEntries(data.entries);
        setStats(data.stats);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close on ESC
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function addToWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientName || !form.patientPhone) return;
    setSaving(true);
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        setShowAdd(false);
        setForm({ patientName: "", patientPhone: "", patientEmail: "", doctorName: "", preferredDate: "", preferredTime: "", treatmentName: "", reason: "", priority: 0, notes: "" });
        fetchData();
      }
    } catch { /* */ }
    finally { setSaving(false); }
  }

  async function doAction(id: string, action: string) {
    setActionLoading(id);
    try {
      await fetch("/api/waitlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      fetchData();
    } catch { /* */ }
    finally { setActionLoading(null); }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 270,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        animation: "waitlistOverlayIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, calc(100vw - 32px))",
          maxHeight: "90vh",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          animation: "waitlistCardIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--grey-200)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>
              📋 Waitlist
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            <button
              onClick={() => setShowAdd((v) => !v)}
              style={{ ...btnPrimary, padding: "5px 10px", fontSize: 11, whiteSpace: "nowrap" }}
            >
              {showAdd ? "× Cancel" : "+ Add"}
            </button>
            <button
              onClick={onClose}
              style={{ border: "none", background: "transparent", fontSize: 20, color: "#6b7280", cursor: "pointer", padding: 2, lineHeight: 1 }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "14px 20px", flex: 1 }}>
          {loading ? (
            <div style={{ minHeight: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "#6b7280", fontSize: 13 }}>Loading waitlist...</p>
            </div>
          ) : (
            <>
              {/* Stats — auto-fit so narrow viewports wrap to 2 or 1 columns */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Waiting", value: stats.waiting, color: "#d97706", bg: "#fef3c7" },
                  { label: "Notified", value: stats.notified, color: "#2563eb", bg: "#dbeafe" },
                  { label: "Booked", value: stats.booked, color: "#059669", bg: "#d1fae5" },
                ].map(s => (
                  <div key={s.label} style={{ ...cardStyle, padding: 10, textAlign: "center", background: s.bg }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                    <p style={{ fontSize: 10, color: "#6b7280", margin: "2px 0 0" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Filter Tabs */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {["waiting", "notified", "booked", "all"].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{
                      padding: "4px 10px", fontSize: 12, fontWeight: filter === f ? 700 : 500, borderRadius: 6, cursor: "pointer",
                      border: filter === f ? "1.5px solid #14532d" : "1.5px solid #e5e7eb",
                      background: filter === f ? "#f0fdf4" : "#fff",
                      color: filter === f ? "#14532d" : "#6b7280",
                    }}>
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Add Form */}
              {showAdd && (
                <div style={{ ...cardStyle, padding: 14, marginBottom: 14, border: "1.5px solid #bbf7d0", background: "#fafff9" }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#14532d", margin: "0 0 10px" }}>Add Patient to Waitlist</h3>
                  <form onSubmit={addToWaitlist}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Patient Name *</label>
                        <input value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })}
                          style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} placeholder="Full name" required />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Phone *</label>
                        <input value={form.patientPhone} onChange={e => setForm({ ...form, patientPhone: e.target.value })}
                          style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} placeholder="Phone number" required />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Email</label>
                        <input value={form.patientEmail} onChange={e => setForm({ ...form, patientEmail: e.target.value })}
                          style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} placeholder="Optional" type="email" />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Preferred Doctor</label>
                        <input value={form.doctorName} onChange={e => setForm({ ...form, doctorName: e.target.value })}
                          style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} placeholder="Any doctor" />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Preferred Date</label>
                        <input type="date" value={form.preferredDate} onChange={e => setForm({ ...form, preferredDate: e.target.value })}
                          style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Preferred Time</label>
                        <select value={form.preferredTime} onChange={e => setForm({ ...form, preferredTime: e.target.value })} style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }}>
                          <option value="">Any time</option>
                          <option value="morning">Morning (9-12)</option>
                          <option value="afternoon">Afternoon (12-3)</option>
                          <option value="evening">Evening (3-6)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Treatment</label>
                        <input value={form.treatmentName} onChange={e => setForm({ ...form, treatmentName: e.target.value })}
                          style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} placeholder="Optional" />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Priority</label>
                        <select value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }}>
                          <option value={0}>Normal</option>
                          <option value={1}>High</option>
                          <option value={2}>Urgent</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Reason / Notes</label>
                      <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                        style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} placeholder="Why they need to be seen" />
                    </div>
                    <button type="submit" disabled={saving} style={{ ...btnPrimary, padding: "6px 14px", fontSize: 12, opacity: saving ? 0.6 : 1 }}>
                      {saving ? "Adding..." : "Add to Waitlist"}
                    </button>
                  </form>
                </div>
              )}

              {/* Entries List */}
              {entries.length === 0 ? (
                <div style={{ ...cardStyle, padding: 24, textAlign: "center" }}>
                  <p style={{ fontSize: 28, marginBottom: 4 }}>📋</p>
                  <p style={{ color: "#6b7280", fontSize: 13 }}>No patients on the waitlist</p>
                </div>
              ) : (
                entries.map(entry => {
                  const sc = STATUS_COLORS[entry.status] || STATUS_COLORS.waiting;
                  return (
                    <div key={entry.id} style={{ ...cardStyle, padding: 12, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{entry.patientName}</span>
                            {entry.priority > 0 && (
                              <span style={{ display: "inline-block", padding: "1px 6px", fontSize: 9, fontWeight: 700, borderRadius: 20, background: entry.priority === 2 ? "#fee2e2" : "#fef3c7", color: PRIORITY_COLORS[entry.priority] }}>
                                {PRIORITY_LABELS[entry.priority]}
                              </span>
                            )}
                            <span style={{ display: "inline-block", padding: "1px 6px", fontSize: 9, fontWeight: 700, borderRadius: 20, background: sc.bg, color: sc.color, textTransform: "uppercase" }}>
                              {entry.status}
                            </span>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#6b7280" }}>
                            <span>📞 {entry.patientPhone}</span>
                            {entry.doctorName && <span>👨‍⚕️ Dr. {entry.doctorName}</span>}
                            <span>📅 {fmtDate(entry.preferredDate)}</span>
                            {entry.preferredTime && <span>🕐 {entry.preferredTime}</span>}
                            {entry.treatmentName && <span>💊 {entry.treatmentName}</span>}
                          </div>
                          {entry.reason && <p style={{ fontSize: 11, color: "#9ca3af", margin: "3px 0 0" }}>{entry.reason}</p>}
                          {entry.notifiedAt && <p style={{ fontSize: 10, color: "#2563eb", margin: "3px 0 0" }}>Notified: {fmtDateTime(entry.notifiedAt)}</p>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {entry.status === "waiting" && (
                            <>
                              <button onClick={() => doAction(entry.id, "notify")} disabled={actionLoading === entry.id}
                                style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, borderRadius: 4, border: "1px solid #2563eb", background: "#eff6ff", color: "#2563eb", cursor: "pointer" }}>
                                Notify
                              </button>
                              <button onClick={() => doAction(entry.id, "book")} disabled={actionLoading === entry.id}
                                style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, borderRadius: 4, border: "1px solid #059669", background: "#ecfdf5", color: "#059669", cursor: "pointer" }}>
                                Booked
                              </button>
                            </>
                          )}
                          {entry.status === "notified" && (
                            <button onClick={() => doAction(entry.id, "book")} disabled={actionLoading === entry.id}
                              style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, borderRadius: 4, border: "1px solid #059669", background: "#ecfdf5", color: "#059669", cursor: "pointer" }}>
                              Booked
                            </button>
                          )}
                          {(entry.status === "waiting" || entry.status === "notified") && (
                            <button onClick={() => doAction(entry.id, "cancel")} disabled={actionLoading === entry.id}
                              style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", color: "#dc2626", cursor: "pointer" }}>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize: 9, color: "#d1d5db", margin: "5px 0 0" }}>Added: {fmtDateTime(entry.createdAt)}</p>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        <style>{`
          @keyframes waitlistOverlayIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes waitlistCardIn {
            from { opacity: 0; transform: translateY(30px) scale(0.94) }
            to { opacity: 1; transform: translateY(0) scale(1) }
          }
        `}</style>
      </div>
    </div>
  );
}
