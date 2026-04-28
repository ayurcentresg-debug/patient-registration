"use client";

/**
 * OfflineBanner — sticky red bar at top when navigator.onLine = false.
 * Auto-hides when connection restored. Mounted from LayoutShell so it
 * appears on every authenticated page.
 */

import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const handleOnline = () => {
      setOnline(true);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
    };
    const handleOffline = () => {
      setOnline(false);
      setJustReconnected(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && !justReconnected) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[10000] text-center py-1.5 text-[12px] font-semibold yoda-fade-in"
      style={{
        background: online ? "#059669" : "#dc2626",
        color: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
      role="status"
      aria-live="polite"
    >
      {online ? (
        <>✓ Back online — your data is syncing</>
      ) : (
        <>⚠ You&apos;re offline — actions you take won&apos;t save until you reconnect</>
      )}
    </div>
  );
}
