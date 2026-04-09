"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log to an error reporting service
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fefbf6" }}>
      <div className="text-center px-6 max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#14532d" }}>
            <span className="text-sm font-extrabold text-white">AG</span>
          </div>
          <span className="text-xl font-bold tracking-wider" style={{ color: "#14532d" }}>AyurGate</span>
        </div>

        {/* Error icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "#fef2f2" }}>
          <svg className="w-8 h-8" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-3" style={{ color: "#111827" }}>Something went wrong</h1>
        <p className="text-base mb-8" style={{ color: "#6b7280" }}>
          An unexpected error occurred. Please try again or contact support if the issue persists.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 cursor-pointer"
            style={{ background: "#14532d" }}
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="px-6 py-2.5 text-sm font-semibold rounded-lg transition-all hover:bg-gray-50"
            style={{ color: "#374151", border: "1.5px solid #e5e7eb" }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
