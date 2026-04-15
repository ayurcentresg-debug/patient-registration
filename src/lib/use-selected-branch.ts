"use client";

/**
 * useSelectedBranch — global per-tab branch selection.
 *
 * The branch selector in the sidebar header writes the chosen branch ID to
 * localStorage and dispatches a "branchchange" window event. Pages that want
 * to filter their data by branch can:
 *
 *   const branchId = useSelectedBranch();
 *   useEffect(() => { refetch(); }, [branchId]);
 *
 * `branchId === null` means "All branches" (or single-branch clinic).
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "selectedBranchId";
const EVENT_NAME = "branchchange";

export function getSelectedBranchId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v !== "all" ? v : null;
  } catch {
    return null;
  }
}

export function setSelectedBranchId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: id }));
  } catch {
    /* ignore */
  }
}

export function useSelectedBranch(): string | null {
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    setBranchId(getSelectedBranchId());
    function handler(e: Event) {
      const detail = (e as CustomEvent<string | null>).detail;
      setBranchId(detail ?? null);
    }
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  return branchId;
}
