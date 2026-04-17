"use client";

/**
 * AyurGate <Input>
 * Stage 4 — UI Components (Brand Style Guide)
 *
 * Height: 40px · Radius: 6px · Border: 1px neutral-200 · Focus ring: 2px teal-700
 * Font: Inter Regular 14px
 *
 * States: default | focused | filled | error | disabled | success
 *
 * Usage:
 *   <Input label="Patient Name" value={v} onChange={...} />
 *   <Input label="Email" error="Enter a valid email" required />
 *   <Input label="Notes" hint="Max 500 characters" />
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from "react";

// ─── Types ──────────────────────────────────────────────────────────────

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  required?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  wrapperStyle?: React.CSSProperties;
}

// ─── Component ──────────────────────────────────────────────────────────

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    success,
    required,
    iconLeft,
    iconRight,
    wrapperStyle,
    disabled,
    id,
    style,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const uid = useId();
  const inputId = id || uid;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const hasError = Boolean(error);
  const hasSuccess = Boolean(success) && !hasError;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...wrapperStyle }}>
      {/* Label — always above (brand rule) */}
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontFamily: "var(--ag-font-heading)",
            fontSize: 13,
            fontWeight: "var(--ag-weight-medium)",
            color: "var(--ag-neutral-700)",
            letterSpacing: "var(--ag-tracking-normal)",
            marginBottom: 2,
          }}
        >
          {label}
          {required && (
            <span style={{ color: "var(--ag-error-icon)", marginLeft: 4 }} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Input wrapper (for icons) */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        {iconLeft && (
          <span
            style={{
              position: "absolute",
              left: 12,
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
              color: "var(--ag-text-secondary)",
            }}
          >
            {iconLeft}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : hint ? hintId : undefined}
          required={required}
          style={{
            width: "100%",
            height: "var(--ag-input-height)",
            padding: `0 ${iconRight ? 40 : 12}px 0 ${iconLeft ? 40 : 12}px`,
            border: `1px solid ${
              hasError
                ? "var(--ag-error-icon)"
                : hasSuccess
                ? "var(--ag-success-icon)"
                : "var(--ag-border-default)"
            }`,
            borderRadius: "var(--ag-input-radius)",
            background: disabled ? "var(--ag-neutral-100)" : "var(--ag-bg-card)",
            color: disabled ? "var(--ag-text-placeholder)" : "var(--ag-text-primary)",
            fontFamily: "var(--ag-font-body)",
            fontSize: 14,
            outline: "none",
            transition:
              "border-color var(--ag-duration-base) var(--ag-ease-standard), " +
              "box-shadow var(--ag-duration-base) var(--ag-ease-standard)",
            cursor: disabled ? "not-allowed" : "text",
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = hasError
              ? "var(--ag-error-icon)"
              : "var(--ag-border-focus)";
            e.currentTarget.style.boxShadow = hasError
              ? `0 0 0 2px rgba(220, 38, 38, 0.12)`
              : `0 0 0 2px rgba(13, 115, 119, 0.16)`;
            onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = hasError
              ? "var(--ag-error-icon)"
              : hasSuccess
              ? "var(--ag-success-icon)"
              : "var(--ag-border-default)";
            e.currentTarget.style.boxShadow = "none";
            onBlur?.(e);
          }}
          {...rest}
        />

        {iconRight && (
          <span
            style={{
              position: "absolute",
              right: 12,
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
              color: "var(--ag-text-secondary)",
            }}
          >
            {iconRight}
          </span>
        )}
      </div>

      {/* Hint / Error / Success text */}
      {hasError ? (
        <p
          id={errorId}
          role="alert"
          style={{
            margin: 0,
            marginTop: 2,
            fontSize: 12,
            color: "var(--ag-error-text)",
            fontFamily: "var(--ag-font-body)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      ) : hasSuccess ? (
        <p
          style={{
            margin: 0,
            marginTop: 2,
            fontSize: 12,
            color: "var(--ag-success-text)",
            fontFamily: "var(--ag-font-body)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span aria-hidden="true">✓</span>
          {success}
        </p>
      ) : hint ? (
        <p
          id={hintId}
          style={{
            margin: 0,
            marginTop: 2,
            fontSize: 12,
            color: "var(--ag-text-secondary)",
            fontFamily: "var(--ag-font-body)",
          }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
