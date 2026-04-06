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

export default function WaitlistPage() {
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

  if (loading) {
    return <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#6b7280" }}>Loading waitlist...</p></div>;
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: 0 }}>Waitlist</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>Manage patients waiting for available slots</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ ...btnPrimary, padding: "10px 20px", fontSize: 13 }}>
          + Add to Waitlist
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Waiting", value: stats.waiting, color: "#d97706", bg: "#fef3c7" },
          { label: "Notified", value: stats.notified, color: "#2563eb", bg: "#dbeafe" },
          { label: "Booked", value: stats.booked, color: "#059669", bg: "#d1fae5" },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, padding: 16, textAlign: "center" }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["waiting", "notified", "booked", "all"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: "6px 16px", fontSize: 13, fontWeight: filter === f ? 700 : 500, borderRadius: 8, cursor: "pointer",
              border: filter === f ? "1.5px solid #14532d" : "1.5px solid #e5e7eb",
              background: filter === f ? "#f0fdf4" : "#fff",
              color: filter === f ? "#14532d" : "#6b7280",
            }}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Add Form Modal */}
      {showAdd && (
        <div style={{ ...cardStyle, padding: 24, marginBottom: 20, border: "1.5px solid #bbf7d0", background: "#fafff9" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#14532d", margin: "0 0 16px" }}>Add Patient to Waitlist</h3>
          <form onSubmit={addToWaitlist}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Patient Name *</label>
                <input value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })}
                  style={inputStyle} placeholder="Full name" required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Phone *</label>
                <input value={form.patientPhone} onChange={e => setForm({ ...form, patientPhone: e.target.value })}
                  style={inputStyle} placeholder="Phone number" required />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Email</label>
                <input value={form.patientEmail} onChange={e => setForm({ ...form, patientEmail: e.target.value })}
                  style={inputStyle} placeholder="Optional" type="email" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Preferred Doctor</label>
                <input value={form.doctorName} onChange={e => setForm({ ...form, doctorName: e.target.value })}
                  style={inputStyle} placeholder="Any doctor" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Preferred Date</label>
                <input type="date" value={form.preferredDate} onChange={e => setForm({ ...form, preferredDate: e.target.value })}
                  style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Preferred Time</label>
                <select value={form.preferredTime} onChange={e => setForm({ ...form, preferredTime: e.target.value })} style={inputStyle}>
                  <option value="">Any time</option>
                  <option value="morning">Morning (9-12)</option>
                  <option value="afternoon">Afternoon (12-3)</option>
                  <option value="evening">Evening (3-6)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Treatment</label>
                <input value={form.treatmentName} onChange={e => setForm({ ...form, treatmentName: e.target.value })}
                  style={inputStyle} placeholder="Optional" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} style={inputStyle}>
                  <option value={0}>Normal</option>
                  <option value={1}>High</option>
                  <option value={2}>Urgent</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Reason / Notes</label>
              <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                style={inputStyle} placeholder="Why they need to be seen" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving} style={{ ...btnPrimary, padding: "8px 20px", fontSize: 13, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Adding..." : "Add to Waitlist"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                style={{ padding: "8px 20px", fontSize: 13, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Entries List */}
      {entries.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>📋</p>
          <p style={{ color: "#6b7280", fontSize: 15 }}>No patients on the waitlist</p>
        </div>
      ) : (
        entries.map(entry => {
          const sc = STATUS_COLORS[entry.status] || STATUS_COLORS.waiting;
          return (
            <div key={entry.id} style={{ ...cardStyle, padding: 18, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{entry.patientName}</span>
                    {entry.priority > 0 && (
                      <span style={{ display: "inline-block", padding: "2px 8px", fontSize: 10, fontWeight: 700, borderRadius: 20, background: entry.priority === 2 ? "#fee2e2" : "#fef3c7", color: PRIORITY_COLORS[entry.priority] }}>
                        {PRIORITY_LABELS[entry.priority]}
                      </span>
                    )}
                    <span style={{ display: "inline-block", padding: "2px 8px", fontSize: 10, fontWeight: 700, borderRadius: 20, background: sc.bg, color: sc.color, textTransform: "uppercase" }}>
                      {entry.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#6b7280" }}>
                    <span>📞 {entry.patientPhone}</span>
                    {entry.doctorName && <span>👨‍⚕️ Dr. {entry.doctorName}</span>}
                    <span>📅 {fmtDate(entry.preferredDate)}</span>
                    {entry.preferredTime && <span>🕐 {entry.preferredTime}</span>}
                    {entry.treatmentName && <span>💊 {entry.treatmentName}</span>}
                  </div>
                  {entry.reason && <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>{entry.reason}</p>}
                  {entry.notifiedAt && <p style={{ fontSize: 11, color: "#2563eb", margin: "4px 0 0" }}>Notified: {fmtDateTime(entry.notifiedAt)}</p>}
                </div>
                <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                  {entry.status === "waiting" && (
                    <>
                      <button onClick={() => doAction(entry.id, "notify")} disabled={actionLoading === entry.id}
                        style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "1px solid #2563eb", background: "#eff6ff", color: "#2563eb", cursor: "pointer" }}>
                        Notify
                      </button>
                      <button onClick={() => doAction(entry.id, "book")} disabled={actionLoading === entry.id}
                        style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "1px solid #059669", background: "#ecfdf5", color: "#059669", cursor: "pointer" }}>
                        Booked
                      </button>
                    </>
                  )}
                  {entry.status === "notified" && (
                    <button onClick={() => doAction(entry.id, "book")} disabled={actionLoading === entry.id}
                      style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "1px solid #059669", background: "#ecfdf5", color: "#059669", cursor: "pointer" }}>
                      Booked
                    </button>
                  )}
                  {(entry.status === "waiting" || entry.status === "notified") && (
                    <button onClick={() => doAction(entry.id, "cancel")} disabled={actionLoading === entry.id}
                      style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", color: "#dc2626", cursor: "pointer" }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 10, color: "#d1d5db", margin: "6px 0 0" }}>Added: {fmtDateTime(entry.createdAt)}</p>
            </div>
          );
        })
      )}
    </div>
  );
}
