"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };
const chipBase = { display: "inline-block", padding: "3px 10px", fontSize: 11, fontWeight: 700 as const, borderRadius: 20 };

interface PatientProfile {
  id: string; patientIdNumber: string; firstName: string; lastName: string;
  email: string | null; phone: string; gender: string; age: number | null;
  dateOfBirth: string | null; bloodGroup: string | null; allergies: string | null;
  medicalNotes: string | null; address: string | null; city: string | null; photoUrl: string | null;
  stats: { appointments: number; prescriptions: number; invoices: number };
}

interface Appointment {
  id: string; date: string; time: string; status: string; type: string;
  reason: string | null; doctor: string; department: string | null;
  treatmentName: string | null; sessionPrice: number | null;
}

interface PrescriptionItem {
  medicineName: string; dosage: string; frequency: string; timing: string | null; duration: string;
}

interface Prescription {
  id: string; prescriptionNo: string; date: string; status: string;
  diagnosis: string | null; doctorName: string;
  items: PrescriptionItem[];
}

interface Invoice {
  id: string; invoiceNumber: string; date: string; status: string;
  totalAmount: number; paidAmount: number; balanceAmount: number;
  items: Array<{ description: string; amount: number }>;
}

type Tab = "home" | "appointments" | "prescriptions" | "invoices" | "feedback";

interface FeedbackItem {
  id: string; rating: number; category: string; comment: string | null;
  response: string | null; doctorName: string | null; createdAt: string;
}

interface PendingReview {
  id: string; date: string; time: string; doctor: string; doctorId: string | null;
  treatmentName: string | null; type: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: "#dbeafe", color: "#2563eb" },
  confirmed: { bg: "#d1fae5", color: "#059669" },
  completed: { bg: "#ecfdf5", color: "#16a34a" },
  cancelled: { bg: "#fee2e2", color: "#dc2626" },
  no_show: { bg: "#fef3c7", color: "#d97706" },
  pending: { bg: "#fff3e0", color: "#f57c00" },
  paid: { bg: "#e8f5e9", color: "#16a34a" },
  partially_paid: { bg: "#dbeafe", color: "#2563eb" },
  active: { bg: "#d1fae5", color: "#059669" },
  draft: { bg: "#f3f4f6", color: "#6b7280" },
};

