"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────
interface StaffMember {
  id: string;
  name: string;
  role: string;
  specialization: string | null;
  isActive: boolean;
}

interface AffectedAppointment {
  id: string;
  date: string;
  time: string;
  endTime: string | null;
  duration: number;
  status: string;
  doctor: string;
  doctorId: string;
  type: string;
  reason: string | null;
  patientName: string;
  patientId: string | null;
  patientPhone: string | null;
  treatmentName: string | null;
}

interface AvailableDoctor {
  id: string;
  name: string;
  role: string;
  specialization: string | null;
  available: boolean;
}

interface AssignmentMap {
  [appointmentId: string]: string; // appointmentId -> newDoctorId
}

// ─── Design tokens ──────────────────────────────────────────────────────────
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

// ─── Component ──────────────────────────────────────────────────────────────
export default function ReassignPage() {
  const searchParams = useSearchParams();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(searchParams.get("doctor") || "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [onlyConflicting, setOnlyConflicting] = useState(false);
  const [appointments, setAppointments] = useState<AffectedAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [availableDoctors, setAvailableDoctors] = useState<Record<string, AvailableDoctor[]>>({});
  const [loadingSlots, setLoadingSlots] = useState<Record<string, boolean>>({});
  const [selectedAll, setSelectedAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTargetId, setBulkTargetId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [result, setResult] = useState<{ reassigned: number; failed: number; errors: Array<{ appointmentId: string; error: string }> } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [leaves, setLeaves] = useState<Array<{ startDate: string; endDate: string }>>([]);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch staff list
  useEffect(() => {
    fetch("/api/staff")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const clinical = data.filter((s: StaffMember) =>
          ["doctor", "therapist"].includes(s.role) && s.isActive
        );
        setStaff(clinical);
      })
      .catch(() => {})
      .finally(() => setLoadingStaff(false));
  }, []);

  // Fetch leaves for selected doctor
  useEffect(() => {
    if (!selectedDoctorId) {
      setLeaves([]);
      return;
    }
    fetch(`/api/staff/${selectedDoctorId}/leave`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const approved = data
          .filter((l: { status: string }) => l.status === "approved")
          .map((l: { startDate: string; endDate: string }) => ({
            startDate: l.startDate.split("T")[0],
            endDate: l.endDate.split("T")[0],
          }));
        setLeaves(approved);
      })
      .catch(() => setLeaves([]));
  }, [selectedDoctorId]);

  // Check if a date falls within any leave period
  const isOnLeave = useCallback(
    (dateStr: string) => {
      return leaves.some((l) => dateStr >= l.startDate && dateStr <= l.endDate);
    },
    [leaves]
  );

  // Fetch affected appointments
  const fetchAppointments = useCallback(async () => {
    if (!selectedDoctorId || !dateFrom || !dateTo) return;
    setLoading(true);
    setResult(null);
    setAssignments({});
    setAvailableDoctors({});
    setSelectedIds(new Set());
    setSelectedAll(false);

    try {
      const res = await fetch(
        `/api/appointments/affected?doctorId=${selectedDoctorId}&from=${dateFrom}&to=${dateTo}`
      );
      if (res.ok) {
        const data: AffectedAppointment[] = await res.json();
        setAppointments(data);
      } else {
        setAppointments([]);
        showToast("Failed to fetch appointments", "err");
      }
    } catch {
      showToast("Network error", "err");
    } finally {
      setLoading(false);
    }
  }, [selectedDoctorId, dateFrom, dateTo]);

  // Filtered appointments (only conflicting = during leave)
  const displayAppointments = onlyConflicting
    ? appointments.filter((a) => isOnLeave(a.date))
    : appointments;

  // Fetch available doctors for a specific appointment
  const fetchAvailableForAppointment = async (appt: AffectedAppointment) => {
    setLoadingSlots((prev) => ({ ...prev, [appt.id]: true }));
    try {
      const selectedDoc = staff.find((s) => s.id === selectedDoctorId);
      const specParam = selectedDoc?.specialization
        ? `&specialization=${encodeURIComponent(selectedDoc.specialization)}`
        : "";
      const res = await fetch(
        `/api/doctors/available?date=${appt.date}&time=${appt.time}&excludeDoctorId=${selectedDoctorId}${specParam}`
      );
      if (res.ok) {
        const data: AvailableDoctor[] = await res.json();
        setAvailableDoctors((prev) => ({ ...prev, [appt.id]: data }));
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingSlots((prev) => ({ ...prev, [appt.id]: false }));
    }
  };

  // Auto-assign all displayed appointments
  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    const newAssignments: AssignmentMap = {};

    for (const appt of displayAppointments) {
      try {
        const selectedDoc = staff.find((s) => s.id === selectedDoctorId);
        const specParam = selectedDoc?.specialization
          ? `&specialization=${encodeURIComponent(selectedDoc.specialization)}`
          : "";
        const res = await fetch(
          `/api/doctors/available?date=${appt.date}&time=${appt.time}&excludeDoctorId=${selectedDoctorId}${specParam}`
        );
        if (res.ok) {
          const data: AvailableDoctor[] = await res.json();
          setAvailableDoctors((prev) => ({ ...prev, [appt.id]: data }));
          // Pick the first available doctor (already sorted by priority from API)
          const best = data.find((d) => d.available);
          if (best) {
            newAssignments[appt.id] = best.id;
          }
        }
      } catch {
        /* skip */
      }
    }

    setAssignments((prev) => ({ ...prev, ...newAssignments }));
    setAutoAssigning(false);

    const assigned = Object.keys(newAssignments).length;
    const unassigned = displayAppointments.length - assigned;
    if (unassigned > 0) {
      showToast(`Auto-assigned ${assigned} appointments. ${unassigned} need manual handling.`, "err");
    } else {
      showToast(`Auto-assigned all ${assigned} appointments`);
    }
  };

  // Reassign selected or all
  const handleReassign = async () => {
    // Determine which appointments to reassign
    const toReassign: Array<{ appointmentId: string; newDoctorId: string }> = [];

    if (bulkTargetId && selectedIds.size > 0) {
      // Bulk reassign selected to one doctor
      for (const apptId of selectedIds) {
        toReassign.push({ appointmentId: apptId, newDoctorId: bulkTargetId });
      }
    } else {
      // Individual assignments
      for (const [apptId, docId] of Object.entries(assignments)) {
        if (docId) {
          toReassign.push({ appointmentId: apptId, newDoctorId: docId });
        }
      }
    }

    if (toReassign.length === 0) {
      showToast("No appointments selected for reassignment", "err");
      return;
    }

    // Group by newDoctorId for batch calls
    const byDoctor: Record<string, string[]> = {};
    for (const item of toReassign) {
      if (!byDoctor[item.newDoctorId]) byDoctor[item.newDoctorId] = [];
      byDoctor[item.newDoctorId].push(item.appointmentId);
    }

    setReassigning(true);
    let totalReassigned = 0;
    let totalFailed = 0;
    const allErrors: Array<{ appointmentId: string; error: string }> = [];

    for (const [docId, apptIds] of Object.entries(byDoctor)) {
      try {
        const res = await fetch("/api/appointments/reassign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentIds: apptIds,
            newDoctorId: docId,
            reason: "Bulk reassignment from admin",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          totalReassigned += data.reassigned;
          totalFailed += data.failed;
          allErrors.push(...data.errors);
        } else {
          totalFailed += apptIds.length;
        }
      } catch {
        totalFailed += apptIds.length;
      }
    }

    setResult({ reassigned: totalReassigned, failed: totalFailed, errors: allErrors });
    setReassigning(false);

    if (totalReassigned > 0) {
      showToast(`Reassigned ${totalReassigned} appointments`);
      // Refresh
      fetchAppointments();
    }
    if (totalFailed > 0) {
      showToast(`${totalFailed} appointments failed to reassign`, "err");
    }
  };

  const toggleSelectAll = () => {
    if (selectedAll) {
      setSelectedIds(new Set());
      setSelectedAll(false);
    } else {
      setSelectedIds(new Set(displayAppointments.map((a) => a.id)));
      setSelectedAll(true);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-[200] px-4 py-3 rounded shadow-lg yoda-slide-in"
          style={{
            background: toast.type === "ok" ? "#e8f5e9" : "#ffebee",
            color: toast.type === "ok" ? "#2e7d32" : "var(--red)",
            border: `1px solid ${toast.type === "ok" ? "#a5d6a7" : "#ef9a9a"}`,
          }}
        >
          <p className="text-[15px] font-semibold">{toast.msg}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <a
            href="/admin/staff"
            className="text-[13px] font-semibold mb-2 inline-flex items-center gap-1"
            style={{ color: "var(--blue-500)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Staff List
          </a>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
            Appointment Reassignment
          </h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            Reassign appointments when a doctor is unavailable or leaving
          </p>
        </div>
      </div>

      {/* Selection controls */}
      <div className="p-5 mb-5" style={cardStyle}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Doctor select */}
          <div>
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
              Staff Member
            </label>
            {loadingStaff ? (
              <div className="h-10 animate-pulse" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-sm)" }} />
            ) : (
              <select
                value={selectedDoctorId}
                onChange={(e) => {
                  setSelectedDoctorId(e.target.value);
                  setAppointments([]);
                  setResult(null);
                }}
                className="w-full px-3 py-2"
                style={inputStyle}
              >
                <option value="">Select doctor/therapist...</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date from */}
          <div>
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2"
              style={inputStyle}
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2"
              style={inputStyle}
            />
          </div>

          {/* Search button */}
          <div className="flex items-end">
            <button
              onClick={fetchAppointments}
              disabled={!selectedDoctorId || !dateFrom || !dateTo || loading}
              className="w-full px-4 py-2 text-[15px] font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
            >
              {loading ? "Loading..." : "Find Appointments"}
            </button>
          </div>
        </div>

        {/* Only conflicting toggle */}
        {appointments.length > 0 && leaves.length > 0 && (
          <div className="flex items-center gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--grey-200)" }}>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={onlyConflicting}
                onChange={(e) => setOnlyConflicting(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--blue-500)]" />
            </label>
            <span className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>
              Show only appointments during leave periods
            </span>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div
          className="p-4 mb-5"
          style={{
            ...cardStyle,
            background: result.failed > 0 ? "#fffbeb" : "#e8f5e9",
            borderColor: result.failed > 0 ? "#fde68a" : "#a5d6a7",
          }}
        >
          <p className="text-[15px] font-semibold" style={{ color: result.failed > 0 ? "#92400e" : "#2e7d32" }}>
            Reassignment complete: {result.reassigned} succeeded, {result.failed} failed
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errors.map((e, i) => (
                <li key={i} className="text-[13px]" style={{ color: "#dc2626" }}>
                  {e.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Appointments table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse" style={{ background: "var(--grey-200)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      ) : appointments.length > 0 ? (
        <div style={cardStyle}>
          {/* Action bar */}
          <div className="p-4 flex flex-wrap items-center gap-3" style={{ borderBottom: "1px solid var(--grey-200)" }}>
            <span className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>
              {displayAppointments.length} appointment{displayAppointments.length !== 1 ? "s" : ""} found
            </span>
            <div className="flex-1" />

            <button
              onClick={handleAutoAssign}
              disabled={autoAssigning || displayAppointments.length === 0}
              className="px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50"
              style={{ background: "#ecfdf5", color: "#059669", borderRadius: "var(--radius-sm)", border: "1px solid #a7f3d0" }}
            >
              {autoAssigning ? "Assigning..." : "Auto-assign All"}
            </button>

            {/* Bulk reassign controls */}
            <div className="flex items-center gap-2">
              <select
                value={bulkTargetId}
                onChange={(e) => setBulkTargetId(e.target.value)}
                className="px-2 py-1.5 text-[13px]"
                style={inputStyle}
              >
                <option value="">Bulk target...</option>
                {staff
                  .filter((s) => s.id !== selectedDoctorId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleReassign}
                disabled={reassigning || (selectedIds.size === 0 && Object.keys(assignments).length === 0)}
                className="px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
              >
                {reassigning ? "Reassigning..." : "Reassign"}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedAll}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--grey-600)" }}>Date</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--grey-600)" }}>Time</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--grey-600)" }}>Patient</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--grey-600)" }}>Treatment</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--grey-600)" }}>Status</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--grey-600)" }}>Leave?</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--grey-600)" }}>Reassign To</th>
                </tr>
              </thead>
              <tbody>
                {displayAppointments.map((appt) => {
                  const onLeaveDay = isOnLeave(appt.date);
                  return (
                    <tr
                      key={appt.id}
                      style={{
                        borderBottom: "1px solid var(--grey-200)",
                        background: onLeaveDay ? "#fef2f2" : "var(--white)",
                      }}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(appt.id)}
                          onChange={() => toggleSelect(appt.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--grey-900)" }}>
                        {new Date(appt.date + "T00:00:00").toLocaleDateString("en-SG", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: "var(--grey-700)" }}>
                        {appt.time}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--grey-900)" }}>
                        {appt.patientName}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--grey-600)" }}>
                        {appt.treatmentName || appt.type}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                          style={{
                            borderRadius: "var(--radius-pill)",
                            background: appt.status === "confirmed" ? "#ecfdf5" : "#eff6ff",
                            color: appt.status === "confirmed" ? "#059669" : "#2563eb",
                          }}
                        >
                          {appt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {onLeaveDay ? (
                          <span
                            className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                            style={{ borderRadius: "var(--radius-pill)", background: "#fef2f2", color: "#dc2626" }}
                          >
                            On Leave
                          </span>
                        ) : (
                          <span className="text-[12px]" style={{ color: "var(--grey-400)" }}>No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {availableDoctors[appt.id] ? (
                            <select
                              value={assignments[appt.id] || ""}
                              onChange={(e) =>
                                setAssignments((prev) => ({ ...prev, [appt.id]: e.target.value }))
                              }
                              className="px-2 py-1 text-[13px] min-w-[140px]"
                              style={inputStyle}
                            >
                              <option value="">Select...</option>
                              {availableDoctors[appt.id].map((d) => (
                                <option key={d.id} value={d.id} disabled={!d.available}>
                                  {d.name} {d.specialization ? `(${d.specialization})` : ""}{" "}
                                  {!d.available ? "- Busy" : ""}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => fetchAvailableForAppointment(appt)}
                              disabled={loadingSlots[appt.id]}
                              className="px-2 py-1 text-[12px] font-semibold"
                              style={{
                                background: "var(--grey-100)",
                                color: "var(--grey-700)",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--grey-300)",
                              }}
                            >
                              {loadingSlots[appt.id] ? "..." : "Find"}
                            </button>
                          )}
                          {assignments[appt.id] && (
                            <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#059669" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {displayAppointments.length === 0 && appointments.length > 0 && (
            <div className="py-8 text-center">
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>
                No appointments conflict with leave periods. Disable the filter to see all appointments.
              </p>
            </div>
          )}
        </div>
      ) : selectedDoctorId && dateFrom && dateTo && !loading ? (
        <div className="py-16 text-center" style={cardStyle}>
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No active appointments found</p>
          <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>
            No scheduled or confirmed appointments in this date range
          </p>
        </div>
      ) : null}
    </div>
  );
}
