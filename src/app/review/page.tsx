"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const STARS = [1, 2, 3, 4, 5];
const TAGS = ["Friendly staff", "Clean facility", "Short wait time", "Clear explanation", "Professional", "Helpful advice", "Good follow-up"];

export default function ReviewPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fefbf6" }}><p style={{ color: "#6b7280" }}>Loading...</p></div>}>
      <ReviewContent />
    </Suspense>
  );
}

function ReviewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState<{ patientName: string; doctorName: string | null } | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setError("Invalid review link"); setLoading(false); return; }
    fetch(`/api/public/feedback?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.alreadySubmitted ? "You have already submitted your review. Thank you!" : data.error);
        } else {
          setInfo(data);
        }
      })
      .catch(() => setError("Failed to load review form"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/public/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, comment: comment || undefined, tags: selectedTags.length > 0 ? selectedTags : undefined }),
      });
      if (r.ok) {
        setSubmitted(true);
      } else {
        const data = await r.json();
        setError(data.error || "Failed to submit");
      }
    } catch { setError("Network error"); }
    finally { setSubmitting(false); }
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fefbf6" }}>
        <p style={{ color: "#6b7280" }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fefbf6", padding: 20 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{error.includes("already") ? "✅" : "⚠️"}</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 8 }}>{error.includes("already") ? "Already Reviewed" : "Oops"}</h1>
          <p style={{ color: "#6b7280", fontSize: 15 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fefbf6", padding: 20 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#14532d", marginBottom: 8 }}>Thank You!</h1>
          <p style={{ color: "#6b7280", fontSize: 15 }}>Your feedback helps us improve. We appreciate you taking the time to share your experience.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, margin: "20px 0" }}>
            {STARS.map(s => (
              <svg key={s} width={32} height={32} viewBox="0 0 24 24" fill={s <= rating ? "#f59e0b" : "#e5e7eb"}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fefbf6", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: "#14532d", padding: "24px 28px", textAlign: "center" }}>
          <h1 style={{ color: "#fff", fontSize: 20, margin: 0, fontWeight: 800 }}>How was your visit?</h1>
          {info?.doctorName && <p style={{ color: "#bbf7d0", fontSize: 14, margin: "4px 0 0" }}>with Dr. {info.doctorName}</p>}
        </div>

        <div style={{ padding: "28px" }}>
          <p style={{ color: "#374151", fontSize: 15, margin: "0 0 20px", textAlign: "center" }}>
            Hi {info?.patientName}, please rate your experience
          </p>

          {/* Star Rating */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            {STARS.map(s => (
              <button key={s}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, transition: "transform 0.15s", transform: (hoverRating || rating) >= s ? "scale(1.15)" : "scale(1)" }}>
                <svg width={40} height={40} viewBox="0 0 24 24" fill={(hoverRating || rating) >= s ? "#f59e0b" : "#e5e7eb"}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>
          {(hoverRating || rating) > 0 && (
            <p style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "#f59e0b", margin: "0 0 20px" }}>
              {labels[hoverRating || rating]}
            </p>
          )}

          {/* Quick Tags */}
          {rating > 0 && (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 8px" }}>What stood out?</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {TAGS.map(tag => (
                  <button key={tag} onClick={() => toggleTag(tag)}
                    style={{
                      padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: "pointer",
                      border: selectedTags.includes(tag) ? "1.5px solid #14532d" : "1.5px solid #e5e7eb",
                      background: selectedTags.includes(tag) ? "#f0fdf4" : "#fff",
                      color: selectedTags.includes(tag) ? "#14532d" : "#6b7280",
                    }}>
                    {tag}
                  </button>
                ))}
              </div>

              {/* Comment */}
              <textarea rows={3} placeholder="Tell us more (optional)..."
                value={comment} onChange={e => setComment(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: 10, border: "1.5px solid #e5e7eb", outline: "none", background: "#fafafa", boxSizing: "border-box" as const, resize: "vertical" as const, marginBottom: 16 }} />

              <button onClick={handleSubmit} disabled={submitting}
                style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 700, borderRadius: 10, border: "none", background: "#14532d", color: "#fff", cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
