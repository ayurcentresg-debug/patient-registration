"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

/* ─── Types ─── */
interface CMEEvent {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  status: string;
  startDate: string;
  endDate: string | null;
  mode: string;
  maxAttendees: number | null;
  registrationFee: number | null;
  cmeCredits: number | null;
  _count?: { registrations: number };
  registrationCount?: number;
}

interface Stats {
  totalEvents: number;
  upcomingEvents: number;
  totalRegistrations: number;
  totalSpeakers: number;
}

const STATUS_BADGE_CLASSES: Record<string, { bg: string; text: string; label: string }> = {
  draft:     { bg: "bg-gray-700",       text: "text-gray-400",    label: "Draft" },
  published: { bg: "bg-emerald-900",    text: "text-emerald-400", label: "Published" },
  live:      { bg: "bg-amber-900/60",   text: "text-amber-400",   label: "Live" },
  completed: { bg: "bg-blue-900/60",    text: "text-blue-400",    label: "Completed" },
  cancelled: { bg: "bg-red-900/60",     text: "text-red-400",     label: "Cancelled" },
};

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "cme", label: "CME" },
  { value: "webinar", label: "Webinar" },
  { value: "workshop", label: "Workshop" },
  { value: "conference", label: "Conference" },
  { value: "seminar", label: "Seminar" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "live", label: "Live" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STAT_ACCENT_CLASSES: Record<string, string> = {
  "Total Events":   "text-amber-400",
  "Upcoming":       "text-emerald-400",
  "Registrations":  "text-blue-400",
  "Speakers":       "text-violet-400",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CMEAdminDashboard() {
  const [events, setEvents] = useState<CMEEvent[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    upcomingEvents: 0,
    totalRegistrations: 0,
    totalSpeakers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);

      const res = await fetch(`/api/cme/events?${params}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();

      setEvents(data.events || []);
      setStats(
        data.stats || {
          totalEvents: data.events?.length || 0,
          upcomingEvents: 0,
          totalRegistrations: 0,
          totalSpeakers: 0,
        }
      );
      setError("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load events";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function togglePublish(id: string, currentStatus: string) {
    setActionLoading(id);
    try {
      const newStatus = currentStatus === "published" ? "draft" : "published";
      const res = await fetch(`/api/cme/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchData();
    } catch {
      /* silent */
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading CME events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center flex-col gap-3">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchData}
          className="px-5 py-2 text-sm rounded-lg border border-amber-500 bg-transparent text-amber-500 cursor-pointer hover:bg-amber-500/10 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-50">
            CME / Webinar Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your continuing medical education events and webinars
          </p>
        </div>
        <Link
          href="/cme/admin/events/new"
          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-900 rounded-lg font-bold text-sm inline-block text-center no-underline transition-all shrink-0"
        >
          + Create Event
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: "Total Events",  value: stats.totalEvents,        icon: "\ud83d\udccb" },
          { label: "Upcoming",      value: stats.upcomingEvents,     icon: "\ud83d\udcc5" },
          { label: "Registrations", value: stats.totalRegistrations, icon: "\ud83d\udc65" },
          { label: "Speakers",      value: stats.totalSpeakers,      icon: "\ud83c\udfa4" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4"
          >
            <span className="text-2xl sm:text-3xl">{s.icon}</span>
            <div>
              <p className={`text-xl sm:text-2xl font-extrabold leading-none ${STAT_ACCENT_CLASSES[s.label] || "text-amber-400"}`}>
                {s.value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-200 cursor-pointer outline-none focus:border-amber-500 transition-colors"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-200 cursor-pointer outline-none focus:border-amber-500 transition-colors"
        >
          {CATEGORIES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500 ml-2">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Events — Empty State */}
      {events.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl py-12 px-6 text-center">
          <p className="text-4xl mb-2">{"\ud83d\udced"}</p>
          <p className="text-gray-400 text-sm mb-4">No events found</p>
          <Link
            href="/cme/admin/events/new"
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-900 rounded-lg font-bold text-sm no-underline inline-block transition-all"
          >
            Create your first event
          </Link>
        </div>
      ) : (
        <>
          {/* ── Desktop Table (md+) ── */}
          <div className="hidden md:block bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  {["Event", "Date", "Category", "Status", "Registrations", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => {
                  const badge = STATUS_BADGE_CLASSES[evt.status] || STATUS_BADGE_CLASSES.draft;
                  const regCount = evt._count?.registrations ?? evt.registrationCount ?? 0;

                  return (
                    <tr key={evt.id} className="border-b border-gray-800 hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-50 mb-0.5">{evt.title}</div>
                        {evt.subtitle && (
                          <div className="text-xs text-gray-500">{evt.subtitle}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-300 whitespace-nowrap">
                        {fmtDateTime(evt.startDate)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-700 text-gray-300 capitalize">
                          {evt.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide ${badge.bg} ${badge.text}`}
                        >
                          {evt.status === "live" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                          )}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-300">
                        <span className="font-bold">{regCount}</span>
                        {evt.maxAttendees && (
                          <span className="text-gray-500"> / {evt.maxAttendees}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1.5">
                          <Link
                            href={`/cme/admin/events/${evt.id}`}
                            className="px-3 py-1 text-xs font-semibold rounded-md border border-amber-500 text-amber-500 hover:bg-amber-500/10 no-underline transition-colors"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/cme/admin/events/${evt.id}/registrations`}
                            className="px-3 py-1 text-xs font-semibold rounded-md border border-blue-400 text-blue-400 hover:bg-blue-400/10 no-underline transition-colors"
                          >
                            Registrations
                          </Link>
                          <button
                            onClick={() => togglePublish(evt.id, evt.status)}
                            disabled={actionLoading === evt.id}
                            className={`px-3 py-1 text-xs font-semibold rounded-md border bg-transparent transition-colors ${
                              evt.status === "published"
                                ? "border-gray-500 text-gray-500 hover:bg-gray-500/10"
                                : "border-emerald-400 text-emerald-400 hover:bg-emerald-400/10"
                            } ${actionLoading === evt.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            {evt.status === "published" ? "Unpublish" : "Publish"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards (< md) ── */}
          <div className="md:hidden flex flex-col gap-3">
            {events.map((evt) => {
              const badge = STATUS_BADGE_CLASSES[evt.status] || STATUS_BADGE_CLASSES.draft;
              const regCount = evt._count?.registrations ?? evt.registrationCount ?? 0;

              return (
                <div
                  key={evt.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3"
                >
                  {/* Title + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-50 text-sm truncate">{evt.title}</h3>
                      {evt.subtitle && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{evt.subtitle}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wide shrink-0 ${badge.bg} ${badge.text}`}
                    >
                      {evt.status === "live" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                      )}
                      {badge.label}
                    </span>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span>{fmtDateTime(evt.startDate)}</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 capitalize font-medium">
                      {evt.category}
                    </span>
                    <span>
                      <span className="font-bold text-gray-300">{regCount}</span>
                      {evt.maxAttendees && <span> / {evt.maxAttendees}</span>}
                      {" "}reg
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/cme/admin/events/${evt.id}`}
                      className="flex-1 text-center px-3 py-1.5 text-xs font-semibold rounded-md border border-amber-500 text-amber-500 hover:bg-amber-500/10 no-underline transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/cme/admin/events/${evt.id}/registrations`}
                      className="flex-1 text-center px-3 py-1.5 text-xs font-semibold rounded-md border border-blue-400 text-blue-400 hover:bg-blue-400/10 no-underline transition-colors"
                    >
                      Registrations
                    </Link>
                    <button
                      onClick={() => togglePublish(evt.id, evt.status)}
                      disabled={actionLoading === evt.id}
                      className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md border bg-transparent transition-colors ${
                        evt.status === "published"
                          ? "border-gray-500 text-gray-500 hover:bg-gray-500/10"
                          : "border-emerald-400 text-emerald-400 hover:bg-emerald-400/10"
                      } ${actionLoading === evt.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {evt.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
