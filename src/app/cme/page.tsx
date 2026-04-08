"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CmeEvent {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  shortDescription: string | null;
  category: string;
  startDate: string;
  endDate: string;
  mode: string;
  venue: string | null;
  cmeCredits: number;
  registrationFee: number;
  currency: string;
  maxAttendees: number | null;
  bannerImageUrl: string | null;
  thumbnailUrl: string | null;
  isFeatured: boolean;
  tags: string;
  _count?: { registrations: number };
  speakers?: Array<{
    speaker: { name: string; designation: string | null; photoUrl: string | null };
    role: string;
  }>;
}

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "cme", label: "CME" },
  { value: "webinar", label: "Webinar" },
  { value: "workshop", label: "Workshop" },
  { value: "conference", label: "Conference" },
];

const MODE_LABELS: Record<string, string> = {
  online: "Online",
  in_person: "In Person",
  hybrid: "Hybrid",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// SVG icon components
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" />
      <path d="M5 1v3M11 1v3M1.5 7h13" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1.5C4.79 1.5 3 3.29 3 5.5c0 3.25 4 7 4 7s4-3.75 4-7c0-2.21-1.79-3.5-4-3.5z" />
      <circle cx="7" cy="5.5" r="1.25" />
    </svg>
  );
}

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  if (category === "webinar") {
    return (
      <svg className={className} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="32" height="20" rx="2" />
        <path d="M15 28l-2 4M25 28l2 4M12 32h16" />
        <circle cx="20" cy="18" r="4" />
        <path d="M14 18a6 6 0 0 1 6-6M20 12a6 6 0 0 1 6 6" />
      </svg>
    );
  }
  if (category === "workshop") {
    return (
      <svg className={className} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 28l6-6 4 4 8-10 6 6" />
        <rect x="5" y="10" width="30" height="22" rx="2" />
        <path d="M14 10V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3" />
        <path d="M5 18h30" />
      </svg>
    );
  }
  if (category === "conference") {
    return (
      <svg className={className} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="14" width="32" height="20" rx="2" />
        <path d="M12 14V9a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5" />
        <path d="M4 22h32M14 22v12M26 22v12" />
      </svg>
    );
  }
  // Default: CME / calendar
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="7" width="32" height="28" rx="2" />
      <path d="M13 4v6M27 4v6M4 19h32" />
      <path d="M12 26h4M20 26h4M12 32h4M20 32h4" />
    </svg>
  );
}

export default function CmePublicPage() {
  const [events, setEvents] = useState<CmeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchEvents();
  }, [category]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: "published" });
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      const res = await fetch(`/api/public/cme/events?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const featuredEvents = events.filter((e) => e.isFeatured);
  const upcomingEvents = events.filter((e) => new Date(e.startDate) >= new Date());
  const pastEvents = events.filter((e) => new Date(e.startDate) < new Date());

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-green-50 via-[#fefbf6] to-green-50/50 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Ayurveda <span className="text-[#14532d]">CME & Events</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-7">
            Continuing Medical Education, webinars, workshops, and conferences
            for Ayurveda professionals worldwide.
          </p>
          {/* Search */}
          <div className="max-w-xl mx-auto flex gap-3">
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchEvents()}
              className="flex-1 h-12 px-4 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
            />
            <button
              onClick={fetchEvents}
              className="px-6 h-12 bg-[#14532d] hover:bg-[#14532d]/90 text-white font-medium rounded-xl transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                category === c.value
                  ? "bg-[#14532d] text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:border-[#14532d]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#14532d] border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-4">Loading events...</p>
        </div>
      )}

      {/* No Events */}
      {!loading && events.length === 0 && (
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="w-14 h-14 mx-auto mb-4 text-[#14532d]/30">
            <CalendarIcon className="w-full h-full" />
          </div>
          <h3 className="text-xl text-gray-900 font-semibold mb-2">No Events Yet</h3>
          <p className="text-gray-500">
            New CME events, webinars, and workshops will be listed here soon.
          </p>
        </div>
      )}

      {/* Featured Events */}
      {!loading && featuredEvents.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Featured Events</h2>
          <div className="grid lg:grid-cols-2 gap-8">
            {featuredEvents.map((event) => (
              <EventCard key={event.id} event={event} featured />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {!loading && upcomingEvents.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Upcoming Events</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* Past Events */}
      {!loading && pastEvents.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            Past Events
            <span className="text-sm font-normal text-gray-500">({pastEvents.length})</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} past />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EventCard({ event, featured, past }: { event: CmeEvent; featured?: boolean; past?: boolean }) {
  const isPast = past || new Date(event.startDate) < new Date();
  const isFree = event.registrationFee === 0;
  const spotsLeft = event.maxAttendees
    ? event.maxAttendees - (event._count?.registrations || 0)
    : null;

  return (
    <Link
      href={`/cme/${event.slug}`}
      className={`block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-[#14532d]/30 transition-all group ${
        featured ? "md:flex" : ""
      }`}
    >
      {/* Thumbnail */}
      <div
        className={`relative bg-gradient-to-br from-[#14532d]/5 to-[#14532d]/10 ${
          featured ? "md:w-2/5 h-48 md:h-auto" : "h-48"
        }`}
      >
        {event.bannerImageUrl || event.thumbnailUrl ? (
          <img
            src={event.thumbnailUrl || event.bannerImageUrl || ""}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CategoryIcon
              category={event.category}
              className="w-14 h-14 text-[#14532d] opacity-20"
            />
          </div>
        )}
        {/* Category badge */}
        <span className="absolute top-3 left-3 px-2 py-0.5 bg-[#14532d] text-white text-[11px] font-medium rounded-full uppercase tracking-wide">
          {event.category}
        </span>
        {/* Mode badge */}
        <span className="absolute top-3 right-3 px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-600 text-[11px] rounded-full">
          {MODE_LABELS[event.mode] || event.mode}
        </span>
        {isPast && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm bg-white/90 px-3 py-1 rounded-full border border-gray-200">
              Event Ended
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`p-5 ${featured ? "md:w-3/5" : ""}`}>
        {/* Date line */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
          <CalendarIcon className="w-4 h-4 text-[#14532d] flex-shrink-0" />
          <span>{formatDate(event.startDate)}</span>
          <span className="text-gray-400">·</span>
          <span>{formatTime(event.startDate)}</span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#14532d] transition-colors mb-1 leading-snug">
          {event.title}
        </h3>
        {event.subtitle && (
          <p className="text-sm text-gray-600 mb-2">{event.subtitle}</p>
        )}
        {event.shortDescription && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
            {event.shortDescription}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {event.cmeCredits > 0 && (
            <span className="px-2 py-1 bg-[#14532d]/10 text-[#14532d] rounded-full font-medium">
              {event.cmeCredits} CME Credits
            </span>
          )}
          {isFree ? (
            <span className="px-2 py-1 bg-[#14532d]/10 text-[#14532d] rounded-full font-medium">
              Free
            </span>
          ) : (
            <span className="px-2 py-1 bg-[#14532d]/5 text-[#14532d] rounded-full font-medium">
              {event.currency} {event.registrationFee}
            </span>
          )}
          {spotsLeft !== null && spotsLeft > 0 && !isPast && (
            <span className={`px-2 py-1 rounded-full font-medium ${
              spotsLeft <= 10
                ? "bg-red-50 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}>
              {spotsLeft} spots left
            </span>
          )}
          {event.venue && (
            <span className="flex items-center gap-1 text-gray-500 truncate max-w-[150px]">
              <MapPinIcon className="w-3.5 h-3.5 text-[#14532d] flex-shrink-0" />
              {event.venue}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
