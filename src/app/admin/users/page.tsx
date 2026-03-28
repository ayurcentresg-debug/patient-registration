"use client";

import { useState, useEffect, useCallback } from "react";
import AdminTabs from "@/components/AdminTabs";

// ─── Types ──────────────────────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  lastLogin: string | null;
  createdAt: string;
}

interface UserForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin: { bg: "#fce4ec", color: "#c62828" },
  doctor: { bg: "#e3f2fd", color: "#1565c0" },
  receptionist: { bg: "#fff3e0", color: "#e65100" },
  staff: { bg: "#f3e5f5", color: "#7b1fa2" },
};

const EMPTY_FORM: UserForm = {
  name: "",
  email: "",
  phone: "",
  role: "staff",
  active: true,
};

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
  fontSize: "13px",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function UserManagementPage() {
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/users?${params}`)
      .then(r => r.json())
      .then(data => {
        const arr = data.users || data;
        setUsers(Array.isArray(arr) ? arr : []);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeout);
  }, [fetchUsers]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      active: user.active,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) {
      setToast({ message: "Name and email are required", type: "error" });
      return;
    }
    setSaving(true);
    const url = editingId ? `/api/users/${editingId}` : "/api/users";
    const method = editingId ? "PUT" : "POST";
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to save user");
        return r.json();
      })
      .then(() => {
        setToast({ message: editingId ? "User updated successfully" : "User created successfully", type: "success" });
        setShowModal(false);
        fetchUsers();
      })
      .catch(() => setToast({ message: "Failed to save user. Please try again.", type: "error" }))
      .finally(() => setSaving(false));
  };

  const handleDeactivate = (user: User) => {
    const newStatus = !user.active;
    fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...user, active: newStatus }),
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then(() => {
        setToast({ message: `User ${newStatus ? "activated" : "deactivated"} successfully`, type: "success" });
        fetchUsers();
      })
      .catch(() => setToast({ message: "Failed to update user status", type: "error" }));
  };

  // Stats
  const totalUsers = users.length;
  const admins = users.filter(u => u.role === "admin").length;
  const doctors = users.filter(u => u.role === "doctor").length;
  const staffCount = users.filter(u => u.role === "staff" || u.role === "receptionist").length;

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-56 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[200] px-4 py-3 rounded shadow-lg yoda-slide-in" style={{ background: toast.type === "success" ? "#e8f5e9" : "#ffebee", color: toast.type === "success" ? "#2e7d32" : "var(--red)", border: `1px solid ${toast.type === "success" ? "#a5d6a7" : "#ef9a9a"}` }}>
          <p className="text-[13px] font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>User Management</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {totalUsers} user{totalUsers !== 1 ? "s" : ""} &middot; Manage clinic staff and access
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 text-white px-5 py-2 text-[13px] font-semibold rounded"
          style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          + Add User
        </button>
      </div>

      <AdminTabs />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Users", value: totalUsers, color: "var(--blue-500)", bg: "var(--blue-50)" },
          { label: "Admins", value: admins, color: "#c62828", bg: "#fce4ec" },
          { label: "Doctors", value: doctors, color: "#1565c0", bg: "#e3f2fd" },
          { label: "Staff", value: staffCount, color: "#7b1fa2", bg: "#f3e5f5" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-lg" style={{ ...cardStyle, borderLeft: `3px solid ${s.color}` }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--grey-600)" }}>{s.label}</p>
            <p className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-[13px]" style={inputStyle} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 text-[13px]" style={{ ...inputStyle, minWidth: 150 }}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="doctor">Doctor</option>
          <option value="receptionist">Receptionist</option>
          <option value="staff">Staff</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-[13px]" style={{ ...inputStyle, minWidth: 130 }}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* User List */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <p className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>No users found</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>Add a new user to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(user => {
            const rc = ROLE_COLORS[user.role] || ROLE_COLORS.staff;
            return (
              <div key={user.id} className="p-4 transition-shadow hover:shadow-md" style={cardStyle}>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>{user.name}</span>
                      <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded" style={{ background: rc.bg, color: rc.color, borderRadius: "var(--radius-sm)" }}>
                        {user.role}
                      </span>
                      <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded" style={{
                        background: user.active ? "#ecfdf5" : "#fef2f2",
                        color: user.active ? "#059669" : "#dc2626",
                        borderRadius: "var(--radius-sm)",
                      }}>
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[12px]" style={{ color: "var(--grey-600)" }}>
                      <span>{user.email}</span>
                      {user.phone && <><span>&middot;</span><span>{user.phone}</span></>}
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: "var(--grey-500)" }}>
                      Last login: {formatDate(user.lastLogin)}
                    </p>
                  </div>

                  {/* Right - Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(user)}
                      className="px-3 py-1.5 text-[12px] font-semibold rounded transition-colors"
                      style={{ background: "var(--white)", border: "1px solid var(--grey-300)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivate(user)}
                      className="px-3 py-1.5 text-[12px] font-semibold rounded transition-colors"
                      style={{
                        background: user.active ? "#fef2f2" : "#ecfdf5",
                        border: `1px solid ${user.active ? "#fecaca" : "#a7f3d0"}`,
                        color: user.active ? "#dc2626" : "#059669",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      {user.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit User Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-lg mx-4 p-6" style={{ ...cardStyle, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>
                {editingId ? "Edit User" : "Add New User"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:opacity-70">
                <svg className="w-5 h-5" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Full Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2" style={inputStyle} placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2" style={inputStyle} placeholder="john@clinic.com" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Phone</label>
                <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2" style={inputStyle} placeholder="+65 1234 5678" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Role</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2" style={inputStyle}>
                  <option value="admin">Admin</option>
                  <option value="doctor">Doctor</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[12px] font-semibold" style={{ color: "var(--grey-700)" }}>Active</label>
                <button
                  onClick={() => setForm(p => ({ ...p, active: !p.active }))}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: form.active ? "var(--blue-500)" : "var(--grey-300)" }}
                >
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ left: form.active ? 22 : 2 }} />
                </button>
                <span className="text-[12px]" style={{ color: "var(--grey-600)" }}>{form.active ? "Active" : "Inactive"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--grey-200)" }}>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-[13px] font-semibold rounded"
                style={{ background: "var(--white)", border: "1px solid var(--grey-300)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 text-[13px] font-semibold text-white rounded disabled:opacity-50"
                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
              >
                {saving ? "Saving..." : editingId ? "Update User" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
