import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AYUR GATE — Ayurveda Clinic Management Software";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #14532d 0%, #2d6a4f 50%, #40916c 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "40px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 800,
              color: "white",
            }}
          >
            AG
          </div>
          <span style={{ fontSize: "40px", fontWeight: 800, color: "white", letterSpacing: "6px" }}>
            AYUR GATE
          </span>
        </div>

        {/* Title */}
        <div style={{ fontSize: "32px", fontWeight: 700, color: "white", marginBottom: "16px" }}>
          Ayurveda Clinic Management Software
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: "20px", color: "rgba(255,255,255,0.7)", marginBottom: "48px" }}>
          Appointments · Billing · Inventory · Prescriptions · Multi-Branch
        </div>

        {/* Features row */}
        <div style={{ display: "flex", gap: "32px" }}>
          {["Patient Records", "Smart Scheduling", "GST Invoicing", "WhatsApp Comms"].map((f) => (
            <div
              key={f}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "16px",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  color: "white",
                }}
              >
                ✓
              </div>
              {f}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{ position: "absolute", bottom: "40px", left: "80px", fontSize: "16px", color: "rgba(255,255,255,0.4)" }}>
          www.ayurgate.com
        </div>
      </div>
    ),
    { ...size }
  );
}
