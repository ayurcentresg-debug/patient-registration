"use client";

/**
 * AyurGate <Badge> / <StatusDot> / <CounterBadge>
 * Stage 4 — UI Components (Brand Style Guide)
 *
 * Pill shape (radius 9999px). Height 20px. Font: Satoshi Bold 11px.
 *
 * Status variants: active | pending | confirmed | cancelled | draft | expired | urgent | new
 * Module variants: appointments | prescriptions | inventory | billing | reports
 *
 * Usage:
 *   <Badge variant="confirmed">Confirmed</Badge>
 *   <Badge module="inventory">Inventory</Badge>
 *   <StatusDot status="online" label="Active" />
 *   <CounterBadge count={3} />
 */

import type { HTMLAttributes, ReactNode } from "react";

// ─── Types ──────────────────────────────────────────────────────────────

export type StatusVariant =
  | "active"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "draft"
  | "expired"
  | "urgent"
  | "new";

export type ModuleVariant =
  | "appointments"
  | "prescriptions"
  | "inventory"
  | "billing"
  | "reports";

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  variant?: StatusVariant;
  module?: ModuleVariant;
  size?: "sm" | "md";
  children: ReactNode;
}

// ─── Variant color maps ─────────────────────────────────────────────────

const STATUS_COLORS: Record<StatusVariant, { bg: string; text: string }> = {
  active:    { bg: "#E0F4F5", text: "#0A5D60" },  // teal
  pending:   { bg: "#FEF3C7", text: "#7C2D12" },  // amber
  confirmed: { bg: "#DCFCE7", text: "#14532D" },  // green
  cancelled: { bg: "#FEE2E2", text: "#7F1D1D" },  // red
  draft:     { bg: "#ECEAE4", text: "#3D3B37" },  // neutral
  expired:   { bg: "#FEE2E2", text: "#7F1D1D" },  // red
  urgent:    { bg: "#DC2626", text: "#FFFFFF" },  // red filled
  new:       { bg: "#FAF0D7", text: "#6B3A00" },  // saffron
};

const MODULE_COLORS: Record<ModuleVariant, { bg: string; text: string }> = {
  appointments:  { bg: "rgba(59, 94, 140, 0.12)", text: "#3B5E8C" },
  prescriptions: { bg: "rgba(74, 107, 82, 0.12)", text: "#4A6B52" },
  inventory:     { bg: "rgba(107, 78, 130, 0.12)", text: "#6B4E82" },
  billing:       { bg: "rgba(122, 82, 48, 0.12)",  text: "#7A5230" },
  reports:       { bg: "rgba(62, 95, 110, 0.12)",  text: "#3E5F6E" },
};

// ─── Badge component ────────────────────────────────────────────────────

export default function Badge({
  variant = "active",
  module,
  size = "md",
  children,
  style,
  ...rest
}: BadgeProps) {
  const colors = module ? MODULE_COLORS[module] : STATUS_COLORS[variant];
  const height = size === "sm" ? 16 : 20;
  const padX = size === "sm" ? 6 : 8;
  const fontSize = size === "sm" ? 10 : 11;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height,
        padding: `0 ${padX}px`,
        borderRadius: "var(--ag-radius-full)",
        background: colors.bg,
        color: colors.text,
        fontFamily: "var(--ag-font-heading)",
        fontWeight: "var(--ag-weight-bold)",
        fontSize,
        letterSpacing: "var(--ag-tracking-wide)",
        whiteSpace: "nowrap",
        lineHeight: 1,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}

// ─── StatusDot — for presence indicators ────────────────────────────────

export type StatusDotState = "online" | "away" | "offline" | "error" | "syncing";

const DOT_COLORS: Record<StatusDotState, string> = {
  online:  "var(--ag-success-icon)",
  away:    "var(--ag-warning-icon)",
  offline: "var(--ag-neutral-300)",
  error:   "var(--ag-error-icon)",
  syncing: "var(--ag-info-icon)",
};

export function StatusDot({
  status,
  label,
  size = 8,
}: {
  status: StatusDotState;
  label?: string;
  size?: number;
}) {
  const pulse = status === "syncing";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--ag-font-body)",
        fontSize: 12,
        color: "var(--ag-text-secondary)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: "50%",
          background: DOT_COLORS[status],
          animation: pulse ? "ag-dot-pulse 1.5s ease infinite" : "none",
        }}
      />
      {label}
      {pulse && (
        <style>{`
          @keyframes ag-dot-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      )}
    </span>
  );
}

// ─── CounterBadge — notification counts ─────────────────────────────────

export function CounterBadge({
  count,
  max = 99,
  style,
}: {
  count: number;
  max?: number;
  style?: React.CSSProperties;
}) {
  if (count <= 0) return null;
  const display = count > max ? `${max}+` : count.toString();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: "var(--ag-radius-full)",
        background: "var(--ag-error-icon)",
        color: "#fff",
        fontFamily: "var(--ag-font-heading)",
        fontWeight: "var(--ag-weight-bold)",
        fontSize: 10,
        letterSpacing: 0,
        lineHeight: 1,
        ...style,
      }}
    >
      {display}
    </span>
  );
}
