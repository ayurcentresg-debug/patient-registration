/**
 * Package balance enforcement.
 *
 * Rule: a session can only be deducted if `paidAmount` covers the value of
 * sessions consumed so far INCLUDING the one about to be deducted.
 *
 *   requiredPaid = (usedSessions + 1) * pricePerSession
 *
 * If `paidAmount < requiredPaid` the session is blocked with HTTP 402
 * (Payment Required) unless an authorized override is provided.
 *
 * Why: a patient who pays a $300 deposit on a $560 / 10-session package and
 * uses 5 sessions has consumed $280 of value — system happy. But if they
 * keep going to session 10 having only paid $300 they walk away with $260
 * of free treatment. Block before each session forces the front desk to
 * collect the balance.
 */
export interface PackageBalanceCheck {
  ok: boolean;
  consumedValueAfter: number; // value after the session is deducted
  paidAmount: number;
  shortfall: number; // 0 if ok=true
}

interface PackageLike {
  usedSessions: number;
  pricePerSession: number;
  paidAmount: number;
  totalPrice: number;
  totalSessions: number;
}

/**
 * Check whether the next session can be deducted without payment shortfall.
 * Pure — no I/O.
 */
export function checkPackageBalance(pkg: PackageLike): PackageBalanceCheck {
  // Fall back to (totalPrice / totalSessions) if pricePerSession is 0/missing
  const perSession =
    pkg.pricePerSession > 0
      ? pkg.pricePerSession
      : pkg.totalSessions > 0
        ? pkg.totalPrice / pkg.totalSessions
        : 0;

  const consumedValueAfter = (pkg.usedSessions + 1) * perSession;
  const paid = pkg.paidAmount || 0;
  const shortfall = Math.max(0, consumedValueAfter - paid);

  return {
    ok: shortfall <= 0.005, // tolerate sub-cent float drift
    consumedValueAfter,
    paidAmount: paid,
    shortfall: Math.round(shortfall * 100) / 100,
  };
}

/**
 * Override role check. Only `owner` and `admin` roles can override the
 * balance gate, and only with a non-empty reason (logged to audit).
 */
export function canOverrideBalanceGate(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Standard 402 response body for blocked deductions. Front-end uses
 * `code: "PACKAGE_BALANCE_DUE"` to show the "Take Payment" CTA.
 */
export function balanceBlockedResponse(check: PackageBalanceCheck) {
  return {
    error: "Payment required before next session",
    code: "PACKAGE_BALANCE_DUE",
    message: `Patient must pay S$${check.shortfall.toFixed(
      2,
    )} before this session can be recorded. Consumed value after this session: S$${check.consumedValueAfter.toFixed(
      2,
    )}, paid so far: S$${check.paidAmount.toFixed(2)}.`,
    shortfall: check.shortfall,
    paidAmount: check.paidAmount,
    consumedValueAfter: check.consumedValueAfter,
  };
}
