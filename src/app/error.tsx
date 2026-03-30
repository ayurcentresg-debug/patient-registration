"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div
        className="max-w-md w-full p-6 text-center"
        style={{
          background: "var(--white)",
          border: "1px solid var(--grey-300)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className="w-12 h-12 mx-auto mb-4 flex items-center justify-center"
          style={{ background: "#ffebee", borderRadius: "var(--radius-sm)" }}
        >
          <svg className="w-6 h-6" fill="none" stroke="#d32f2f" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold mb-2" style={{ color: "var(--grey-900)" }}>
          Something went wrong
        </h2>
        <p className="text-[15px] mb-4" style={{ color: "var(--grey-600)" }}>
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