function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }); }
function fmtTime(t: string) { if (!t) return ""; const [h, m] = t.split(":"); const hr = parseInt(h); return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`; }
function fmtCurrency(n: number) { return `S$${n.toFixed(2)}`; }

function StatusChip({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || { bg: "#f3f4f6", color: "#6b7280" };
  return <span style={{ ...chipBase, background: colors.bg, color: colors.color }}>{status.replace(/_/g, " ")}</span>;
}

export default function PatientPortal() {
  const router = useRouter();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<{ upcoming: Appointment[]; past: Appointment[] }>({ upcoming: [], past: [] });
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [invoices, setInvoices] = useState<{ invoices: Invoice[]; summary: { totalBilled: number; totalPaid: number; totalOutstanding: number } }>({ invoices: [], summary: { totalBilled: 0, totalPaid: 0, totalOutstanding: 0 } });
  const [tab, setTab] = useState<Tab>("home");
  const [feedbackData, setFeedbackData] = useState<{ feedbacks: FeedbackItem[]; pendingReview: PendingReview[] }>({ feedbacks: [], pendingReview: [] });
  const [reviewForm, setReviewForm] = useState<{ appointmentId: string; rating: number; comment: string } | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, aRes, rxRes, invRes, fbRes] = await Promise.all([
        fetch("/api/portal/me"),
        fetch("/api/portal/appointments"),
        fetch("/api/portal/prescriptions"),
        fetch("/api/portal/invoices"),
        fetch("/api/portal/feedback"),
      ]);

      if (!pRes.ok) { router.push("/portal/login"); return; }

      const [pData, aData, rxData, invData, fbData] = await Promise.all([
        pRes.json(), aRes.json(), rxRes.json(), invRes.json(), fbRes.json(),
      ]);

      setProfile(pData);
      setAppointments(aData);
      setPrescriptions(rxData);
      setInvoices(invData);
      if (fbRes.ok) setFeedbackData(fbData);
    } catch { router.push("/portal/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function logout() {
    await fetch("/api/portal/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    router.push("/portal/login");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#14532d", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ color: "#6b7280" }}>Loading your portal...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const tabs: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "appointments", label: "Appointments", icon: "📅", count: profile.stats.appointments },
    { key: "prescriptions", label: "Prescriptions", icon: "💊", count: profile.stats.prescriptions },
    { key: "invoices", label: "Invoices", icon: "🧾", count: profile.stats.invoices },
    { key: "feedback", label: "Reviews", icon: "⭐", count: feedbackData.pendingReview.length },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Header */}
      <header style={{ background: "#14532d", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#166534", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbf7d0", fontSize: 16, fontWeight: 700 }}>
            {profile.firstName[0]}{profile.lastName[0]}
          </div>
          <div>
            <h1 style={{ color: "#fff", fontSize: 16, margin: 0, fontWeight: 700 }}>Hi, {profile.firstName}!</h1>
            <p style={{ color: "#bbf7d0", fontSize: 12, margin: 0 }}>Patient Portal</p>
          </div>
        </div>
        <button onClick={logout} style={{ padding: "6px 16px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#bbf7d0", cursor: "pointer" }}>
          Logout
        </button>
      </header>

      {/* Tab Bar */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", overflowX: "auto", position: "sticky", top: 60, zIndex: 40 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: 1, minWidth: 80, padding: "12px 8px", fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? "#14532d" : "#6b7280", background: "none", border: "none",
              borderBottom: tab === t.key ? "2px solid #14532d" : "2px solid transparent",
              cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
        {/* ═══ HOME TAB ═══ */}
        {tab === "home" && (
          <div>
            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Appointments", value: profile.stats.appointments, color: "#2563eb", bg: "#dbeafe" },
                { label: "Prescriptions", value: profile.stats.prescriptions, color: "#059669", bg: "#d1fae5" },
                { label: "Invoices", value: profile.stats.invoices, color: "#d97706", bg: "#fef3c7" },
              ].map(s => (
                <div key={s.label} style={{ ...card, padding: 16, textAlign: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Alerts */}
            {profile.allergies && (
              <div style={{ ...card, padding: 14, marginBottom: 12, border: "1.5px solid #fca5a5", background: "#fef2f2" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", margin: 0 }}>Allergies</p>
                    <p style={{ fontSize: 13, color: "#991b1b", margin: "2px 0 0" }}>{profile.allergies}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Appointments */}
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "20px 0 12px" }}>Upcoming Appointments</h2>
            {appointments.upcoming.length === 0 ? (
              <div style={{ ...card, padding: 24, textAlign: "center" }}>
                <p style={{ color: "#9ca3af", fontSize: 14 }}>No upcoming appointments</p>
              </div>
            ) : (
              appointments.upcoming.slice(0, 3).map(a => (
                <div key={a.id} style={{ ...card, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: 0 }}>{fmtDate(a.date)} at {fmtTime(a.time)}</p>
                      <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>{a.treatmentName || a.type} with {a.doctor}</p>
                      {a.reason && <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>{a.reason}</p>}
                    </div>
                    <StatusChip status={a.status} />
                  </div>
                </div>
              ))
            )}

            {/* Recent Prescriptions */}
            {prescriptions.length > 0 && (
              <>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "24px 0 12px" }}>Recent Prescriptions</h2>
                {prescriptions.slice(0, 2).map(rx => (
                  <div key={rx.id} style={{ ...card, padding: 16, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#14532d" }}>{rx.prescriptionNo}</span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{fmtDate(rx.date)}</span>
                    </div>
                    {rx.diagnosis && <p style={{ fontSize: 13, color: "#374151", margin: "0 0 6px" }}>{rx.diagnosis}</p>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {rx.items.map((item, i) => (
                        <span key={i} style={{ ...chipBase, background: "#f0fdf4", color: "#166534" }}>{item.medicineName}</span>
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: "6px 0 0" }}>Dr. {rx.doctorName}</p>
                  </div>
                ))}
              </>
            )}

            {/* Outstanding Balance */}
            {invoices.summary.totalOutstanding > 0 && (
              <div style={{ ...card, padding: 16, marginTop: 20, border: "1.5px solid #fbbf24", background: "#fffbeb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", margin: 0 }}>Outstanding Balance</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: "#d97706", margin: "4px 0 0" }}>{fmtCurrency(invoices.summary.totalOutstanding)}</p>
                  </div>
                  <button onClick={() => setTab("invoices")} style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1.5px solid #d97706", background: "#fff", color: "#d97706", cursor: "pointer" }}>
                    View Invoices
                  </button>
                </div>
              </div>
            )}

            {/* My Info */}
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "24px 0 12px" }}>My Information</h2>
            <div style={{ ...card, padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                {[
                  { label: "Patient ID", value: profile.patientIdNumber },
                  { label: "Phone", value: profile.phone },
                  { label: "Email", value: profile.email || "—" },
                  { label: "Gender", value: profile.gender },
                  { label: "Blood Group", value: profile.bloodGroup || "—" },
                  { label: "Date of Birth", value: profile.dateOfBirth ? fmtDate(profile.dateOfBirth) : "—" },
                ].map(f => (
                  <div key={f.label}>
                    <p style={{ color: "#9ca3af", margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</p>
                    <p style={{ color: "#111", margin: "2px 0 0", fontWeight: 600 }}>{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ APPOINTMENTS TAB ═══ */}
        {tab === "appointments" && (
          <div>
            {appointments.upcoming.length > 0 && (
              <>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>Upcoming</h2>
                {appointments.upcoming.map(a => (
                  <div key={a.id} style={{ ...card, padding: 16, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: 0 }}>{fmtDate(a.date)} at {fmtTime(a.time)}</p>
                        <p style={{ fontSize: 13, color: "#374151", margin: "4px 0 0" }}>{a.treatmentName || a.type}</p>
                        <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>Dr. {a.doctor}{a.department ? ` • ${a.department}` : ""}</p>
                        {a.reason && <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>Reason: {a.reason}</p>}
                        {a.sessionPrice ? <p style={{ fontSize: 12, fontWeight: 600, color: "#059669", margin: "4px 0 0" }}>{fmtCurrency(a.sessionPrice)}</p> : null}
                      </div>
                      <StatusChip status={a.status} />
                    </div>
                  </div>
                ))}
              </>
            )}

            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "20px 0 12px" }}>Past Visits</h2>
            {appointments.past.length === 0 ? (
              <div style={{ ...card, padding: 24, textAlign: "center" }}><p style={{ color: "#9ca3af" }}>No past appointments</p></div>
            ) : (
              appointments.past.map(a => (
                <div key={a.id} style={{ ...card, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>{fmtDate(a.date)} at {fmtTime(a.time)}</p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{a.treatmentName || a.type} • Dr. {a.doctor}</p>
                    </div>
                    <StatusChip status={a.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ PRESCRIPTIONS TAB ═══ */}
        {tab === "prescriptions" && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>My Prescriptions</h2>
            {prescriptions.length === 0 ? (
              <div style={{ ...card, padding: 24, textAlign: "center" }}><p style={{ color: "#9ca3af" }}>No prescriptions yet</p></div>
            ) : (
              prescriptions.map(rx => (
                <div key={rx.id} style={{ ...card, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#14532d" }}>{rx.prescriptionNo}</span>
                      <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>{fmtDate(rx.date)}</span>
                    </div>
                    <StatusChip status={rx.status} />
                  </div>
                  {rx.diagnosis && <p style={{ fontSize: 13, color: "#374151", margin: "0 0 10px", background: "#f9fafb", padding: "6px 10px", borderRadius: 6 }}>Diagnosis: {rx.diagnosis}</p>}
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <th style={{ padding: "6px 0", textAlign: "left", color: "#9ca3af", fontWeight: 600 }}>Medicine</th>
                        <th style={{ padding: "6px 0", textAlign: "left", color: "#9ca3af", fontWeight: 600 }}>Dosage</th>
                        <th style={{ padding: "6px 0", textAlign: "left", color: "#9ca3af", fontWeight: 600 }}>Frequency</th>
                        <th style={{ padding: "6px 0", textAlign: "left", color: "#9ca3af", fontWeight: 600 }}>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rx.items.map((item, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                          <td style={{ padding: "6px 0", fontWeight: 600, color: "#111" }}>{item.medicineName}</td>
                          <td style={{ padding: "6px 0", color: "#374151" }}>{item.dosage}</td>
                          <td style={{ padding: "6px 0", color: "#374151" }}>{item.frequency}{item.timing ? ` (${item.timing})` : ""}</td>
                          <td style={{ padding: "6px 0", color: "#374151" }}>{item.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0" }}>Prescribed by Dr. {rx.doctorName}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ INVOICES TAB ═══ */}
        {tab === "invoices" && (
          <div>
            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
              <div style={{ ...card, padding: 14, textAlign: "center" }}>
                <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Total Billed</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#111", margin: "4px 0 0" }}>{fmtCurrency(invoices.summary.totalBilled)}</p>
              </div>
              <div style={{ ...card, padding: 14, textAlign: "center" }}>
                <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Total Paid</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#16a34a", margin: "4px 0 0" }}>{fmtCurrency(invoices.summary.totalPaid)}</p>
              </div>
              <div style={{ ...card, padding: 14, textAlign: "center" }}>
                <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Outstanding</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: invoices.summary.totalOutstanding > 0 ? "#d97706" : "#16a34a", margin: "4px 0 0" }}>{fmtCurrency(invoices.summary.totalOutstanding)}</p>
              </div>
            </div>

            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>Invoice History</h2>
            {invoices.invoices.length === 0 ? (
              <div style={{ ...card, padding: 24, textAlign: "center" }}><p style={{ color: "#9ca3af" }}>No invoices yet</p></div>
            ) : (
              invoices.invoices.map(inv => (
                <div key={inv.id} style={{ ...card, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: 0 }}>{inv.invoiceNumber}</p>
                      <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{fmtDate(inv.date)}</p>
                    </div>
                    <StatusChip status={inv.status} />
                  </div>
                  {inv.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid #f9fafb" }}>
                      <span style={{ color: "#374151" }}>{item.description}</span>
                      <span style={{ fontWeight: 600, color: "#111" }}>{fmtCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1.5px solid #e5e7eb" }}>
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: "#6b7280" }}>Paid: </span>
                      <span style={{ color: "#16a34a", fontWeight: 600 }}>{fmtCurrency(inv.paidAmount)}</span>
                      {inv.balanceAmount > 0 && (
                        <>
                          <span style={{ color: "#6b7280", marginLeft: 12 }}>Balance: </span>
                          <span style={{ color: "#d97706", fontWeight: 600 }}>{fmtCurrency(inv.balanceAmount)}</span>
                        </>
                      )}
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{fmtCurrency(inv.totalAmount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {/* ═══ FEEDBACK TAB ═══ */}
        {tab === "feedback" && (
          <div>
            {/* Pending Reviews */}
            {feedbackData.pendingReview.length > 0 && (
              <>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>Rate Your Visit</h2>
                {feedbackData.pendingReview.map(appt => (
                  <div key={appt.id} style={{ ...card, padding: 16, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>{fmtDate(appt.date)} at {fmtTime(appt.time)}</p>
                        <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{appt.treatmentName || appt.type} • Dr. {appt.doctor}</p>
                      </div>
                    </div>
                    {reviewForm?.appointmentId === appt.id ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <button key={s} onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                              <svg width={28} height={28} viewBox="0 0 24 24" fill={s <= reviewForm.rating ? "#f59e0b" : "#e5e7eb"}>
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                        <textarea rows={3} placeholder="Tell us about your experience (optional)..."
                          value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                          style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 8, border: "1.5px solid #e5e7eb", outline: "none", background: "#fafafa", boxSizing: "border-box" as const, resize: "vertical" as const, marginBottom: 10 }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button disabled={submittingReview || reviewForm.rating === 0}
                            onClick={async () => {
                              setSubmittingReview(true);
                              try {
                                const r = await fetch("/api/portal/feedback", {
                                  method: "POST", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ appointmentId: appt.id, rating: reviewForm.rating, comment: reviewForm.comment || undefined }),
                                });
                                if (r.ok) { setReviewForm(null); fetchAll(); }
                              } catch { /* */ }
                              finally { setSubmittingReview(false); }
                            }}
                            style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", background: "#14532d", color: "#fff", cursor: "pointer", opacity: submittingReview || reviewForm.rating === 0 ? 0.5 : 1 }}>
                            {submittingReview ? "Submitting..." : "Submit Review"}
                          </button>
                          <button onClick={() => setReviewForm(null)}
                            style={{ padding: "8px 16px", fontSize: 13, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setReviewForm({ appointmentId: appt.id, rating: 0, comment: "" })}
                        style={{ padding: "6px 16px", fontSize: 12, fontWeight: 600, borderRadius: 8, border: "1.5px solid #f59e0b", background: "#fffbeb", color: "#92400e", cursor: "pointer" }}>
                        ⭐ Rate This Visit
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Past Reviews */}
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "20px 0 12px" }}>My Reviews</h2>
            {feedbackData.feedbacks.length === 0 ? (
              <div style={{ ...card, padding: 24, textAlign: "center" }}>
                <p style={{ color: "#9ca3af", fontSize: 14 }}>No reviews yet</p>
              </div>
            ) : (
              feedbackData.feedbacks.map(fb => (
                <div key={fb.id} style={{ ...card, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 2 }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <svg key={s} width={16} height={16} viewBox="0 0 24 24" fill={s <= fb.rating ? "#f59e0b" : "#e5e7eb"}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmtDate(fb.createdAt)}</span>
                  </div>
                  {fb.doctorName && <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 4px" }}>Dr. {fb.doctorName}</p>}
                  {fb.comment && <p style={{ fontSize: 13, color: "#374151", margin: "4px 0 0" }}>{fb.comment}</p>}
                  {fb.response && (
                    <div style={{ background: "#f0fdf4", borderRadius: 8, padding: 10, marginTop: 8, borderLeft: "3px solid #16a34a" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#166534", margin: "0 0 2px" }}>Clinic Response</p>
                      <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>{fb.response}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "20px 0 40px", fontSize: 12, color: "#d1d5db" }}>
        Patient Portal • Powered by AyurGate
      </footer>
    </div>
  );
}
