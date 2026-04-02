"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TablePageSkeleton } from "@/components/Skeleton";
import { cardStyle, inputStyle } from "@/lib/styles";

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: "Active", bg: "var(--green-light)", color: "var(--green)" },
  completed: { label: "Completed", bg: "var(--blue-50)", color: "var(--blue-500)" },
  cancelled: { label: "Cancelled", bg: "var(--red-light)", color: "var(--red)" },
};

const FREQ_LABELS: Record<string, string> = {
  once_daily: "Once daily", twice_daily: "Twice daily", thrice_daily: "Thrice daily",
  four_times: "4 times/day", every_6h: "Every 6 hrs", every_8h: "Every 8 hrs",
  every_12h: "Every 12 hrs", sos: "SOS (as needed)", weekly: "Weekly", alternate_days: "Alternate days",
  stat: "Stat (immediately)",
};

const TIMING_LABELS: Record<string, string> = {
  before_food: "Before food", after_food: "After food", with_food: "With food",
  empty_stomach: "Empty stomach", bedtime: "At bedtime", morning: "Morning", evening: "Evening",
};

interface PrescriptionItem {
  id: string; medicineName: string; dosage: string; frequency: string;
  timing: string | null; duration: string; quantity: number | null; instructions: string | null;
}

interface Patient {
  id: string; firstName: string; lastName: string; patientIdNumber: string;
  phone: string; dateOfBirth: string | null; gender: string | null; allergies: string | null; photoUrl: string | null;
}

interface Prescription {
  id: string; prescriptionNo: string; patientId: string; doctorId: string | null;
  doctorName: string; diagnosis: string | null; notes: string | null; status: string;
  date: string; items: PrescriptionItem[]; patient: Patient;
}

interface Doctor { id: string; name: string; }

const ITEMS_PER_PAGE = 15;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

