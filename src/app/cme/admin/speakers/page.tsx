"use client";

import { useEffect, useState, useCallback } from "react";

/* ─── Types ─── */
interface Speaker {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  organization: string | null;
  bio: string | null;
  photoUrl: string | null;
  specializations: string[];
  linkedinUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
}

interface SpeakerForm {
  name: string;
  email: string;
  phone: string;
  designation: string;
  organization: string;
  bio: string;
  photoUrl: string;
  specializations: string;
  linkedinUrl: string;
  websiteUrl: string;
}

const EMPTY_FORM: SpeakerForm = {
  name: "",
  email: "",
  phone: "",
  designation: "",
  organization: "",
  bio: "",
  photoUrl: "",
  specializations: "",
  linkedinUrl: "",
  websiteUrl: "",
};

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [form, setForm] = useState<SpeakerForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchSpeakers = useCallback(async () => {
    try {
      const res = await fetch("/api/cme/speakers");
      if (!res.ok) throw new Error("Failed to fetch speakers");
      const data = await res.json();
      setSpeakers(data.speakers || []);
      setError("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load speakers";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpeakers();
  }, [fetchSpeakers]);

  function openAdd() {
    setEditingSpeaker(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(speaker: Speaker) {
    setEditingSpeaker(speaker);
    setForm({
      name: speaker.name,
      email: speaker.email || "",
      phone: speaker.phone || "",
      designation: speaker.designation || "",
      organization: speaker.organization || "",
      bio: speaker.bio || "",
      photoUrl: speaker.photoUrl || "",
      specializations: Array.isArray(speaker.specializations)
        ? speaker.specializations.join(", ")
        : "",
      linkedinUrl: speaker.linkedinUrl || "",
      websiteUrl: speaker.websiteUrl || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        designation: form.designation.trim() || null,
        organization: form.organization.trim() || null,
        bio: form.bio.trim() || null,
        photoUrl: form.photoUrl.trim() || null,
        specializations: form.specializations
          ? form.specializations.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        linkedinUrl: form.linkedinUrl.trim() || null,
        websiteUrl: form.websiteUrl.trim() || null,
      };

      const url = editingSpeaker
        ? `/api/cme/speakers/${editingSpeaker.id}`
        : "/api/cme/speakers";
      const method = editingSpeaker ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save speaker");
      }

      setShowModal(false);
      setEditingSpeaker(null);
      setForm(EMPTY_FORM);
      fetchSpeakers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSpeaker(id: string) {
    if (!confirm("Are you sure you want to delete this speaker?")) return;
    setDeleteLoading(id);
    try {
      const res = await fetch(`/api/cme/speakers/${id}`, { method: "DELETE" });
      if (res.ok) fetchSpeakers();
    } catch {
      /* silent */
    } finally {
      setDeleteLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading speakers...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-50">
            Speaker Directory
          </h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1">
            Manage speakers for your CME events and webinars
          </p>
        </div>
        <button
          onClick={openAdd}
          className="self-start sm:self-auto px-6 py-2.5 text-sm font-bold rounded-lg border-none bg-gradient-to-br from-amber-400 to-amber-600 text-gray-900 cursor-pointer hover:from-amber-300 hover:to-amber-500 transition-all"
        >
          + Add Speaker
        </button>
      </div>

      {error && (
        <div className="bg-red-900/80 border border-red-800 rounded-lg px-4 py-3 mb-5 text-red-300 text-xs md:text-sm">
          {error}
        </div>
      )}

      {/* Speaker Grid */}
      {speakers.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-10 md:p-12 text-center">
          <p className="text-4xl mb-2">🎤</p>
          <p className="text-gray-400 text-sm md:text-base mb-4">
            No speakers added yet
          </p>
          <button
            onClick={openAdd}
            className="px-6 py-2.5 text-sm font-bold rounded-lg border-none bg-gradient-to-br from-amber-400 to-amber-600 text-gray-900 cursor-pointer hover:from-amber-300 hover:to-amber-500 transition-all"
          >
            Add your first speaker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {speakers.map((speaker) => (
            <div
              key={speaker.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-5"
            >
              <div className="flex items-start gap-4 mb-3">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-xl text-amber-400 font-bold shrink-0 overflow-hidden">
                  {speaker.photoUrl ? (
                    <img
                      src={speaker.photoUrl}
                      alt={speaker.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    speaker.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-gray-50 truncate">
                    {speaker.name}
                  </div>
                  {speaker.designation && (
                    <div className="text-xs text-amber-400 truncate">
                      {speaker.designation}
                    </div>
                  )}
                  {speaker.organization && (
                    <div className="text-xs text-gray-400 truncate">
                      {speaker.organization}
                    </div>
                  )}
                </div>
              </div>

              {/* Specializations */}
              {speaker.specializations && speaker.specializations.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {speaker.specializations.map((spec, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 text-[11px] rounded-full bg-amber-900/30 text-amber-400 border border-amber-800/50"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}

              {/* Bio preview */}
              {speaker.bio && (
                <p className="text-xs text-gray-400 mb-3 leading-relaxed line-clamp-2">
                  {speaker.bio}
                </p>
              )}

              {/* Contact / Links */}
              <div className="flex gap-2 text-[11px] text-gray-500 mb-3 flex-wrap">
                {speaker.email && <span className="truncate max-w-[180px]">{speaker.email}</span>}
                {speaker.phone && <span>{speaker.phone}</span>}
              </div>

              {/* Actions */}
              <div className="flex gap-2 border-t border-gray-700 pt-3">
                <button
                  onClick={() => openEdit(speaker)}
                  className="px-3.5 py-1 text-[11px] font-semibold rounded-md border border-amber-400 bg-transparent text-amber-400 cursor-pointer hover:bg-amber-400/10 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteSpeaker(speaker.id)}
                  disabled={deleteLoading === speaker.id}
                  className={`px-3.5 py-1 text-[11px] font-semibold rounded-md border border-red-900 bg-transparent text-red-400 cursor-pointer hover:bg-red-400/10 transition-colors ${
                    deleteLoading === speaker.id
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Speaker Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 md:p-7 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-50 mb-6">
              {editingSpeaker ? "Edit Speaker" : "Add New Speaker"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Designation
                </label>
                <input
                  value={form.designation}
                  onChange={(e) =>
                    setForm({ ...form, designation: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g. Professor, Dr."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="speaker@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="+65..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Organization
                </label>
                <input
                  value={form.organization}
                  onChange={(e) =>
                    setForm({ ...form, organization: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Hospital, university, or organization"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Bio
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[80px] resize-y font-[inherit]"
                placeholder="Brief professional bio..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Specializations (comma-separated)
              </label>
              <input
                value={form.specializations}
                onChange={(e) =>
                  setForm({ ...form, specializations: e.target.value })
                }
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Ayurveda, Panchakarma, Yoga Therapy"
              />
              {form.specializations && (
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {form.specializations
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((spec, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 text-[11px] rounded-full bg-amber-900/30 text-amber-400 border border-amber-800/50"
                      >
                        {spec}
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Photo URL
                </label>
                <input
                  value={form.photoUrl}
                  onChange={(e) =>
                    setForm({ ...form, photoUrl: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  LinkedIn URL
                </label>
                <input
                  value={form.linkedinUrl}
                  onChange={(e) =>
                    setForm({ ...form, linkedinUrl: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Website URL
                </label>
                <input
                  value={form.websiteUrl}
                  onChange={(e) =>
                    setForm({ ...form, websiteUrl: e.target.value })
                  }
                  className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-gray-700 pt-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingSpeaker(null);
                }}
                className="px-6 py-2.5 text-sm font-semibold rounded-lg border border-gray-700 bg-gray-700 text-gray-300 cursor-pointer hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-2.5 text-sm font-bold rounded-lg border-none bg-gradient-to-br from-amber-400 to-amber-600 text-gray-900 cursor-pointer hover:from-amber-300 hover:to-amber-500 transition-all ${
                  saving ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {saving
                  ? "Saving..."
                  : editingSpeaker
                  ? "Update Speaker"
                  : "Add Speaker"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
