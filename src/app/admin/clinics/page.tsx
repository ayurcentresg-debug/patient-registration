"use client";

import { useEffect, useState } from "react";

interface ClinicData {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  country: string | null;
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

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<ClinicData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clinic/list")
      .then((r) => r.json())
      .then((data) => {
        setClinics(data.clinics || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getPlanBadge = (plan: string, status: string, trialEndsAt: string | null) => {
    const now = new Date();
    const isExpired = trialEndsAt && new Date(trialEndsAt) < now;

    if (plan === "trial" && isExpired) {
      return { label: "Trial Expired", bg: "#fef2f2", color: "#991b1b" };
    }
    if (plan === "trial") {
      const days = trialEndsAt ? Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / 86400000) : 0;
      return { label: `Trial (${days}d left)`, bg: "#fffbeb", color: "#92400e" };
    }
    if (status === "active") {
      return { label: plan.charAt(0).toUpperCase() + plan.slice(1), bg: "#ecfdf5", color: "#065f46" };
    }
    return { label: status, bg: "#f3f4f6", color: "#374151" };
  };

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Registered Clinics</h1>
        <p style={{ color: "#6b7280" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="yoda-fade-in" style={{ padding: "24px 32px", maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Registered Clinics</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
            {clinics.length} clinic{clinics.length !== 1 ? "s" : ""} registered on AyurGate
          </p>
        </div>
      </div>

      {clinics.length === 0 ? (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 48, textAlign: "center" }}>
          <p style={{ color: "#6b7280", fontSize: 16 }}>No clinics registered yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {clinics.map((clinic) => {
            const badge = clinic.subscription
              ? getPlanBadge(clinic.subscription.plan, clinic.subscription.status, clinic.subscription.trialEndsAt)
              : { label: "No Plan", bg: "#f3f4f6", color: "#374151" };

            return (
              <div
                key={clinic.id}
                style={{
                  background: "white",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{clinic.name}</h2>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: "3px 12px",
                          borderRadius: 100,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "#6b7280" }}>
                      <span>{clinic.email}</span>
                      {clinic.phone && <span>{clinic.phone}</span>}
                      {clinic.city && clinic.country && <span>{clinic.city}, {clinic.country}</span>}
                      <span>Joined {new Date(clinic.createdAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 24 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#2d6a4f" }}>{clinic.stats.users}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Users</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#2d6a4f" }}>{clinic.stats.patients}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Patients</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#2d6a4f" }}>{clinic.stats.appointments}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Appointments</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
