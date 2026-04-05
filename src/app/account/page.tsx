"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";

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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

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

  // Active tab
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  useEffect(() => { setMounted(true); }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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
    if (newPassword.length < 6) { showToast("Password must be at least 6 characters", "error"); return; }
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

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 24, right: 24, zIndex: 9999,
            padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
            backgroundColor: toast.type === "success" ? "#d1f2e0" : "#fecaca",
            color: toast.type === "success" ? "#14532d" : "#991b1b",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}>
            {toast.message}
          </div>
        )}

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
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        style={inputStyle}
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>New Password *</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={inputStyle}
                        placeholder="At least 6 characters"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Confirm New Password *</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={inputStyle}
                        placeholder="Re-enter new password"
                      />
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
