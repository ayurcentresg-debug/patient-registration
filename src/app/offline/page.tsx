"use client";

/**
 * Offline fallback page — shown by the service worker when a navigation
 * request fails AND no cached version exists for the URL.
 */

import Link from "next/link";
import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--background)" }}>
      <div className="max-w-md w-full p-6 rounded-md text-center" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", boxShadow: "var(--shadow-lg)" }}>
        <div className="mb-4 inline-flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 16, background: online ? "#d1fae5" : "#fef2f2" }}>
          {online ? (
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2}>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2}>
              <path d="M18.364 5.636L5.636 18.364M5.636 5.636l12.728 12.728" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <h1 className="text-[20px] font-bold mb-1" style={{ color: "var(--grey-900)" }}>
          {online ? "Back online" : "You're offline"}
        </h1>
        <p className="text-[13px] mb-5" style={{ color: "var(--grey-500)" }}>
          {online
            ? "Connection restored. You can resume your work."
            : "AyurGate needs an internet connection. Some pages you've already opened may still load from cache. Check your Wi-Fi or mobile data."}
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-[13px] font-bold text-white rounded"
            style={{ background: "var(--blue-500)" }}
          >
            🔄 Retry
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-[13px] font-semibold rounded"
            style={{ background: "var(--white)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}
          >
            Open Dashboard
          </Link>
        </div>
        <p className="text-[11px] italic mt-4" style={{ color: "var(--grey-400)" }}>
          Tip: bookmark frequently-used pages so they cache for offline access.
        </p>
      </div>
    </div>
  );
}
