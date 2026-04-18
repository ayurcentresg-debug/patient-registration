"use client";

import { useState, useRef, useEffect } from "react";

// ─── HelpTip: Small info icon with hover/click tooltip ──────────────────────
interface HelpTipProps {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  size?: number;
  color?: string;
}

export function HelpTip({ text, position = "top", size = 15, color = "var(--grey-500)" }: HelpTipProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    }
    if (show) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show]);

  const posStyles: Record<string, React.CSSProperties> = {
    top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  };

  return (
    <span ref={ref} className="relative inline-flex" style={{ verticalAlign: "middle" }}>
      <button
        type="button"
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center justify-center transition-opacity hover:opacity-80"
        style={{ color, width: size, height: size }}
        aria-label="Help"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width={size} height={size}>
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
      </button>
      {show && (
        <span
          className="absolute z-50 px-3 py-2 text-[14px] leading-relaxed font-medium whitespace-normal block"
          style={{
            ...posStyles[position],
            background: "var(--grey-900)",
            color: "#fff",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            minWidth: 200,
            maxWidth: 300,
            pointerEvents: "none",
          }}
        >
          {text}
          <span
            style={{
              position: "absolute",
              display: "block",
              width: 8, height: 8,
              background: "var(--grey-900)",
              transform: "rotate(45deg)",
              ...(position === "top" ? { bottom: -4, left: "50%", marginLeft: -4 } : {}),
              ...(position === "bottom" ? { top: -4, left: "50%", marginLeft: -4 } : {}),
              ...(position === "left" ? { right: -4, top: "50%", marginTop: -4 } : {}),
              ...(position === "right" ? { left: -4, top: "50%", marginTop: -4 } : {}),
            }}
          />
        </span>
      )}
    </span>
  );
}

// ─── PageGuide: Floating help button (bottom-right) + slide-over panel ──────
// First visit to a page: panel auto-opens with the guide.
// After closing once: collapses to a small "?" button bottom-right.
// Click "?" any time to re-open.
interface GuideStep {
  icon: string;
  title: string;
  description: string;
}

interface PageGuideProps {
  storageKey: string;
  title: string;
  subtitle?: string;
  steps: GuideStep[];
}

export function PageGuide({ storageKey, title, subtitle, steps }: PageGuideProps) {
  // Start closed to avoid hydration flash; open on mount if first visit.
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = localStorage.getItem(`guide_seen_${storageKey}`);
    if (!seen) setOpen(true);
  }, [storageKey]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function close() {
    localStorage.setItem(`guide_seen_${storageKey}`, "true");
    setOpen(false);
  }

  function toggle() {
    if (!open) {
      setOpen(true);
    } else {
      close();
    }
  }

  if (!mounted) return null;

  return (
    <>
      {/* Floating help button — always visible, bottom-right */}
      <button
        onClick={toggle}
        aria-label={open ? "Close page guide" : "Open page guide"}
        title={open ? "Close page guide" : "Open page guide"}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 90,
          width: 48,
          height: 48,
          borderRadius: 9999,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: open ? "var(--grey-900)" : "linear-gradient(135deg, #2563eb, #3b82f6)",
          color: "#fff",
          boxShadow: "0 4px 16px rgba(37, 99, 235, 0.35), 0 2px 6px rgba(0,0,0,0.12)",
          transition: "transform 0.15s ease, background 0.2s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {open ? (
          <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>

      {/* Slide-over panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={close}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.25)",
              backdropFilter: "blur(2px)",
              zIndex: 80,
              animation: "guideFadeIn 0.2s ease-out",
            }}
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-labelledby="guide-title"
            style={{
              position: "fixed",
              bottom: 84,
              right: 20,
              width: "min(400px, calc(100vw - 40px))",
              maxHeight: "min(70vh, 640px)",
              background: "linear-gradient(135deg, #f0f7ff 0%, #e8f4f8 100%)",
              border: "1px solid var(--blue-200)",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.08)",
              zIndex: 85,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "guideSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Header */}
            <div style={{ padding: "16px 44px 12px 20px", position: "relative", borderBottom: "1px solid rgba(59, 130, 246, 0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg style={{ width: 20, height: 20, color: "var(--blue-500)", flexShrink: 0 }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <h3 id="guide-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--grey-900)" }}>{title}</h3>
              </div>
              {subtitle && <p style={{ margin: "4px 0 0 28px", fontSize: 13, color: "var(--grey-600)" }}>{subtitle}</p>}
              <button
                onClick={close}
                aria-label="Close guide"
                style={{
                  position: "absolute", top: 12, right: 12, width: 28, height: 28,
                  border: "none", background: "transparent", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 6, color: "var(--grey-500)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.6)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Steps (scrollable) */}
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
              {steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: 12,
                    background: "rgba(255,255,255,0.7)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid rgba(0,0,0,0.05)",
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{step.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--grey-900)" }}>{step.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, lineHeight: 1.5, color: "var(--grey-600)" }}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <style>{`
            @keyframes guideFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes guideSlideUp {
              from { opacity: 0; transform: translateY(20px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </>
      )}
    </>
  );
}

// ─── SectionNote: Inline note for a section ─────────────────────────────────
interface SectionNoteProps {
  text: string;
  type?: "info" | "tip" | "warning";
}

export function SectionNote({ text, type = "info" }: SectionNoteProps) {
  const styles = {
    info: { bg: "var(--blue-50)", border: "var(--blue-200)", color: "var(--blue-500)", icon: "ℹ" },
    tip: { bg: "#f0faf0", border: "#a5d6a7", color: "var(--green)", icon: "💡" },
    warning: { bg: "#fff8e1", border: "#ffe082", color: "#f57c00", icon: "⚠" },
  };
  const s = styles[type];

  return (
    <div
      className="flex items-start gap-2 px-3 py-2 text-[13px] leading-relaxed mb-3"
      style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: "var(--radius-sm)", color: s.color }}
    >
      <span className="flex-shrink-0 text-[15px]">{s.icon}</span>
      <span style={{ color: "var(--grey-700)" }}>{text}</span>
    </div>
  );
}
