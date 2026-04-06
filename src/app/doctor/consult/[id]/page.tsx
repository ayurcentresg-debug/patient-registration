"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ConsultData {
  appointment: {
    id: string; date: string; time: string; status: string; type: string;
    reason: string | null; notes: string | null; doctor: string; department: string | null;
    sessionPrice: number | null; treatmentName: string | null; packageName: string | null;
    isWalkin?: boolean; walkinName?: string; walkinPhone?: string;
  };
  patient: {
    id: string; patientIdNumber: string; firstName: string; lastName: string;
    phone: string; email: string | null; gender: string; age: number | null;
    dateOfBirth: string | null; bloodGroup: string | null; allergies: string | null;
    medicalHistory: string | null; medicalNotes: string | null; occupation: string | null; address: string | null;
  } | null;
  vitals: Array<{
    id: string; date: string; bloodPressureSys: number | null; bloodPressureDia: number | null;
    pulse: number | null; temperature: number | null; weight: number | null; height: number | null;
    bmi: number | null; oxygenSaturation: number | null; respiratoryRate: number | null; notes: string | null;
  }>;
  clinicalNotes: Array<{ id: string; type: string; title: string; content: string; doctor: string | null; createdAt: string }>;
  pastAppointments: Array<{ id: string; date: string; time: string; status: string; type: string; reason: string | null; notes: string | null; doctor: string; department: string | null }>;
  prescriptions: Array<{
    id: string; prescriptionNo: string; date: string; status: string; diagnosis: string | null; notes: string | null; doctorName: string;
    items: Array<{ medicineName: string; dosage: string; frequency: string; timing: string | null; duration: string; quantity: string | null; instructions: string | null }>;
  }>;
}

interface MedItem { medicineName: string; dosage: string; frequency: string; timing: string; duration: string; quantity: string; instructions: string }

const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const inputStyle = { width: "100%", padding: "8px 12px", fontSize: 14, borderRadius: 8, border: "1.5px solid #e5e7eb", outline: "none", background: "#fafafa", boxSizing: "border-box" as const };
const btnPrimary = { padding: "8px 20px", fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", background: "#14532d", color: "#fff", cursor: "pointer" };

function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }); }
function fmtDateTime(d: string) { return new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }

