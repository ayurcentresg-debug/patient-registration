"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import AdminTabs from "@/components/AdminTabs";
import { useFlash } from "@/components/FlashCardProvider";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuth } from "@/components/AuthProvider";
import {
  ROLES,
  MODULES,
  ROLE_PERMISSIONS,
  ACCESS_LEVELS,
  type Role,
  type Module,
  type AccessLevel,
  type RoleOverrides,
  getVisibleNavItems,
  getEffectiveAccess,
} from "@/lib/permissions";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  staffIdNumber: string | null;
  lastLogin: string | null;
}

// ─── Display config ─────────────────────────────────────────────────────────

const ROLE_META: Record<Role, { label: string; emoji: string; color: string; bg: string; desc: string }> = {
  owner:        { label: "Owner",         emoji: "👑", color: "#b45309", bg: "#fffbeb", desc: "Clinic founder — full control" },
  admin:        { label: "Admin",         emoji: "🛡️", color: "#dc2626", bg: "#fef2f2", desc: "Full admin access" },
  receptionist: { label: "Receptionist",  emoji: "💁", color: "#37845e", bg: "#f0faf4", desc: "Front desk — patients & billing" },
  doctor:       { label: "Doctor",        emoji: "🩺", color: "#2d6a4f", bg: "#f0faf4", desc: "Medical prescriber" },
  therapist:    { label: "Therapist",     emoji: "💆", color: "#059669", bg: "#ecfdf5", desc: "Treatment delivery" },
  pharmacist:   { label: "Pharmacist",    emoji: "💊", color: "#7c3aed", bg: "#faf5ff", desc: "Inventory & prescriptions" },
  staff:        { label: "Staff",         emoji: "👔", color: "#78716c", bg: "#fafaf9", desc: "General staff member" },
};

const MODULE_META: Record<Module, { label: string; icon: string; href?: string }> = {
  dashboard:        { label: "Dashboard",         icon: "🏠", href: "/" },
  patients:         { label: "Patients",          icon: "👥", href: "/patients" },
  appointments:     { label: "Appointments",      icon: "📅", href: "/appointments" },
  prescriptions:    { label: "Prescriptions",     icon: "📝", href: "/prescriptions" },
  doctor_portal:    { label: "Doctor Portal",     icon: "🩺", href: "/doctor" },
  inventory:        { label: "Inventory",         icon: "💊", href: "/inventory" },
  billing:          { label: "Billing",           icon: "💰", href: "/billing" },
  packages:         { label: "Packages",          icon: "🎁", href: "/packages" },
  reports:          { label: "Reports",           icon: "📊", href: "/reports" },
  communications:   { label: "Messages",          icon: "💬", href: "/communications" },
  whatsapp:         { label: "WhatsApp",          icon: "📱" },
  admin_settings:   { label: "Admin Settings",    icon: "⚙️", href: "/admin/settings" },
  staff_management: { label: "Staff Management",  icon: "🧑‍💼", href: "/admin/staff" },
  payroll:          { label: "Payroll",           icon: "💵", href: "/admin/payroll" },
  commission:       { label: "Commission",        icon: "🤝", href: "/admin/commission" },
  branches:         { label: "Branches",          icon: "🏢", href: "/admin/branches" },
  import:           { label: "Import",            icon: "📤", href: "/admin/import" },
  feedback:         { label: "Feedback",          icon: "⭐", href: "/feedback" },
  waitlist:         { label: "Waitlist",          icon: "⏳", href: "/waitlist" },
  security:         { label: "Security",          icon: "🔒", href: "/security" },
  cme:              { label: "CME / Events",      icon: "🎓", href: "/cme/admin" },
};

const LEVEL_META: Record<AccessLevel, { label: string; color: string; bg: string; emoji: string }> = {
  full:  { label: "Full",    color: "#15803d", bg: "#dcfce7", emoji: "🟢" },
  write: { label: "Write",   color: "#1d4ed8", bg: "#dbeafe", emoji: "🔵" },
  view:  { label: "View",    color: "#b45309", bg: "#fef3c7", emoji: "🟡" },
  own:   { label: "Own",     color: "#7c3aed", bg: "#f3e8ff", emoji: "🟣" },
  none:  { label: "Blocked", color: "#6b7280", bg: "#f3f4f6", emoji: "⚫" },
};

