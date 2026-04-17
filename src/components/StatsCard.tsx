/**
 * StatsCard — dashboard stat tile (brand-guide compliant)
 * Follows Card.KPI pattern from AyurGate Brand Style Guide Stage 4.
 *
 * Props stay backward-compatible with the old StatsCard API so existing
 * callers keep working; new callers can pass optional `delta` / `moduleColor`.
 */

import Link from "next/link";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  /** Optional trend delta (e.g. "+12% vs last month") */
  delta?: { value: string; trend: "up" | "down" | "neutral" };
  /** Optional click-through href (wraps card in a Link) */
  href?: string;
}

// ─── Map legacy color prop to brand module colors ───────────────────────
//
// Old colors: blue | green | purple | orange
// Brand module palette: appointments / prescriptions / inventory / billing / reports
const COLOR_TO_MODULE: Record<string, { strip: string; iconBg: string; iconColor: string }> = {
  blue: {
    strip: "var(--ag-module-appointments)",
    iconBg: "rgba(59, 94, 140, 0.12)",
    iconColor: "var(--ag-module-appointments)",
  },
  green: {
    strip: "var(--ag-module-prescriptions)",
    iconBg: "rgba(74, 107, 82, 0.12)",
    iconColor: "var(--ag-module-prescriptions)",
  },
  purple: {
    strip: "var(--ag-module-inventory)",
    iconBg: "rgba(107, 78, 130, 0.12)",
    iconColor: "var(--ag-module-inventory)",
  },
  orange: {
    strip: "var(--ag-module-billing)",
    iconBg: "rgba(122, 82, 48, 0.12)",
    iconColor: "var(--ag-module-billing)",
  },
  teal: {
    strip: "var(--ag-interactive-bg)",
    iconBg: "var(--ag-bg-selected)",
    iconColor: "var(--ag-interactive-bg)",
  },
};

export default function StatsCard({ title, value, icon, color, delta, href }: StatsCardProps) {
  const c = COLOR_TO_MODULE[color] || COLOR_TO_MODULE.blue;

  const deltaColor =
    delta?.trend === "up"
      ? "var(--ag-success-text)"
      : delta?.trend === "down"
      ? "var(--ag-error-text)"
      : "var(--ag-text-secondary)";
  const deltaArrow = delta?.trend === "up" ? "↑" : delta?.trend === "down" ? "↓" : "→";

  const inner = (
    <div
      style={{
        background: "var(--ag-bg-card)",
        border: "1px solid var(--ag-border-default)",
        borderTop: `3px solid ${c.strip}`,
        borderRadius: "var(--ag-radius-md)",
        padding: "var(--ag-card-padding-default)",
        transition: "box-shadow var(--ag-duration-base) var(--ag-ease-standard), transform var(--ag-duration-fast) var(--ag-ease-standard)",
        cursor: href ? "pointer" : "default",
        height: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--ag-shadow-dp2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Label — small caps */}
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontFamily: "var(--ag-font-heading)",
              fontWeight: "var(--ag-weight-medium)",
              color: "var(--ag-text-secondary)",
              letterSpacing: "var(--ag-tracking-wide)",
              textTransform: "uppercase",
              lineHeight: 1.3,
            }}
          >
            {title}
          </p>

          {/* Value — large tabular nums */}
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 28,
              fontFamily: "var(--ag-font-heading)",
              fontWeight: "var(--ag-weight-bold)",
              color: "var(--ag-text-primary)",
              letterSpacing: "var(--ag-tracking-tight)",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums lining-nums",
            }}
          >
            {value}
          </p>

          {/* Optional delta */}
          {delta && (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 12,
                color: deltaColor,
                fontFamily: "var(--ag-font-body)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span aria-hidden="true">{deltaArrow}</span>
              {delta.value}
            </p>
          )}
        </div>

        {/* Icon bubble */}
        <div
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: "var(--ag-radius-sm)",
            background: c.iconBg,
            color: c.iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        {inner}
      </Link>
    );
  }

  return inner;
}
