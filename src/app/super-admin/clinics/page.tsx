"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ClinicData {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  country: string;
  city: string | null;
  createdAt: string;
  subscription: {
    plan: string;
    status: string;
    trialEndsAt: string | null;
    maxUsers: number;
    maxPatients: number;
  } | null;
  stats: {
    users: number;
    patients: number;
    appointments: number;
  };
}

function SuperAdminSidebar({ active }: { active: string }) {
  const router = useRouter();

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z", href: "/super-admin" },
    { key: "clinics", label: "Clinics", icon: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z", href: "/super-admin/clinics" },
  ];

  const handleLogout = () => {
    document.cookie = "super_admin_token=; path=/; max-age=0";
    router.push("/super-admin/login");
  };

  return (
    <div
      style={{
        width: 260,
        minHeight: "100vh",
        background: "linear-gradient(180deg, #14532d 0%, #1b4332 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: "rgba(255,255,255,0.15)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>AYUR GATE</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Super Admin</div>
          </div>
        </div>
      </div>

      <nav style={{ padding: "16px 12px", flex: 1 }}>
        {navItems.map((item) => (
          <a
            key={item.key}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 10,
              marginBottom: 4,
              background: active === item.key ? "rgba(255,255,255,0.15)" : "transparent",
              color: "#fff",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: active === item.key ? 600 : 400,
              transition: "background 0.2s",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            {item.label}
          </a>
        ))}
      </nav>

      <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            width: "100%",
            transition: "background 0.2s",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}

function getTrialInfo(sub: ClinicData["subscription"]): { label: string; color: string; bgColor: string } {
  if (!sub) return { label: "No Plan", color: "#6b7280", bgColor: "#f3f4f6" };

  if (sub.plan !== "trial") {
    return {
      label: sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1),
      color: "var(--blue-600)",
      bgColor: "var(--blue-50)",
    };
  }

  if (!sub.trialEndsAt) return { label: "Trial", color: "#059669", bgColor: "#ecfdf5" };

  const now = new Date();
  const ends = new Date(sub.trialEndsAt);
  const daysLeft = Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return { label: "Trial Expired", color: "#dc2626", bgColor: "#fef2f2" };
  }

  if (daysLeft <= 2) {
    return { label: `${daysLeft}d left`, color: "#ea580c", bgColor: "#fff7ed" };
  }

  return { label: `${daysLeft}d left`, color: "#059669", bgColor: "#ecfdf5" };
}

export default function SuperAdminClinicsPage() {
  const [clinics, setClinics] = useState<ClinicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clinic/list")
      .then((r) => r.json())
      .then((data) => {
        if (data.clinics) setClinics(data.clinics);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = clinics.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.city || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <SuperAdminSidebar active="clinics" />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Loading clinics...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar active="clinics" />

      <div style={{ flex: 1, background: "#f9fafb", overflow: "auto" }}>
        {/* Header */}
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid #e5e7eb",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Clinics</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
              {clinics.length} registered clinic{clinics.length !== 1 ? "s" : ""}
            </p>
          </div>
          <input
            type="text"
            placeholder="Search clinics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              borderRadius: 10,
              border: "1.5px solid #e5e7eb",
              background: "#fafafa",
              outline: "none",
              width: 280,
              transition: "all 0.2s",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#2d6a4f";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(45,106,79,0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        <div style={{ padding: "24px 32px" }}>
          {filtered.length === 0 ? (
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 40,
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 14,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              {search ? "No clinics match your search." : "No clinics registered yet."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filtered.map((clinic) => {
                const trial = getTrialInfo(clinic.subscription);
                const isExpanded = expandedId === clinic.id;

                return (
                  <div
                    key={clinic.id}
                    style={{
                      background: "#fff",
                      borderRadius: 16,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      border: "1px solid #f3f4f6",
                      overflow: "hidden",
                      transition: "box-shadow 0.2s",
                    }}
                  >
                    {/* Clinic Row */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : clinic.id)}
                      style={{
                        padding: "20px 24px",
                        display: "grid",
                        gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 0.8fr 40px",
                        alignItems: "center",
                        gap: 16,
                        cursor: "pointer",
                      }}
                    >
                      {/* Name + Email */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{clinic.name}</div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{clinic.email}</div>
                      </div>

                      {/* Phone + Location */}
                      <div>
                        <div style={{ fontSize: 13, color: "#374151" }}>{clinic.phone || "-"}</div>
                        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                          {[clinic.city, clinic.country].filter(Boolean).join(", ")}
                        </div>
                      </div>

                      {/* Plan & Trial */}
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: trial.bgColor,
                            color: trial.color,
                          }}
                        >
                          {trial.label}
                        </span>
                      </div>

                      {/* Stats */}
                      <div style={{ fontSize: 13, color: "#374151" }}>
                        <div>{clinic.stats.users} users</div>
                        <div style={{ color: "#9ca3af", marginTop: 2 }}>{clinic.stats.patients} patients</div>
                      </div>

                      {/* Appointments */}
                      <div style={{ fontSize: 13, color: "#374151" }}>
                        {clinic.stats.appointments} appts
                      </div>

                      {/* Registered */}
                      <div style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>
                        {new Date(clinic.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>

                      {/* Expand arrow */}
                      <div>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#9ca3af"
                          strokeWidth={2}
                          style={{
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s",
                          }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "20px 24px",
                          borderTop: "1px solid #f3f4f6",
                          background: "#fafafa",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: 20,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Clinic Details
                          </div>
                          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                            <div><strong>Slug:</strong> {clinic.slug}</div>
                            <div><strong>Email:</strong> {clinic.email}</div>
                            <div><strong>Phone:</strong> {clinic.phone || "-"}</div>
                            <div><strong>Location:</strong> {[clinic.city, clinic.country].filter(Boolean).join(", ") || "-"}</div>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Subscription
                          </div>
                          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                            <div><strong>Plan:</strong> {clinic.subscription?.plan || "None"}</div>
                            <div><strong>Status:</strong> {clinic.subscription?.status || "N/A"}</div>
                            <div><strong>Max Users:</strong> {clinic.subscription?.maxUsers ?? "-"}</div>
                            <div><strong>Max Patients:</strong> {clinic.subscription?.maxPatients ?? "-"}</div>
                            {clinic.subscription?.trialEndsAt && (
                              <div>
                                <strong>Trial Ends:</strong>{" "}
                                {new Date(clinic.subscription.trialEndsAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Usage
                          </div>
                          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                            <div><strong>Users:</strong> {clinic.stats.users}</div>
                            <div><strong>Patients:</strong> {clinic.stats.patients}</div>
                            <div><strong>Appointments:</strong> {clinic.stats.appointments}</div>
                            <div>
                              <strong>Registered:</strong>{" "}
                              {new Date(clinic.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
