"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

/* ─── Types ─── */
interface Speaker {
  id: string;
  name: string;
  designation: string | null;
  organization: string | null;
  photoUrl: string | null;
  specializations: string[];
}

interface EventSpeaker {
  id: string;
  speakerId: string;
  role: string;
  topic: string | null;
  speaker: Speaker;
}

interface Session {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  speakerName: string | null;
}

interface EventForm {
  title: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  category: string;
  status: string;
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

const SPEAKER_ROLES = [
  "keynote",
  "presenter",
  "panelist",
  "moderator",
  "facilitator",
];

/* ─── Reusable class strings ─── */
const inputCls = "w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent";
const selectCls = `${inputCls} cursor-pointer`;
const textareaCls = `${inputCls} min-h-[100px] resize-y font-[inherit]`;
const labelCls = "block text-xs font-semibold text-gray-300 mb-1.5";
const cardCls = "bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 mb-6";
const sectionTitleCls = "text-sm font-bold text-amber-500 mb-4 pb-2 border-b border-gray-700";
const btnPrimaryCls = "px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-900 rounded-lg font-bold text-sm cursor-pointer border-none";
const btnSecondaryCls = "px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium text-sm cursor-pointer border border-gray-700";
const gridTwoCls = "grid grid-cols-1 sm:grid-cols-2 gap-4";
const gridThreeCls = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

function toDateStr(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function toTimeStr(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [form, setForm] = useState<EventForm>({
    title: "", subtitle: "", shortDescription: "", description: "",
    category: "webinar", status: "draft",
    startDate: "", startTime: "", endDate: "", endTime: "",
    timezone: "Asia/Singapore", mode: "online",
    venue: "", venueAddress: "",
    platformType: "zoom", platformUrl: "", meetingId: "",
    cmeCredits: "", accreditor: "", accreditationId: "",
    maxAttendees: "", registrationFee: "0", currency: "SGD",
    earlyBirdFee: "", earlyBirdDeadline: "",
    bannerImageUrl: "", thumbnailUrl: "", tags: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Speakers
  const [eventSpeakers, setEventSpeakers] = useState<EventSpeaker[]>([]);
  const [allSpeakers, setAllSpeakers] = useState<Speaker[]>([]);
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [speakerForm, setSpeakerForm] = useState({
    speakerId: "",
    role: "presenter",
    topic: "",
  });

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionForm, setSessionForm] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    speakerName: "",
  });

  function updateField(field: keyof EventForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/cme/events/${eventId}`);
      if (!res.ok) throw new Error("Event not found");
      const data = await res.json();
      const evt = data.event;

      setForm({
        title: evt.title || "",
        subtitle: evt.subtitle || "",
        shortDescription: evt.shortDescription || "",
        description: evt.description || "",
        category: evt.category || "webinar",
        status: evt.status || "draft",
        startDate: toDateStr(evt.startDate),
        startTime: toTimeStr(evt.startDate),
        endDate: toDateStr(evt.endDate),
        endTime: toTimeStr(evt.endDate),
        timezone: evt.timezone || "Asia/Singapore",
        mode: evt.mode || "online",
        venue: evt.venue || "",
        venueAddress: evt.venueAddress || "",
        platformType: evt.platformType || "zoom",
        platformUrl: evt.platformUrl || "",
        meetingId: evt.meetingId || "",
        cmeCredits: evt.cmeCredits?.toString() || "",
        accreditor: evt.accreditor || "",
        accreditationId: evt.accreditationId || "",
        maxAttendees: evt.maxAttendees?.toString() || "",
        registrationFee: evt.registrationFee?.toString() || "0",
        currency: evt.currency || "SGD",
        earlyBirdFee: evt.earlyBirdFee?.toString() || "",
        earlyBirdDeadline: toDateStr(evt.earlyBirdDeadline),
        bannerImageUrl: evt.bannerImageUrl || "",
        thumbnailUrl: evt.thumbnailUrl || "",
        tags: Array.isArray(evt.tags) ? evt.tags.join(", ") : "",
      });

      setEventSpeakers(evt.speakers || []);
      setSessions(evt.sessions || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load event";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchSpeakers = useCallback(async () => {
    try {
      const res = await fetch("/api/cme/speakers");
      if (res.ok) {
        const data = await res.json();
        setAllSpeakers(data.speakers || []);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchEvent();
    fetchSpeakers();
  }, [fetchEvent, fetchSpeakers]);

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Event title is required");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const startDateTime = form.startDate && form.startTime
        ? new Date(`${form.startDate}T${form.startTime}`)
        : null;
      const endDateTime = form.endDate && form.endTime
        ? new Date(`${form.endDate}T${form.endTime}`)
        : null;

      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        shortDescription: form.shortDescription.trim() || null,
        description: form.description.trim() || null,
        category: form.category,
        status: form.status,
        startDate: startDateTime?.toISOString() || null,
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
        registrationFee: form.registrationFee ? parseFloat(form.registrationFee) : 0,
        currency: form.currency,
        earlyBirdFee: form.earlyBirdFee ? parseFloat(form.earlyBirdFee) : null,
        earlyBirdDeadline: form.earlyBirdDeadline
          ? new Date(form.earlyBirdDeadline).toISOString()
          : null,
        bannerImageUrl: form.bannerImageUrl.trim() || null,
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        tags: form.tags
          ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
      };

      const res = await fetch(`/api/cme/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update event");
      }

      setSuccess("Event updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update event";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function addSpeaker() {
    if (!speakerForm.speakerId) return;
    try {
      const res = await fetch(`/api/cme/events/${eventId}/speakers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(speakerForm),
      });
      if (res.ok) {
        setShowSpeakerModal(false);
        setSpeakerForm({ speakerId: "", role: "presenter", topic: "" });
        fetchEvent();
      }
    } catch {
      /* silent */
    }
  }

  async function removeSpeaker(eventSpeakerId: string) {
    try {
      await fetch(`/api/cme/events/${eventId}/speakers/${eventSpeakerId}`, {
        method: "DELETE",
      });
      fetchEvent();
    } catch {
      /* silent */
    }
  }

  async function saveSession() {
    if (!sessionForm.title) return;
    try {
      const url = editingSession
        ? `/api/cme/events/${eventId}/sessions/${editingSession.id}`
        : `/api/cme/events/${eventId}/sessions`;
      const method = editingSession ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sessionForm.title,
          description: sessionForm.description || null,
          startTime: sessionForm.startTime || null,
          endTime: sessionForm.endTime || null,
          speakerName: sessionForm.speakerName || null,
        }),
      });
      if (res.ok) {
        setShowSessionModal(false);
        setEditingSession(null);
        setSessionForm({ title: "", description: "", startTime: "", endTime: "", speakerName: "" });
        fetchEvent();
      }
    } catch {
      /* silent */
    }
  }

  async function deleteSession(sessionId: string) {
    try {
      await fetch(`/api/cme/events/${eventId}/sessions/${sessionId}`, {
        method: "DELETE",
      });
      fetchEvent();
    } catch {
      /* silent */
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading event...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-50">
            Edit Event
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Update event details, manage speakers and sessions
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/cme/admin")} className={btnSecondaryCls}>
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`${btnPrimaryCls} ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/60 border border-red-800 rounded-lg px-4 py-3 mb-5 text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-900/60 border border-emerald-800 rounded-lg px-4 py-3 mb-5 text-emerald-300 text-sm">
          {success}
        </div>
      )}

      {/* Basic Info */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Basic Information</h2>
        <div className="mb-4">
          <label className={labelCls}>Event Title *</label>
          <input value={form.title} onChange={(e) => updateField("title", e.target.value)} className={inputCls} />
        </div>
        <div className={`${gridTwoCls} mb-4`}>
          <div>
            <label className={labelCls}>Subtitle</label>
            <input value={form.subtitle} onChange={(e) => updateField("subtitle", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select value={form.category} onChange={(e) => updateField("category", e.target.value)} className={selectCls}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className={labelCls}>Short Description</label>
          <input value={form.shortDescription} onChange={(e) => updateField("shortDescription", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Full Description</label>
          <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} className={textareaCls} />
        </div>
      </div>

      {/* Schedule */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Schedule</h2>
        <div className={gridThreeCls}>
          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => updateField("startDate", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Start Time</label>
            <input type="time" value={form.startTime} onChange={(e) => updateField("startTime", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Timezone</label>
            <select value={form.timezone} onChange={(e) => updateField("timezone", e.target.value)} className={selectCls}>
              {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input type="date" value={form.endDate} onChange={(e) => updateField("endDate", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>End Time</label>
            <input type="time" value={form.endTime} onChange={(e) => updateField("endTime", e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Location</h2>
        <div className="mb-4">
          <div className="flex flex-wrap gap-3">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => updateField("mode", m.value)}
                className={`px-5 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                  form.mode === m.value
                    ? "font-bold border-[1.5px] border-amber-500 bg-amber-900/30 text-amber-500"
                    : "font-medium border border-gray-700 bg-transparent text-gray-400 hover:border-gray-500"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {(form.mode === "in_person" || form.mode === "hybrid") && (
          <div className={gridTwoCls}>
            <div>
              <label className={labelCls}>Venue Name</label>
              <input value={form.venue} onChange={(e) => updateField("venue", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Venue Address</label>
              <input value={form.venueAddress} onChange={(e) => updateField("venueAddress", e.target.value)} className={inputCls} />
            </div>
          </div>
        )}
      </div>

      {/* Video */}
      {(form.mode === "online" || form.mode === "hybrid") && (
        <div className={cardCls}>
          <h2 className={sectionTitleCls}>Video / Streaming Platform</h2>
          <div className={gridThreeCls}>
            <div>
              <label className={labelCls}>Platform</label>
              <select value={form.platformType} onChange={(e) => updateField("platformType", e.target.value)} className={selectCls}>
                {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Platform URL</label>
              <input value={form.platformUrl} onChange={(e) => updateField("platformUrl", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Meeting ID</label>
              <input value={form.meetingId} onChange={(e) => updateField("meetingId", e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
      )}

      {/* CME */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>CME Accreditation</h2>
        <div className={gridThreeCls}>
          <div>
            <label className={labelCls}>CME Credits</label>
            <input type="number" step="0.5" value={form.cmeCredits} onChange={(e) => updateField("cmeCredits", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Accrediting Body</label>
            <input value={form.accreditor} onChange={(e) => updateField("accreditor", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Accreditation ID</label>
            <input value={form.accreditationId} onChange={(e) => updateField("accreditationId", e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Capacity & Pricing */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Capacity & Pricing</h2>
        <div className={gridThreeCls}>
          <div>
            <label className={labelCls}>Max Attendees</label>
            <input type="number" value={form.maxAttendees} onChange={(e) => updateField("maxAttendees", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Registration Fee</label>
            <input type="number" step="0.01" value={form.registrationFee} onChange={(e) => updateField("registrationFee", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select value={form.currency} onChange={(e) => updateField("currency", e.target.value)} className={selectCls}>
              <option value="SGD">SGD</option>
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Early Bird Fee</label>
            <input type="number" step="0.01" value={form.earlyBirdFee} onChange={(e) => updateField("earlyBirdFee", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Early Bird Deadline</label>
            <input type="date" value={form.earlyBirdDeadline} onChange={(e) => updateField("earlyBirdDeadline", e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Media */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Media</h2>
        <div className={gridTwoCls}>
          <div>
            <label className={labelCls}>Banner Image URL</label>
            <input value={form.bannerImageUrl} onChange={(e) => updateField("bannerImageUrl", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Thumbnail URL</label>
            <input value={form.thumbnailUrl} onChange={(e) => updateField("thumbnailUrl", e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Tags</h2>
        <input value={form.tags} onChange={(e) => updateField("tags", e.target.value)} className={inputCls} placeholder="comma-separated tags" />
        {form.tags && (
          <div className="flex gap-1.5 flex-wrap mt-2">
            {form.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag, i) => (
              <span key={i} className="px-2.5 py-0.5 text-[11px] rounded-full bg-amber-900/30 text-amber-500 border border-amber-800/50">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ─── Speakers Section ─── */}
      <div className={cardCls}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-amber-500">Speakers</h2>
          <button
            onClick={() => { fetchSpeakers(); setShowSpeakerModal(true); }}
            className="px-4 py-1.5 text-xs font-semibold rounded-md border border-amber-500 bg-transparent text-amber-500 cursor-pointer hover:bg-amber-500/10 transition-colors"
          >
            + Add Speaker
          </button>
        </div>

        {eventSpeakers.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-5">
            No speakers assigned yet
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {eventSpeakers.map((es) => (
              <div
                key={es.id}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 sm:px-4 bg-gray-900 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-base text-amber-500 font-bold overflow-hidden shrink-0">
                    {es.speaker.photoUrl ? (
                      <img src={es.speaker.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      es.speaker.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-50 text-sm">{es.speaker.name}</div>
                    <div className="text-[11px] text-gray-400">
                      {es.role.charAt(0).toUpperCase() + es.role.slice(1)}
                      {es.topic && ` — ${es.topic}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeSpeaker(es.id)}
                  className="self-end sm:self-auto px-3 py-1 text-[11px] font-semibold rounded-md border border-red-900 bg-transparent text-red-400 cursor-pointer hover:bg-red-900/20 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Speaker Modal */}
      {showSpeakerModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 w-full max-w-lg">
            <h3 className="text-base font-bold text-gray-50 mb-5">Add Speaker to Event</h3>
            <div className="mb-4">
              <label className={labelCls}>Speaker *</label>
              <select
                value={speakerForm.speakerId}
                onChange={(e) => setSpeakerForm({ ...speakerForm, speakerId: e.target.value })}
                className={selectCls}
              >
                <option value="">Select a speaker...</option>
                {allSpeakers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.designation ? `(${s.designation})` : ""}
                  </option>
                ))}
              </select>
              {allSpeakers.length === 0 && (
                <p className="text-[11px] text-amber-400 mt-1">
                  No speakers found. Add speakers in the Speaker Directory first.
                </p>
              )}
            </div>
            <div className={`${gridTwoCls} mb-4`}>
              <div>
                <label className={labelCls}>Role</label>
                <select
                  value={speakerForm.role}
                  onChange={(e) => setSpeakerForm({ ...speakerForm, role: e.target.value })}
                  className={selectCls}
                >
                  {SPEAKER_ROLES.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Topic</label>
                <input
                  value={speakerForm.topic}
                  onChange={(e) => setSpeakerForm({ ...speakerForm, topic: e.target.value })}
                  className={inputCls}
                  placeholder="Talk topic"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSpeakerModal(false)} className={btnSecondaryCls}>Cancel</button>
              <button onClick={addSpeaker} className={btnPrimaryCls}>Add Speaker</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Sessions Section ─── */}
      <div className={cardCls}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-amber-500">Sessions</h2>
          <button
            onClick={() => {
              setEditingSession(null);
              setSessionForm({ title: "", description: "", startTime: "", endTime: "", speakerName: "" });
              setShowSessionModal(true);
            }}
            className="px-4 py-1.5 text-xs font-semibold rounded-md border border-amber-500 bg-transparent text-amber-500 cursor-pointer hover:bg-amber-500/10 transition-colors"
          >
            + Add Session
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-5">
            No sessions added yet. Add sessions for multi-part events.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 sm:px-4 bg-gray-900 rounded-lg border border-gray-700"
              >
                <div>
                  <div className="font-semibold text-gray-50 text-sm">{s.title}</div>
                  <div className="text-[11px] text-gray-400">
                    {s.startTime && new Date(s.startTime).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}
                    {s.endTime && ` - ${new Date(s.endTime).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}`}
                    {s.speakerName && ` | ${s.speakerName}`}
                  </div>
                </div>
                <div className="flex gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      setEditingSession(s);
                      setSessionForm({
                        title: s.title,
                        description: s.description || "",
                        startTime: s.startTime ? toTimeStr(s.startTime) : "",
                        endTime: s.endTime ? toTimeStr(s.endTime) : "",
                        speakerName: s.speakerName || "",
                      });
                      setShowSessionModal(true);
                    }}
                    className="px-3 py-1 text-[11px] font-semibold rounded-md border border-amber-500 bg-transparent text-amber-500 cursor-pointer hover:bg-amber-500/10 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteSession(s.id)}
                    className="px-3 py-1 text-[11px] font-semibold rounded-md border border-red-900 bg-transparent text-red-400 cursor-pointer hover:bg-red-900/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 w-full max-w-lg">
            <h3 className="text-base font-bold text-gray-50 mb-5">
              {editingSession ? "Edit Session" : "Add Session"}
            </h3>
            <div className="mb-4">
              <label className={labelCls}>Session Title *</label>
              <input
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                className={inputCls}
                placeholder="e.g. Opening Keynote"
              />
            </div>
            <div className="mb-4">
              <label className={labelCls}>Description</label>
              <textarea
                value={sessionForm.description}
                onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                className={`${textareaCls} !min-h-[60px]`}
                placeholder="Optional"
              />
            </div>
            <div className={`${gridThreeCls} mb-4`}>
              <div>
                <label className={labelCls}>Start Time</label>
                <input
                  type="time"
                  value={sessionForm.startTime}
                  onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>End Time</label>
                <input
                  type="time"
                  value={sessionForm.endTime}
                  onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Speaker</label>
                <input
                  value={sessionForm.speakerName}
                  onChange={(e) => setSessionForm({ ...sessionForm, speakerName: e.target.value })}
                  className={inputCls}
                  placeholder="Speaker name"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowSessionModal(false); setEditingSession(null); }} className={btnSecondaryCls}>
                Cancel
              </button>
              <button onClick={saveSession} className={btnPrimaryCls}>
                {editingSession ? "Update Session" : "Add Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom save */}
      <div className="flex gap-3 justify-end pb-12">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`${btnPrimaryCls} ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
