"use client";

import { useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FlashCardProps {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
  onClose: () => void;
  autoDismiss?: number; // ms, 0 = no auto-dismiss. Default: 5000 for success, 0 for error
}

// ─── Theme config per type ───────────────────────────────────────────────────

const THEME = {
  success: {
    bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #e8f5e9 100%)",
    iconBg: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    titleColor: "#15803d",
    buttonBorder: "#22c55e",
    buttonText: "#15803d",
    buttonHover: "#f0fdf4",
  },
  error: {
    bg: "linear-gradient(135deg, #fef2f2 0%, #fecaca 50%, #fee2e2 100%)",
    iconBg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    titleColor: "#dc2626",
    buttonBorder: "#ef4444",
    buttonText: "#dc2626",
    buttonHover: "#fef2f2",
  },
  warning: {
    bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fef9c3 100%)",
    iconBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    titleColor: "#b45309",
    buttonBorder: "#f59e0b",
    buttonText: "#b45309",
    buttonHover: "#fffbeb",
  },
  info: {
    bg: "linear-gradient(135deg, #eff6ff 0%, #bfdbfe 50%, #dbeafe 100%)",
    iconBg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    titleColor: "#1d4ed8",
    buttonBorder: "#3b82f6",
    buttonText: "#1d4ed8",
    buttonHover: "#eff6ff",
  },
};

// ─── SVG Illustrations ───────────────────────────────────────────────────────

