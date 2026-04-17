"use client";

import { useEffect, useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log full error to console for debugging
    console.error("[AyurGate Error]", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      name: error.name,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fefbf6" }}>
      <div className="text-center px-6 max-w-xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#0D7377" }}>
            <span className="text-sm font-extrabold text-white">AG</span>
          </div>
          <span className="text-xl font-bold tracking-wider" style={{ color: "#0D7377" }}>AyurGate</span>
        </div>

        {/* Error icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: "#fef2f2" }}>
          <svg className="w-8 h-8" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold mb-3" style={{ color: "#111827" }}>Something went wrong</h1>
        <p className="text-base mb-6" style={{ color: "#6b7280" }}>
          An unexpected error occurred. Please try again or contact support if the issue persists.
        </p>

        {/* Error message — now visible in UI for debugging */}
        <div style={{
          marginBottom: 24,
          padding: 12,
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 8,
          fontSize: 13,
          color: "#991b1b",
          textAlign: "left",
          fontFamily: "monospace",
          wordBreak: "break-word",
        }}>
          <strong>Error:</strong> {error.message || "Unknown error"}
          {error.digest && <div style={{ marginTop: 4, fontSize: 11, opacity: 0.7 }}>Digest: {error.digest}</div>}
        </div>

        {error.stack && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              marginBottom: 16,
              fontSize: 12,
              color: "#6b7280",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {showDetails ? "Hide" : "Show"} technical details
          </button>
        )}

        {showDetails && error.stack && (
          <pre style={{
            marginBottom: 24,
            padding: 12,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 11,
            color: "#374151",
            textAlign: "left",
            maxHeight: 200,
            overflow: "auto",
            whiteSpace: "pre-wrap",
          }}>
            {error.stack}
          </pre>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 cursor-pointer"
            style={{ background: "#0D7377" }}
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
