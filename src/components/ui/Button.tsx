"use client";

/**
 * AyurGate <Button>
 * Stage 4 — UI Components (Brand Style Guide)
 *
 * Variants: primary | secondary | ghost | danger | saffron
 * Sizes:    xs (28) | sm (32) | md (36, default) | lg (44) | xl (52)
 * States:   default | hover | active | disabled | loading
 *
 * Usage:
 *   <Button>Save</Button>
 *   <Button variant="secondary" size="sm">Cancel</Button>
 *   <Button variant="danger" loading>Deleting…</Button>
 *   <Button iconOnly aria-label="Edit"><EditIcon /></Button>
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

// ─── Types ──────────────────────────────────────────────────────────────

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "saffron";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  iconOnly?: boolean;
  fullWidth?: boolean;
}

// ─── Style configs ──────────────────────────────────────────────────────

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  xs: { height: "var(--ag-btn-height-xs)", padding: "0 12px", fontSize: 12 },
  sm: { height: "var(--ag-btn-height-sm)", padding: "0 14px", fontSize: 13 },
  md: { height: "var(--ag-btn-height-md)", padding: "0 16px", fontSize: 13 },
  lg: { height: "var(--ag-btn-height-lg)", padding: "0 20px", fontSize: 14 },
  xl: { height: "var(--ag-btn-height-xl)", padding: "0 24px", fontSize: 15 },
};

const VARIANT_STYLES: Record<ButtonVariant, {
  bg: string;
  color: string;
  border: string;
  hoverBg: string;
  activeBg: string;
  disabledBg?: string;
  disabledColor?: string;
}> = {
  primary: {
    bg: "var(--ag-interactive-bg)",
    color: "var(--ag-text-on-brand)",
    border: "none",
    hoverBg: "var(--ag-interactive-hover)",
    activeBg: "var(--ag-interactive-press)",
    disabledBg: "var(--ag-neutral-200)",
    disabledColor: "var(--ag-neutral-300)",
  },
  secondary: {
    bg: "var(--ag-bg-card)",
    color: "var(--ag-text-primary)",
    border: "1px solid var(--ag-border-default)",
    hoverBg: "var(--ag-bg-hover)",
    activeBg: "var(--ag-neutral-100)",
  },
  ghost: {
    bg: "transparent",
    color: "var(--ag-text-primary)",
    border: "none",
    hoverBg: "var(--ag-bg-hover)",
    activeBg: "var(--ag-neutral-100)",
  },
  danger: {
    bg: "var(--ag-error-icon)",
    color: "#fff",
    border: "none",
    hoverBg: "#B91C1C",
    activeBg: "var(--ag-error-text)",
  },
  saffron: {
    bg: "var(--ag-accent)",
    color: "#fff",
    border: "none",
    hoverBg: "var(--ag-saffron-700)",
    activeBg: "var(--ag-saffron-900)",
  },
};

// ─── Loading Spinner ────────────────────────────────────────────────────

function Spinner({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid ${color}`,
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "ag-btn-spin 600ms linear infinite",
      }}
    />
  );
}

// ─── Component ──────────────────────────────────────────────────────────

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    iconLeft,
    iconRight,
    iconOnly = false,
    fullWidth = false,
    disabled,
    children,
    style,
    onMouseEnter,
    onMouseLeave,
    onMouseDown,
    onMouseUp,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;
  const sizeStyle = SIZE_STYLES[size];
  const variantStyle = VARIANT_STYLES[variant];

  // Icon-only: square aspect
  const finalWidth = iconOnly ? sizeStyle.height : undefined;
  const finalPadding = iconOnly ? 0 : sizeStyle.padding;
  const finalMinWidth = iconOnly ? undefined : "var(--ag-btn-min-width)";

  return (
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      style={{
        // Reset
        border: variantStyle.border,
        outline: "none",
        cursor: isDisabled ? "not-allowed" : "pointer",
        fontFamily: "var(--ag-font-heading)",
        fontWeight: "var(--ag-weight-bold)",
        letterSpacing: "0.01em",
        // Layout
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: fullWidth ? "100%" : finalWidth,
        minWidth: finalMinWidth,
        // Size
        height: sizeStyle.height,
        padding: finalPadding,
        fontSize: sizeStyle.fontSize,
        borderRadius: "var(--ag-btn-radius)",
        // Variant
        background: isDisabled
          ? variantStyle.disabledBg ?? variantStyle.bg
          : variantStyle.bg,
        color: isDisabled
          ? variantStyle.disabledColor ?? variantStyle.color
          : variantStyle.color,
        // Motion
        transition:
          "background-color var(--ag-duration-base) var(--ag-ease-standard), " +
          "box-shadow var(--ag-duration-base) var(--ag-ease-standard), " +
          "transform var(--ag-duration-fast) var(--ag-ease-standard)",
        opacity: isDisabled && variant !== "primary" ? 0.5 : 1,
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = variantStyle.hoverBg;
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = variantStyle.bg;
        }
        onMouseLeave?.(e);
      }}
      onMouseDown={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = variantStyle.activeBg;
          e.currentTarget.style.transform = "scale(0.98)";
        }
        onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = variantStyle.hoverBg;
          e.currentTarget.style.transform = "scale(1)";
        }
        onMouseUp?.(e);
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 2px var(--ag-bg-page), 0 0 0 4px var(--ag-teal-700)`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner size={size === "xs" || size === "sm" ? 12 : 14} />
          {!iconOnly && children}
        </>
      ) : (
        <>
          {iconLeft}
          {!iconOnly && children}
          {iconRight}
          {iconOnly && children}
        </>
      )}

      <style>{`
        @keyframes ag-btn-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
});

export default Button;
