"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useFlash } from "@/components/FlashCardProvider";
import { validatePassword, PASSWORD_RULES } from "@/lib/country-data";

// ─── Styles ────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};
const inputStyle: React.CSSProperties = {
  border: "1px solid var(--grey-400)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-900)",
  background: "var(--white)",
  fontSize: "15px",
  width: "100%",
  padding: "10px 14px",
};
const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--grey-700)",
  marginBottom: 6,
  display: "block",
};
const btnPrimary: React.CSSProperties = {
  padding: "10px 24px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  background: "#14532d",
  color: "#fff",
};

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  staffIdNumber?: string;
  jobTitle?: string;
  totpEnabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function MyAccountPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showFlash } = useFlash();

  // Profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Password
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  useEffect(() => { setMounted(true); }, []);

  const showToast = (message: string, type: "success" | "error") => {
    showFlash({ type, title: type === "success" ? "Success" : "Error", message });
  };

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (mounted && user?.id) fetchProfile();
  }, [mounted, user?.id, fetchProfile]);

  // Save profile
  const handleSaveProfile = async () => {
    if (!user?.id) return;
    if (!name.trim()) { showToast("Name is required", "error"); return; }
    if (!email.trim()) { showToast("Email is required", "error"); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }),
      });
      if (res.ok) {
        showToast("Profile updated successfully", "success");
        fetchProfile();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update profile", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!currentPassword) { showToast("Enter current password", "error"); return; }
    if (!newPassword) { showToast("Enter new password", "error"); return; }
    const pwResult = validatePassword(newPassword);
    if (!pwResult.valid) { showToast("Password requirements not met: " + pwResult.errors.join(", "), "error"); return; }
    if (newPassword !== confirmPassword) { showToast("Passwords do not match", "error"); return; }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        showToast("Password changed successfully", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordSection(false);
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to change password", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--grey-900)", margin: 0 }}>My Account</h1>
          <p style={{ fontSize: 14, color: "var(--grey-600)", marginTop: 4 }}>Manage your profile and security settings</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {[
            { key: "profile" as const, label: "Profile" },
            { key: "security" as const, label: "Security" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "8px 20px",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: activeTab === t.key ? "#14532d" : "var(--grey-100)",
                color: activeTab === t.key ? "#fff" : "var(--grey-600)",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
            <div style={{ width: 32, height: 32, border: "3px solid var(--grey-300)", borderTopColor: "#14532d", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            <p style={{ marginTop: 12, fontSize: 14, color: "var(--grey-500)" }}>Loading profile...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : activeTab === "profile" ? (
          <>
            {/* Profile Card */}
            <div style={{ ...cardStyle, padding: 0, marginBottom: 20 }}>
              {/* Profile header with avatar */}
              <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--grey-200)", display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "linear-gradient(135deg, #14532d, #22c55e)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, fontWeight: 800, color: "#fff", flexShrink: 0,
                }}>
                  {(profile?.name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--grey-900)", margin: 0 }}>{profile?.name}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
                      padding: "2px 10px", borderRadius: 6,
                      background: "#dbeafe", color: "#1e40af",
                    }}>
                      {profile?.role}
                    </span>
                    {profile?.staffIdNumber && (
                      <span style={{ fontSize: 13, color: "var(--grey-500)" }}>{profile.staffIdNumber}</span>
                    )}
                  </div>
                  {profile?.jobTitle && (
                    <p style={{ fontSize: 13, color: "var(--grey-600)", marginTop: 2 }}>{profile.jobTitle}</p>
                  )}
                </div>
              </div>

              {/* Profile form */}
              <div style={{ padding: "24px 28px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={inputStyle}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={inputStyle}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={inputStyle}
                      placeholder="+65 xxxx xxxx"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <input
                      type="text"
                      value={profile?.role || ""}
                      disabled
                      style={{ ...inputStyle, background: "var(--grey-100)", cursor: "not-allowed" }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Account Info Card */}
            <div style={{ ...cardStyle, padding: "20px 28px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--grey-900)", marginBottom: 16 }}>Account Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <span style={{ fontSize: 12, color: "var(--grey-500)", fontWeight: 600 }}>Account Status</span>
                  <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600, color: profile?.isActive ? "#16a34a" : "#dc2626" }}>
                    {profile?.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--grey-500)", fontWeight: 600 }}>Last Login</span>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--grey-800)" }}>
                    {profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : "Never"}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--grey-500)", fontWeight: 600 }}>Member Since</span>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--grey-800)" }}>
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: "var(--grey-500)", fontWeight: 600 }}>2FA Status</span>
                  <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600, color: profile?.totpEnabled ? "#16a34a" : "#f59e0b" }}>
                    {profile?.totpEnabled ? "Enabled" : "Not Enabled"}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Security Tab */}
            {/* iCal subscription — sync appointments to Google/Apple/Outlook calendar */}
            <ICalSubscription />

            {/* Change Password */}
            <div style={{ ...cardStyle, padding: "24px 28px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showPasswordSection ? 20 : 0 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--grey-900)", margin: 0 }}>Change Password</h3>
                  <p style={{ fontSize: 13, color: "var(--grey-500)", marginTop: 2 }}>Update your password to keep your account secure</p>
                </div>
                {!showPasswordSection && (
                  <button onClick={() => setShowPasswordSection(true)} style={{ ...btnPrimary, padding: "8px 18px", fontSize: 13 }}>
                    Change Password
                  </button>
                )}
              </div>
              {showPasswordSection && (
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
                    <div>
                      <label style={labelStyle}>Current Password *</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showCurrentPw ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          style={{ ...inputStyle, paddingRight: 40 }}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9ca3af" }}
                          tabIndex={-1}
                          aria-label={showCurrentPw ? "Hide password" : "Show password"}
                        >
                          {showCurrentPw ? (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          ) : (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>New Password *</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showNewPw ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          style={{ ...inputStyle, paddingRight: 40 }}
                          placeholder="At least 12 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9ca3af" }}
                          tabIndex={-1}
                          aria-label={showNewPw ? "Hide password" : "Show password"}
                        >
                          {showNewPw ? (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          ) : (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </button>
                      </div>
                      {newPassword && (
                        <div style={{ marginTop: 8 }}>
                          {PASSWORD_RULES.map((rule, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: rule.test(newPassword) ? "#059669" : "#9ca3af", marginBottom: 2 }}>
                              {rule.test(newPassword) ? (
                                <svg width="14" height="14" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              ) : (
                                <svg width="14" height="14" fill="none" stroke="#d1d5db" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>
                              )}
                              <span>{rule.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Confirm New Password *</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showConfirmPw ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          style={{ ...inputStyle, paddingRight: 40 }}
                          placeholder="Re-enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9ca3af" }}
                          tabIndex={-1}
                          aria-label={showConfirmPw ? "Hide password" : "Show password"}
                        >
                          {showConfirmPw ? (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          ) : (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      style={{ ...btnPrimary, opacity: changingPassword ? 0.6 : 1 }}
                    >
                      {changingPassword ? "Updating..." : "Update Password"}
                    </button>
                    <button
                      onClick={() => { setShowPasswordSection(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
                      style={{ ...btnPrimary, background: "var(--grey-200)", color: "var(--grey-700)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Two-Factor Authentication */}
            <div style={{ ...cardStyle, padding: "24px 28px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--grey-900)", margin: 0 }}>Two-Factor Authentication</h3>
                  <p style={{ fontSize: 13, color: "var(--grey-500)", marginTop: 2 }}>
                    {profile?.totpEnabled
                      ? "2FA is enabled. Your account has an extra layer of security."
                      : "Add an extra layer of security with TOTP authentication."}
                  </p>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8,
                  background: profile?.totpEnabled ? "#d1f2e0" : "#fef3c7",
                  color: profile?.totpEnabled ? "#14532d" : "#92400e",
                }}>
                  {profile?.totpEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--grey-500)", marginTop: 12 }}>
                To {profile?.totpEnabled ? "manage" : "enable"} 2FA, go to{" "}
                <a href="/security" style={{ color: "#14532d", fontWeight: 600, textDecoration: "none" }}>Security Settings</a>.
              </p>
            </div>

            {/* Active Sessions */}
            <div style={{ ...cardStyle, padding: "24px 28px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--grey-900)", margin: 0 }}>Session Info</h3>
              <p style={{ fontSize: 13, color: "var(--grey-500)", marginTop: 2 }}>Your current login session details</p>
              <div style={{ marginTop: 16, padding: "14px 16px", background: "var(--grey-50)", borderRadius: 8, border: "1px solid var(--grey-200)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--grey-800)" }}>Current Session</span>
                    <p style={{ fontSize: 12, color: "var(--grey-500)", marginTop: 2 }}>
                      Last login: {profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : "Unknown"}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: "#d1f2e0", color: "#14532d" }}>
                    Active
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
  );
}

// ─── iCal subscription component (Phase 2.4 / iCal feed) ────────────────
function ICalSubscription() {
  const [info, setInfo] = useState<{ hasToken: boolean; url: string | null; role: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/portal/ical-token").then(r => r.ok ? r.json() : null).then(setInfo).catch(() => {});
  }, []);

  async function generate() {
    if (!confirm("Generate a private calendar URL?\n\nAnyone with this URL can read your appointments. Treat it like a password.")) return;
    setBusy(true);
    try {
      const r = await fetch("/api/portal/ical-token", { method: "POST" });
      const data = await r.json();
      setInfo({ hasToken: true, url: data.url, role: info?.role || "" });
    } finally { setBusy(false); }
  }

  async function revoke() {
    if (!confirm("Revoke the calendar URL? Calendar apps using it will stop syncing.")) return;
    setBusy(true);
    try {
      await fetch("/api/portal/ical-token", { method: "DELETE" });
      setInfo({ hasToken: false, url: null, role: info?.role || "" });
    } finally { setBusy(false); }
  }

  function copy() {
    if (!info?.url) return;
    navigator.clipboard?.writeText(info.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Only show for clinical staff (doctors/therapists). Admins/receptionists don't have own appointments.
  if (info && info.role && !["doctor", "therapist"].includes(info.role)) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid var(--grey-200)", borderRadius: 8, padding: "20px 24px", marginBottom: 16, boxShadow: "var(--shadow-card)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--grey-900)", margin: 0 }}>📅 Sync to Google / Apple Calendar</h3>
          <p style={{ fontSize: 12.5, color: "var(--grey-500)", marginTop: 4, lineHeight: 1.5 }}>
            Subscribe to your AyurGate appointments in your personal calendar app. Syncs every ~12 hours. Patient name, treatment, branch and time included.
          </p>
        </div>
        {!info?.hasToken && (
          <button
            onClick={generate}
            disabled={busy}
            style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#fff", background: busy ? "#9ca3af" : "var(--blue-500)", border: "none", borderRadius: 6, cursor: busy ? "wait" : "pointer", whiteSpace: "nowrap" }}
          >
            {busy ? "…" : "Generate URL"}
          </button>
        )}
      </div>
      {info?.hasToken && info.url && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
            <input
              type="text"
              value={info.url}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
              style={{ flex: 1, fontFamily: "monospace", fontSize: 11.5, padding: "8px 10px", background: "var(--grey-50)", border: "1px solid var(--grey-300)", borderRadius: 6, color: "var(--grey-800)" }}
            />
            <button onClick={copy} style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, background: copied ? "#059669" : "var(--grey-100)", color: copied ? "#fff" : "var(--grey-700)", border: "1px solid var(--grey-300)", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
            <button onClick={revoke} disabled={busy} style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "var(--red)", background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: 6, cursor: "pointer" }}>
              Revoke
            </button>
          </div>
          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: 12, fontWeight: 600, color: "var(--blue-500)", cursor: "pointer" }}>How to add to my calendar</summary>
            <div style={{ fontSize: 12, color: "var(--grey-700)", lineHeight: 1.6, marginTop: 8, paddingLeft: 8 }}>
              <p><strong>Google Calendar:</strong> Settings → Add calendar → From URL → paste the URL above</p>
              <p><strong>Apple Calendar:</strong> File → New Calendar Subscription → paste the URL</p>
              <p><strong>Outlook:</strong> Add Calendar → From Internet → paste the URL</p>
              <p style={{ color: "var(--grey-500)", fontStyle: "italic", marginTop: 6 }}>
                ⚠️ Anyone with this URL can read your appointments. Don&apos;t share it. Click Revoke if it leaks.
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
