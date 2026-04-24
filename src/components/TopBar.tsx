"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";

// ─────────────────────────────────────────────
// TopBar — desktop-only fixed top bar (hidden md:flex).
// Shows: [Clinic Logo + Clinic Name] on the left,
//        [Notification Bell + Avatar] on the right.
// Never renders on mobile — className="hidden md:flex".
// Height governed by CSS var(--header-height, 56px).
// ─────────────────────────────────────────────

export default function TopBar() {
    const { user } = useAuth();
    const [clinicName, setClinicName] = useState<string>("AyurGate");
    const [clinicLogoUrl, setClinicLogoUrl] = useState<string | null>(null);
    const [notifCount, setNotifCount] = useState(0);
    const [accountOpen, setAccountOpen] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);

  const userInitials = user?.name
      ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
        : "AC";

  // Fetch clinic settings
  useEffect(() => {
        fetch("/api/settings")
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
                    if (data?.clinicName) setClinicName(data.clinicName);
                    if (data?.logoUrl) setClinicLogoUrl(data.logoUrl);
          })
          .catch(() => {});
  }, []);

  // Fetch notification count
  useEffect(() => {
        const load = () => {
                Promise.allSettled([
                          fetch("/api/inventory/alerts"),
                          fetch("/api/reminders?status=pending"),
                          fetch("/api/notifications"),
                        ]).then(([alertsRes, remindersRes, notifRes]) => {
                          let count = 0;
                          if (alertsRes.status === "fulfilled" && alertsRes.value.ok) {
                                      alertsRes.value.json().then((d) => {
                                                    const items = Array.isArray(d) ? d : d.alerts || d.items || [];
                                                    count += items.length;
                                                    setNotifCount((prev) => prev + items.length);
                                      });
                          }
                });
        };
        load();
  }, []);

  // Close account dropdown on outside click
  useEffect(() => {
        const handler = (e: MouseEvent) => {
                if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
                          setAccountOpen(false);
                }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
        <header
                className="hidden md:flex items-center justify-between px-4"
                style={{
                          position: "fixed",
                          top: 0,
                          left: 64,
                          right: 0,
                          height: "var(--header-height, 56px)",
                          backgroundColor: "#ffffff",
                          borderBottom: "1px solid #e5e7eb",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          zIndex: 40,
                }}
              >
          {/* LEFT: Clinic Logo + Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {clinicLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                                        src={clinicLogoUrl}
                                        alt={clinicName}
                                        style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }}
                                      />
                        ) : (
                          <div
                                        style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: 6,
                                                        background: "linear-gradient(135deg, #059669, #10b981)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        color: "#fff",
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                        }}
                                      >
                            {clinicName.slice(0, 2).toUpperCase()}
                          </div>div>
                      )}
                      <span style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>
                        {clinicName}
                      </span>span>
              </div>div>
        
          {/* RIGHT: Notification Bell + Avatar */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {/* Bell */}
                      <button
                                  aria-label="Notifications"
                                  style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8, position: "relative" }}
                                >
                                <svg style={{ width: 20, height: 20 }} fill="none" stroke="#374151" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>svg>
                        {notifCount > 0 && (
                                              <span style={{ position: "absolute", top: 4, right: 4, backgroundColor: "#ef4444", color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 700, width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                {notifCount > 99 ? "99+" : notifCount}
                                              </span>span>
                                )}
                      </button>button>
              
                {/* Avatar */}
                      <div ref={accountRef} style={{ position: "relative" }}>
                                <button
                                              onClick={() => setAccountOpen(!accountOpen)}
                                              aria-label="Account menu"
                                              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 99 }}
                                            >
                                  {clinicLogoUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={clinicLogoUrl} alt="" style={{ width: 30, height: 30, borderRadius: 99, objectFit: "cover" }} />
                                                          ) : (
                                                            <div style={{ width: 30, height: 30, borderRadius: 99, background: "linear-gradient(135deg, #059669, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                                                              {userInitials}
                                                            </div>div>
                                            )}
                                </button>button>
                      
                        {accountOpen && (
                            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", minWidth: 180, zIndex: 60 }}>
                                          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
                                                          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#111827" }}>{user?.name || "Account"}</p>p>
                                                          <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{user?.email || ""}</p>p>
                                          </div>div>
                                          <a href="/account" style={{ display: "block", padding: "10px 16px", fontSize: 14, color: "#374151", textDecoration: "none" }}>My Account</a>a>
                                          <a href="/api/auth/logout" style={{ display: "block", padding: "10px 16px", fontSize: 14, color: "#ef4444", textDecoration: "none", borderTop: "1px solid #f3f4f6" }}>Sign Out</a>a>
                            </div>div>
                                )}
                      </div>div>
              </div>div>
        </header>header>
      );
}</header>
