"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    clinicName: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    country: "Singapore",
    city: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/clinic/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName: form.clinicName,
          ownerName: form.ownerName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          country: form.country,
          city: form.city,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      // Auto-logged in via cookie — redirect to dashboard
      router.push("/");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#fefbf6" }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-center px-16"
        style={{ background: "linear-gradient(135deg, #14532d 0%, #2d6a4f 50%, #40916c 100%)" }}
      >
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
              <span className="text-2xl">&#127807;</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-wider">AYUR GATE</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Complete Ayurveda Clinic Management
          </h1>
          <p className="text-[15px] text-white/80 leading-relaxed mb-8">
            Manage patients, appointments, prescriptions, inventory, billing, and more — all in one place. Built specifically for Ayurveda and wellness clinics.
          </p>
          <div className="space-y-4">
            {[
              "Patient records & medical history",
              "Appointment scheduling with doctor slots",
              "Digital prescriptions & pharmacy workflow",
              "Inventory management with Ayurvedic categories",
              "GST-compliant billing & invoicing",
              "WhatsApp communication templates",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[14px] text-white/90">{feature}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.1)" }}>
            <p className="text-[13px] text-white/70">
              <strong className="text-white">7-day free trial</strong> — No credit card required. Full access to all features.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — registration form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-xl">&#127807;</span>
            <span className="text-xl font-bold tracking-wider" style={{ color: "#14532d" }}>AYUR GATE</span>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
            Start your free trial
          </h2>
          <p className="text-[14px] mb-6" style={{ color: "#6b7280" }}>
            Set up your clinic in under 2 minutes
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-[13px] font-medium" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                Clinic Name *
              </label>
              <input
                type="text"
                required
                value={form.clinicName}
                onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
                placeholder="e.g. Ayur Wellness Centre"
                className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                Your Name *
              </label>
              <input
                type="text"
                required
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                placeholder="Full name"
                className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@clinic.com"
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                  style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                  Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+65 XXXX XXXX"
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                  style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                  Country
                </label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
                  style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                >
                  <option value="Singapore">Singapore</option>
                  <option value="India">India</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Sri Lanka">Sri Lanka</option>
                  <option value="UAE">UAE</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="City"
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                  style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                  style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Confirm"
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                  style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold text-[15px] transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
            >
              {loading ? "Creating your clinic..." : "Start Free Trial"}
            </button>

            <p className="text-center text-[13px]" style={{ color: "#6b7280" }}>
              Already have an account?{" "}
              <Link href="/login" className="font-medium hover:underline" style={{ color: "#2d6a4f" }}>
                Sign in
              </Link>
            </p>
          </form>

          <p className="mt-6 text-center text-[11px]" style={{ color: "#9ca3af" }}>
            By registering, you agree to our Terms of Service and Privacy Policy.
            <br />
            7-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}
