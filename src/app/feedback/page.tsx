"use client";

import { useEffect, useState, useCallback } from "react";
import { cardStyle, btnPrimary, inputStyle } from "@/lib/styles";

const chipBase = { display: "inline-block", padding: "3px 10px", fontSize: 11, fontWeight: 700 as const, borderRadius: 20 };

interface FeedbackItem {
  id: string; patientName: string; doctorName: string | null; doctorId: string | null;
  rating: number; category: string; comment: string | null; response: string | null;
  respondedAt: string | null; status: string; source: string; appointmentId: string | null;
  createdAt: string; tags: string;
}

interface Stats {
  total: number; avgRating: number; nps: number;
  distribution: Array<{ rating: number; count: number }>;
}

const CATEGORIES = ["all", "general", "consultation", "treatment", "staff", "facility", "billing"];
const STARS = [1, 2, 3, 4, 5];

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {STARS.map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={s <= rating ? "#f59e0b" : "#e5e7eb"} stroke="none">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }); }

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, avgRating: 0, nps: 0, distribution: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: "all", rating: "", status: "all" });
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter.category !== "all") params.set("category", filter.category);
    if (filter.rating) params.set("rating", filter.rating);
    if (filter.status !== "all") params.set("status", filter.status);

    try {
      const r = await fetch(`/api/feedback?${params}`);
      if (r.ok) {
        const data = await r.json();
        setFeedbacks(data.feedbacks);
        setStats(data.stats);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function respondToFeedback(id: string) {
    if (!responseText.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, response: responseText }),
      });
      if (r.ok) {
        setRespondingId(null);
        setResponseText("");
        fetchData();
      }
    } catch { /* */ }
    finally { setSaving(false); }
  }

  async function toggleStatus(id: string, newStatus: string) {
    await fetch("/api/feedback", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    fetchData();
  }

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading feedback...</p>
      </div>
    );
  }

  const ratingColors = ["", "#dc2626", "#f97316", "#eab308", "#84cc16", "#16a34a"];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: 0 }}>Patient Feedback</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>Reviews and ratings from patients</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, padding: 20, textAlign: "center" }}>
          <p style={{ fontSize: 32, fontWeight: 800, color: "#f59e0b", margin: 0 }}>{stats.avgRating}</p>
          <StarRating rating={Math.round(stats.avgRating)} size={14} />
          <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>Average Rating</p>
        </div>
        <div style={{ ...cardStyle, padding: 20, textAlign: "center" }}>
          <p style={{ fontSize: 32, fontWeight: 800, color: "#2563eb", margin: 0 }}>{stats.total}</p>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>Total Reviews</p>
        </div>
        <div style={{ ...cardStyle, padding: 20, textAlign: "center" }}>
          <p style={{ fontSize: 32, fontWeight: 800, color: stats.nps >= 0 ? "#16a34a" : "#dc2626", margin: 0 }}>{stats.nps}</p>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>NPS Score</p>
        </div>
        <div style={{ ...cardStyle, padding: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 8px" }}>Distribution</p>
          {[5, 4, 3, 2, 1].map(r => {
            const count = stats.distribution.find(d => d.rating === r)?.count || 0;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: "#6b7280", width: 12, textAlign: "right" }}>{r}</span>
                <svg width={12} height={12} viewBox="0 0 24 24" fill={ratingColors[r]}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: ratingColors[r], borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af", width: 24, textAlign: "right" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })}
          style={{ ...inputStyle, width: "auto", minWidth: 140 }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={filter.rating} onChange={e => setFilter({ ...filter, rating: e.target.value })}
          style={{ ...inputStyle, width: "auto", minWidth: 120 }}>
          <option value="">All Ratings</option>
          {STARS.map(s => <option key={s} value={s}>{s} Star{s > 1 ? "s" : ""}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}
          style={{ ...inputStyle, width: "auto", minWidth: 120 }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      {/* Feedback List */}
      {feedbacks.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>📝</p>
          <p style={{ color: "#6b7280", fontSize: 15 }}>No feedback yet. Feedback will appear here as patients review their appointments.</p>
        </div>
      ) : (
        feedbacks.map(fb => (
          <div key={fb.id} style={{ ...cardStyle, padding: 20, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{fb.patientName}</span>
                  <StarRating rating={fb.rating} size={14} />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {fb.doctorName && <span style={{ ...chipBase, background: "#eff6ff", color: "#2563eb", fontSize: 11 }}>Dr. {fb.doctorName}</span>}
                  <span style={{ ...chipBase, background: "#f3f4f6", color: "#6b7280", fontSize: 11 }}>{fb.category}</span>
                  <span style={{ ...chipBase, background: "#f3f4f6", color: "#6b7280", fontSize: 11 }}>{fb.source}</span>
                  {fb.status === "flagged" && <span style={{ ...chipBase, background: "#fef2f2", color: "#dc2626", fontSize: 11 }}>Flagged</span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{fmtDate(fb.createdAt)}</span>
                <div style={{ position: "relative" }}>
                  <select
                    value={fb.status}
                    onChange={e => toggleStatus(fb.id, e.target.value)}
                    style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, border: "1px solid #e5e7eb", color: "#6b7280", background: "#fff", cursor: "pointer" }}>
                    <option value="active">Active</option>
                    <option value="flagged">Flag</option>
                    <option value="hidden">Hide</option>
                  </select>
                </div>
              </div>
            </div>

            {fb.comment && <p style={{ fontSize: 14, color: "#374151", margin: "8px 0", lineHeight: 1.6 }}>{fb.comment}</p>}

            {/* Response */}
            {fb.response && (
              <div style={{ background: "#f0fdf4", borderRadius: 8, padding: 12, marginTop: 10, borderLeft: "3px solid #16a34a" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#166534", margin: "0 0 4px" }}>Clinic Response</p>
                <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{fb.response}</p>
                {fb.respondedAt && <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>{fmtDate(fb.respondedAt)}</p>}
              </div>
            )}

            {/* Reply form */}
            {!fb.response && respondingId !== fb.id && (
              <button onClick={() => { setRespondingId(fb.id); setResponseText(""); }}
                style={{ marginTop: 8, padding: "4px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", cursor: "pointer" }}>
                Reply
              </button>
            )}

            {respondingId === fb.id && (
              <div style={{ marginTop: 10 }}>
                <textarea rows={3} placeholder="Write your response..."
                  value={responseText} onChange={e => setResponseText(e.target.value)}
                  style={{ ...inputStyle, resize: "vertical" as const, marginBottom: 8 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => respondToFeedback(fb.id)} disabled={saving || !responseText.trim()}
                    style={{ ...btnPrimary, padding: "6px 16px", fontSize: 12, opacity: saving || !responseText.trim() ? 0.5 : 1 }}>
                    {saving ? "Sending..." : "Send Response"}
                  </button>
                  <button onClick={() => setRespondingId(null)}
                    style={{ padding: "6px 16px", fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