function SuccessIllustration() {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      {/* Decorative leaves */}
      <ellipse cx="40" cy="130" rx="28" ry="12" fill="#dcfce7" />
      <ellipse cx="160" cy="130" rx="28" ry="12" fill="#dcfce7" />

      {/* Left leaf cluster */}
      <path d="M55 95c-15-20-35-15-40-5s5 25 20 25c10 0 18-8 20-20z" fill="#86efac" opacity="0.7" />
      <path d="M48 100c-10-25-30-22-35-12s2 28 17 30c10 1 16-6 18-18z" fill="#4ade80" opacity="0.8" />
      <path d="M42 90c-8-22-25-20-30-12s0 22 14 26c9 2 14-4 16-14z" fill="#22c55e" opacity="0.6" />

      {/* Right leaf cluster */}
      <path d="M145 95c15-20 35-15 40-5s-5 25-20 25c-10 0-18-8-20-20z" fill="#86efac" opacity="0.7" />
      <path d="M152 100c10-25 30-22 35-12s-2 28-17 30c-10 1-16-6-18-18z" fill="#4ade80" opacity="0.8" />
      <path d="M158 90c8-22 25-20 30-12s0 22-14 26c-9 2-14-4-16-14z" fill="#22c55e" opacity="0.6" />

      {/* Center circle glow */}
      <circle cx="100" cy="75" r="42" fill="#dcfce7" opacity="0.5" />
      <circle cx="100" cy="75" r="36" fill="#bbf7d0" opacity="0.6" />

      {/* Checkmark circle */}
      <circle cx="100" cy="75" r="30" fill="url(#successGrad)">
        <animate attributeName="r" from="0" to="30" dur="0.4s" fill="freeze" />
      </circle>

      {/* Checkmark */}
      <path
        d="M86 75l8 8 20-20"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="40"
        strokeDashoffset="40"
      >
        <animate attributeName="stroke-dashoffset" from="40" to="0" dur="0.3s" begin="0.3s" fill="freeze" />
      </path>

      {/* Small floating leaves */}
      <path d="M70 40c-3-8-10-7-12-3s1 9 6 9c3 0 5-3 6-6z" fill="#4ade80" opacity="0.5">
        <animateTransform attributeName="transform" type="translate" values="0,0;2,-3;0,0" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M135 35c3-8 10-7 12-3s-1 9-6 9c-3 0-5-3-6-6z" fill="#86efac" opacity="0.5">
        <animateTransform attributeName="transform" type="translate" values="0,0;-2,-4;0,0" dur="3.5s" repeatCount="indefinite" />
      </path>

      {/* Sparkles */}
      <circle cx="65" cy="55" r="2" fill="#fbbf24" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="140" cy="50" r="1.5" fill="#fbbf24" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="80" cy="35" r="1.5" fill="#fbbf24" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.8s" repeatCount="indefinite" />
      </circle>

      <defs>
        <linearGradient id="successGrad" x1="70" y1="45" x2="130" y2="105" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22c55e" />
          <stop offset="1" stopColor="#16a34a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ErrorIllustration() {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      {/* Ground shadow */}
      <ellipse cx="100" cy="135" rx="60" ry="10" fill="#fecaca" opacity="0.4" />

      {/* Wilted leaves - left */}
      <path d="M55 110c-12-15-28-10-32-2s3 20 16 22c8 1 14-7 16-20z" fill="#d4a0a0" opacity="0.5" />
      <path d="M48 105c-10-18-25-15-28-6s1 22 14 24c8 1 13-6 14-18z" fill="#c48888" opacity="0.6" />
      <path d="M60 115c-8-12-20-10-24-3s1 16 10 18c6 1 12-5 14-15z" fill="#b07070" opacity="0.4" />

      {/* Wilted leaves - right */}
      <path d="M145 110c12-15 28-10 32-2s-3 20-16 22c-8 1-14-7-16-20z" fill="#d4a0a0" opacity="0.5" />
      <path d="M152 105c10-18 25-15 28-6s-1 22-14 24c-8 1-13-6-14-18z" fill="#c48888" opacity="0.6" />
      <path d="M140 115c8-12 20-10 24-3s-1 16-10 18c-6 1-12-5-14-15z" fill="#b07070" opacity="0.4" />

      {/* Center glow */}
      <circle cx="100" cy="75" r="42" fill="#fee2e2" opacity="0.5" />
      <circle cx="100" cy="75" r="36" fill="#fecaca" opacity="0.5" />

      {/* X circle */}
      <circle cx="100" cy="75" r="30" fill="url(#errorGrad)">
        <animate attributeName="r" from="0" to="30" dur="0.4s" fill="freeze" />
      </circle>

      {/* X mark */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;-2,0;2,0;-1,0;1,0;0,0" dur="0.5s" begin="0.3s" fill="freeze" />
        <path d="M88 63l24 24M112 63l-24 24" stroke="white" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* Falling petals */}
      <ellipse cx="70" cy="45" rx="4" ry="2" fill="#fca5a5" opacity="0.6" transform="rotate(-20 70 45)">
        <animateTransform attributeName="transform" type="translate" values="0,0;5,15;10,30" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.3;0" dur="4s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="130" cy="40" rx="3" ry="1.5" fill="#fca5a5" opacity="0.5" transform="rotate(15 130 40)">
        <animateTransform attributeName="transform" type="translate" values="0,0;-4,12;-8,25" dur="3.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.2;0" dur="3.5s" repeatCount="indefinite" />
      </ellipse>

      <defs>
        <linearGradient id="errorGrad" x1="70" y1="45" x2="130" y2="105" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ef4444" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function WarningIllustration() {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      {/* Ground */}
      <ellipse cx="100" cy="135" rx="55" ry="10" fill="#fef3c7" opacity="0.5" />

      {/* Half-open leaves */}
      <path d="M50 105c-10-20-28-16-32-6s4 22 18 23c9 0 13-6 14-17z" fill="#fde68a" opacity="0.6" />
      <path d="M55 100c-8-18-22-14-26-5s2 18 14 20c8 1 11-5 12-15z" fill="#fbbf24" opacity="0.5" />
      <path d="M150 105c10-20 28-16 32-6s-4 22-18 23c-9 0-13-6-14-17z" fill="#fde68a" opacity="0.6" />
      <path d="M145 100c8-18 22-14 26-5s-2 18-14 20c-8 1-11-5-12-15z" fill="#fbbf24" opacity="0.5" />

      {/* Center glow */}
      <circle cx="100" cy="75" r="42" fill="#fef9c3" opacity="0.5" />
      <circle cx="100" cy="75" r="36" fill="#fef3c7" opacity="0.5" />

      {/* Triangle */}
      <path d="M100 48L128 100H72L100 48z" fill="url(#warnGrad)" strokeLinejoin="round">
        <animate attributeName="opacity" from="0" to="1" dur="0.4s" fill="freeze" />
      </path>

      {/* Exclamation */}
      <line x1="100" y1="64" x2="100" y2="82" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="91" r="2.5" fill="white" />

      {/* Pulse ring */}
      <circle cx="100" cy="75" r="30" stroke="#f59e0b" strokeWidth="1.5" fill="none" opacity="0.4">
        <animate attributeName="r" values="30;40;30" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
      </circle>

      <defs>
        <linearGradient id="warnGrad" x1="100" y1="48" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function InfoIllustration() {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      {/* Ground */}
      <ellipse cx="100" cy="135" rx="55" ry="10" fill="#bfdbfe" opacity="0.4" />

      {/* Leaf accents */}
      <path d="M48 105c-10-18-26-14-30-5s3 20 16 22c8 1 12-6 14-17z" fill="#93c5fd" opacity="0.5" />
      <path d="M55 100c-8-16-20-12-24-4s1 16 12 18c7 1 10-4 12-14z" fill="#60a5fa" opacity="0.4" />
      <path d="M152 105c10-18 26-14 30-5s-3 20-16 22c-8 1-12-6-14-17z" fill="#93c5fd" opacity="0.5" />
      <path d="M145 100c8-16 20-12 24-4s-1 16-12 18c-7 1-10-4-12-14z" fill="#60a5fa" opacity="0.4" />

      {/* Center glow */}
      <circle cx="100" cy="75" r="42" fill="#dbeafe" opacity="0.5" />
      <circle cx="100" cy="75" r="36" fill="#bfdbfe" opacity="0.5" />

      {/* Info circle */}
      <circle cx="100" cy="75" r="30" fill="url(#infoGrad)">
        <animate attributeName="r" from="0" to="30" dur="0.4s" fill="freeze" />
      </circle>

      {/* "i" symbol */}
      <circle cx="100" cy="62" r="3" fill="white" />
      <line x1="100" y1="70" x2="100" y2="90" stroke="white" strokeWidth="4" strokeLinecap="round" />

      {/* Orbiting dot */}
      <circle cx="100" cy="75" r="0" fill="#60a5fa" opacity="0.3">
        <animate attributeName="r" values="35;38;35" dur="3s" repeatCount="indefinite" />
      </circle>

      <defs>
        <linearGradient id="infoGrad" x1="70" y1="45" x2="130" y2="105" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const ILLUSTRATIONS = {
  success: SuccessIllustration,
  error: ErrorIllustration,
  warning: WarningIllustration,
  info: InfoIllustration,
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FlashCard({
  type,
  title,
  message,
  action,
  onClose,
  autoDismiss,
}: FlashCardProps) {
  const theme = THEME[type];
  const Illustration = ILLUSTRATIONS[type];

  // Auto-dismiss: 5s for success/info, manual for error/warning
  const dismissTime = autoDismiss ?? (type === "success" || type === "info" ? 5000 : 0);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (dismissTime > 0) {
      const t = setTimeout(handleDismiss, dismissTime);
      return () => clearTimeout(t);
    }
  }, [dismissTime, handleDismiss]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDismiss]);

  return (
    <div
      className="flash-card-overlay"
      onClick={handleDismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(4px)",
        animation: "flashOverlayIn 0.25s ease-out",
      }}
    >
      <div
        className="flash-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 280,
          maxWidth: "90vw",
          borderRadius: 16,
          background: "#fff",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1)",
          overflow: "hidden",
          animation: "flashCardIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            border: "none",
            background: "rgba(255,255,255,0.8)",
            borderRadius: "50%",
            fontSize: 16,
            color: "#6b7280",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
            backdropFilter: "blur(4px)",
            transition: "background 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,1)";
            e.currentTarget.style.color = "#111";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.8)";
            e.currentTarget.style.color = "#6b7280";
          }}
        >
          &times;
        </button>

        {/* Illustration area — 60% of card */}
        <div
          style={{
            position: "relative",
            height: 200,
            background: theme.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 24px 0",
          }}
        >
          <Illustration />
        </div>

        {/* Content area */}
        <div style={{ padding: "20px 24px 24px", textAlign: "center" }}>
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: theme.titleColor,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              lineHeight: 1.5,
              color: "#6b7280",
            }}
          >
            {message}
          </p>

          {/* CTA Button */}
          {action && (
            <button
              onClick={action.onClick}
              style={{
                marginTop: 20,
                width: "100%",
                padding: "10px 20px",
                border: `1.5px solid ${theme.buttonBorder}`,
                borderRadius: 8,
                background: "transparent",
                color: theme.buttonText,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "background 0.2s, transform 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme.buttonHover;
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes flashOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes flashCardIn {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

// ─── Hook for easy usage ─────────────────────────────────────────────────────

import { useState } from "react";

interface FlashState {
  type: FlashCardProps["type"];
  title: string;
  message: string;
  action?: FlashCardProps["action"];
  autoDismiss?: number;
}

export function useFlashCard() {
  const [flash, setFlash] = useState<FlashState | null>(null);

  const showFlash = useCallback((config: FlashState) => {
    setFlash(config);
  }, []);

  const hideFlash = useCallback(() => {
    setFlash(null);
  }, []);

  const FlashCardElement = flash ? (
    <FlashCard
      type={flash.type}
      title={flash.title}
      message={flash.message}
      action={flash.action}
      onClose={hideFlash}
      autoDismiss={flash.autoDismiss}
    />
  ) : null;

  return { showFlash, hideFlash, FlashCardElement };
}