// Module grouping for the mini sidebar preview
const SIDEBAR_MODULES: Module[] = [
  "dashboard", "doctor_portal", "patients", "appointments", "packages",
  "prescriptions", "inventory", "billing", "reports", "communications",
  "cme", "feedback", "waitlist", "import", "admin_settings", "security",
];

// ─── Design Tokens ──────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [viewAs, setViewAs] = useState<{ name: string; role: string } | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [overrides, setOverrides] = useState<RoleOverrides>({});
  const { showFlash } = useFlash();
  const confirm = useConfirm();
  const { refreshPermissions } = useAuth();

  const loadStaff = async () => {
    try {
      const res = await fetch("/api/staff", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadOverrides = async () => {
    try {
      const res = await fetch("/api/admin/permissions", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setOverrides(data.overrides || {});
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadStaff();
    loadOverrides();
  }, []);

  async function saveOverrides(role: Role, rolePerms: Partial<Record<Module, AccessLevel>>) {
    // Merge this role's changes into existing overrides, then save whole object
    const next: RoleOverrides = { ...overrides };
    // Only keep entries that differ from defaults
    const defaults = ROLE_PERMISSIONS[role];
    const diffs: Partial<Record<Module, AccessLevel>> = {};
    for (const mod of MODULES) {
      const chosen = rolePerms[mod] ?? defaults[mod];
      if (chosen !== defaults[mod]) diffs[mod] = chosen;
    }
    if (Object.keys(diffs).length === 0) {
      delete next[role];
    } else {
      next[role] = diffs;
    }

    try {
      const res = await fetch("/api/admin/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ overrides: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      const data = await res.json();
      setOverrides(data.overrides || {});
      await refreshPermissions();
      showFlash({
        type: "success",
        title: "Saved",
        message: `Permissions for ${role} updated.`,
      });
      setEditingRole(null);
    } catch (e) {
      showFlash({
        type: "error",
        title: "Failed",
        message: e instanceof Error ? e.message : "Could not save permissions",
      });
    }
  }

  async function toggleActive(user: Staff) {
    const action = user.isActive ? "Deactivate" : "Reactivate";
    const ok = await confirm({
      type: user.isActive ? "danger" : "default",
      title: `${action} ${user.name}?`,
      message: user.isActive
        ? `They'll lose access immediately. All their data (appointments, records) stays intact.`
        : `They'll regain their previous access.`,
      confirmLabel: action,
    });
    if (!ok) return;

    setBusyUserId(user.id);
    try {
      const res = await fetch(`/api/staff/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      showFlash({
        type: "success",
        title: "Updated",
        message: `${user.name} has been ${user.isActive ? "deactivated" : "reactivated"}.`,
      });
      await loadStaff();
    } catch (e) {
      showFlash({
        type: "error",
        title: "Failed",
        message: e instanceof Error ? e.message : "Could not update user",
      });
    } finally {
      setBusyUserId(null);
    }
  }

  // Staff filtered by search + role filter
  const filteredStaff = useMemo(() => {
    const s = search.toLowerCase().trim();
    return staff.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!s) return true;
      return (
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.staffIdNumber || "").toLowerCase().includes(s)
      );
    });
  }, [staff, search, roleFilter]);

  // Count users per role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of staff) counts[u.role] = (counts[u.role] || 0) + 1;
    return counts;
  }, [staff]);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-[1400px] mx-auto">
      <AdminTabs />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] sm:text-[26px] font-bold" style={{ color: "var(--grey-900)" }}>
          Permissions & Access
        </h1>
        <p className="text-[14px] sm:text-[15px] mt-1" style={{ color: "var(--grey-600)" }}>
          See what each role can do across all modules. Click a user to view their specific access.
        </p>
      </div>

      {/* ─── Section 1: Role Cards (Option D) ──────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-[17px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>
          Roles Overview
        </h2>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
        >
          {ROLES.map((role) => {
            const meta = ROLE_META[role];
            // Effective perms = defaults merged with this role's overrides
            const perms: Record<Module, AccessLevel> = { ...ROLE_PERMISSIONS[role] };
            for (const mod of MODULES) {
              perms[mod] = getEffectiveAccess(role, mod, overrides);
            }
            const accessible = MODULES.filter((m) => perms[m] !== "none");
            const userCount = roleCounts[role] || 0;
            const hasOverride = !!overrides[role] && Object.keys(overrides[role]!).length > 0;

            return (
              <div key={role} style={{ ...cardStyle, padding: 16, position: "relative" }}>
                {hasOverride && (
                  <div
                    className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "#fef3c7", color: "#b45309", letterSpacing: "0.05em" }}
                    title="This role has custom overrides for this clinic"
                  >
                    CUSTOM
                  </div>
                )}
                {/* Role header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex items-center justify-center text-[20px]"
                      style={{
                        width: 40, height: 40,
                        background: meta.bg,
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      {meta.emoji}
                    </div>
                    <div>
                      <div className="text-[15px] font-bold" style={{ color: meta.color }}>
                        {meta.label}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--grey-500)" }}>
                        {userCount} {userCount === 1 ? "user" : "users"} • {accessible.length}/{MODULES.length} modules
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[12px] mb-3" style={{ color: "var(--grey-600)" }}>
                  {meta.desc}
                </p>

                <button
                  onClick={() => setEditingRole(role)}
                  className="w-full text-[12px] font-semibold mb-3 py-1.5"
                  style={{
                    background: "var(--blue-50)",
                    color: "var(--blue-700)",
                    border: "1px solid var(--blue-200)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  ✏ Edit permissions
                </button>

                {/* Mini sidebar preview */}
                <div
                  className="text-[11px]"
                  style={{
                    background: "var(--grey-50)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 10px",
                    border: "1px solid var(--grey-200)",
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--grey-500)" }}>
                    Sidebar Preview
                  </div>
                  {SIDEBAR_MODULES.map((mod) => {
                    const level = perms[mod];
                    const mm = MODULE_META[mod];
                    const isBlocked = level === "none";
                    return (
                      <div
                        key={mod}
                        className="flex items-center justify-between py-1"
                        style={{
                          opacity: isBlocked ? 0.35 : 1,
                          color: isBlocked ? "var(--grey-500)" : "var(--grey-800)",
                          textDecoration: isBlocked ? "line-through" : "none",
                        }}
                      >
                        <span>
                          <span style={{ marginRight: 6 }}>{mm.icon}</span>
                          {mm.label}
                        </span>
                        {!isBlocked && (
                          <span
                            className="text-[9px] font-bold uppercase px-1.5 rounded"
                            style={{
                              background: LEVEL_META[level].bg,
                              color: LEVEL_META[level].color,
                            }}
                          >
                            {level}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Section 2: Users List (Option B) ──────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>
            Users ({staff.length})
          </h2>
          <div className="flex gap-2 flex-wrap">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, ID…"
              className="px-3 py-1.5 text-[14px]"
              style={{
                border: "1px solid var(--grey-300)",
                borderRadius: "var(--radius-sm)",
                minWidth: 220,
              }}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 text-[14px]"
              style={{
                border: "1px solid var(--grey-300)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <option value="all">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_META[r].label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12" style={{ color: "var(--grey-500)" }}>
            Loading users…
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-12" style={{ color: "var(--grey-500)" }}>
            No users match your filters.
          </div>
        ) : (
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            {filteredStaff.map((user, idx) => {
              const isOpen = expandedUserId === user.id;
              const meta = ROLE_META[user.role as Role] || ROLE_META.staff;
              const perms: Record<Module, AccessLevel> = { ...(ROLE_PERMISSIONS[user.role as Role] || ROLE_PERMISSIONS.staff) };
              for (const mod of MODULES) {
                perms[mod] = getEffectiveAccess(user.role, mod, overrides);
              }
              const accessibleCount = MODULES.filter((m) => perms[m] !== "none").length;

              return (
                <div key={user.id} style={{ borderTop: idx > 0 ? "1px solid var(--grey-200)" : "none" }}>
                  {/* User row */}
                  <div
                    className="px-4 py-3 flex items-center gap-3 flex-wrap cursor-pointer hover:bg-[var(--grey-50)] transition-colors"
                    onClick={() => setExpandedUserId(isOpen ? null : user.id)}
                  >
                    <div
                      className="flex items-center justify-center text-[18px]"
                      style={{
                        width: 40, height: 40, background: meta.bg,
                        borderRadius: "50%", flexShrink: 0,
                      }}
                    >
                      {meta.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>
                        {user.name}
                        {!user.isActive && (
                          <span className="ml-2 text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--grey-200)", color: "var(--grey-600)" }}>
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] truncate" style={{ color: "var(--grey-500)" }}>
                        {user.email}{user.staffIdNumber ? ` • ${user.staffIdNumber}` : ""}
                      </div>
                    </div>
                    <div
                      className="text-[12px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </div>
                    <div className="text-[12px] hidden sm:block" style={{ color: "var(--grey-500)" }}>
                      {accessibleCount} modules
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setViewAs({ name: user.name, role: user.role })}
                        className="text-[12px] font-semibold px-2.5 py-1.5"
                        style={{
                          background: "var(--blue-50)",
                          color: "var(--blue-700)",
                          border: "1px solid var(--blue-200)",
                          borderRadius: "var(--radius-sm)",
                        }}
                        title="Preview their sidebar & access"
                      >
                        👁 View as
                      </button>
                      <Link
                        href={`/admin/staff/${user.id}/edit`}
                        className="text-[12px] font-semibold px-2.5 py-1.5"
                        style={{
                          background: "var(--grey-50)",
                          color: "var(--grey-700)",
                          border: "1px solid var(--grey-300)",
                          borderRadius: "var(--radius-sm)",
                          textDecoration: "none",
                        }}
                        title="Edit user details & role"
                      >
                        ✏ Edit
                      </Link>
                      <button
                        onClick={() => toggleActive(user)}
                        disabled={busyUserId === user.id}
                        className="text-[12px] font-semibold px-2.5 py-1.5"
                        style={{
                          background: user.isActive ? "#fef2f2" : "#f0faf4",
                          color: user.isActive ? "#dc2626" : "#15803d",
                          border: `1px solid ${user.isActive ? "#fecaca" : "#bbf7d0"}`,
                          borderRadius: "var(--radius-sm)",
                          cursor: busyUserId === user.id ? "wait" : "pointer",
                          opacity: busyUserId === user.id ? 0.6 : 1,
                        }}
                        title={user.isActive ? "Deactivate user" : "Reactivate user"}
                      >
                        {busyUserId === user.id ? "…" : user.isActive ? "⊘ Deactivate" : "✓ Reactivate"}
                      </button>
                    </div>
                    <span style={{ color: "var(--grey-400)", fontSize: 18 }}>
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div
                      className="px-4 py-4"
                      style={{ background: "var(--grey-50)", borderTop: "1px solid var(--grey-200)" }}
                    >
                      <div className="mb-2 text-[12px]" style={{ color: "var(--grey-600)" }}>
                        Last login: {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}
                      </div>

                      {/* Access breakdown by level */}
                      {(["full", "write", "view", "own", "none"] as AccessLevel[]).map((level) => {
                        const mods = MODULES.filter((m) => perms[m] === level);
                        if (mods.length === 0) return null;
                        const lm = LEVEL_META[level];
                        return (
                          <div key={level} className="mb-2">
                            <div
                              className="text-[11px] font-bold uppercase mb-1"
                              style={{ color: lm.color }}
                            >
                              {lm.emoji} {lm.label} access ({mods.length})
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {mods.map((mod) => {
                                const mm = MODULE_META[mod];
                                return (
                                  <span
                                    key={mod}
                                    className="text-[11px] px-2 py-0.5 rounded"
                                    style={{
                                      background: level === "none" ? "#fff" : lm.bg,
                                      color: level === "none" ? "var(--grey-500)" : lm.color,
                                      border: level === "none" ? "1px dashed var(--grey-300)" : "none",
                                      textDecoration: level === "none" ? "line-through" : "none",
                                    }}
                                  >
                                    {mm.icon} {mm.label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── "View as" Modal (Option A) ─────────────────────────────────────── */}
      {viewAs && (
        <ViewAsModal
          name={viewAs.name}
          role={viewAs.role}
          overrides={overrides}
          onClose={() => setViewAs(null)}
        />
      )}

      {/* ─── Role Matrix Editor Modal ───────────────────────────────────────── */}
      {editingRole && (
        <RoleMatrixEditor
          role={editingRole}
          overrides={overrides}
          onClose={() => setEditingRole(null)}
          onSave={(rp) => saveOverrides(editingRole, rp)}
        />
      )}
    </div>
  );
}

// ─── View As Modal ──────────────────────────────────────────────────────────

function ViewAsModal({ name, role, overrides, onClose }: { name: string; role: string; overrides: RoleOverrides; onClose: () => void }) {
  const meta = ROLE_META[role as Role] || ROLE_META.staff;
  const visibleNav = getVisibleNavItems(role, overrides);
  const visibleHrefs = Object.entries(visibleNav).filter(([, v]) => v).map(([h]) => h);
  const perms: Record<Module, AccessLevel> = { ...(ROLE_PERMISSIONS[role as Role] || ROLE_PERMISSIONS.staff) };
  for (const mod of MODULES) {
    perms[mod] = getEffectiveAccess(role, mod, overrides);
  }

  const hrefToLabel: Record<string, string> = {
    "/": "🏠 Dashboard",
    "/onboarding/dashboard": "🏠 Setup Guide",
    "/doctor": "🩺 Doctor Dashboard",
    "/patients": "👥 Patients",
    "/patients/new": "➕ Register Patient",
    "/appointments": "📅 Appointments",
    "/appointments/calendar": "📅 Calendar",
    "/packages": "🎁 Packages",
    "/prescriptions": "📝 Prescriptions",
    "/inventory": "💊 Inventory",
    "/billing": "💰 Billing",
    "/reports": "📊 Reports",
    "/communications": "💬 Messages",
    "/cme/admin": "🎓 CME / Events",
    "/feedback": "⭐ Feedback",
    "/waitlist": "⏳ Waitlist",
    "/admin/import": "📤 Import",
    "/admin": "⚙️ Admin",
    "/security": "🔒 Security",
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 250,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        animation: "viewAsOverlayIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "viewAsCardIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            background: meta.bg,
            borderBottom: "1px solid var(--grey-200)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 44, height: 44,
              background: "#fff",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            {meta.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: meta.color }}>
              Viewing as {name}
            </div>
            <div style={{ fontSize: 12, color: "var(--grey-600)" }}>
              Role: {meta.label} • {visibleHrefs.length} nav items visible
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 22,
              color: "var(--grey-500)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: 20 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--grey-500)",
              marginBottom: 10,
            }}
          >
            Sidebar — what {name} sees
          </div>

          {/* Sidebar mock */}
          <div
            style={{
              background: "var(--grey-50)",
              border: "1px solid var(--grey-200)",
              borderRadius: 8,
              padding: 10,
              marginBottom: 18,
            }}
          >
            {Object.entries(hrefToLabel).map(([href, label]) => {
              const visible = visibleHrefs.includes(href);
              return (
                <div
                  key={href}
                  style={{
                    padding: "7px 10px",
                    fontSize: 13,
                    color: visible ? "var(--grey-800)" : "var(--grey-400)",
                    textDecoration: visible ? "none" : "line-through",
                    opacity: visible ? 1 : 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: 4,
                  }}
                >
                  <span>{label}</span>
                  {visible ? (
                    <span style={{ fontSize: 14, color: "#15803d" }}>✓</span>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--grey-500)" }}>hidden</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Access level summary */}
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--grey-500)",
              marginBottom: 10,
            }}
          >
            Access levels
          </div>

          {(["full", "write", "view", "own"] as AccessLevel[]).map((level) => {
            const mods = MODULES.filter((m) => perms[m] === level);
            if (mods.length === 0) return null;
            const lm = LEVEL_META[level];
            return (
              <div key={level} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: lm.color, marginBottom: 4 }}>
                  {lm.emoji} {lm.label} ({mods.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {mods.map((m) => (
                    <span
                      key={m}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        background: lm.bg,
                        color: lm.color,
                        borderRadius: 4,
                      }}
                    >
                      {MODULE_META[m].icon} {MODULE_META[m].label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Blocked */}
          {(() => {
            const blocked = MODULES.filter((m) => perms[m] === "none");
            if (blocked.length === 0) return null;
            return (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--grey-200)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--grey-500)", marginBottom: 4 }}>
                  ⚫ Blocked ({blocked.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {blocked.map((m) => (
                    <span
                      key={m}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        background: "#fff",
                        color: "var(--grey-500)",
                        border: "1px dashed var(--grey-300)",
                        borderRadius: 4,
                        textDecoration: "line-through",
                      }}
                    >
                      {MODULE_META[m].icon} {MODULE_META[m].label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <style>{`
          @keyframes viewAsOverlayIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes viewAsCardIn {
            from { opacity: 0; transform: translateY(30px) scale(0.94) }
            to { opacity: 1; transform: translateY(0) scale(1) }
          }
        `}</style>
      </div>
    </div>
  );
}

// ─── Role Matrix Editor ─────────────────────────────────────────────────────

function RoleMatrixEditor({
  role,
  overrides,
  onClose,
  onSave,
}: {
  role: Role;
  overrides: RoleOverrides;
  onClose: () => void;
  onSave: (rolePerms: Partial<Record<Module, AccessLevel>>) => void | Promise<void>;
}) {
  const meta = ROLE_META[role];
  const defaults = ROLE_PERMISSIONS[role];

  // Build initial perms = defaults + current overrides
  const initialPerms: Record<Module, AccessLevel> = { ...defaults };
  for (const mod of MODULES) {
    initialPerms[mod] = getEffectiveAccess(role, mod, overrides);
  }
  const [perms, setPerms] = useState<Record<Module, AccessLevel>>(initialPerms);
  const [saving, setSaving] = useState(false);

  // Close on ESC
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const changedCount = MODULES.filter((m) => perms[m] !== defaults[m]).length;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(perms);
    } finally {
      setSaving(false);
    }
  }

  function resetToDefaults() {
    setPerms({ ...defaults });
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 260,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        animation: "matrixOverlayIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "matrixCardIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            background: meta.bg,
            borderBottom: "1px solid var(--grey-200)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 44, height: 44,
              background: "#fff",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            {meta.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: meta.color }}>
              Edit {meta.label} permissions
            </div>
            <div style={{ fontSize: 12, color: "var(--grey-600)" }}>
              {changedCount === 0
                ? "No changes yet"
                : `${changedCount} change${changedCount === 1 ? "" : "s"} from defaults`}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none", background: "transparent",
              fontSize: 22, color: "var(--grey-500)",
              cursor: "pointer", padding: 4,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>
          <p style={{ fontSize: 12, color: "var(--grey-600)", margin: "0 0 12px" }}>
            Pick an access level for each module. Click <b>Reset</b> to restore defaults.
          </p>

          {MODULES.map((mod) => {
            const mm = MODULE_META[mod];
            const current = perms[mod];
            const def = defaults[mod];
            const changed = current !== def;
            return (
              <div
                key={mod}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: changed ? "#fffbeb" : "transparent",
                  border: changed ? "1px solid #fde68a" : "1px solid transparent",
                  marginBottom: 4,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--grey-900)" }}>
                    <span style={{ marginRight: 6 }}>{mm.icon}</span>
                    {mm.label}
                    {changed && (
                      <span style={{ fontSize: 10, color: "#b45309", fontWeight: 700, marginLeft: 6 }}>
                        CHANGED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--grey-500)", marginTop: 1 }}>
                    Default: <b>{def}</b>
                  </div>
                </div>
                <select
                  value={current}
                  onChange={(e) => setPerms((p) => ({ ...p, [mod]: e.target.value as AccessLevel }))}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "6px 8px",
                    border: `1px solid ${LEVEL_META[current].color}40`,
                    borderRadius: 6,
                    background: LEVEL_META[current].bg,
                    color: LEVEL_META[current].color,
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {ACCESS_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {LEVEL_META[lvl].emoji} {LEVEL_META[lvl].label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex", gap: 10,
            padding: "14px 20px",
            borderTop: "1px solid var(--grey-200)",
            background: "var(--grey-50)",
          }}
        >
          <button
            onClick={resetToDefaults}
            disabled={saving}
            style={{
              padding: "9px 14px",
              border: "1px solid var(--grey-300)",
              borderRadius: 8,
              background: "#fff",
              color: "var(--grey-700)",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.5 : 1,
            }}
          >
            Reset to defaults
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "9px 14px",
              border: "1px solid var(--grey-300)",
              borderRadius: 8,
              background: "#fff",
              color: "var(--grey-700)",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || changedCount === 0}
            style={{
              padding: "9px 18px",
              border: "none",
              borderRadius: 8,
              background: (saving || changedCount === 0) ? "var(--grey-300)" : "#2d6a4f",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              cursor: (saving || changedCount === 0) ? "not-allowed" : "pointer",
              boxShadow: (saving || changedCount === 0) ? "none" : "0 2px 8px #2d6a4f40",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        <style>{`
          @keyframes matrixOverlayIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes matrixCardIn {
            from { opacity: 0; transform: translateY(30px) scale(0.94) }
            to { opacity: 1; transform: translateY(0) scale(1) }
          }
        `}</style>
      </div>
    </div>
  );
}

