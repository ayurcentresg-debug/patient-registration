"use client";

import { createContext, useContext, useCallback, useState, type ReactNode } from "react";
import FlashCard, { type FlashCardProps } from "./FlashCard";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FlashConfig {
  type: FlashCardProps["type"];
  title: string;
  message: string;
  action?: FlashCardProps["action"];
  autoDismiss?: number;
}

interface FlashContextValue {
  showFlash: (config: FlashConfig) => void;
  hideFlash: () => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const FlashContext = createContext<FlashContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function FlashCardProvider({ children }: { children: ReactNode }) {
  const [flash, setFlash] = useState<FlashConfig | null>(null);

  const showFlash = useCallback((config: FlashConfig) => {
    setFlash(config);
  }, []);

  const hideFlash = useCallback(() => {
    setFlash(null);
  }, []);

  return (
    <FlashContext.Provider value={{ showFlash, hideFlash }}>
      {children}
      {flash && (
        <FlashCard
          type={flash.type}
          title={flash.title}
          message={flash.message}
          action={flash.action}
          onClose={hideFlash}
          autoDismiss={flash.autoDismiss}
        />
      )}
    </FlashContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useFlash() {
  const ctx = useContext(FlashContext);
  if (!ctx) throw new Error("useFlash must be used within <FlashCardProvider>");
  return ctx;
}
