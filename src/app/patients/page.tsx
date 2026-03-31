"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { PageGuide } from "@/components/HelpTip";
import { PatientListSkeleton } from "@/components/Skeleton";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Patient {
  id: string;
  patientIdNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  gender: string;
  bloodGroup: string | null;
  status: string;
  createdAt: string;
  _count: { appointments: number; communications: number };
}

type SortField = "name" | "createdAt" | "status" | "gender";
type SortDir = "asc" | "desc";

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" };
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)" };
const chipBase = "inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide";

// ─── Utility: format date consistently (avoids hydration mismatches) ────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// ─── Filter Chip Component ──────────────────────────────────────────────────
function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 text-[13px] font-semibold transition-all duration-150"
      style={{
        borderRadius: "var(--radius-pill)",
        border: active ? "1.5px solid var(--blue-500)" : "1px solid var(--grey-300)",
        background: active ? "var(--blue-50)" : "var(--white)",
        color: active ? "var(--blue-500)" : "var(--grey-600)",
      }}
    >
      {label}
    </button>
  );
}

// ─── Sort Header Component (clickable table headers) ────────────────────────
function SortHeader({ label, field, currentField, direction, onSort }: {
  label: string; field: SortField; currentField: SortField; direction: SortDir; onSort: (f: SortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <th
      className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider cursor-pointer select-none"
      style={{ color: isActive ? "var(--blue-500)" : "var(--grey-600)" }}
      onClick={() => onSort(field)}
      role="columnheader"
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
            {direction === "asc"
              ? <path d="M6 2l4 5H2z" />  /* ▲ */
              : <path d="M6 10l4-5H2z" /> /* ▼ */
            }
          </svg>
        )}
      </span>
    </th>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");

  // Sorting — default: newest first
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ─── Data fetching with debounced search ────────────────────────────────
  const fetchPatients = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    // Send status filter to API if not "all" (server-side filtering for performance)
    if (statusFilter !== "all") params.set("status", statusFilter);

    fetch(`/api/patients?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then(setPatients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timeout);
  }, [fetchPatients]);

  // ─── Client-side sorting & gender filter (fast for typical patient counts) ─
  const filteredAndSorted = useMemo(() => {
    let result = [...patients];

    // Gender filter (client-side since API doesn't support it yet)
    if (genderFilter !== "all") {
      result = result.filter((p) => p.gender === genderFilter);
    }

    // Sort
    result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "name":
          return dir * (`${a.firstName} ${a.lastName}`).localeCompare(`${b.firstName} ${b.lastName}`);
        case "createdAt":
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "status":
          return dir * a.status.localeCompare(b.status);
        case "gender":
          return dir * a.gender.localeCompare(b.gender);
        default:
          return 0;
      }
    });

    return result;
  }, [patients, genderFilter, sortField, sortDir]);

  // ─── Sort toggle handler ────────────────────────────────────────────────
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // ─── Summary counts (derived from full list before gender filter) ───────
  const activeCount = patients.filter((p) => p.status === "active").length;
  const totalFetched = patients.length;
  const displayedCount = filteredAndSorted.length;

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Patients</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {displayedCount === totalFetched
              ? `${totalFetched} total patients`
              : `${displayedCount} of ${totalFetched} patients`
            }
            {activeCount > 0 && ` · ${activeCount} active`}
          </p>
        </div>
        <Link
          href="/patients/new"
          className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
          style={btnPrimary}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Register Patient
        </Link>
      </div>

      <PageGuide
        storageKey="patients"
        title="Patient Management Guide"
        subtitle="Register, track, and manage all your clinic patients."
        steps={[
          { icon: "➕", title: "Register New Patient", description: "Click 'Register Patient' to add a new patient. A unique Patient ID (e.g., P10001) is generated automatically." },
          { icon: "📋", title: "Patient Profile", description: "Click any patient to view their full profile — appointments, clinical notes, prescriptions, billing, and more." },
          { icon: "🔍", title: "Search & Filter", description: "Search by name, phone, or patient ID. Filter by status (Active/Inactive) or gender using the chips below." },
          { icon: "📂", title: "Patient Sidebar Tabs", description: "Each patient has 3 sections: Patient (profile, appointments), EMR (clinical notes, prescriptions, vitals), and Billing (invoices, payments)." },
          { icon: "💰", title: "Patient Billing", description: "Create invoices directly from a patient's profile using the Invoices tab > New Invoice button." },
          { icon: "📱", title: "Communications", description: "Send SMS/WhatsApp reminders to patients from their Communications tab." },
        ]}
      />

      {/* ── Search + Filters Row ────────────────────────────────── */}
      <div className="mb-5 space-y-3">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, phone, email, or patient ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-[400px] pl-10 pr-4 py-2 text-[15px]"
            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" }}
            aria-label="Search patients"
          />
          {/* Clear search button */}
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center"
              style={{ color: "var(--grey-500)" }}
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[13px] font-bold uppercase tracking-wide mr-1" style={{ color: "var(--grey-500)" }}>Status:</span>
          {["all", "active", "inactive"].map((s) => (
            <FilterChip key={s} label={s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
          ))}
          <span className="text-[13px] font-bold uppercase tracking-wide ml-3 mr-1" style={{ color: "var(--grey-500)" }}>Gender:</span>
          {["all", "male", "female", "other"].map((g) => (
            <FilterChip key={g} label={g === "all" ? "All" : g.charAt(0).toUpperCase() + g.slice(1)} active={genderFilter === g} onClick={() => setGenderFilter(g)} />
          ))}
        </div>
      </div>

      {/* ── Error State ─────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 flex items-center justify-between" style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="text-[15px] font-medium">Failed to load patients: {error}</p>
          <button onClick={fetchPatients} className="text-[14px] font-semibold underline">Retry</button>
        </div>
      )}

      {/* ── Loading State ───────────────────────────────────────── */}
      {loading ? (
        <PatientListSkeleton />
      ) : filteredAndSorted.length === 0 ? (
        /* ── Empty State ─────────────────────────────────────────── */
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>
            {search || statusFilter !== "all" || genderFilter !== "all" ? "No patients match your filters" : "No patients found"}
          </p>
          {(search || statusFilter !== "all" || genderFilter !== "all") ? (
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); setGenderFilter("all"); }}
              className="text-[14px] font-semibold mt-2 hover:underline"
              style={{ color: "var(--blue-500)" }}
            >
              Clear all filters
            </button>
          ) : (
            <Link href="/patients/new" className="text-[14px] font-semibold mt-2 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>
              Register your first patient
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop Table ─────────────────────────────────────── */}
          <div className="hidden md:block overflow-hidden" style={cardStyle}>
            <table className="w-full" role="table">
              <thead style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                <tr>
                  <SortHeader label="Patient" field="name" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Contact</th>
                  <SortHeader label="Gender" field="gender" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Status" field="status" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Registered" field="createdAt" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((p, i) => (
                  <tr
                    key={p.id}
                    className="transition-colors duration-100 group"
                    style={{ borderBottom: i < filteredAndSorted.length - 1 ? "1px solid var(--grey-200)" : "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/patients/${p.id}`} className="flex items-center gap-3 group/link">
                        <div
                          className="w-8 h-8 flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                          style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}
                        >
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold group-hover/link:underline" style={{ color: "var(--grey-900)" }}>
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{p.patientIdNumber || p.id.slice(0, 8)}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[15px]" style={{ color: "var(--grey-800)" }}>{p.phone}</p>
                      {p.email && <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{p.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-[15px] capitalize" style={{ color: "var(--grey-800)" }}>{p.gender}</td>
                    <td className="px-4 py-3">
                      <span
                        className={chipBase}
                        style={{
                          borderRadius: "var(--radius-sm)",
                          background: p.status === "active" ? "var(--green-light)" : "var(--grey-200)",
                          color: p.status === "active" ? "var(--green)" : "var(--grey-600)",
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/patients/${p.id}`} className="text-[14px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ───────────────────────────────────────── */}
          <div className="md:hidden space-y-2">
            {filteredAndSorted.map((p) => (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="block p-4 transition-shadow duration-150 active:shadow-md"
                style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 flex items-center justify-center text-[13px] font-bold"
                      style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}
                    >
                      {p.firstName[0]}{p.lastName[0]}
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold" style={{ color: "var(--grey-900)" }}>{p.firstName} {p.lastName}</p>
                      <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>{p.phone}</p>
                    </div>
                  </div>
                  <span
                    className={chipBase}
                    style={{
                      borderRadius: "var(--radius-sm)",
                      background: p.status === "active" ? "var(--green-light)" : "var(--grey-200)",
                      color: p.status === "active" ? "var(--green)" : "var(--grey-600)",
                    }}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="flex gap-4 mt-2 ml-12">
                  <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>Appts: {p._count.appointments}</span>
                  <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>Msgs: {p._count.communications}</span>
                  <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>{formatDate(p.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
