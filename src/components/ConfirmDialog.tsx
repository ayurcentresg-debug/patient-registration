"use client";

import React, { useEffect, useRef } from "react";

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

const VARIANTS = {
  danger: {
    icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    iconBg: "var(--red-light, #fef2f2)",
    iconColor: "var(--red, #dc2626)",
    btnBg: "var(--red, #dc2626)",
    btnHover: "#b91c1c",
  },
  warning: {
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z",
    iconBg: "#faf3e6",
    iconColor: "#b68d40",
    btnBg: "#b68d40",
    btnHover: "#8b6914",
  },
  default: {
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    iconBg: "#f0faf4",
    iconColor: "#2d6a4f",
    btnBg: "#2d6a4f",
    btnHover: "#14532d",
  },
};

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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm yoda-slide-in"
        style={{
          background: "var(--white)",
          borderRadius: "var(--radius)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 text-center">
          {/* Icon */}
          <div
            className="w-12 h-12 mx-auto mb-4 flex items-center justify-center"
            style={{ background: v.iconBg, borderRadius: "var(--radius-pill)" }}
          >
            <svg
              className="w-6 h-6"
              style={{ color: v.iconColor }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={v.icon} />
            </svg>
          </div>
          {/* Title */}
          <h3 className="text-[15px] font-bold mb-1.5" style={{ color: "var(--grey-900)" }}>
            {title}
          </h3>
          {/* Message */}
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--grey-600)" }}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div
          className="flex gap-3 px-6 py-4"
          style={{ background: "var(--grey-50)", borderTop: "1px solid var(--grey-200)" }}
        >
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50"
            style={{
              background: "var(--white)",
              border: "1px solid var(--grey-300)",
              borderRadius: "var(--radius-sm)",
              color: "var(--grey-700)",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
            style={{
              background: v.btnBg,
              borderRadius: "var(--radius-sm)",
              border: "none",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
