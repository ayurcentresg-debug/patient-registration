"use client";

/**
 * AyurGate <Card>
 * Stage 4 — UI Components (Brand Style Guide)
 *
 * Padding: compact (16) | default (20) | spacious (24)
 * Elevation: flat | dp1 | dp2 | dp4
 * Radius: 8px (var --ag-card-radius)
 *
 * Types:
 *   <Card>         — generic surface
 *   <Card.Header>  — title + optional actions
 *   <Card.Body>    — padded content area
 *   <Card.Footer>  — actions footer
 *   <Card.KPI>     — dashboard stat card (module strip on top)
 */

import type { HTMLAttributes, ReactNode, CSSProperties } from "react";

// ─── Types ──────────────────────────────────────────────────────────────

type Padding = "compact" | "default" | "spacious" | "none";
type Elevation = "flat" | "dp1" | "dp2" | "dp4";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  elevation?: Elevation;
  bordered?: boolean;
  moduleColor?: string; // top strip accent (e.g. var(--ag-module-appointments))
}

// ─── Style maps ─────────────────────────────────────────────────────────

const PADDING_MAP: Record<Padding, string> = {
  none: "0",
  compact: "16px",
  default: "20px",
  spacious: "24px",
};

const ELEVATION_MAP: Record<Elevation, string> = {
  flat: "none",
  dp1: "var(--ag-shadow-dp1)",
  dp2: "var(--ag-shadow-dp2)",
  dp4: "var(--ag-shadow-dp4)",
};

// ─── Main Card ──────────────────────────────────────────────────────────

function Card({
  padding = "default",
  elevation = "flat",
  bordered = true,
  moduleColor,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      style={{
        background: "var(--ag-bg-card)",
        borderRadius: "var(--ag-card-radius)",
        border: bordered ? "1px solid var(--ag-border-default)" : "none",
        boxShadow: ELEVATION_MAP[elevation],
        overflow: "hidden",
        position: "relative",
        ...(moduleColor && { borderTop: `3px solid ${moduleColor}` }),
        ...style,
      }}
      {...rest}
    >
      {padding === "none" ? (
        children
      ) : (
        <div style={{ padding: PADDING_MAP[padding] }}>{children}</div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  meta?: string;
  actions?: ReactNode;
}

function CardHeader({ title, meta, actions, style, ...rest }: CardHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid var(--ag-border-subtle)",
        ...style,
      }}
      {...rest}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--ag-font-heading)",
            fontSize: 14,
            fontWeight: "var(--ag-weight-bold)",
            color: "var(--ag-text-primary)",
            lineHeight: "var(--ag-leading-snug)",
          }}
        >
          {title}
        </h3>
        {meta && (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: "var(--ag-text-secondary)",
              fontFamily: "var(--ag-font-body)",
            }}
          >
            {meta}
          </p>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{actions}</div>}
    </div>
  );
}

function CardBody({
  children,
  padding = "default",
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { padding?: Padding }) {
  return (
    <div
      style={{
        padding: PADDING_MAP[padding],
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

function CardFooter({ children, style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        padding: "12px 20px",
        borderTop: "1px solid var(--ag-border-subtle)",
        background: "var(--ag-neutral-50)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─── KPI Card — dashboard stat tile ─────────────────────────────────────

interface KPIProps {
  label: string;
  value: string | number;
  delta?: { value: string; trend: "up" | "down" | "neutral" };
  moduleColor?: string;
  icon?: ReactNode;
  style?: CSSProperties;
}

function CardKPI({ label, value, delta, moduleColor, icon, style }: KPIProps) {
  const deltaColor =
    delta?.trend === "up"
      ? "var(--ag-success-text)"
      : delta?.trend === "down"
      ? "var(--ag-error-text)"
      : "var(--ag-text-secondary)";

  const deltaArrow = delta?.trend === "up" ? "↑" : delta?.trend === "down" ? "↓" : "→";

  return (
    <Card
      padding="default"
      elevation="flat"
      moduleColor={moduleColor}
      style={style}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontFamily: "var(--ag-font-heading)",
              fontWeight: "var(--ag-weight-medium)",
              color: "var(--ag-text-secondary)",
              letterSpacing: "var(--ag-tracking-wide)",
              textTransform: "uppercase",
            }}
          >
            {label}
          </p>
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
        {icon && (
          <div
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: "var(--ag-radius-sm)",
              background: "var(--ag-bg-selected)",
              color: "var(--ag-interactive-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Compound export ────────────────────────────────────────────────────

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.KPI = CardKPI;

export default Card;
export { CardHeader, CardBody, CardFooter, CardKPI };
