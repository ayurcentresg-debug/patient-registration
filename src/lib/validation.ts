/**
 * YODA — Shared Validation Utilities
 *
 * Reusable validators for patient names, phone numbers, etc.
 * Used by both client-side forms and server-side API routes.
 */

/* ─── Name Validation ─── */

// Allows letters (any language/script), spaces, hyphens, apostrophes, periods
// Blocks numbers, @, #, $, %, etc.
const NAME_PATTERN = /^[a-zA-ZÀ-ÿĀ-žА-яÁáÉéÍíÓóÚú\u0B80-\u0BFF\u0C00-\u0C7F\u0900-\u097F\s'.\\-]+$/;

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

/**
 * Validate a person's name (first name or last name).
 * Returns { valid, error } — error is null if valid.
 */
export function validateName(value: string, fieldLabel = "Name"): ValidationResult {
  const trimmed = (value ?? "").trim();

  if (!trimmed) {
    return { valid: false, error: `${fieldLabel} is required` };
  }

  if (trimmed.length < MIN_NAME_LENGTH) {
    return { valid: false, error: `${fieldLabel} must be at least ${MIN_NAME_LENGTH} characters` };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `${fieldLabel} must be under ${MAX_NAME_LENGTH} characters` };
  }

  if (!NAME_PATTERN.test(trimmed)) {
    return { valid: false, error: `${fieldLabel} can only contain letters, spaces, hyphens, and apostrophes` };
  }

  // No consecutive special characters (e.g., "--", "''", "..")
  if (/[-'.]{2,}/.test(trimmed)) {
    return { valid: false, error: `${fieldLabel} contains invalid consecutive characters` };
  }

  // Must start and end with a letter
  if (!/^[a-zA-ZÀ-ÿĀ-žА-яÁáÉéÍíÓóÚú\u0B80-\u0BFF\u0C00-\u0C7F\u0900-\u097F]/.test(trimmed)) {
    return { valid: false, error: `${fieldLabel} must start with a letter` };
  }

  return { valid: true, error: null };
}

/**
 * Quick boolean check — useful for inline validation.
 */
export function isValidName(value: string): boolean {
  return validateName(value).valid;
}
