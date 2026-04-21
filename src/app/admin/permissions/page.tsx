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
  type UserOverrides,
  type PermissionTemplate,
  getVisibleNavItems,
  getEffectiveAccess,
  getUserEffectiveAccess,
  parseUserOverrides,
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
  permissionOverrides?: string | null;
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
  const [editingUser, setEditingUser] = useState<Staff | null>(null);
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

  async function saveUserOverrides(user: Staff, userOv: UserOverrides) {
    try {
      const res = await fetch(`/api/staff/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ permissionOverrides: userOv }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      // If editing self, refresh own permissions for live sidebar update
      await refreshPermissions();
      await loadStaff();
      showFlash({
        type: "success",
        title: "Saved",
        message: `Custom permissions for ${user.name} updated.`,
      });
      setEditingUser(null);
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
              const userOv = parseUserOverrides(user.permissionOverrides);
              const hasUserOv = Object.keys(userOv).length > 0;
              const perms: Record<Module, AccessLevel> = { ...(ROLE_PERMISSIONS[user.role as Role] || ROLE_PERMISSIONS.staff) };
              for (const mod of MODULES) {
                perms[mod] = getUserEffectiveAccess(user.role, mod, overrides, userOv);
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
                      className="text-[12px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                      {hasUserOv && (
                        <span
                          style={{
                            background: "#fef3c7",
                            color: "#b45309",
                            fontSize: 9,
                            padding: "1px 5px",
                            borderRadius: 3,
                            letterSpacing: "0.05em",
                          }}
                          title={`${Object.keys(userOv).length} custom override${Object.keys(userOv).length === 1 ? "" : "s"}`}
                        >
                          +{Object.keys(userOv).length}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] hidden sm:block" style={{ color: "var(--grey-500)" }}>
                      {accessibleCount} modules
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-[12px] font-semibold px-2.5 py-1.5"
                        style={{
                          background: hasUserOv ? "#fef3c7" : "#faf5ff",
                          color: hasUserOv ? "#b45309" : "#7c3aed",
                          border: `1px solid ${hasUserOv ? "#fde68a" : "#e9d5ff"}`,
                          borderRadius: "var(--radius-sm)",
                        }}
                        title="Set custom permissions for this user only"
                      >
                        🎯 Custom
                      </button>
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

      {/* ─── Section 3: Permission change history ─────────────────────────── */}
      <PermissionHistorySection />

      {/* ─── "View as" Modal (Option A) ─────────────────────────────────────── */}
      {viewAs && (
        <ViewAsModal
          name={viewAs.name}
          role={viewAs.role}
          overrides={overrides}
          userOverrides={
            (() => {
              const u = staff.find((s) => s.name === viewAs.name && s.role === viewAs.role);
              return u ? parseUserOverrides(u.permissionOverrides) : {};
            })()
          }
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

      {/* ─── User Permissions Editor Modal (Option 3) ───────────────────────── */}
      {editingUser && (
        <UserPermissionsEditor
          user={editingUser}
          clinicOverrides={overrides}
          onClose={() => setEditingUser(null)}
          onSave={(ov) => saveUserOverrides(editingUser, ov)}
        />
      )}
    </div>
  );
}

// ─── View As Modal ──────────────────────────────────────────────────────────

function ViewAsModal({
  name, role, overrides, userOverrides = {}, onClose,
}: {
  name: string;
  role: string;
  overrides: RoleOverrides;
  userOverrides?: UserOverrides;
  onClose: () => void;
}) {
  const meta = ROLE_META[role as Role] || ROLE_META.staff;
  const visibleNav = getVisibleNavItems(role, overrides, userOverrides);
  const visibleHrefs = Object.entries(visibleNav).filter(([, v]) => v).map(([h]) => h);
  const perms: Record<Module, AccessLevel> = { ...(ROLE_PERMISSIONS[role as Role] || ROLE_PERMISSIONS.staff) };
  for (const mod of MODULES) {
    perms[mod] = getUserEffectiveAccess(role, mod, overrides, userOverrides);
  }

  const hrefToLabel: Record<string, string> = {
    "/": "🏠 Dashboard",
    "/onboarding/dashboard": "🏠 Setup Guide",
    "/doctor": "🩺 Doctor Dashboard",
    "/patients": "👥 Patients",
    "/patients/new": "➕ Register Patient",
    "/appointments": "📅 Appointments",
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
          <TemplateToolbar
            scope="role"
            onApply={(t) => {
              setPerms((p) => {
                const next = { ...p };
                for (const [mod, lvl] of Object.entries(t.perms)) {
                  next[mod as Module] = lvl as AccessLevel;
                }
                return next;
              });
            }}
            captureCurrent={() => {
              // Only include modules that differ from defaults
              const out: Partial<Record<Module, AccessLevel>> = {};
              for (const mod of MODULES) {
                if (perms[mod] !== defaults[mod]) out[mod] = perms[mod];
              }
              return out;
            }}
          />

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

// ─── User Permissions Editor (Option 3: per-user overrides) ─────────────────

function UserPermissionsEditor({
  user,
  clinicOverrides,
  onClose,
  onSave,
}: {
  user: Staff;
  clinicOverrides: RoleOverrides;
  onClose: () => void;
  onSave: (ov: UserOverrides) => void | Promise<void>;
}) {
  const meta = ROLE_META[user.role as Role] || ROLE_META.staff;
  const existing = parseUserOverrides(user.permissionOverrides);
  const roleDefaults: Record<Module, AccessLevel> = {} as Record<Module, AccessLevel>;
  for (const mod of MODULES) {
    roleDefaults[mod] = getEffectiveAccess(user.role, mod, clinicOverrides);
  }

  const [picks, setPicks] = useState<Record<Module, AccessLevel | null>>(() => {
    const init: Record<Module, AccessLevel | null> = {} as Record<Module, AccessLevel | null>;
    for (const mod of MODULES) {
      init[mod] = existing[mod] ?? null;
    }
    return init;
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const overrideCount = MODULES.filter((m) => picks[m] !== null).length;

  async function handleSave() {
    const ov: UserOverrides = {};
    for (const mod of MODULES) {
      const v = picks[mod];
      if (v !== null) ov[mod] = v;
    }
    setSaving(true);
    try {
      await onSave(ov);
    } finally {
      setSaving(false);
    }
  }

  function clearAll() {
    const empty: Record<Module, AccessLevel | null> = {} as Record<Module, AccessLevel | null>;
    for (const mod of MODULES) empty[mod] = null;
    setPicks(empty);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 265,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        animation: "userPermOverlayIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 600, maxHeight: "90vh",
          background: "#fff", borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          animation: "userPermCardIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
            borderBottom: "1px solid var(--grey-200)",
            display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <div
            style={{
              width: 44, height: 44, background: "#fff", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
            }}
          >
            🎯
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#7c3aed" }}>
              Custom permissions — {user.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--grey-600)" }}>
              {meta.label} • {overrideCount === 0 ? "Uses role defaults" : `${overrideCount} custom override${overrideCount === 1 ? "" : "s"}`}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "transparent", fontSize: 22, color: "var(--grey-500)", cursor: "pointer", padding: 4 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "14px 20px", flex: 1 }}>
          <TemplateToolbar
            scope="user"
            onApply={(t) => {
              setPicks((p) => {
                const next = { ...p };
                for (const [mod, lvl] of Object.entries(t.perms)) {
                  next[mod as Module] = lvl as AccessLevel;
                }
                return next;
              });
            }}
            captureCurrent={() => {
              const out: Partial<Record<Module, AccessLevel>> = {};
              for (const mod of MODULES) {
                const v = picks[mod];
                if (v !== null) out[mod] = v;
              }
              return out;
            }}
          />

          <p style={{ fontSize: 12, color: "var(--grey-600)", margin: "0 0 14px" }}>
            Leave a module on <b>&ldquo;(inherit)&rdquo;</b> to use the {meta.label} role default.
            Pick a specific level to override just for <b>{user.name}</b>. Overrides take precedence over role + clinic defaults.
          </p>

          {MODULES.map((mod) => {
            const mm = MODULE_META[mod];
            const roleDefault = roleDefaults[mod];
            const pick = picks[mod];
            const hasOverride = pick !== null;
            const effective = pick ?? roleDefault;

            const grantsMore = hasOverride && pick !== null && rankLevel(pick) > rankLevel(roleDefault);
            const grantsLess = hasOverride && pick !== null && rankLevel(pick) < rankLevel(roleDefault);

            return (
              <div
                key={mod}
                style={{
                  display: "grid", gridTemplateColumns: "1fr auto",
                  gap: 10, alignItems: "center",
                  padding: "8px 10px", borderRadius: 6,
                  background: hasOverride ? "#faf5ff" : "transparent",
                  border: hasOverride ? "1px solid #e9d5ff" : "1px solid transparent",
                  marginBottom: 4,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--grey-900)" }}>
                    <span style={{ marginRight: 6 }}>{mm.icon}</span>
                    {mm.label}
                    {grantsMore && (
                      <span style={{ fontSize: 10, color: "#15803d", fontWeight: 700, marginLeft: 6 }}>
                        +MORE
                      </span>
                    )}
                    {grantsLess && (
                      <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 700, marginLeft: 6 }}>
                        −LESS
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--grey-500)", marginTop: 1 }}>
                    Role default: <b>{roleDefault}</b>
                    {hasOverride && <> • Effective: <b style={{ color: LEVEL_META[effective].color }}>{effective}</b></>}
                  </div>
                </div>
                <select
                  value={pick ?? "__inherit__"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPicks((p) => ({ ...p, [mod]: val === "__inherit__" ? null : (val as AccessLevel) }));
                  }}
                  style={{
                    fontSize: 13, fontWeight: 600,
                    padding: "6px 8px",
                    border: `1px solid ${hasOverride ? "#a855f7" : "var(--grey-300)"}`,
                    borderRadius: 6,
                    background: hasOverride ? LEVEL_META[effective].bg : "#fff",
                    color: hasOverride ? LEVEL_META[effective].color : "var(--grey-600)",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    minWidth: 130,
                  }}
                >
                  <option value="__inherit__">(inherit)</option>
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
            onClick={clearAll}
            disabled={saving || overrideCount === 0}
            style={{
              padding: "9px 14px",
              border: "1px solid var(--grey-300)",
              borderRadius: 8,
              background: "#fff", color: "var(--grey-700)",
              fontSize: 13, fontWeight: 600,
              cursor: (saving || overrideCount === 0) ? "not-allowed" : "pointer",
              opacity: (saving || overrideCount === 0) ? 0.4 : 1,
            }}
          >
            Clear all overrides
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "9px 14px",
              border: "1px solid var(--grey-300)",
              borderRadius: 8,
              background: "#fff", color: "var(--grey-700)",
              fontSize: 13, fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "9px 18px",
              border: "none", borderRadius: 8,
              background: saving ? "var(--grey-300)" : "#7c3aed",
              color: "#fff",
              fontSize: 13, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.03em",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: saving ? "none" : "0 2px 8px #7c3aed40",
            }}
          >
            {saving ? "Saving…" : "Save overrides"}
          </button>
        </div>

        <style>{`
          @keyframes userPermOverlayIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes userPermCardIn {
            from { opacity: 0; transform: translateY(30px) scale(0.94) }
            to { opacity: 1; transform: translateY(0) scale(1) }
          }
        `}</style>
      </div>
    </div>
  );
}

function rankLevel(level: AccessLevel): number {
  return { full: 4, write: 3, view: 2, own: 1, none: 0 }[level];
}

// ─── Permission Change History ──────────────────────────────────────────────

interface HistoryEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

interface PermDiff {
  role?: string;
  module: string;
  from: string;
  to: string;
}

interface PermDetails {
  diffs?: PermDiff[];
  changeCount?: number;
  targetUserName?: string;
  targetUserRole?: string;
  rolesTouched?: string[];
}

function PermissionHistorySection() {
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/audit-logs?entity=clinic_permissions&limit=50", { credentials: "include" }),
        fetch("/api/audit-logs?entity=user_permissions&limit=50", { credentials: "include" }),
      ]);
      const d1 = r1.ok ? await r1.json() : { logs: [] };
      const d2 = r2.ok ? await r2.json() : { logs: [] };
      const merged: HistoryEntry[] = [...(d1.logs || []), ...(d2.logs || [])];
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setEntries(merged.slice(0, 50));
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (expanded && !loaded) load();
  }, [expanded, loaded]);

  function parseDetails(raw: string | null): PermDetails {
    if (!raw) return {};
    try { return JSON.parse(raw) as PermDetails; } catch { return {}; }
  }

  return (
    <section className="mb-10" style={{ ...cardStyle, padding: 16 }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between"
        style={{
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div>
          <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>
            📜 Permission change history
          </h2>
          <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>
            Who changed what and when. Most recent first.
          </p>
        </div>
        <span style={{ fontSize: 20, color: "var(--grey-400)" }}>
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: 16 }}>
          {loading ? (
            <div className="text-center py-6 text-[13px]" style={{ color: "var(--grey-500)" }}>
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-6 text-[13px]" style={{ color: "var(--grey-500)" }}>
              No permission changes recorded yet.
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button
                  onClick={load}
                  className="text-[12px] font-semibold px-2.5 py-1"
                  style={{
                    background: "var(--grey-50)",
                    color: "var(--grey-700)",
                    border: "1px solid var(--grey-300)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  ↻ Refresh
                </button>
              </div>

              {entries.map((e) => {
                const d = parseDetails(e.details);
                const isUserScope = e.entity === "user_permissions";
                return (
                  <div
                    key={e.id}
                    style={{
                      padding: "10px 12px",
                      borderLeft: `3px solid ${isUserScope ? "#7c3aed" : "#2d6a4f"}`,
                      background: "var(--grey-50)",
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5"
                        style={{
                          background: isUserScope ? "#faf5ff" : "#f0faf4",
                          color: isUserScope ? "#7c3aed" : "#2d6a4f",
                          borderRadius: 4,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {isUserScope ? "🎯 User" : "🏛️ Role"}
                      </span>
                      <span className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>
                        {e.userName}
                      </span>
                      <span className="text-[12px]" style={{ color: "var(--grey-600)" }}>
                        {isUserScope ? (
                          <>updated permissions for <b>{d.targetUserName || "user"}</b>{d.targetUserRole ? ` (${d.targetUserRole})` : ""}</>
                        ) : (
                          <>updated <b>role permissions</b></>
                        )}
                      </span>
                      <span className="text-[11px] ml-auto" style={{ color: "var(--grey-500)" }}>
                        {new Date(e.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {d.diffs && d.diffs.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                        {d.diffs.map((diff, i) => (
                          <span
                            key={i}
                            className="text-[11px]"
                            style={{
                              background: "#fff",
                              border: "1px solid var(--grey-200)",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontFamily: "ui-monospace, monospace",
                            }}
                          >
                            {diff.role ? <span style={{ color: "#7c3aed" }}>{diff.role}.</span> : null}
                            <span style={{ color: "var(--grey-800)" }}>{diff.module}</span>
                            <span style={{ color: "var(--grey-400)" }}>: </span>
                            <span style={{ color: "#dc2626" }}>{diff.from}</span>
                            <span style={{ color: "var(--grey-400)" }}> → </span>
                            <span style={{ color: "#15803d" }}>{diff.to}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px]" style={{ color: "var(--grey-500)" }}>
                        No diff details available.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Template Toolbar (shared between Role + User editors) ──────────────────

function TemplateToolbar({
  scope,
  onApply,
  captureCurrent,
}: {
  scope: "role" | "user";
  onApply: (tpl: PermissionTemplate) => void;
  captureCurrent: () => Partial<Record<Module, AccessLevel>>;
}) {
  const [templates, setTemplates] = useState<PermissionTemplate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const { showFlash } = useFlash();
  const confirm = useConfirm();

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/permission-templates", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      } else {
        setTemplates([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  const scoped = (templates || []).filter((t) => t.scope === scope);

  async function handleApply(id: string) {
    const t = scoped.find((x) => x.id === id);
    if (!t) return;
    onApply(t);
    showFlash({
      type: "info",
      title: "Template applied",
      message: `${t.name} — ${Object.keys(t.perms).length} modules set. Review and click Save to persist.`,
      autoDismiss: 3000,
    });
  }

  async function handleSaveAs() {
    if (!newName.trim()) {
      showFlash({ type: "warning", title: "Name required", message: "Give the template a name.", autoDismiss: 2500 });
      return;
    }
    const perms = captureCurrent();
    if (Object.keys(perms).length === 0) {
      showFlash({ type: "warning", title: "Nothing to save", message: "No changes from defaults/inherit to capture.", autoDismiss: 2500 });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/permission-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), scope, perms }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      await loadTemplates();
      setShowSave(false);
      setNewName("");
      setNewDesc("");
      showFlash({ type: "success", title: "Saved", message: `Template "${newName.trim()}" saved.`, autoDismiss: 3000 });
    } catch (e) {
      showFlash({ type: "error", title: "Failed", message: e instanceof Error ? e.message : "Could not save template" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: PermissionTemplate) {
    if (t.builtIn) return;
    const ok = await confirm({
      type: "danger",
      title: `Delete template "${t.name}"?`,
      message: "This cannot be undone. Users who already had it applied keep their settings.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/permission-templates?id=${encodeURIComponent(t.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      await loadTemplates();
      showFlash({ type: "success", title: "Deleted", message: `Template "${t.name}" removed.`, autoDismiss: 2500 });
    } catch (e) {
      showFlash({ type: "error", title: "Failed", message: e instanceof Error ? e.message : "Could not delete template" });
    }
  }

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid var(--grey-200)",
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 14,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase" style={{ color: "var(--grey-500)", letterSpacing: "0.05em" }}>
          📋 Templates
        </span>

        <select
          value=""
          onChange={(e) => {
            if (e.target.value) handleApply(e.target.value);
            e.target.value = "";
          }}
          disabled={loading || scoped.length === 0}
          className="text-[13px]"
          style={{
            padding: "5px 8px",
            border: "1px solid var(--grey-300)",
            borderRadius: 6,
            background: "#fff",
            color: "var(--grey-800)",
            minWidth: 200,
            cursor: (loading || scoped.length === 0) ? "not-allowed" : "pointer",
          }}
        >
          <option value="">
            {loading ? "Loading…" : scoped.length === 0 ? "No templates yet" : "Apply a template…"}
          </option>
          {scoped.filter((t) => t.builtIn).length > 0 && (
            <optgroup label="Built-in">
              {scoped.filter((t) => t.builtIn).map((t) => (
                <option key={t.id} value={t.id} title={t.description}>
                  {t.name} ({Object.keys(t.perms).length} modules)
                </option>
              ))}
            </optgroup>
          )}
          {scoped.filter((t) => !t.builtIn).length > 0 && (
            <optgroup label="Custom">
              {scoped.filter((t) => !t.builtIn).map((t) => (
                <option key={t.id} value={t.id} title={t.description}>
                  {t.name} ({Object.keys(t.perms).length} modules)
                </option>
              ))}
            </optgroup>
          )}
        </select>

        <button
          onClick={() => setShowSave((v) => !v)}
          className="text-[12px] font-semibold px-2.5 py-1"
          style={{
            background: showSave ? "#fef3c7" : "#faf5ff",
            color: showSave ? "#b45309" : "#7c3aed",
            border: `1px solid ${showSave ? "#fde68a" : "#e9d5ff"}`,
            borderRadius: 6,
            cursor: "pointer",
          }}
          title="Save current configuration as a reusable template"
        >
          {showSave ? "× Cancel" : "💾 Save as template"}
        </button>

        {scoped.filter((t) => !t.builtIn).length > 0 && (
          <details style={{ marginLeft: "auto", fontSize: 11 }}>
            <summary style={{ cursor: "pointer", color: "var(--grey-600)" }}>Manage custom…</summary>
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              {scoped.filter((t) => !t.builtIn).map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--grey-700)" }}>{t.name}</span>
                  <button
                    onClick={() => handleDelete(t)}
                    style={{
                      fontSize: 10, padding: "1px 6px",
                      background: "#fef2f2", color: "#dc2626",
                      border: "1px solid #fecaca", borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {showSave && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name (e.g. Senior Receptionist)"
            style={{
              fontSize: 13, padding: "6px 10px",
              border: "1px solid var(--grey-300)", borderRadius: 6,
            }}
            autoFocus
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            style={{
              fontSize: 12, padding: "6px 10px",
              border: "1px solid var(--grey-300)", borderRadius: 6,
            }}
          />
          <button
            onClick={handleSaveAs}
            disabled={saving}
            className="text-[12px] font-bold"
            style={{
              padding: "6px 12px",
              background: saving ? "var(--grey-300)" : "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: saving ? "wait" : "pointer",
              alignSelf: "flex-start",
            }}
          >
            {saving ? "Saving…" : "Save template"}
          </button>
        </div>
      )}
    </div>
  );
}
