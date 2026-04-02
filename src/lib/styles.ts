// ─── YODA Design Tokens ─────────────────────────────────────────────────────
// Shared inline style objects used across all pages for consistent styling.
// These complement CSS variables defined in globals.css.

export const cardStyle = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
} as const;

export const btnPrimary = {
  background: "var(--blue-500)",
  borderRadius: "var(--radius-sm)",
} as const;

export const inputStyle = {
  border: "1px solid var(--grey-400)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-900)",
  background: "var(--white)",
  fontSize: "15px",
} as const;

export const chipBase =
  "inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide";
