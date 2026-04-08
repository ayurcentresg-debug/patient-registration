"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface EventInfo {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  registrationFee: number;
  currency: string;
  maxAttendees: number | null;
  _count: { registrations: number };
}

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [regNo, setRegNo] = useState("");
  const [error, setError] = useState("");

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/cme/events/${event.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setSuccess(true);
      setRegNo(data.registrationNo || "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="max-w-xl mx-auto px-4 py-10 sm:py-14 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#14532d] border-t-transparent rounded-full mx-auto" />
      </div>
    );

  if (!event)
    return (
      <div className="max-w-xl mx-auto px-4 py-10 sm:py-14 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Event Not Found</h2>
        <Link href="/cme" className="inline-flex items-center gap-1.5 text-sm text-[#14532d] hover:text-[#1a6b3a] font-medium transition-colors">
          &larr; Back to Events
        </Link>
      </div>
    );

  if (success)
    return (
      <div className="max-w-xl mx-auto px-4 py-10 sm:py-14">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 sm:p-10 text-center">
          <div className="w-20 h-20 bg-[#14532d]/8 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-[#14532d]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">
            You are registered for <span className="text-[#14532d] font-medium">{event.title}</span>
          </p>
          {regNo && (
            <p className="text-sm text-gray-500 mb-6">
              Registration No: <span className="text-gray-900 font-mono">{regNo}</span>
            </p>
          )}
          <p className="text-sm text-gray-500 mb-8">
            A confirmation email will be sent to <span className="text-gray-700">{form.email}</span>.
            Event details and joining link will be shared before the event.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/cme/${slug}`}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium transition-colors"
            >
              View Event
            </Link>
            <Link
              href="/cme"
              className="px-6 py-2.5 bg-[#14532d] hover:bg-[#1a6b3a] text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Browse More Events
            </Link>
          </div>
        </div>
      </div>
    );

  const isFree = event.registrationFee === 0;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm text-gray-500">
          <li>
            <Link href="/cme" className="hover:text-[#14532d] transition-colors">Events</Link>
          </li>
          <li>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </li>
          <li>
            <Link href={`/cme/${slug}`} className="hover:text-[#14532d] transition-colors truncate max-w-[200px] inline-block">{event.title}</Link>
          </li>
          <li>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </li>
          <li className="text-gray-900 font-medium">Register</li>
        </ol>
      </nav>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Register for Event</h1>
        <p className="text-gray-500 mb-6">{event.title}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Dr. Priya Sharma"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="priya@example.com"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
            />
          </div>

          {/* Phone & Designation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="Ayurveda Physician"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
              />
            </div>
          </div>

          {/* Organization & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
              <input
                type="text"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                placeholder="ABC Ayurveda Hospital"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Chennai"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d]"
              />
            </div>
          </div>

          {/* WhatsApp opt-in */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.whatsappOptIn}
              onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 accent-[#14532d] focus:ring-[#14532d] bg-white"
            />
            <span className="text-sm text-gray-600">
              Send me event updates and reminders via WhatsApp
            </span>
          </label>

          {/* Price Summary */}
          {!isFree && (
            <div className="bg-[#14532d]/5 border border-[#14532d]/10 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Registration Fee</span>
                <span className="text-gray-900 font-bold text-lg">
                  {event.currency} {event.registrationFee}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Payment details will be shared after registration</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#14532d] hover:bg-[#1a6b3a] text-white rounded-xl font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Registering..." : isFree ? "Register (Free)" : "Register Now"}
          </button>
        </form>
      </div>
    </div>
  );
}