function calcAge(dob: string | null): string {
  if (!dob) return "";
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return `${age}y`;
}

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDay === 0) return "Today";
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;
  return formatDate(dateStr);
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDoctor, setFilterDoctor] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchPrescriptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const q = params.toString();
      const res = await fetch(`/api/prescriptions${q ? `?${q}` : ""}`);
      const data = await res.json();
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to load prescriptions", "error");
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, showToast]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  useEffect(() => {
    fetch("/api/doctors").then(r => r.json()).then(d => setDoctors(Array.isArray(d) ? d : d.data || [])).catch(() => {});
  }, []);

  // Client-side filters for doctor and date (API handles search & status)
  const filtered = prescriptions.filter(rx => {
    if (filterDoctor !== "all" && rx.doctorName !== filterDoctor) return false;
    if (dateFrom && new Date(rx.date) < new Date(dateFrom)) return false;
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(rx.date) > to) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Stats
  const stats = {
    total: prescriptions.length,
    active: prescriptions.filter(r => r.status === "active").length,
    completed: prescriptions.filter(r => r.status === "completed").length,
    today: prescriptions.filter(r => {
      const d = new Date(r.date);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
  };

  // Unique doctors from prescriptions
  const uniqueDoctors = [...new Set(prescriptions.map(r => r.doctorName))].sort();

  function printPrescription(rx: Prescription) {
    const pat = rx.patient;
    const rows = rx.items.map((item, i) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e4;font-weight:600;text-align:center">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e4"><strong>${item.medicineName}</strong>${item.instructions ? `<br/><span style="color:#78716c;font-size:11px">${item.instructions}</span>` : ""}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e4">${item.dosage}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e4">${FREQ_LABELS[item.frequency] || item.frequency}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e4">${item.timing ? (TIMING_LABELS[item.timing] || item.timing) : "—"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e4">${item.duration}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e4;text-align:center">${item.quantity || "—"}</td>
    </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><title>Prescription ${rx.prescriptionNo}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; color: #292524; max-width: 800px; margin: 0 auto; }
      .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 2px solid #292524; margin-bottom: 20px; }
      .header h1 { font-size: 20px; color: #292524; }
      .header .rx-no { font-size: 14px; color: #78716c; }
      .grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
      .grid .label { font-size: 10px; color: #78716c; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
      .grid .value { font-size: 13px; font-weight: 600; margin-top: 2px; }
      .diagnosis { background: #faf3e6; border-left: 3px solid #b68d40; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-bottom: 20px; }
      .diagnosis .label { font-size: 10px; color: #8b6914; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
      .diagnosis .value { font-size: 13px; font-weight: 600; margin-top: 4px; }
      h2 { font-size: 14px; color: #292524; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #f5f5f4; padding: 8px 12px; text-align: left; font-size: 11px; color: #78716c; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e5e4; }
      .notes { background: #f5f5f4; padding: 12px 16px; border-radius: 6px; font-size: 13px; margin-bottom: 20px; }
      .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
      .footer .allergies { font-size: 11px; color: #78716c; }
      .footer .signature { text-align: center; }
      .footer .sig-line { width: 180px; border-top: 1px solid #292524; padding-top: 6px; font-size: 11px; color: #78716c; }
      @media print { body { padding: 16px; } button { display: none !important; } }
    </style></head><body>
    <div style="text-align:right;margin-bottom:16px"><button onclick="window.print()" style="padding:8px 20px;background:#2d6a4f;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600">Print</button></div>
    <div class="header">
      <div><h1>Prescription</h1><div class="rx-no">${rx.prescriptionNo}</div></div>
      <div style="text-align:right"><div style="font-size:13px;font-weight:600">Date: ${formatDate(rx.date)}</div></div>
    </div>
    <div class="grid">
      <div><span class="label">Patient</span><div class="value">${pat.firstName} ${pat.lastName}</div></div>
      <div><span class="label">Patient ID</span><div class="value">${pat.patientIdNumber}</div></div>
      <div><span class="label">Age / Gender</span><div class="value">${calcAge(pat.dateOfBirth) || "—"} / ${pat.gender ? pat.gender.charAt(0).toUpperCase() + pat.gender.slice(1) : "—"}</div></div>
      <div><span class="label">Doctor</span><div class="value">${rx.doctorName}</div></div>
    </div>
    ${rx.diagnosis ? `<div class="diagnosis"><span class="label">Diagnosis</span><div class="value">${rx.diagnosis}</div></div>` : ""}
    <h2>Medicines</h2>
    <table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Timing</th><th>Duration</th><th>Qty</th></tr></thead><tbody>${rows}</tbody></table>
    ${rx.notes ? `<h2>Notes</h2><div class="notes">${rx.notes}</div>` : ""}
    <div class="footer">
      <div class="allergies"><strong>Allergies:</strong> ${pat.allergies || "None recorded"}</div>
      <div class="signature"><div class="sig-line">${rx.doctorName}<br/>Signature</div></div>
    </div>
    </body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  }

  const [convertingRx, setConvertingRx] = useState<string | null>(null);

  function shareRxWhatsApp(rx: Prescription) {
    const pat = rx.patient;
    const items = rx.items.map((item, i) =>
      `${i + 1}. *${item.medicineName}* — ${item.dosage}, ${FREQ_LABELS[item.frequency] || item.frequency}, ${item.timing ? (TIMING_LABELS[item.timing] || item.timing) : ""}, ${item.duration}${item.instructions ? ` (${item.instructions})` : ""}`
    ).join("\n");
    const text = `*${rx.prescriptionNo}*\nDate: ${formatDate(rx.date)}\nDoctor: ${rx.doctorName}\nPatient: ${pat.firstName} ${pat.lastName}\n${rx.diagnosis ? `Diagnosis: ${rx.diagnosis}\n` : ""}\n*Medicines:*\n${items}\n${rx.notes ? `\nNotes: ${rx.notes}` : ""}`;
    const phone = (pat.phone || "").replace(/[^0-9]/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  async function convertRxToInvoice(rx: Prescription) {
    setConvertingRx(rx.id);
    try {
      const r = await fetch(`/api/prescriptions/${rx.id}/convert-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await r.json();
      if (r.ok) {
        showToast(`Invoice ${data.invoiceNumber} created from ${rx.prescriptionNo}`, "success");
        setPrescriptions(prev => prev.map(p => p.id === rx.id ? { ...p, status: "completed" } : p));
        window.open(`/billing?search=${data.invoiceNumber}`, "_blank");
      } else {
        showToast(data.error || "Failed to convert", "error");
      }
    } catch { showToast("Failed to convert to invoice", "error"); }
    finally { setConvertingRx(null); }
  }

  async function updateStatus(rxId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/prescriptions/${rxId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPrescriptions(prev => prev.map(r => r.id === rxId ? { ...r, status: newStatus } : r));
        showToast(`Prescription marked as ${newStatus}`, "success");
      }
    } catch {
      showToast("Failed to update status", "error");
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <TablePageSkeleton columns={6} rows={8} filters={4} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 text-[15px] font-semibold text-white yoda-slide-in"
          style={{ background: toast.type === "success" ? "var(--green)" : "var(--red)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)" }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Prescriptions</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>View and manage all digital prescriptions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total, color: "var(--blue-500)", bg: "var(--blue-50)", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
          { label: "Active", value: stats.active, color: "var(--green)", bg: "var(--green-light)", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
          { label: "Completed", value: stats.completed, color: "var(--blue-500)", bg: "var(--blue-50)", icon: "M5 13l4 4L19 7" },
          { label: "Today", value: stats.today, color: "#8b5cf6", bg: "#f5f3ff", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
        ].map(s => (
          <div key={s.label} className="p-3" style={{ ...cardStyle, borderLeft: `3px solid ${s.color}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>{s.label}</p>
                <p className="text-[24px] font-bold mt-0.5" style={{ color: "var(--grey-900)" }}>{s.value}</p>
              </div>
              <div className="w-9 h-9 flex items-center justify-center" style={{ background: s.bg, borderRadius: "var(--radius-sm)" }}>
                <svg className="w-5 h-5" style={{ color: s.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text" placeholder="Search patient, Rx no, doctor, diagnosis..."
          value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 min-w-[260px]" style={inputStyle}
        />
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-3 py-2" style={inputStyle}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filterDoctor} onChange={e => { setFilterDoctor(e.target.value); setCurrentPage(1); }} className="px-3 py-2" style={inputStyle}>
          <option value="all">All Doctors</option>
          {uniqueDoctors.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} className="px-3 py-2" style={inputStyle} title="From date" />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }} className="px-3 py-2" style={inputStyle} title="To date" />
        {(search || filterStatus !== "all" || filterDoctor !== "all" || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(""); setFilterStatus("all"); setFilterDoctor("all"); setDateFrom(""); setDateTo(""); setCurrentPage(1); }}
            className="px-3 py-2 text-[14px] font-semibold" style={{ color: "var(--red)", background: "var(--red-light)", borderRadius: "var(--radius-sm)", border: "1px solid var(--red-light)" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Prescription List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={cardStyle}>
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>
            {prescriptions.length === 0 ? "No prescriptions yet" : "No prescriptions match your filters"}
          </p>
          <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>
            Prescriptions are created from the patient profile page
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map(rx => {
            const isExpanded = expandedId === rx.id;
            const st = STATUS_MAP[rx.status] || STATUS_MAP.active;
            const pat = rx.patient;
            return (
              <div key={rx.id} style={cardStyle} className="overflow-hidden transition-shadow duration-150 hover:shadow-md">
                {/* Header row */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : rx.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Rx icon */}
                      <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: "var(--blue-50)", borderRadius: "var(--radius-sm)" }}>
                        <svg className="w-5 h-5" style={{ color: "var(--blue-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>{rx.prescriptionNo}</span>
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                            style={{ borderRadius: "var(--radius-sm)", background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Link href={`/patients/${pat.id}`} className="text-[14px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}
                            onClick={e => e.stopPropagation()}>
                            {pat.firstName} {pat.lastName}
                          </Link>
                          <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>({pat.patientIdNumber})</span>
                          {rx.diagnosis && (
                            <>
                              <span style={{ color: "var(--grey-300)" }}>|</span>
                              <span className="text-[13px] font-medium" style={{ color: "var(--grey-600)" }}>{rx.diagnosis}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-[13px] font-semibold" style={{ color: "var(--grey-700)" }}>{rx.doctorName}</p>
                        <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>{relativeTime(rx.date)}</p>
                      </div>
                      <div className="text-[13px] font-semibold px-2 py-1" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)", color: "var(--grey-600)" }}>
                        {rx.items.length} med{rx.items.length !== 1 ? "s" : ""}
                      </div>
                      <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--grey-200)" }}>
                    {/* Patient info bar */}
                    <div className="flex flex-wrap gap-4 py-3 mb-3" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                      <div>
                        <span className="text-[11px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Age/Gender</span>
                        <p className="text-[14px] font-semibold" style={{ color: "var(--grey-800)" }}>
                          {calcAge(pat.dateOfBirth) || "—"} / {pat.gender ? pat.gender.charAt(0).toUpperCase() + pat.gender.slice(1) : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Phone</span>
                        <p className="text-[14px] font-semibold" style={{ color: "var(--grey-800)" }}>{pat.phone}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Allergies</span>
                        <p className="text-[14px] font-semibold" style={{ color: pat.allergies ? "var(--red)" : "var(--grey-500)" }}>
                          {pat.allergies || "None"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Date</span>
                        <p className="text-[14px] font-semibold" style={{ color: "var(--grey-800)" }}>{formatDate(rx.date)}</p>
                      </div>
                    </div>

                    {/* Diagnosis */}
                    {rx.diagnosis && (
                      <div className="mb-3 p-2.5" style={{ background: "#faf3e6", borderLeft: "3px solid #b68d40", borderRadius: "0 6px 6px 0" }}>
                        <span className="text-[10px] font-bold uppercase" style={{ color: "#8b6914", letterSpacing: "0.3px" }}>Diagnosis</span>
                        <p className="text-[14px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>{rx.diagnosis}</p>
                      </div>
                    )}

                    {/* Medicine table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-[14px]" style={{ borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "var(--grey-100)" }}>
                            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase" style={{ color: "var(--grey-600)", letterSpacing: "0.3px" }}>#</th>
                            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase" style={{ color: "var(--grey-600)", letterSpacing: "0.3px" }}>Medicine</th>
                            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase" style={{ color: "var(--grey-600)", letterSpacing: "0.3px" }}>Dosage</th>
                            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase" style={{ color: "var(--grey-600)", letterSpacing: "0.3px" }}>Frequency</th>
                            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase" style={{ color: "var(--grey-600)", letterSpacing: "0.3px" }}>Timing</th>
                            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase" style={{ color: "var(--grey-600)", letterSpacing: "0.3px" }}>Duration</th>
                            <th className="px-3 py-2 text-center text-[11px] font-bold uppercase" style={{ color: "var(--grey-600)", letterSpacing: "0.3px" }}>Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rx.items.map((item, i) => (
                            <tr key={item.id} style={{ borderBottom: "1px solid var(--grey-100)" }}>
                              <td className="px-3 py-2 font-semibold" style={{ color: "var(--grey-500)" }}>{i + 1}</td>
                              <td className="px-3 py-2">
                                <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{item.medicineName}</span>
                                {item.instructions && (
                                  <p className="text-[12px] mt-0.5" style={{ color: "var(--grey-500)" }}>{item.instructions}</p>
                                )}
                              </td>
                              <td className="px-3 py-2" style={{ color: "var(--grey-700)" }}>{item.dosage}</td>
                              <td className="px-3 py-2" style={{ color: "var(--grey-700)" }}>{FREQ_LABELS[item.frequency] || item.frequency}</td>
                              <td className="px-3 py-2" style={{ color: "var(--grey-700)" }}>{item.timing ? (TIMING_LABELS[item.timing] || item.timing) : "—"}</td>
                              <td className="px-3 py-2" style={{ color: "var(--grey-700)" }}>{item.duration}</td>
                              <td className="px-3 py-2 text-center" style={{ color: "var(--grey-700)" }}>{item.quantity || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Notes */}
                    {rx.notes && (
                      <div className="mt-3 p-2.5" style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)" }}>
                        <span className="text-[10px] font-bold uppercase" style={{ color: "var(--grey-500)", letterSpacing: "0.3px" }}>Notes</span>
                        <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-700)" }}>{rx.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--grey-200)" }}>
                      <button
                        onClick={e => { e.stopPropagation(); printPrescription(rx); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold transition-colors"
                        style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-sm)", border: "1px solid var(--blue-100)" }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); shareRxWhatsApp(rx); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold transition-colors"
                        style={{ background: "#ecfdf5", color: "#25D366", borderRadius: "var(--radius-sm)", border: "1px solid #d1fae5" }}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                      </button>
                      <Link
                        href={`/patients/${pat.id}`}
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold transition-colors"
                        style={{ background: "var(--white)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Patient
                      </Link>
                      {rx.status === "active" && (
                        <button
                          onClick={e => { e.stopPropagation(); convertRxToInvoice(rx); }}
                          disabled={convertingRx === rx.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold transition-colors disabled:opacity-50"
                          style={{ background: "#fef3c7", color: "#92400e", borderRadius: "var(--radius-sm)", border: "1px solid #fde68a" }}
                        >
                          {convertingRx === rx.id ? (
                            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#92400e", borderTopColor: "transparent" }} />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                            </svg>
                          )}
                          Convert to Invoice
                        </button>
                      )}
                      {rx.status === "active" && (
                        <button
                          onClick={e => { e.stopPropagation(); updateStatus(rx.id, "completed"); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold transition-colors"
                          style={{ background: "var(--green-light)", color: "var(--green)", borderRadius: "var(--radius-sm)", border: "1px solid var(--green-light)" }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Dispensed
                        </button>
                      )}
                      {rx.status === "active" && (
                        <button
                          onClick={e => { e.stopPropagation(); updateStatus(rx.id, "cancelled"); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold transition-colors"
                          style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)", border: "1px solid var(--red-light)" }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-3 py-1.5 text-[14px] font-semibold disabled:opacity-40"
              style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}>
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
              .map(p => (
                <button key={p} onClick={() => setCurrentPage(p)} className="px-3 py-1.5 text-[14px] font-semibold"
                  style={{
                    border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)",
                    background: p === currentPage ? "var(--blue-500)" : "var(--white)",
                    color: p === currentPage ? "var(--white)" : "var(--grey-700)",
                  }}>
                  {p}
                </button>
              ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-[14px] font-semibold disabled:opacity-40"
              style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
