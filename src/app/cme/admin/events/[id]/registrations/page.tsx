"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

/* ─── Types ─── */
interface Registration {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  status: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  registeredAt: string;
  paymentStatus: string | null;
}

interface EventSummary {
  id: string;
  title: string;
  startDate: string;
  status: string;
  maxAttendees: number | null;
  registrationCount: number;
}

const STATUS_BADGE: Record<string, string> = {
  confirmed: "bg-emerald-900 text-emerald-400",
  pending: "bg-yellow-900 text-yellow-400",
  cancelled: "bg-red-900 text-red-400",
  waitlisted: "bg-blue-900 text-blue-400",
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

export default function EventRegistrationsPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [checkInLoading, setCheckInLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [eventRes, regRes] = await Promise.all([
        fetch(`/api/cme/events/${eventId}`),
        fetch(`/api/cme/events/${eventId}/registrations`),
      ]);

      if (!eventRes.ok) throw new Error("Event not found");

      const eventData = await eventRes.json();
      setEvent({
        id: eventData.event.id,
        title: eventData.event.title,
        startDate: eventData.event.startDate,
        status: eventData.event.status,
        maxAttendees: eventData.event.maxAttendees,
        registrationCount: eventData.event._count?.registrations ?? 0,
      });

      if (regRes.ok) {
        const regData = await regRes.json();
        setRegistrations(regData.registrations || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleCheckIn(registrationId: string, currentState: boolean) {
    setCheckInLoading(registrationId);
    try {
      const res = await fetch(`/api/cme/events/${eventId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId,
          checkedIn: !currentState,
        }),
      });
      if (res.ok) {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === registrationId
              ? {
                  ...r,
                  checkedIn: !currentState,
                  checkedInAt: !currentState
                    ? new Date().toISOString()
                    : null,
                }
              : r
          )
        );
      }
    } catch {
      /* silent */
    } finally {
      setCheckInLoading(null);
    }
  }

  const filtered = registrations.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.phone && r.phone.includes(q))
    );
  });

  const checkedInCount = registrations.filter((r) => r.checkedIn).length;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading registrations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center flex-col gap-3">
        <p className="text-red-400 text-sm">{error}</p>
        <Link
          href="/cme/admin"
          className="text-amber-500 text-xs underline"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Link
              href="/cme/admin"
              className="text-gray-400 text-xs no-underline hover:text-gray-300"
            >
              Dashboard
            </Link>
            <span className="text-gray-600 text-xs">/</span>
            <Link
              href={`/cme/admin/events/${eventId}`}
              className="text-gray-400 text-xs no-underline hover:text-gray-300"
            >
              Edit Event
            </Link>
            <span className="text-gray-600 text-xs">/</span>
            <span className="text-amber-500 text-xs">Registrations</span>
          </div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-gray-50 m-0 truncate">
            {event?.title || "Event"} — Registrations
          </h1>
          {event && (
            <p className="text-xs text-gray-400 mt-1">
              {fmtDate(event.startDate)} | Status: {event.status}
            </p>
          )}
        </div>
        <button
          className="px-5 py-2.5 text-xs font-semibold rounded-lg border border-gray-700 bg-gray-800 text-gray-400 cursor-not-allowed opacity-60 shrink-0 self-start"
          title="Coming soon"
          disabled
        >
          Export CSV
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-center">
          <p className="text-3xl font-extrabold text-amber-500 m-0">
            {registrations.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Total Registrations
            {event?.maxAttendees && (
              <span className="text-gray-500">
                {" "}/ {event.maxAttendees} capacity
              </span>
            )}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-center">
          <p className="text-3xl font-extrabold text-emerald-400 m-0">
            {checkedInCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">Checked In</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-center">
          <p className="text-3xl font-extrabold text-blue-400 m-0">
            {registrations.length - checkedInCount}
          </p>
          <p className="text-xs text-gray-400 mt-1">Not Checked In</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72 px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="Search by name, email, or phone..."
        />
        {search && (
          <span className="text-xs text-gray-500">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Registrations Table / Cards */}
      {filtered.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
          <p className="text-4xl mb-2">📋</p>
          <p className="text-gray-400 text-sm">
            {search
              ? "No registrations match your search"
              : "No registrations yet"}
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table (md+) ── */}
          <div className="hidden md:block bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  {[
                    "#",
                    "Name",
                    "Email",
                    "Phone",
                    "Organization",
                    "Status",
                    "Check-in",
                    "Registered",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3.5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg, idx) => {
                  const badge =
                    STATUS_BADGE[reg.status] || STATUS_BADGE.pending;

                  return (
                    <tr
                      key={reg.id}
                      className={`border-b border-gray-800 ${
                        reg.checkedIn ? "bg-emerald-400/5" : ""
                      }`}
                    >
                      <td className="px-3.5 py-3 text-gray-500 text-xs">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-gray-50">
                        {reg.name}
                      </td>
                      <td className="px-3.5 py-3 text-gray-300">
                        {reg.email}
                      </td>
                      <td className="px-3.5 py-3 text-gray-300">
                        {reg.phone || "—"}
                      </td>
                      <td className="px-3.5 py-3 text-gray-300">
                        {reg.organization || "—"}
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase ${badge}`}
                        >
                          {reg.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <button
                          onClick={() =>
                            toggleCheckIn(reg.id, reg.checkedIn)
                          }
                          disabled={checkInLoading === reg.id}
                          className={`px-3.5 py-1 text-[11px] font-bold rounded-md border transition-colors ${
                            reg.checkedIn
                              ? "border-emerald-800 bg-emerald-900 text-emerald-400 hover:bg-emerald-800"
                              : "border-gray-700 bg-transparent text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                          } ${
                            checkInLoading === reg.id
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                        >
                          {reg.checkedIn ? "Checked In" : "Check In"}
                        </button>
                        {reg.checkedInAt && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {fmtDateTime(reg.checkedInAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {fmtDateTime(reg.registeredAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards (below md) ── */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((reg, idx) => {
              const badge =
                STATUS_BADGE[reg.status] || STATUS_BADGE.pending;

              return (
                <div
                  key={reg.id}
                  className={`bg-gray-800 border border-gray-700 rounded-xl p-4 ${
                    reg.checkedIn ? "ring-1 ring-emerald-800" : ""
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-50 text-sm truncate">
                        <span className="text-gray-500 font-normal mr-1.5">#{idx + 1}</span>
                        {reg.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {reg.email}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase ${badge}`}
                    >
                      {reg.status}
                    </span>
                  </div>

                  {/* Card details */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                    <div>
                      <span className="text-gray-500">Phone</span>
                      <p className="text-gray-300 mt-0.5">{reg.phone || "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Organization</span>
                      <p className="text-gray-300 mt-0.5">{reg.organization || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Registered</span>
                      <p className="text-gray-300 mt-0.5">
                        {fmtDateTime(reg.registeredAt)}
                      </p>
                    </div>
                  </div>

                  {/* Card action */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        toggleCheckIn(reg.id, reg.checkedIn)
                      }
                      disabled={checkInLoading === reg.id}
                      className={`w-full py-2 text-xs font-bold rounded-lg border transition-colors ${
                        reg.checkedIn
                          ? "border-emerald-800 bg-emerald-900 text-emerald-400"
                          : "border-gray-700 bg-transparent text-gray-400 hover:bg-gray-700"
                      } ${
                        checkInLoading === reg.id
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      {reg.checkedIn ? "Checked In" : "Check In"}
                    </button>
                  </div>
                  {reg.checkedIn && reg.checkedInAt && (
                    <p className="text-[10px] text-gray-500 mt-1.5 text-center">
                      Checked in {fmtDateTime(reg.checkedInAt)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