export default function ConsultPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<ConsultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"vitals" | "notes" | "prescription" | "history">("vitals");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Vitals form
  const [vitals, setVitals] = useState({ bloodPressureSys: "", bloodPressureDia: "", pulse: "", temperature: "", weight: "", height: "", oxygenSaturation: "", respiratoryRate: "", notes: "" });

  // Clinical note form
  const [note, setNote] = useState({ type: "general", title: "", content: "" });

  // Prescription form
  const [rx, setRx] = useState({ diagnosis: "", notes: "", items: [{ medicineName: "", dosage: "", frequency: "TDS", timing: "After food", duration: "", quantity: "", instructions: "" }] as MedItem[] });

  // Completion notes
  const [completionNotes, setCompletionNotes] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`/api/doctor/consult/${id}`);
      if (r.ok) {
        const d = await r.json();
        setData(d);
        if (d.appointment.notes) setCompletionNotes(d.appointment.notes);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveVitals() {
    setSaving(true);
    try {
      const r = await fetch(`/api/doctor/consult/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_vitals", vitals }),
      });
      if (r.ok) {
        showToast("Vitals saved");
        setVitals({ bloodPressureSys: "", bloodPressureDia: "", pulse: "", temperature: "", weight: "", height: "", oxygenSaturation: "", respiratoryRate: "", notes: "" });
        fetchData();
      } else { showToast("Failed to save vitals", "error"); }
    } catch { showToast("Error", "error"); }
    finally { setSaving(false); }
  }

  async function saveNote() {
    if (!note.content.trim()) { showToast("Note content is required", "error"); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/doctor/consult/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_note", note }),
      });
      if (r.ok) {
        showToast("Clinical note saved");
        setNote({ type: "general", title: "", content: "" });
        fetchData();
      } else { showToast("Failed to save note", "error"); }
    } catch { showToast("Error", "error"); }
    finally { setSaving(false); }
  }

  async function savePrescription() {
    const validItems = rx.items.filter(i => i.medicineName.trim());
    if (validItems.length === 0) { showToast("Add at least one medicine", "error"); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/doctor/consult/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_prescription", prescription: { ...rx, items: validItems } }),
      });
      if (r.ok) {
        showToast("Prescription saved");
        setRx({ diagnosis: "", notes: "", items: [{ medicineName: "", dosage: "", frequency: "TDS", timing: "After food", duration: "", quantity: "", instructions: "" }] });
        fetchData();
      } else { showToast("Failed to save prescription", "error"); }
    } catch { showToast("Error", "error"); }
    finally { setSaving(false); }
  }

  async function completeAppointment() {
    setSaving(true);
    try {
      const r = await fetch(`/api/doctor/consult/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", notes: completionNotes }),
      });
      if (r.ok) {
        showToast("Appointment completed!");
        setTimeout(() => router.push("/doctor"), 1000);
      } else { showToast("Failed to complete", "error"); }
    } catch { showToast("Error", "error"); }
    finally { setSaving(false); }
  }

  function addMedItem() {
    setRx({ ...rx, items: [...rx.items, { medicineName: "", dosage: "", frequency: "TDS", timing: "After food", duration: "", quantity: "", instructions: "" }] });
  }
  function removeMedItem(idx: number) {
    setRx({ ...rx, items: rx.items.filter((_, i) => i !== idx) });
  }
  function updateMedItem(idx: number, field: string, value: string) {
    const items = [...rx.items];
    (items[idx] as unknown as Record<string, string>)[field] = value;
    setRx({ ...rx, items });
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#14532d", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ color: "#6b7280", fontSize: 15 }}>Loading consultation...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>Appointment not found</p>
          <Link href="/doctor" style={{ color: "#14532d", fontWeight: 600, fontSize: 14 }}>Back to Portal</Link>
        </div>
      </div>
    );
  }

  const { appointment: appt, patient: pt } = data;
  const isCompleted = appt.status === "completed";
  const patientName = pt ? `${pt.firstName} ${pt.lastName}` : (appt.walkinName || "Walk-in Patient");
  const allergies = pt?.allergies ? (typeof pt.allergies === "string" ? pt.allergies : "") : "";

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 100,
          padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
          background: toast.type === "success" ? "#ecfdf5" : "#fef2f2",
          color: toast.type === "success" ? "#059669" : "#dc2626",
          border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header style={{ background: "#14532d", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/doctor" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back
          </Link>
          <div style={{ height: 24, width: 1, background: "rgba(255,255,255,0.2)" }} />
          <div>
            <h1 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>Consultation</h1>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: 0 }}>{appt.time} &middot; {fmtDate(appt.date)}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
            background: isCompleted ? "rgba(5,150,105,0.2)" : appt.status === "cancelled" ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.15)",
            color: isCompleted ? "#86efac" : appt.status === "cancelled" ? "#fca5a5" : "#fff",
          }}>
            {appt.status}
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px" }}>
        {/* Patient Info Card */}
        <div style={{ ...card, padding: "20px 24px", marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap" as const }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 800, color: "#14532d", flexShrink: 0,
          }}>
            {patientName.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>{patientName}</h2>
              {pt && <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", padding: "2px 8px", borderRadius: 6 }}>{pt.patientIdNumber}</span>}
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" as const, fontSize: 13, color: "#6b7280" }}>
              {pt?.gender && <span>{pt.gender.charAt(0).toUpperCase() + pt.gender.slice(1)}</span>}
              {pt?.age && <span>Age {pt.age}</span>}
              {pt?.phone && <span>{pt.phone}</span>}
              {pt?.bloodGroup && <span style={{ fontWeight: 600, color: "#dc2626" }}>Blood: {pt.bloodGroup}</span>}
              {appt.type && <span>Type: {appt.type}</span>}
              {appt.reason && <span>Reason: {appt.reason}</span>}
            </div>
          </div>
          {/* Allergies */}
          {allergies && (
            <div style={{ padding: "10px 16px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", flexShrink: 0, maxWidth: 300 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" as const, marginBottom: 2 }}>Allergies</div>
              <div style={{ fontSize: 13, color: "#991b1b", fontWeight: 600 }}>{allergies}</div>
            </div>
          )}
          {/* Medical Notes */}
          {pt?.medicalNotes && (
            <div style={{ padding: "10px 16px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa", flexShrink: 0, maxWidth: 300 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#ea580c", textTransform: "uppercase" as const, marginBottom: 2 }}>Medical Notes</div>
              <div style={{ fontSize: 13, color: "#9a3412" }}>{pt.medicalNotes}</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f3f4f6", borderRadius: 10, padding: 4 }}>
          {([
            { key: "vitals", label: "Vitals", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
            { key: "notes", label: "Clinical Notes", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
            { key: "prescription", label: "Prescription", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
            { key: "history", label: "History", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
          ] as { key: "vitals" | "notes" | "prescription" | "history"; label: string; icon: string }[]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: "10px 0", fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500, borderRadius: 8, border: "none", cursor: "pointer",
                background: activeTab === tab.key ? "#fff" : "transparent",
                color: activeTab === tab.key ? "#14532d" : "#6b7280",
                boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} /></svg>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
          {/* Main Content */}
          <div>
            {/* ══════ Vitals Tab ══════ */}
            {activeTab === "vitals" && (
              <div>
                {/* Record New Vitals */}
                {!isCompleted && pt && (
                  <div style={{ ...card, padding: 20, marginBottom: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Record Vitals</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>BP Systolic</label>
                        <input placeholder="mmHg" value={vitals.bloodPressureSys} onChange={e => setVitals({ ...vitals, bloodPressureSys: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>BP Diastolic</label>
                        <input placeholder="mmHg" value={vitals.bloodPressureDia} onChange={e => setVitals({ ...vitals, bloodPressureDia: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Pulse</label>
                        <input placeholder="bpm" value={vitals.pulse} onChange={e => setVitals({ ...vitals, pulse: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Temperature</label>
                        <input placeholder="°C" value={vitals.temperature} onChange={e => setVitals({ ...vitals, temperature: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Weight</label>
                        <input placeholder="kg" value={vitals.weight} onChange={e => setVitals({ ...vitals, weight: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Height</label>
                        <input placeholder="cm" value={vitals.height} onChange={e => setVitals({ ...vitals, height: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>SpO2</label>
                        <input placeholder="%" value={vitals.oxygenSaturation} onChange={e => setVitals({ ...vitals, oxygenSaturation: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Resp Rate</label>
                        <input placeholder="/min" value={vitals.respiratoryRate} onChange={e => setVitals({ ...vitals, respiratoryRate: e.target.value })} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Notes</label>
                      <input placeholder="Optional notes..." value={vitals.notes} onChange={e => setVitals({ ...vitals, notes: e.target.value })} style={inputStyle} />
                    </div>
                    <button onClick={saveVitals} disabled={saving} style={{ ...btnPrimary, marginTop: 12, opacity: saving ? 0.6 : 1 }}>
                      {saving ? "Saving..." : "Save Vitals"}
                    </button>
                  </div>
                )}

                {/* Vitals History */}
                <div style={{ ...card, padding: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Vitals History</h3>
                  {data.vitals.length === 0 ? (
                    <p style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: "20px 0" }}>No vitals recorded yet</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                            {["Date", "BP", "Pulse", "Temp", "Wt", "Ht", "BMI", "SpO2"].map(h => (
                              <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.vitals.map(v => (
                            <tr key={v.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "8px 6px", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" as const }}>{fmtDateTime(v.date)}</td>
                              <td style={{ padding: "8px 6px", color: "#374151" }}>{v.bloodPressureSys && v.bloodPressureDia ? `${v.bloodPressureSys}/${v.bloodPressureDia}` : "-"}</td>
                              <td style={{ padding: "8px 6px", color: "#374151" }}>{v.pulse || "-"}</td>
                              <td style={{ padding: "8px 6px", color: "#374151" }}>{v.temperature ? `${v.temperature}°` : "-"}</td>
                              <td style={{ padding: "8px 6px", color: "#374151" }}>{v.weight || "-"}</td>
                              <td style={{ padding: "8px 6px", color: "#374151" }}>{v.height || "-"}</td>
                              <td style={{ padding: "8px 6px", color: "#374151", fontWeight: 600 }}>{v.bmi || "-"}</td>
                              <td style={{ padding: "8px 6px", color: "#374151" }}>{v.oxygenSaturation ? `${v.oxygenSaturation}%` : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════ Clinical Notes Tab ══════ */}
            {activeTab === "notes" && (
              <div>
                {!isCompleted && pt && (
                  <div style={{ ...card, padding: 20, marginBottom: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Add Clinical Note</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Type</label>
                        <select value={note.type} onChange={e => setNote({ ...note, type: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                          {["general", "present_illness", "past_history", "personal_history", "examination", "diagnosis", "treatment"].map(t => (
                            <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Title</label>
                        <input placeholder="Note title..." value={note.title} onChange={e => setNote({ ...note, title: e.target.value })} style={inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Content</label>
                      <textarea rows={4} placeholder="Write clinical notes here..." value={note.content} onChange={e => setNote({ ...note, content: e.target.value })}
                        style={{ ...inputStyle, resize: "vertical" as const, minHeight: 100 }} />
                    </div>
                    <button onClick={saveNote} disabled={saving} style={{ ...btnPrimary, marginTop: 12, opacity: saving ? 0.6 : 1 }}>
                      {saving ? "Saving..." : "Save Note"}
                    </button>
                  </div>
                )}

                {/* Notes History */}
                <div style={{ ...card, padding: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Clinical Notes History</h3>
                  {data.clinicalNotes.length === 0 ? (
                    <p style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: "20px 0" }}>No clinical notes yet</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {data.clinicalNotes.map(n => (
                        <div key={n.id} style={{ padding: "14px 16px", background: "#fafafa", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#ecfdf5", color: "#059669", textTransform: "uppercase" as const }}>{n.type.replace(/_/g, " ")}</span>
                              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{n.title}</span>
                            </div>
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>{fmtDateTime(n.createdAt)}</span>
                          </div>
                          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" as const }}>{n.content}</p>
                          {n.doctor && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>By: {n.doctor}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════ Prescription Tab ══════ */}
            {activeTab === "prescription" && (
              <div>
                {!isCompleted && pt && (
                  <div style={{ ...card, padding: 20, marginBottom: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Write Prescription</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Diagnosis</label>
                        <input placeholder="Diagnosis..." value={rx.diagnosis} onChange={e => setRx({ ...rx, diagnosis: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Notes</label>
                        <input placeholder="Prescription notes..." value={rx.notes} onChange={e => setRx({ ...rx, notes: e.target.value })} style={inputStyle} />
                      </div>
                    </div>

                    {/* Medicine Items */}
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8, textTransform: "uppercase" as const }}>Medicines</div>
                    {rx.items.map((item, idx) => (
                      <div key={idx} style={{ padding: 12, background: "#fafafa", borderRadius: 10, border: "1px solid #f3f4f6", marginBottom: 8 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                          <div>
                            <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 2 }}>Medicine</label>
                            <input placeholder="Medicine name" value={item.medicineName} onChange={e => updateMedItem(idx, "medicineName", e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 2 }}>Dosage</label>
                            <input placeholder="e.g. 500mg" value={item.dosage} onChange={e => updateMedItem(idx, "dosage", e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 2 }}>Frequency</label>
                            <select value={item.frequency} onChange={e => updateMedItem(idx, "frequency", e.target.value)} style={{ ...inputStyle, fontSize: 13, cursor: "pointer" }}>
                              {["OD", "BD", "TDS", "QID", "SOS", "Stat", "HS"].map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 2 }}>Duration</label>
                            <input placeholder="e.g. 7 days" value={item.duration} onChange={e => updateMedItem(idx, "duration", e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 2 }}>Timing</label>
                            <select value={item.timing} onChange={e => updateMedItem(idx, "timing", e.target.value)} style={{ ...inputStyle, fontSize: 13, cursor: "pointer" }}>
                              {["Before food", "After food", "With food", "Empty stomach", "Bedtime"].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <button onClick={() => removeMedItem(idx)} style={{ padding: 6, background: "#fef2f2", borderRadius: 6, border: "none", cursor: "pointer", color: "#dc2626", marginBottom: 0 }} title="Remove">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginTop: 8 }}>
                          <div>
                            <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 2 }}>Quantity</label>
                            <input placeholder="e.g. 21 tabs" value={item.quantity} onChange={e => updateMedItem(idx, "quantity", e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 2 }}>Instructions</label>
                            <input placeholder="Special instructions..." value={item.instructions} onChange={e => updateMedItem(idx, "instructions", e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                      <button onClick={addMedItem} style={{ ...btnPrimary, background: "#f3f4f6", color: "#374151" }}>+ Add Medicine</button>
                      <button onClick={savePrescription} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                        {saving ? "Saving..." : "Save Prescription"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Past Prescriptions */}
                <div style={{ ...card, padding: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Past Prescriptions</h3>
                  {data.prescriptions.length === 0 ? (
                    <p style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: "20px 0" }}>No prescriptions yet</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {data.prescriptions.map(p => (
                        <div key={p.id} style={{ padding: 14, background: "#fafafa", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            <div>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{p.prescriptionNo}</span>
                              {p.diagnosis && <span style={{ fontSize: 13, color: "#6b7280", marginLeft: 8 }}>{p.diagnosis}</span>}
                            </div>
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>{fmtDate(p.date)}</span>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                            {p.items.map((m, i) => (
                              <span key={i} style={{ fontSize: 12, padding: "3px 10px", background: "#faf3e6", color: "#8b6914", borderRadius: 6, fontWeight: 500 }}>
                                {m.medicineName} {m.dosage} {m.frequency} {m.duration}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════ History Tab ══════ */}
            {activeTab === "history" && (
              <div style={{ ...card, padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Past Appointments</h3>
                {data.pastAppointments.length === 0 ? (
                  <p style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: "20px 0" }}>No past appointments</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {data.pastAppointments.map(a => (
                      <div key={a.id} style={{ padding: "12px 14px", background: "#fafafa", borderRadius: 10, border: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{fmtDate(a.date)} at {a.time}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, textTransform: "uppercase" as const,
                              background: a.status === "completed" ? "#ecfdf5" : a.status === "cancelled" ? "#fef2f2" : "#f3f4f6",
                              color: a.status === "completed" ? "#059669" : a.status === "cancelled" ? "#dc2626" : "#6b7280",
                            }}>{a.status}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {a.type && <span>{a.type}</span>}
                            {a.reason && <span> &middot; {a.reason}</span>}
                            {a.doctor && <span> &middot; Dr. {a.doctor}</span>}
                          </div>
                          {a.notes && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, fontStyle: "italic" }}>{a.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar — Complete Appointment */}
          <div>
            {/* Quick Info */}
            {pt && (
              <div style={{ ...card, padding: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, marginBottom: 10 }}>Patient Quick Info</h4>
                <div style={{ fontSize: 13, color: "#374151", lineHeight: 2 }}>
                  {pt.dateOfBirth && <div><strong>DOB:</strong> {fmtDate(pt.dateOfBirth)}</div>}
                  {pt.occupation && <div><strong>Occupation:</strong> {pt.occupation}</div>}
                  {pt.email && <div><strong>Email:</strong> {pt.email}</div>}
                  {pt.address && <div><strong>Address:</strong> {pt.address}</div>}
                </div>
                {pt.medicalHistory && pt.medicalHistory !== "[]" && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>Medical History</div>
                    <div style={{ fontSize: 12, color: "#374151" }}>
                      {(() => {
                        try { const arr = JSON.parse(pt.medicalHistory || "[]"); return Array.isArray(arr) ? arr.join(", ") : pt.medicalHistory; }
                        catch { return pt.medicalHistory; }
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Latest Vitals */}
            {data.vitals.length > 0 && (
              <div style={{ ...card, padding: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, marginBottom: 10 }}>Latest Vitals</h4>
                {(() => {
                  const v = data.vitals[0];
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                      {v.bloodPressureSys && <div style={{ padding: "6px 10px", background: "#f9fafb", borderRadius: 8 }}><div style={{ fontSize: 11, color: "#9ca3af" }}>BP</div><div style={{ fontWeight: 700, color: "#111" }}>{v.bloodPressureSys}/{v.bloodPressureDia}</div></div>}
                      {v.pulse && <div style={{ padding: "6px 10px", background: "#f9fafb", borderRadius: 8 }}><div style={{ fontSize: 11, color: "#9ca3af" }}>Pulse</div><div style={{ fontWeight: 700, color: "#111" }}>{v.pulse} bpm</div></div>}
                      {v.temperature && <div style={{ padding: "6px 10px", background: "#f9fafb", borderRadius: 8 }}><div style={{ fontSize: 11, color: "#9ca3af" }}>Temp</div><div style={{ fontWeight: 700, color: "#111" }}>{v.temperature}°C</div></div>}
                      {v.weight && <div style={{ padding: "6px 10px", background: "#f9fafb", borderRadius: 8 }}><div style={{ fontSize: 11, color: "#9ca3af" }}>Weight</div><div style={{ fontWeight: 700, color: "#111" }}>{v.weight} kg</div></div>}
                      {v.bmi && <div style={{ padding: "6px 10px", background: "#f9fafb", borderRadius: 8 }}><div style={{ fontSize: 11, color: "#9ca3af" }}>BMI</div><div style={{ fontWeight: 700, color: "#111" }}>{v.bmi}</div></div>}
                      {v.oxygenSaturation && <div style={{ padding: "6px 10px", background: "#f9fafb", borderRadius: 8 }}><div style={{ fontSize: 11, color: "#9ca3af" }}>SpO2</div><div style={{ fontWeight: 700, color: "#111" }}>{v.oxygenSaturation}%</div></div>}
                    </div>
                  );
                })()}
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>{fmtDateTime(data.vitals[0].date)}</p>
              </div>
            )}

            {/* Complete Appointment */}
            {!isCompleted && appt.status !== "cancelled" && (
              <div style={{ ...card, padding: 16, border: "1.5px solid #bbf7d0", background: "#f0fdf4" }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#14532d", marginBottom: 10 }}>Complete Consultation</h4>
                <textarea
                  rows={3}
                  placeholder="Consultation summary / notes..."
                  value={completionNotes}
                  onChange={e => setCompletionNotes(e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" as const, background: "#fff", marginBottom: 12 }}
                />
                <button onClick={completeAppointment} disabled={saving}
                  style={{ ...btnPrimary, width: "100%", padding: "10px 0", fontSize: 14, opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Completing..." : "Mark as Complete"}
                </button>
              </div>
            )}

            {isCompleted && (
              <div style={{ ...card, padding: 16, border: "1.5px solid #bbf7d0", background: "#f0fdf4", textAlign: "center" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2} style={{ margin: "0 auto 8px" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#059669" }}>Consultation Completed</p>
                {appt.notes && <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{appt.notes}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
