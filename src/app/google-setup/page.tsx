"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/country-data";

export default function GoogleSetupPage() {
  const router = useRouter();
  const [clinicName, setClinicName] = useState("");
  const [country, setCountry] = useState("Singapore");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicName.trim()) {
      setError("Clinic name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/google/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicName, country }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { border: "1.5px solid #e5e7eb", background: "white" };
  const inputClassName = "w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all";
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "#2d6a4f");
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "#e5e7eb");

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#fefbf6" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-2xl">&#127807;</span>
          <span className="text-2xl font-bold tracking-wider" style={{ color: "#14532d" }}>
            AyurGate
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{ background: "white", border: "1.5px solid #e5e7eb", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
        >
          {/* Google check icon */}
          <div className="flex justify-center mb-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "#f0fdf4" }}
            >
              <svg width="28" height="28" fill="none" stroke="#14532d" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-bold text-center mb-1" style={{ color: "#111827" }}>
            Google Sign-In Successful
          </h2>
          <p className="text-[14px] text-center mb-6" style={{ color: "#6b7280" }}>
            One last step — name your clinic to get started.
          </p>

          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-[13px] font-medium"
              style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                Clinic Name *
              </label>
              <input
                type="text"
                required
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. Ayur Wellness Centre"
                className={inputClassName}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClassName}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold text-[15px] transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
            >
              {loading ? "Creating your clinic..." : "Start Free Trial"}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px]" style={{ color: "#9ca3af" }}>
            7-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}
