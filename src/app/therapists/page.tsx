"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Therapist {
  id: string;
  name: string;
  gender: string | null;
  specialization: string;
  department: string;
  phone: string | null;
  email: string | null;
  consultationFee: number | null;
  slotDuration: number | null;
  status: string;
  createdAt: string;
}

type SortField = "name" | "department" | "specialization" | "fee" | "status";
type SortDir = "asc" | "desc";

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" };
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)" };
const chipBase = "inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";
const inputStyle = { border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", fontSize: "13px" };

const DEPARTMENTS = [
  "Panchakarma", "General Ayurveda", "Kayachikitsa", "Yoga & Naturopathy", "Marma Therapy",
];

// ─── Sort Header Component ──────────────────────────────────────────────────
function SortHeader({ label, field, currentField, direction, onSort }: {
  label: string; field: SortField; currentField: SortField; direction: SortDir; onSort: (f: SortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <th
      className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none"
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
              ? <path d="M6 2l4 5H2z" />
              : <path d="M6 10l4-5H2z" />
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
export default function TherapistsPage() {
  const [mounted, setMounted] = useState(false);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Hydration guard
  useEffect(() => { setMounted(true); }, []);

  // ─── Data fetching ────────────────────────────────────────────────────
  const fetchTherapists = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("role", "therapist");
    if (search) params.set("search", search);
    if (departmentFilter !== "all") {
      params.set("department", departmentFilter);
      params.set("status", "active");
    }

    fetch(`/api/doctors?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then(setTherapists)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, departmentFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchTherapists, 300);
    return () => clearTimeout(timeout);
  }, [fetchTherapists]);

  // ─── Client-side sorting ──────────────────────────────────────────────
  const sorted = useMemo(() => {
    const result = [...therapists];
    result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "department":
          return dir * a.department.localeCompare(b.department);
        case "specialization":
          return dir * a.specialization.localeCompare(b.specialization);
        case "fee":
          return dir * ((a.consultationFee ?? 0) - (b.consultationFee ?? 0));
        case "status":
          return dir * a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    return result;
  }, [therapists, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const activeCount = therapists.filter((d) => d.status === "active").length;

  if (!mounted) return null;

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Ayurveda Therapists</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {sorted.length} total therapists{activeCount > 0 && ` \u00b7 ${activeCount} active`}
          </p>
        </div>
        <Link
          href="/therapists/new"
          className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[13px] font-semibold transition-colors duration-150"
          style={btnPrimary}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Therapist
        </Link>
      </div>

      {/* ── Search + Department Filter ────────────────────────────── */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-[400px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by therapist name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-[13px]"
            style={inputStyle}
            aria-label="Search therapists"
          />
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

        {/* Department dropdown */}
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-3 py-2 text-[13px] sm:w-[200px]"
          style={inputStyle}
          aria-label="Filter by department"
        >
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* ── Error State ─────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 flex items-center justify-between" style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="text-[13px] font-medium">Failed to load therapists: {error}</p>
          <button onClick={fetchTherapists} className="text-[12px] font-semibold underline">Retry</button>
        </div>
      )}

      {/* ── Loading State ───────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        /* ── Empty State ─────────────────────────────────────────── */
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>
            {search || departmentFilter !== "all" ? "No therapists match your filters" : "No therapists found"}
          </p>
          {(search || departmentFilter !== "all") ? (
            <button
              onClick={() => { setSearch(""); setDepartmentFilter("all"); }}
              className="text-[12px] font-semibold mt-2 hover:underline"
              style={{ color: "var(--blue-500)" }}
            >
              Clear all filters
            </button>
          ) : (
            <Link href="/therapists/new" className="text-[12px] font-semibold mt-2 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>
              Add your first therapist
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
                  <SortHeader label="Therapist" field="name" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Gender</th>
                  <SortHeader label="Specialization" field="specialization" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Department" field="department" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Therapy Fee" field="fee" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Status" field="status" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((d, i) => (
                  <tr
                    key={d.id}
                    className="transition-colors duration-100 group"
                    style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--grey-200)" : "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/therapists/${d.id}`} className="flex items-center gap-3 group/link">
                        <div
                          className="w-8 h-8 flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}
                        >
                          {d.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold group-hover/link:underline" style={{ color: "var(--grey-900)" }}>
                            {d.name}
                          </p>
                          {d.phone && <p className="text-[11px]" style={{ color: "var(--grey-500)" }}>{d.phone}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {d.gender ? (
                        <span className="text-[12px] font-semibold px-2 py-0.5 rounded" style={{
                          background: d.gender === "male" ? "#dbeafe" : "#fce7f3",
                          color: d.gender === "male" ? "#1d4ed8" : "#be185d",
                        }}>
                          {d.gender === "male" ? "♂ Male" : "♀ Female"}
                        </span>
                      ) : (
                        <span className="text-[11px]" style={{ color: "var(--grey-400)" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: "var(--grey-800)" }}>{d.specialization}</td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] px-2 py-0.5" style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>
                        {d.department}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium" style={{ color: "var(--grey-800)" }}>
                      {d.consultationFee != null ? `$${d.consultationFee}` : "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={chipBase}
                        style={{
                          borderRadius: "var(--radius-sm)",
                          background: d.status === "active" ? "var(--green-light)" : "var(--grey-200)",
                          color: d.status === "active" ? "var(--green)" : "var(--grey-600)",
                        }}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={chipBase}
                        style={{
                          borderRadius: "var(--radius-sm)",
                          background: "#f3e8ff",
                          color: "#7c3aed",
                        }}
                      >
                        Therapist
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/therapists/${d.id}`} className="text-[12px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>
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
            {sorted.map((d) => (
              <Link
                key={d.id}
                href={`/therapists/${d.id}`}
                className="block p-4 transition-shadow duration-150 active:shadow-md"
                style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 flex items-center justify-center text-[11px] font-bold"
                      style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}
                    >
                      {d.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{d.name}</p>
                      <p className="text-[12px]" style={{ color: "var(--grey-600)" }}>{d.specialization}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={chipBase}
                      style={{
                        borderRadius: "var(--radius-sm)",
                        background: d.status === "active" ? "var(--green-light)" : "var(--grey-200)",
                        color: d.status === "active" ? "var(--green)" : "var(--grey-600)",
                      }}
                    >
                      {d.status}
                    </span>
                    <span
                      className={chipBase}
                      style={{
                        borderRadius: "var(--radius-sm)",
                        background: "#f3e8ff",
                        color: "#7c3aed",
                      }}
                    >
                      Therapist
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 ml-12">
                  <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>{d.department}</span>
                  <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>
                    {d.consultationFee != null ? `$${d.consultationFee}` : "No fee set"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
