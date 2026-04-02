"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            background: "#f8f9fa",
          }}
        >
          <div
            style={{
              maxWidth: "420px",
              width: "100%",
              padding: "2rem",
              textAlign: "center",
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: "15px", color: "#666", marginBottom: "20px" }}>
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            <button
              onClick={reset}
              style={{
                padding: "10px 24px",
                fontSize: "15px",
                fontWeight: 600,
                color: "#fff",
                background: "#14532d",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
