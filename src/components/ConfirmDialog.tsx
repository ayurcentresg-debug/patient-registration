"use client";

import React, { useEffect, useRef, useCallback, createContext, useContext, useState, type ReactNode } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ─── Variants ───────────────────────────────────────────────────────────────

const VARIANTS = {
  danger: {
    bg: "linear-gradient(135deg, #fef2f2 0%, #fecaca 50%, #fee2e2 100%)",
    iconBg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    titleColor: "#dc2626",
    btnBg: "#ef4444",
    btnHover: "#dc2626",
    fallbackIconBg: "var(--red-light, #fef2f2)",
    fallbackIconColor: "var(--red, #dc2626)",
    icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  },
  warning: {
    bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fef9c3 100%)",
    iconBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    titleColor: "#b45309",
    btnBg: "#f59e0b",
    btnHover: "#d97706",
    fallbackIconBg: "#faf3e6",
    fallbackIconColor: "#b68d40",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z",
  },
  default: {
    bg: "linear-gradient(135deg, #f0faf4 0%, #d1fae5 50%, #e8f5e9 100%)",
    iconBg: "linear-gradient(135deg, #2d6a4f 0%, #14532d 100%)",
    titleColor: "#14532d",
    btnBg: "#2d6a4f",
    btnHover: "#14532d",
    fallbackIconBg: "#f0faf4",
    fallbackIconColor: "#2d6a4f",
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

// ─── SVG Illustrations ──────────────────────────────────────────────────────

function DangerIllustration() {
  return (
    <svg viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <path d="M50 100c-12-15-28-10-32-2s3 20 16 22c8 1 14-7 16-20z" fill="#d4a0a0" opacity="0.4" />
      <path d="M150 100c12-15 28-10 32-2s-3 20-16 22c-8 1-14-7-16-20z" fill="#d4a0a0" opacity="0.4" />
      <path d="M100 20 L132 42 L132 72 Q132 95 100 108 Q68 95 68 72 L68 42 Z" fill="url(#dShield)" opacity="0.9">
        <animate attributeName="opacity" from="0" to="0.9" dur="0.3s" fill="freeze" />
      </path>
      <path d="M100 26 L128 45 L128 70 Q128 90 100 103 Q72 90 72 70 L72 45 Z" fill="white" opacity="0.12" />
      <line x1="100" y1="46" x2="100" y2="72" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <circle cx="100" cy="84" r="3" fill="white" />
      <defs>
        <linearGradient id="dShield" x1="68" y1="20" x2="132" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ef4444" /><stop offset="1" stopColor="#dc2626" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function WarningDialogIllustration() {
  return (
    <svg viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <path d="M45 100c-10-16-24-12-28-4s3 18 14 20c7 1 12-5 14-16z" fill="#fde68a" opacity="0.5" />
      <path d="M155 100c10-16 24-12 28-4s-3 18-14 20c-7 1-12-5-14-16z" fill="#fde68a" opacity="0.5" />
      <circle cx="100" cy="60" r="38" fill="#fef3c7" opacity="0.4" />
      <path d="M100 28L132 85H68L100 28z" fill="url(#wGrad)" strokeLinejoin="round">
        <animate attributeName="opacity" from="0" to="1" dur="0.35s" fill="freeze" />
      </path>
      <line x1="100" y1="48" x2="100" y2="68" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="76" r="2.5" fill="white" />
      <circle cx="100" cy="60" r="35" stroke="#f59e0b" strokeWidth="1" fill="none" opacity="0.25">
        <animate attributeName="r" values="35;42;35" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.25;0;0.25" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <defs>
        <linearGradient id="wGrad" x1="100" y1="28" x2="100" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" /><stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DefaultDialogIllustration() {
  return (
    <svg viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <path d="M48 95c-8-14-20-10-24-3s2 16 12 18c6 1 10-5 12-15z" fill="#86efac" opacity="0.4" />
      <path d="M152 95c8-14 20-10 24-3s-2 16-12 18c-6 1-10-5-12-15z" fill="#86efac" opacity="0.4" />
      <circle cx="100" cy="60" r="38" fill="#d1fae5" opacity="0.4" />
      <circle cx="100" cy="60" r="30" fill="url(#defGrad)">
        <animate attributeName="r" from="0" to="30" dur="0.35s" fill="freeze" />
      </circle>
      <circle cx="100" cy="48" r="3" fill="white" />
      <line x1="100" y1="56" x2="100" y2="76" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <defs>
        <linearGradient id="defGrad" x1="70" y1="30" x2="130" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2d6a4f" /><stop offset="1" stopColor="#14532d" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const ILLUSTRATIONS: Record<string, React.FC> = {
  danger: DangerIllustration,
  warning: WarningDialogIllustration,
  default: DefaultDialogIllustration,
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const v = VARIANTS[variant];
  const Illustration = ILLUSTRATIONS[variant];

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") onCancel();
      };
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[310] flex items-center justify-center p-4"
      style={{
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        animation: "confirmOverlayIn 0.2s ease-out",
      }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[300px]"
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.1)",
          overflow: "hidden",
          animation: "confirmCardIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Illustration area */}
        <div
          style={{
            height: 150,
            background: v.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 24px 0",
          }}
        >
          <Illustration />
        </div>

        {/* Content area */}
        <div style={{ padding: "20px 24px 8px", textAlign: "center" }}>
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "0.03em",
              color: v.titleColor,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 14,
              lineHeight: 1.5,
              color: "#6b7280",
            }}
          >
            {message}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, padding: "16px 24px 24px" }}>
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "1.5px solid #d1d5db",
              borderRadius: 8,
              background: "transparent",
              color: "#6b7280",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.borderColor = "#9ca3af"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#d1d5db"; }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "none",
              borderRadius: 8,
              background: v.btnBg,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.2s",
              boxShadow: `0 2px 8px ${v.btnBg}40`,
            }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = v.btnHover; e.currentTarget.style.transform = "scale(1.02)"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = v.btnBg; e.currentTarget.style.transform = "scale(1)"; }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                Processing...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confirmOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes confirmCardIn {
          from { opacity: 0; transform: translateY(30px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Context-based Provider (Promise-based confirm) ─────────────────────────

interface ConfirmConfig {
  type?: "danger" | "warning" | "default";
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmContextValue {
  confirm: (config: ConfirmConfig) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmConfig & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((config: ConfirmConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ ...config, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    dialog?.resolve(true);
    setDialog(null);
  }, [dialog]);

  const handleCancel = useCallback(() => {
    dialog?.resolve(false);
    setDialog(null);
  }, [dialog]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <ConfirmDialog
          open={true}
          variant={dialog.type || "default"}
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * Promise-based confirm dialog hook.
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: "Delete?", message: "This cannot be undone", type: "danger" });
 *   if (ok) { ... }
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmDialogProvider>");
  return ctx.confirm;
}
