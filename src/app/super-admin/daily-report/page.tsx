"use client";

import { useState } from "react";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";

export default function DailyReportPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; sentTo?: string; error?: string; totals?: Record<string, number> } | null>(null);

  async function sendReport() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/daily-report?secret=ayurgate-daily-2026");
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar />
      <div style={{ flex: 1, background: "#f9fafb", overflow: "auto" }}>
        {/* Header */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Daily Report</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>Daily Activity Report Configuration</p>
        </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Info */}
        <div className="p-6 rounded-xl mb-6" style={{ background: "white", border: "1px solid #e5e7eb" }}>
          <h2 className="text-[16px] font-bold mb-3" style={{ color: "#111827" }}>Report Configuration</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <span className="text-[14px]" style={{ color: "#6b7280" }}>Recipient Email</span>
              <span className="text-[14px] font-medium" style={{ color: "#111827" }}>ayurcentresg@gmail.com</span>
            </div>
            <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <span className="text-[14px]" style={{ color: "#6b7280" }}>Schedule</span>
              <span className="text-[14px] font-medium" style={{ color: "#111827" }}>Daily at 11:00 PM SGT</span>
            </div>
            <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <span className="text-[14px]" style={{ color: "#6b7280" }}>Contents</span>
              <span className="text-[14px] font-medium" style={{ color: "#111827" }}>All clinic stats, revenue, alerts</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[14px]" style={{ color: "#6b7280" }}>Trigger URL</span>
              <code className="text-[12px] px-2 py-1 rounded" style={{ background: "#f3f4f6", color: "#374151" }}>/api/daily-report?secret=***</code>
            </div>
          </div>
        </div>

        {/* Report includes */}
        <div className="p-6 rounded-xl mb-6" style={{ background: "white", border: "1px solid #e5e7eb" }}>
          <h2 className="text-[16px] font-bold mb-3" style={{ color: "#111827" }}>Report Includes</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              "Today's appointments",
              "Revenue (today + MTD)",
              "New patients",
              "Completed / Cancelled / No-shows",
              "Tomorrow's schedule",
              "Low stock alerts",
              "Expiring inventory",
              "Per-clinic breakdown",
              "Active clinics count",
              "Actionable alerts",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#16a34a" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[13px]" style={{ color: "#374151" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Send Now */}
        <div className="p-6 rounded-xl" style={{ background: "white", border: "1px solid #e5e7eb" }}>
          <h2 className="text-[16px] font-bold mb-3" style={{ color: "#111827" }}>Send Report Now</h2>
          <p className="text-[13px] mb-4" style={{ color: "#6b7280" }}>
            Generate and send the daily report immediately to ayurcentresg@gmail.com
          </p>
          <button
            onClick={sendReport}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-white font-semibold text-[14px] transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: "#14532d" }}
          >
            {loading ? "Generating & Sending..." : "Send Daily Report"}
          </button>

          {result && (
            <div className="mt-4 p-4 rounded-lg" style={{ background: result.success ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.success ? "#bbf7d0" : "#fecaca"}` }}>
              {result.success ? (
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "#16a34a" }}>Report sent successfully!</p>
                  <p className="text-[13px] mt-1" style={{ color: "#6b7280" }}>Sent to: {result.sentTo}</p>
                  {result.totals && (
                    <div className="mt-2 flex gap-4 flex-wrap">
                      <span className="text-[12px]" style={{ color: "#374151" }}>Clinics: {result.totals.clinics}</span>
                      <span className="text-[12px]" style={{ color: "#374151" }}>Appointments: {result.totals.appointments}</span>
                      <span className="text-[12px]" style={{ color: "#374151" }}>New Patients: {result.totals.newPatients}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[14px] font-semibold" style={{ color: "#dc2626" }}>Error: {result.error}</p>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
