"use client";

/**
 * Patient Branch History — chronological timeline of every visit grouped
 * by branch. Useful for doctors reviewing care continuity across locations.
 *
 * Route: /patients/[id]/branches
 */

import React, { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/formatters";

interface AppointmentRow {
  id: string;
  date: string;
  time: string;
  doctor: string;
  status: string;
  reason?: string | null;
  branchId?: string | null;
}

interface PatientShape {
  id: string;
  firstName: string;
  lastName: string;
  patientIdNumber: string;
  appointments: AppointmentRow[];
}

interface BranchInfo { id: string; name: string; address: string | null; isMainBranch?: boolean }

const STATUS_COLOR: Record<string, string> = {
  scheduled: "#d00d00",
  confirmed: "#2d6a4f",
  "in-progress": "#f97c00",
  completed: "#028901",
  cancelled: "#909090",
  "no-show": "#b125c0",
};

export default function PatientBranchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [patient, setPatient] = useState<PatientShape | null>(null);
  const [branches, setBranches] = useState<Record<string, BranchInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/patients/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: PatientShape | null) => setPatient(data))
      .finally(() => setLoading(false));
    fetch("/api/branches?active=true")
      .then(r => (r.ok ? r.json() : []))
      .then((data: BranchInfo[]) => {
        const map: Record<string, BranchInfo> = {};
        if (Array.isArray(data)) data.forEach(b => { map[b.id] = b; });
        setBranches(map);
      })
      .catch(() => {});
  }, [id]);

  // Group appointments by branch (most-visited first), with chronological list per branch
  const grouped = useMemo(() => {
    if (!patient?.appointments) return [];
    const map: Record<string, AppointmentRow[]> = {};
    let unassignedCount = 0;
    for (const a of patient.appointments) {
      const key = a.branchId || "_unassigned";
      if (!map[key]) map[key] = [];
      map[key].push(a);
      if (!a.branchId) unassignedCount++;
    }
    // Sort each group's appointments by date desc
    Object.values(map).forEach(list => list.sort((x, y) => (x.date < y.date ? 1 : -1)));
    // Sort groups by visit count desc; unassigned last
    const groupArr = Object.entries(map)
      .map(([branchId, appts]) => ({
        branchId,
        branchName: branchId === "_unassigned" ? "(Unassigned — legacy data)" : branches[branchId]?.name || "(Deleted branch)",
        branchAddress: branchId === "_unassigned" ? null : branches[branchId]?.address || null,
        isUnassigned: branchId === "_unassigned",
        appts,
        firstVisit: appts[appts.length - 1]?.date,
        lastVisit: appts[0]?.date,
      }))
      .sort((a, b) => {
        if (a.isUnassigned !== b.isUnassigned) return a.isUnassigned ? 1 : -1;
        return b.appts.length - a.appts.length;
      });
    return { groupArr, unassignedCount };
  }, [patient?.appointments, branches]);

  if (loading) return <div className="p-8"><p className="text-[14px]" style={{ color: "var(--grey-500)" }}>Loading…</p></div>;
  if (!patient) return <div className="p-8"><p className="text-[14px]" style={{ color: "var(--red)" }}>Patient not found</p></div>;

  const totalVisits = patient.appointments.length;
  const groups = grouped && "groupArr" in grouped ? grouped.groupArr : [];

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div className="mb-6">
        <Link href={`/patients/${id}`} className="text-[13px] font-semibold inline-flex items-center gap-1" style={{ color: "var(--blue-500)" }}>
          ← Back to patient profile
        </Link>
        <h1 className="text-[24px] font-bold tracking-tight mt-2" style={{ color: "var(--grey-900)" }}>
          Branch Visit History
        </h1>
        <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-500)" }}>
          {patient.firstName} {patient.lastName} · {patient.patientIdNumber} · {totalVisits} total visit{totalVisits !== 1 ? "s" : ""} across {groups.length} branch{groups.length !== 1 ? "es" : ""}
        </p>
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="p-8 text-center rounded-md" style={{ background: "var(--white)", border: "1px solid var(--grey-200)" }}>
          <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No appointments yet for this patient.</p>
        </div>
      )}

      {/* Per-branch sections */}
      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.branchId} className="p-5 rounded-md" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-start justify-between gap-3 mb-3 pb-3" style={{ borderBottom: "1px solid var(--grey-200)" }}>
              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] font-bold flex items-center gap-2" style={{ color: g.isUnassigned ? "var(--grey-500)" : "var(--grey-900)" }}>
                  🏢 {g.branchName}
                </h2>
                {g.branchAddress && (
                  <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>{g.branchAddress}</p>
                )}
                <p className="text-[12px] mt-1" style={{ color: "var(--grey-400)" }}>
                  First visit: {formatDate(g.firstVisit)} · Last visit: {formatDate(g.lastVisit)}
                </p>
              </div>
              <span className="px-2 py-1 text-[12px] font-bold rounded flex-shrink-0" style={{ background: g.isUnassigned ? "var(--grey-100)" : "#dcfce7", color: g.isUnassigned ? "var(--grey-600)" : "#166534" }}>
                {g.appts.length} visit{g.appts.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Visits list */}
            <ul className="space-y-2">
              {g.appts.map(a => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded text-[13px] hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-semibold flex-shrink-0 w-[110px]" style={{ color: "var(--grey-700)" }}>{formatDate(a.date)}</span>
                    <span className="font-bold flex-shrink-0 w-[60px]" style={{ color: "var(--blue-500)" }}>{a.time}</span>
                    <span className="truncate" style={{ color: "var(--grey-800)" }}>{a.doctor}</span>
                    {a.reason && <span className="text-[12px] truncate hidden md:inline" style={{ color: "var(--grey-500)" }}>· {a.reason}</span>}
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0" style={{ background: `${STATUS_COLOR[a.status] || "#9baa9f"}18`, color: STATUS_COLOR[a.status] || "#9baa9f" }}>
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
