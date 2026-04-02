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

// ─── PageGuide: Dismissible getting-started banner ──────────────────────────
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
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const val = localStorage.getItem(`guide_dismissed_${storageKey}`);
    setDismissed(val === "true");
  }, [storageKey]);

  function dismiss() {
    localStorage.setItem(`guide_dismissed_${storageKey}`, "true");
    setDismissed(true);
  }

  function reset() {
    localStorage.removeItem(`guide_dismissed_${storageKey}`);
    setDismissed(false);
  }

  if (dismissed) {
    return (
      <button
        onClick={reset}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:underline mb-3"
        style={{ color: "var(--blue-500)" }}
        title="Show getting started guide"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
        Show Guide
      </button>
    );
  }

  return (
    <div
      className="mb-5 p-4 relative yoda-fade-in"
      style={{
        background: "linear-gradient(135deg, #f0f7ff 0%, #e8f4f8 100%)",
        border: "1px solid var(--blue-200)",
        borderRadius: "var(--radius)",
      }}
    >
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-white/50"
        style={{ color: "var(--grey-500)" }}
        aria-label="Dismiss guide"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-center gap-2 mb-1">
        <svg className="w-5 h-5" style={{ color: "var(--blue-500)" }} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
        <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{title}</h3>
      </div>
      {subtitle && <p className="text-[14px] mb-3 ml-7" style={{ color: "var(--grey-600)" }}>{subtitle}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 p-3"
            style={{ background: "rgba(255,255,255,0.7)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(0,0,0,0.05)" }}
          >
            <span className="text-[18px] flex-shrink-0 mt-0.5">{step.icon}</span>
            <div>
              <p className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>{step.title}</p>
              <p className="text-[13px] leading-relaxed mt-0.5" style={{ color: "var(--grey-600)" }}>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
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
