"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* ─── Constants ─── */
const CATEGORIES = [
  { value: "cme", label: "CME" },
  { value: "webinar", label: "Webinar" },
  { value: "workshop", label: "Workshop" },
  { value: "conference", label: "Conference" },
  { value: "seminar", label: "Seminar" },
];

const MODES = [
  { value: "online", label: "Online" },
  { value: "in_person", label: "In Person" },
  { value: "hybrid", label: "Hybrid" },
];

const PLATFORMS = [
  { value: "zoom", label: "Zoom" },
  { value: "youtube", label: "YouTube Live" },
  { value: "teams", label: "MS Teams" },
  { value: "google_meet", label: "Google Meet" },
  { value: "other", label: "Other" },
];

const TIMEZONES = [
  { value: "Asia/Singapore", label: "SGT (UTC+8)" },
  { value: "Asia/Kolkata", label: "IST (UTC+5:30)" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "EST (UTC-5)" },
  { value: "Europe/London", label: "GMT (UTC+0)" },
];

/* ─── Reusable class strings ─── */
const inputCls =
  "w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent";
const selectCls = `${inputCls} cursor-pointer`;
const textareaCls = `${inputCls} min-h-[100px] resize-y font-[inherit]`;
const labelCls = "block text-xs font-semibold text-gray-300 mb-1.5";
const cardCls = "bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 mb-6";
const sectionTitleCls =
  "text-sm font-bold text-amber-500 mb-4 pb-2 border-b border-gray-700";

interface EventForm {
  title: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  category: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  mode: string;
  venue: string;
  venueAddress: string;
  platformType: string;
  platformUrl: string;
  meetingId: string;
  cmeCredits: string;
  accreditor: string;
  accreditationId: string;
  maxAttendees: string;
  registrationFee: string;
  currency: string;
  earlyBirdFee: string;
  earlyBirdDeadline: string;
  bannerImageUrl: string;
  thumbnailUrl: string;
  tags: string;
}

const INITIAL_FORM: EventForm = {
  title: "",
  subtitle: "",
  shortDescription: "",
  description: "",
  category: "webinar",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  timezone: "Asia/Singapore",
  mode: "online",
  venue: "",
  venueAddress: "",
  platformType: "zoom",
  platformUrl: "",
  meetingId: "",
  cmeCredits: "",
  accreditor: "",
  accreditationId: "",
  maxAttendees: "",
  registrationFee: "0",
  currency: "SGD",
  earlyBirdFee: "",
  earlyBirdDeadline: "",
  bannerImageUrl: "",
  thumbnailUrl: "",
  tags: "",
};

