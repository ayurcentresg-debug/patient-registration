"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────
// MobileHeader — the fixed white top bar shown
// only on mobile (md:hidden).  All layout concerns
// (hamburger, search, notifications, help, avatar)
// live here and nowhere else.
// ─────────────────────────────────────────────

interface MobileHeaderProps {
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (v: boolean) => void;
    mobileSearchOpen: boolean;
    setMobileSearchOpen: (v: boolean) => void;
    notifOpen: boolean;
    setNotifOpen: (v: boolean) => void;
    helpOpen: boolean;
    setHelpOpen: (v: boolean) => void;
    accountOpen: boolean;
    setAccountOpen: (v: boolean) => void;
    totalNotifCount: number;
    clinicLogoUrl: string | null;
    userInitials: string;
    notifRef: React.RefObject<HTMLDivElement | null>;
}

export default function MobileHeader({
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileSearchOpen,
    setMobileSearchOpen,
    notifOpen,
    setNotifOpen,
    helpOpen,
    setHelpOpen,
    accountOpen,
    setAccountOpen,
    totalNotifCount,
    clinicLogoUrl,
    userInitials,
    notifRef,
}: MobileHeaderProps) {
    return (
          /* ============ MOBILE TOP HEADER (< md) ============ */
          /* NOTE: flex/items/justify/padding live in className, not style,
             so md:hidden display:none wins on desktop without needing !important. */
          <header
                  className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3"
                  data-mobile-header="light"
                  style={{
                            backgroundColor: "#ffffff",
                            height: `calc(var(--header-height, 56px) + env(safe-area-inset-top))`,
                            paddingTop: "env(safe-area-inset-top)",
                            borderBottom: "1px solid #e5e7eb",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
            {/* Left: Hamburger + Clinic logo (clinic brand always visible) */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                    aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6 }}
                                  >
                                  <svg style={{ width: 22, height: 22 }} fill="none" stroke="#374151" viewBox="0 0 24 24">
                                    {mobileMenuOpen ? (
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                ) : (
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                                )}
                                  </svg>
                        </button>
                  {clinicLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={clinicLogoUrl} alt="Clinic" style={{ width: 30, height: 30, borderRadius: 6, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 30, height: 30, borderRadius: 6, background: "#14532d", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                      {(userInitials || "·")}
                    </div>
                  )}
                </div>
          
            {/* Right: Search + Notifications + Help + Avatar */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button
                                    onClick={() => { setMobileSearchOpen(!mobileSearchOpen); setMobileMenuOpen(false); }}
                                    aria-label="Search patients"
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8 }}
                                  >
                                  <svg style={{ width: 20, height: 20 }} fill="none" stroke="#374151" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  </svg>
                        </button>
                
                        <div ref={notifRef} style={{ position: "relative" }}>
                                  <button
                                                onClick={() => { setNotifOpen(!notifOpen); setMobileMenuOpen(false); setMobileSearchOpen(false); }}
                                                aria-label="View notifications"
                                                style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8 }}
                                              >
                                              <svg style={{ width: 20, height: 20 }} fill="none" stroke="#374151" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                              </svg>
                                    {totalNotifCount > 0 && (
                                                              <span style={{ position: "absolute", top: 4, right: 4, backgroundColor: "#ef4444", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                {totalNotifCount > 99 ? "99+" : totalNotifCount}
                                                              </span>
                                              )}
                                  </button>
                        </div>
                
                        <button
                                    onClick={() => { setHelpOpen(true); setMobileMenuOpen(false); setMobileSearchOpen(false); }}
                                    aria-label="Help and support"
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8 }}
                                  >
                                  <svg style={{ width: 20, height: 20 }} fill="none" stroke="#374151" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                        </button>
                
                  {/* Avatar — represents the LOGGED-IN USER (not the clinic) */}
                        <button
                                    onClick={() => { setAccountOpen(!accountOpen); setMobileMenuOpen(false); setMobileSearchOpen(false); }}
                                    aria-label="Account menu"
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 99 }}
                                  >
                          <div style={{ width: 30, height: 30, borderRadius: 99, background: "linear-gradient(135deg, #059669, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                            {userInitials || "U"}
                          </div>
                        </button>
                </div>
          </header>
        );
}
