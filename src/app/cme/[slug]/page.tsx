"use client";
// v4 — inline registration form + amber hover CTA

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Speaker {
  id: string;
  role: string;
  topic: string | null;
  speaker: {
    id: string;
    name: string;
    title: string | null;
    designation: string | null;
    organization: string | null;
    bio: string | null;
    photoUrl: string | null;
  };
}

interface Session {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
}

interface EventDetail {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  shortDescription: string | null;
  category: string;
  startDate: string;
  endDate: string;
  timezone: string;
  mode: string;
  venue: string | null;
  venueAddress: string | null;
  platformType: string | null;
  cmeCredits: number;
  cmeAccreditor: string | null;
  registrationFee: number;
  currency: string;
  earlyBirdFee: number | null;
  earlyBirdDeadline: string | null;
  maxAttendees: number | null;
  bannerImageUrl: string | null;
  status: string;
  tags: string;
  speakers: Speaker[];
  sessions: Session[];
  _count: { registrations: number };
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
    </svg>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Registration form state
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [regNo, setRegNo] = useState("");
  const [formError, setFormError] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    organization: "",
    city: "",
    whatsappOptIn: true,
  });

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/cme/events?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.event) setEvent(data.event);
        else setError("Event not found");
      })
      .catch(() => setError("Failed to load event"))
      .finally(() => setLoading(false));
  }, [slug]);

  function handleRegisterClick() {
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch(`/api/public/cme/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, eventId: event.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setSuccess(true);
      setRegNo(data.registrationNo || "");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center bg-[#fefbf6] min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[#14532d] border-t-transparent rounded-full mx-auto" />
      </div>
    );

  if (error || !event)
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center bg-[#fefbf6] min-h-screen">
        <h2 className="text-2xl text-gray-900 font-bold mb-2">Event Not Found</h2>
        <p className="text-gray-500 mb-6">{error || "This event doesn't exist."}</p>
        <Link href="/cme" className="text-[#14532d] hover:underline">
          &larr; Back to Events
        </Link>
      </div>
    );

  const isPast = new Date(event.endDate) < new Date();
  const isFree = event.registrationFee === 0;
  const spotsLeft = event.maxAttendees
    ? event.maxAttendees - event._count.registrations
    : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const tags = JSON.parse(event.tags || "[]") as string[];
  const isEarlyBird =
    event.earlyBirdFee !== null &&
    event.earlyBirdDeadline &&
    new Date(event.earlyBirdDeadline) > new Date();

  const canRegister = !isPast && !isFull && !success;

  return (
    <div className="bg-[#fefbf6] min-h-screen">
      {/* Banner with breadcrumb */}
      <div className="relative bg-gradient-to-br from-[#14532d]/10 to-[#fefbf6]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-10">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <ol className="flex items-center gap-1.5 text-sm text-gray-500">
              <li>
                <Link href="/cme" className="hover:text-[#14532d] transition-colors">Events</Link>
              </li>
              <li>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </li>
              <li className="text-gray-900 font-medium truncate max-w-[300px]">{event.title}</li>
            </ol>
          </nav>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-[#14532d]/10 text-[#14532d] text-xs font-medium rounded-full uppercase">
              {event.category}
            </span>
            <span className="px-3 py-1 bg-[#14532d]/10 text-[#14532d] text-xs font-medium rounded-full">
              {event.mode === "online" ? "Online" : event.mode === "hybrid" ? "Hybrid" : "In Person"}
            </span>
            {event.cmeCredits > 0 && (
              <span className="px-3 py-1 bg-[#14532d]/10 text-[#14532d] text-xs font-medium rounded-full">
                {event.cmeCredits} CME Credits
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{event.title}</h1>
          {event.subtitle && <p className="text-lg text-gray-600">{event.subtitle}</p>}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Date & Venue */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-[#14532d] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-900 font-medium">{fmt(event.startDate)}</p>
                  <p className="text-gray-500 text-sm">
                    {fmtTime(event.startDate)} — {fmtTime(event.endDate)} ({event.timezone})
                  </p>
                  {fmt(event.startDate) !== fmt(event.endDate) && (
                    <p className="text-gray-500 text-sm">to {fmt(event.endDate)}</p>
                  )}
                </div>
              </div>
              {event.venue && (
                <div className="flex items-start gap-3">
                  <MapPinIcon className="w-5 h-5 text-[#14532d] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 font-medium">{event.venue}</p>
                    {event.venueAddress && <p className="text-gray-500 text-sm">{event.venueAddress}</p>}
                  </div>
                </div>
              )}
              {event.platformType && (
                <div className="flex items-start gap-3">
                  <MonitorIcon className="w-5 h-5 text-[#14532d] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 font-medium capitalize">{event.platformType.replace("_", " ")}</p>
                    <p className="text-gray-500 text-sm">Link will be shared after registration</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">About This Event</h2>
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">{event.description}</div>
            </div>

            {/* Sessions */}
            {event.sessions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
                <div className="space-y-3">
                  {event.sessions.map((s) => (
                    <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-gray-900 font-medium">{s.title}</h3>
                        <span className="text-sm text-gray-500">
                          {fmtTime(s.startTime)} - {fmtTime(s.endTime)}
                        </span>
                      </div>
                      {s.description && <p className="text-gray-600 text-sm mt-1">{s.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Speakers */}
            {event.speakers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Speakers</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {event.speakers.map((es) => (
                    <div
                      key={es.id}
                      className="bg-white border border-gray-200 rounded-xl p-5 flex gap-4"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#14532d]/10 to-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {es.speaker.photoUrl ? (
                          <img src={es.speaker.photoUrl} alt={es.speaker.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-medium text-[#14532d]">
                            {es.speaker.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium">
                          {es.speaker.title ? `${es.speaker.title} ` : ""}
                          {es.speaker.name}
                        </p>
                        {es.speaker.designation && (
                          <p className="text-gray-600 text-sm">{es.speaker.designation}</p>
                        )}
                        {es.speaker.organization && (
                          <p className="text-gray-500 text-xs">{es.speaker.organization}</p>
                        )}
                        {es.topic && (
                          <p className="text-[#14532d] text-xs mt-1">Topic: {es.topic}</p>
                        )}
                        <span className="text-xs text-gray-500 capitalize">{es.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t} className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar — Registration CTA + Inline Form */}
          <div className="md:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Pricing Card */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
                {/* Price */}
                <div className="text-center">
                  {isFree ? (
                    <p className="text-3xl font-bold text-[#14532d]">Free</p>
                  ) : (
                    <>
                      {isEarlyBird && (
                        <p className="text-sm text-gray-500 line-through">
                          {event.currency} {event.registrationFee}
                        </p>
                      )}
                      <p className="text-3xl font-bold text-gray-900">
                        {event.currency}{" "}
                        {isEarlyBird ? event.earlyBirdFee : event.registrationFee}
                      </p>
                      {isEarlyBird && (
                        <p className="text-xs text-[#14532d] mt-1">
                          Early bird until {fmt(event.earlyBirdDeadline!)}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Capacity */}
                {event.maxAttendees && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Registrations</span>
                      <span className="text-gray-600">
                        {event._count.registrations} / {event.maxAttendees}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#14532d] h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (event._count.registrations / event.maxAttendees) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* CME accreditation */}
                {event.cmeCredits > 0 && (
                  <div className="bg-[#14532d]/10 border border-[#14532d]/20 rounded-xl p-3 text-center">
                    <p className="text-[#14532d] font-bold text-lg">{event.cmeCredits} Credits</p>
                    {event.cmeAccreditor && (
                      <p className="text-gray-500 text-xs">Accredited by {event.cmeAccreditor}</p>
                    )}
                  </div>
                )}

                {/* Register Button / Status */}
                {isPast ? (
                  <button disabled className="w-full py-3.5 bg-gray-200 text-gray-500 rounded-xl font-medium cursor-not-allowed">
                    Event Ended
                  </button>
                ) : isFull ? (
                  <button disabled className="w-full py-3.5 bg-gray-200 text-gray-500 rounded-xl font-medium cursor-not-allowed">
                    Registration Full
                  </button>
                ) : success ? (
                  <div className="text-center py-2">
                    <div className="w-12 h-12 bg-[#14532d]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-[#14532d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-[#14532d] font-semibold">Registered!</p>
                    {regNo && <p className="text-xs text-gray-500 mt-1">Reg No: <span className="font-mono">{regNo}</span></p>}
                    <p className="text-xs text-gray-500 mt-1">Confirmation email sent to {form.email}</p>
                    <Link href="/cme" className="inline-block mt-3 text-xs text-[#14532d] hover:underline font-medium">
                      Browse More Events
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={handleRegisterClick}
                    className="w-full py-3.5 bg-[#14532d] hover:bg-[#b45309] text-white rounded-xl font-bold text-center transition-all cursor-pointer"
                  >
                    Register Now
                  </button>
                )}

                {isPast && event.status === "completed" && (
                  <p className="text-center text-sm text-gray-500">
                    Recording may be available. Check back soon.
                  </p>
                )}
              </div>

              {/* Inline Registration Form — appears below pricing card */}
              {showForm && canRegister && (
                <div ref={formRef} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 scroll-mt-24">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900">Register</h2>
                    <button
                      onClick={() => setShowForm(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-xs">
                      {formError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Dr. Priya Sharma"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="priya@example.com"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
                      <input
                        type="text"
                        value={form.designation}
                        onChange={(e) => setForm({ ...form, designation: e.target.value })}
                        placeholder="Ayurveda Physician"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Organization</label>
                      <input
                        type="text"
                        value={form.organization}
                        onChange={(e) => setForm({ ...form, organization: e.target.value })}
                        placeholder="ABC Ayurveda Hospital"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        placeholder="Chennai"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.whatsappOptIn}
                        onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })}
                        className="w-3.5 h-3.5 rounded border-gray-300 accent-[#14532d] focus:ring-[#14532d] bg-white"
                      />
                      <span className="text-xs text-gray-600">
                        Send me updates via WhatsApp
                      </span>
                    </label>

                    {!isFree && (
                      <div className="bg-[#14532d]/5 border border-[#14532d]/10 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Registration Fee</span>
                          <span className="text-gray-900 font-bold text-sm">
                            {event.currency} {isEarlyBird ? event.earlyBirdFee : event.registrationFee}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">Payment details shared after registration</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-[#14532d] hover:bg-[#b45309] text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submitting ? "Registering..." : isFree ? "Complete Registration (Free)" : "Complete Registration"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex items-center justify-between">
          <Link href="/cme" className="inline-flex items-center gap-1.5 text-sm text-[#14532d] hover:underline font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            All Events
          </Link>
          {canRegister && !showForm && (
            <button
              onClick={handleRegisterClick}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#14532d] hover:bg-[#b45309] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Register Now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