export default function CreateEventPage() {
  const router = useRouter();
  const [form, setForm] = useState<EventForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: keyof EventForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(status: "draft" | "published") {
    if (!form.title.trim()) {
      setError("Event title is required");
      return;
    }
    if (!form.startDate || !form.startTime) {
      setError("Start date and time are required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const startDateTime = new Date(`${form.startDate}T${form.startTime}`);
      const endDateTime =
        form.endDate && form.endTime
          ? new Date(`${form.endDate}T${form.endTime}`)
          : null;

      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        shortDescription: form.shortDescription.trim() || null,
        description: form.description.trim() || null,
        category: form.category,
        status,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime?.toISOString() || null,
        timezone: form.timezone,
        mode: form.mode,
        venue: form.venue.trim() || null,
        venueAddress: form.venueAddress.trim() || null,
        platformType: form.platformType || null,
        platformUrl: form.platformUrl.trim() || null,
        meetingId: form.meetingId.trim() || null,
        cmeCredits: form.cmeCredits ? parseFloat(form.cmeCredits) : null,
        accreditor: form.accreditor.trim() || null,
        accreditationId: form.accreditationId.trim() || null,
        maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees) : null,
        registrationFee: form.registrationFee
          ? parseFloat(form.registrationFee)
          : 0,
        currency: form.currency,
        earlyBirdFee: form.earlyBirdFee
          ? parseFloat(form.earlyBirdFee)
          : null,
        earlyBirdDeadline: form.earlyBirdDeadline
          ? new Date(form.earlyBirdDeadline).toISOString()
          : null,
        bannerImageUrl: form.bannerImageUrl.trim() || null,
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      };

      const res = await fetch("/api/cme/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create event");
      }

      const data = await res.json();
      router.push(
        data.event?.id
          ? `/cme/admin/events/${data.event.id}`
          : "/cme/admin"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save event";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-50">
            Create New Event
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Set up a new CME, webinar, or workshop event
          </p>
        </div>
        <button
          onClick={() => router.push("/cme/admin")}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-gray-700 bg-gray-800 text-gray-300 cursor-pointer hover:bg-gray-700 transition-colors self-start sm:self-auto"
        >
          Cancel
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/80 border border-red-800 rounded-lg px-4 py-3 mb-5 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Basic Information</h2>
        <div className="mb-4">
          <label className={labelCls}>Event Title *</label>
          <input
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            className={inputCls}
            placeholder="e.g. Advanced Panchakarma Techniques"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>Subtitle</label>
            <input
              value={form.subtitle}
              onChange={(e) => updateField("subtitle", e.target.value)}
              className={inputCls}
              placeholder="Optional subtitle"
            />
          </div>
          <div>
            <label className={labelCls}>Category *</label>
            <select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className={selectCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className={labelCls}>Short Description</label>
          <input
            value={form.shortDescription}
            onChange={(e) => updateField("shortDescription", e.target.value)}
            className={inputCls}
            placeholder="Brief one-line summary"
          />
        </div>
        <div>
          <label className={labelCls}>Full Description</label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className={textareaCls}
            placeholder="Detailed description of the event, topics covered, learning objectives..."
          />
        </div>
      </div>

      {/* Schedule */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Schedule</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Start Date *</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => updateField("startDate", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Start Time *</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => updateField("startTime", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => updateField("timezone", e.target.value)}
              className={selectCls}
            >
              {TIMEZONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => updateField("endDate", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>End Time</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => updateField("endTime", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Location / Mode */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Location</h2>
        <div className="mb-4">
          <label className={labelCls}>Event Mode *</label>
          <div className="flex flex-wrap gap-3">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => updateField("mode", m.value)}
                className={`px-5 py-2 text-sm rounded-lg border cursor-pointer transition-colors ${
                  form.mode === m.value
                    ? "font-bold border-amber-500 bg-amber-900/30 text-amber-500"
                    : "font-medium border-gray-700 bg-transparent text-gray-400 hover:border-gray-500"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {(form.mode === "in_person" || form.mode === "hybrid") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Venue Name</label>
              <input
                value={form.venue}
                onChange={(e) => updateField("venue", e.target.value)}
                className={inputCls}
                placeholder="e.g. Singapore Convention Centre"
              />
            </div>
            <div>
              <label className={labelCls}>Venue Address</label>
              <input
                value={form.venueAddress}
                onChange={(e) => updateField("venueAddress", e.target.value)}
                className={inputCls}
                placeholder="Full address"
              />
            </div>
          </div>
        )}
      </div>

      {/* Video / Platform */}
      {(form.mode === "online" || form.mode === "hybrid") && (
        <div className={cardCls}>
          <h2 className={sectionTitleCls}>Video / Streaming Platform</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Platform</label>
              <select
                value={form.platformType}
                onChange={(e) => updateField("platformType", e.target.value)}
                className={selectCls}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Platform URL</label>
              <input
                value={form.platformUrl}
                onChange={(e) => updateField("platformUrl", e.target.value)}
                className={inputCls}
                placeholder="https://zoom.us/j/..."
              />
            </div>
            <div>
              <label className={labelCls}>Meeting ID</label>
              <input
                value={form.meetingId}
                onChange={(e) => updateField("meetingId", e.target.value)}
                className={inputCls}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      )}

      {/* CME Details */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>CME Accreditation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>CME Credits</label>
            <input
              type="number"
              step="0.5"
              value={form.cmeCredits}
              onChange={(e) => updateField("cmeCredits", e.target.value)}
              className={inputCls}
              placeholder="e.g. 2.0"
            />
          </div>
          <div>
            <label className={labelCls}>Accrediting Body</label>
            <input
              value={form.accreditor}
              onChange={(e) => updateField("accreditor", e.target.value)}
              className={inputCls}
              placeholder="e.g. SMC, AYUSH"
            />
          </div>
          <div>
            <label className={labelCls}>Accreditation ID</label>
            <input
              value={form.accreditationId}
              onChange={(e) => updateField("accreditationId", e.target.value)}
              className={inputCls}
              placeholder="Reference number"
            />
          </div>
        </div>
      </div>

      {/* Capacity & Pricing */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Capacity & Pricing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Max Attendees</label>
            <input
              type="number"
              value={form.maxAttendees}
              onChange={(e) => updateField("maxAttendees", e.target.value)}
              className={inputCls}
              placeholder="Leave blank for unlimited"
            />
          </div>
          <div>
            <label className={labelCls}>Registration Fee</label>
            <input
              type="number"
              step="0.01"
              value={form.registrationFee}
              onChange={(e) => updateField("registrationFee", e.target.value)}
              className={inputCls}
              placeholder="0 for free"
            />
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select
              value={form.currency}
              onChange={(e) => updateField("currency", e.target.value)}
              className={selectCls}
            >
              <option value="SGD">SGD</option>
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Early Bird Fee</label>
            <input
              type="number"
              step="0.01"
              value={form.earlyBirdFee}
              onChange={(e) => updateField("earlyBirdFee", e.target.value)}
              className={inputCls}
              placeholder="Discounted price"
            />
          </div>
          <div>
            <label className={labelCls}>Early Bird Deadline</label>
            <input
              type="date"
              value={form.earlyBirdDeadline}
              onChange={(e) => updateField("earlyBirdDeadline", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Media */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Media</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Banner Image URL</label>
            <input
              value={form.bannerImageUrl}
              onChange={(e) => updateField("bannerImageUrl", e.target.value)}
              className={inputCls}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className={labelCls}>Thumbnail URL</label>
            <input
              value={form.thumbnailUrl}
              onChange={(e) => updateField("thumbnailUrl", e.target.value)}
              className={inputCls}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Tags</h2>
        <div>
          <label className={labelCls}>Tags (comma-separated)</label>
          <input
            value={form.tags}
            onChange={(e) => updateField("tags", e.target.value)}
            className={inputCls}
            placeholder="ayurveda, panchakarma, cme, singapore"
          />
          {form.tags && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 text-xs rounded-full bg-amber-900/30 text-amber-500 border border-amber-800/50"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pb-12">
        <button
          onClick={() => handleSubmit("draft")}
          disabled={saving}
          className={`px-7 py-3 text-sm font-semibold rounded-lg border border-gray-700 bg-gray-700 text-gray-300 cursor-pointer hover:bg-gray-600 transition-colors ${
            saving ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {saving ? "Saving..." : "Save as Draft"}
        </button>
        <button
          onClick={() => handleSubmit("published")}
          disabled={saving}
          className={`px-7 py-3 text-sm font-bold rounded-lg border-none bg-gradient-to-br from-amber-500 to-amber-600 text-gray-900 cursor-pointer hover:from-amber-400 hover:to-amber-500 transition-all ${
            saving ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {saving ? "Publishing..." : "Publish Event"}
        </button>
      </div>
    </div>
  );
}
