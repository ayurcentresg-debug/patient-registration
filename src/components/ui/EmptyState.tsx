"use client";

/**
 * AyurGate <EmptyState>
 * Stage 7 — Empty States (Brand Style Guide)
 *
 * STRICT RULE: typography + single icon character + CTA only.
 * NO illustrations, NO SVG art, NO stock images (per brand guide).
 *
 * Anatomy:
 *   1. Accent strip  — 4px top border in module color
 *   2. Icon circle   — single text character (e.g. "A", "Rx", "+")
 *   3. Headline (H3) — what's empty, max 5 words
 *   4. Body copy     — why + next step, 2 lines max
 *   5. Primary CTA   — one action
 *   6. Ghost link    — optional secondary path
 *
 * Usage:
 *   <EmptyState
 *     iconChar="A"
 *     moduleColor="var(--ag-module-appointments)"
 *     title="No Appointments"
 *     description="Schedule your first appointment to get started."
 *     primaryAction={<Button>+ New Appointment</Button>}
 *     secondaryLink={{ label: "Import from CSV", href: "/import" }}
 *   />
 */

import type { ReactNode } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  iconChar: string; // 1-3 chars max (e.g. "A", "Rx", "Inv")
  moduleColor?: string; // e.g. "var(--ag-module-appointments)"
  title: string;
  description: string;
  primaryAction?: ReactNode;
  secondaryLink?: { label: string; href?: string; onClick?: () => void };
  compact?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────

export default function EmptyState({
  iconChar,
  moduleColor = "var(--ag-interactive-bg)",
  title,
  description,
  primaryAction,
  secondaryLink,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      style={{
        background: "var(--ag-bg-card)",
        border: "1px solid var(--ag-border-default)",
        borderTop: `3px solid ${moduleColor}`,
        borderRadius: "var(--ag-radius-md)",
        padding: compact ? "32px 24px" : "56px 32px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {/* Icon circle — text character, not illustration */}
      <div
        style={{
          width: compact ? 48 : 64,
          height: compact ? 48 : 64,
          borderRadius: "50%",
          background: moduleColor,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--ag-font-heading)",
          fontWeight: "var(--ag-weight-bold)",
          fontSize: compact ? 20 : 24,
          letterSpacing: "var(--ag-tracking-tight)",
        }}
        aria-hidden="true"
      >
        {iconChar}
      </div>

      {/* Headline */}
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--ag-font-heading)",
          fontSize: compact ? 16 : 18,
          fontWeight: "var(--ag-weight-bold)",
          color: "var(--ag-text-primary)",
          letterSpacing: "var(--ag-tracking-tight)",
        }}
      >
        {title}
      </h3>

      {/* Body */}
      <p
        style={{
          margin: 0,
          maxWidth: 320,
          fontSize: 14,
          lineHeight: "var(--ag-leading-normal)",
          color: "var(--ag-text-secondary)",
          fontFamily: "var(--ag-font-body)",
        }}
      >
        {description}
      </p>

      {/* Actions */}
      {(primaryAction || secondaryLink) && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
          }}
        >
          {primaryAction}

          {secondaryLink && (
            secondaryLink.href ? (
              <Link
                href={secondaryLink.href}
                style={{
                  fontSize: 13,
                  color: "var(--ag-text-link)",
                  fontFamily: "var(--ag-font-body)",
                  textDecoration: "none",
                  padding: "4px 8px",
                }}
              >
                {secondaryLink.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryLink.onClick}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 13,
                  color: "var(--ag-text-link)",
                  fontFamily: "var(--ag-font-body)",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                {secondaryLink.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
