"use client";

import { useEffect, useState } from "react";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";

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
        <SuperAdminSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Loading clinics...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar />

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
                        <div style={{ gridColumn: "1 / -1", paddingTop: 12, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
                          <a
                            href={`/super-admin/clinics/${clinic.id}`}
                            style={{
                              padding: "8px 20px",
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 600,
                              background: "#14532d",
                              color: "#fff",
                              textDecoration: "none",
                              transition: "opacity 0.2s",
                            }}
                          >
                            View Details & Manage
                          </a>
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
