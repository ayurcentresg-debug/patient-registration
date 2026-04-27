/**
 * AYUR GATE — Role-Based Access Control (RBAC)
 *
 * Central permissions map for all modules.
 * Each role has a defined access level per module:
 *   - "full"  → read + write + delete
 *   - "write" → read + write (no delete)
 *   - "view"  → read only
 *   - "own"   → read/write own data only (e.g. doctor sees own appointments)
 *   - "none"  → no access
 *
 * Usage:
 *   import { hasAccess, canAccess, getAccessLevel } from "@/lib/permissions";
 *   if (!hasAccess(role, "inventory", "view")) return 403;
 */

// ─── Module definitions ──────────────────────────────────────────────────────

export const MODULES = [
  "dashboard",
  "patients",
  "appointments",
  "prescriptions",
  "doctor_portal",
  "inventory",
  "billing",
  "packages",
  "reports",
  "communications",
  "whatsapp",
  "admin_settings",
  "staff_management",
  "payroll",
  "commission",
  "branches",
  "import",
  "feedback",
  "waitlist",
  "security",
  // "cme" removed — going to separate AyurCME repo (~/Desktop/ayurcme-plan.md)
] as const;

export type Module = (typeof MODULES)[number];

// ─── Access levels (ordered from highest to lowest) ──────────────────────────

export const ACCESS_LEVELS = ["full", "write", "view", "own", "none"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

// ─── Role type ───────────────────────────────────────────────────────────────

export const ROLES = [
  "owner",
  "admin",
  "receptionist",
  "doctor",
  "therapist",
  "pharmacist",
  "staff",
] as const;

export type Role = (typeof ROLES)[number];

// ─── Permissions map ─────────────────────────────────────────────────────────
// ROLE_PERMISSIONS[role][module] → access level

export const ROLE_PERMISSIONS: Record<Role, Record<Module, AccessLevel>> = {
  owner: {
    dashboard: "full",
    patients: "full",
    appointments: "full",
    prescriptions: "full",
    doctor_portal: "none",
    inventory: "full",
    billing: "full",
    packages: "full",
    reports: "full",
    communications: "full",
    whatsapp: "full",
    admin_settings: "full",
    staff_management: "full",
    payroll: "full",
    commission: "full",
    branches: "full",
    import: "full",
    feedback: "full",
    waitlist: "full",
    security: "full",
  },

  admin: {
    dashboard: "full",
    patients: "full",
    appointments: "full",
    prescriptions: "full",
    doctor_portal: "none",
    inventory: "full",
    billing: "full",
    packages: "full",
    reports: "full",
    communications: "full",
    whatsapp: "full",
    admin_settings: "full",
    staff_management: "full",
    payroll: "full",
    commission: "full",
    branches: "full",
    import: "full",
    feedback: "full",
    waitlist: "full",
    security: "full",
  },

  receptionist: {
    dashboard: "full",
    patients: "full",
    appointments: "full",
    prescriptions: "view",
    doctor_portal: "none",
    inventory: "view",
    billing: "full",
    packages: "full",
    reports: "view",
    communications: "full",
    whatsapp: "full",
    admin_settings: "none",
    staff_management: "view",
    payroll: "none",
    commission: "none",
    branches: "none",
    import: "full",
    feedback: "full",
    waitlist: "full",
    security: "none",
  },

  doctor: {
    dashboard: "own",
    patients: "view",
    appointments: "own",
    prescriptions: "full",
    doctor_portal: "full",
    inventory: "none",
    billing: "view",
    packages: "view",
    reports: "own",
    communications: "own",
    whatsapp: "own",
    admin_settings: "none",
    staff_management: "none",
    payroll: "none",
    commission: "own",
    branches: "none",
    import: "none",
    feedback: "none",
    waitlist: "none",
    security: "none",
  },

  therapist: {
    dashboard: "own",
    patients: "view",
    appointments: "own",
    prescriptions: "none",
    doctor_portal: "full",
    inventory: "none",
    billing: "view",
    packages: "view",
    reports: "own",
    communications: "own",
    whatsapp: "own",
    admin_settings: "none",
    staff_management: "none",
    payroll: "none",
    commission: "own",
    branches: "none",
    import: "none",
    feedback: "none",
    waitlist: "none",
    security: "none",
  },

  pharmacist: {
    dashboard: "full",
    patients: "view",
    appointments: "view",
    prescriptions: "full",
    doctor_portal: "none",
    inventory: "full",
    billing: "view",
    packages: "none",
    reports: "view",
    communications: "none",
    whatsapp: "none",
    admin_settings: "none",
    staff_management: "none",
    payroll: "none",
    commission: "none",
    branches: "none",
    import: "none",
    feedback: "none",
    waitlist: "none",
    security: "none",
  },

  staff: {
    dashboard: "full",
    patients: "full",
    appointments: "full",
    prescriptions: "view",
    doctor_portal: "none",
    inventory: "view",
    billing: "full",
    packages: "full",
    reports: "view",
    communications: "full",
    whatsapp: "full",
    admin_settings: "view",
    staff_management: "view",
    payroll: "none",
    commission: "none",
    branches: "none",
    import: "full",
    feedback: "full",
    waitlist: "full",
    security: "view",
  },
};

// ─── Access level hierarchy (for comparisons) ────────────────────────────────
const LEVEL_RANK: Record<AccessLevel, number> = {
  full: 4,
  write: 3,
  view: 2,
  own: 1,
  none: 0,
};

// ─── Per-clinic overrides ────────────────────────────────────────────────────
// Stored as JSON on Clinic.rolePermissions. Shape:
//   { [role]: { [module]: AccessLevel } }
// Missing entries fall back to ROLE_PERMISSIONS defaults.

export type RoleOverrides = Partial<Record<Role, Partial<Record<Module, AccessLevel>>>>;

/**
 * Parse a JSON string of overrides. Returns {} on any error.
 */
export function parseOverrides(raw: string | null | undefined): RoleOverrides {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as RoleOverrides;
  } catch {
    return {};
  }
}

/**
 * Get the effective access level for a role+module, applying overrides first.
 */
export function getEffectiveAccess(
  role: string,
  module: Module,
  overrides?: RoleOverrides
): AccessLevel {
  const override = overrides?.[role as Role]?.[module];
  if (override) return override;
  const permissions = ROLE_PERMISSIONS[role as Role];
  if (!permissions) return "none";
  return permissions[module] || "none";
}

// ─── Per-user overrides ──────────────────────────────────────────────────────
// Stored as JSON on User.permissionOverrides. Shape:
//   { [module]: AccessLevel }
// These take precedence over clinic role overrides and code defaults.

export type UserOverrides = Partial<Record<Module, AccessLevel>>;

export function parseUserOverrides(raw: string | null | undefined): UserOverrides {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as UserOverrides;
  } catch {
    return {};
  }
}

/**
 * Get the effective access level for a specific user+module, applying:
 *   1. User-specific overrides (highest priority)
 *   2. Clinic-level role overrides
 *   3. Code defaults (lowest)
 */
export function getUserEffectiveAccess(
  role: string,
  module: Module,
  clinicOverrides?: RoleOverrides,
  userOverrides?: UserOverrides
): AccessLevel {
  const userOv = userOverrides?.[module];
  if (userOv) return userOv;
  return getEffectiveAccess(role, module, clinicOverrides);
}

// ─── Helper functions ────────────────────────────────────────────────────────

/**
 * Get the access level a role has for a module (code defaults only).
 * For override-aware checks, use getEffectiveAccess.
 */
export function getAccessLevel(role: string, module: Module): AccessLevel {
  const permissions = ROLE_PERMISSIONS[role as Role];
  if (!permissions) return "none";
  return permissions[module] || "none";
}

/**
 * Check if a role has at least the required access level for a module.
 * e.g. hasAccess("pharmacist", "inventory", "view") → true (pharmacist has "full")
 * e.g. hasAccess("pharmacist", "billing", "write") → false (pharmacist has "view")
 */
export function hasAccess(
  role: string,
  module: Module,
  requiredLevel: AccessLevel = "view"
): boolean {
  const actual = getAccessLevel(role, module);
  // "own" is a special case — it grants at least "view" level access
  // but write operations should check for "own" explicitly
  if (actual === "own" && requiredLevel === "view") return true;
  if (actual === "own" && requiredLevel === "own") return true;
  return LEVEL_RANK[actual] >= LEVEL_RANK[requiredLevel];
}

/**
 * Check if a role can access a module at all (any level above "none").
 */
export function canAccess(role: string, module: Module): boolean {
  return getAccessLevel(role, module) !== "none";
}

/**
 * Check if a role can write to a module ("write" or "full" or "own").
 */
export function canWrite(role: string, module: Module): boolean {
  const level = getAccessLevel(role, module);
  return level === "full" || level === "write" || level === "own";
}

/**
 * Check if a role has full CRUD access to a module.
 */
export function canDelete(role: string, module: Module): boolean {
  return getAccessLevel(role, module) === "full";
}

// ─── Route → Module mapping (for middleware) ─────────────────────────────────
// Maps URL path prefixes to modules for automatic permission checking.

export const ROUTE_MODULE_MAP: [string, Module][] = [
  // UI routes
  ["/admin/staff", "staff_management"],
  ["/admin/permissions", "staff_management"],
  ["/admin/payroll", "payroll"],
  ["/admin/commission", "commission"],
  ["/admin/branches", "branches"],
  ["/admin/settings", "admin_settings"],
  ["/admin/import", "import"],
  ["/admin/ket", "payroll"],
  ["/admin", "admin_settings"],
  ["/doctor", "doctor_portal"],
  ["/patients", "patients"],
  ["/appointments", "appointments"],
  ["/prescriptions", "prescriptions"],
  ["/inventory", "inventory"],
  ["/billing", "billing"],
  ["/packages", "packages"],
  ["/reports", "reports"],
  ["/communications/whatsapp", "whatsapp"],
  ["/communications", "communications"],
  ["/feedback", "feedback"],
  ["/security", "security"],

  // API routes
  ["/api/admin/payroll", "payroll"],
  ["/api/admin/commission", "commission"],
  ["/api/admin/ket", "payroll"],
  ["/api/staff", "staff_management"],
  ["/api/inventory", "inventory"],
  ["/api/billing", "billing"],
  ["/api/invoices", "billing"],
  ["/api/credit-notes", "billing"],
  ["/api/reports", "reports"],
  ["/api/communications", "communications"],
  ["/api/whatsapp", "whatsapp"],
  ["/api/prescriptions", "prescriptions"],
  ["/api/patients", "patients"],
  ["/api/appointments", "appointments"],
  ["/api/purchase-orders", "inventory"],
  ["/api/suppliers", "inventory"],
  ["/api/transfers", "inventory"],
  ["/api/branches", "branches"],
  ["/api/packages", "packages"],
  ["/api/patient-packages", "packages"],
  ["/api/feedback", "feedback"],
  ["/api/waitlist", "waitlist"],
  ["/api/doctor", "doctor_portal"],
  ["/api/medicines", "prescriptions"],
];

/**
 * Resolve a URL pathname to its module. Returns null if no mapping found
 * (meaning the route is accessible to all authenticated users).
 *
 * Matches by path SEGMENT — prefix "/api/doctor" matches "/api/doctor" or
 * "/api/doctor/xyz" but NOT "/api/doctors/xyz". This prevents singular/plural
 * collisions like /api/doctor (portal) vs /api/doctors (staff listing).
 */
export function resolveModule(pathname: string): Module | null {
  for (const [prefix, module] of ROUTE_MODULE_MAP) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return module;
  }
  return null;
}

// ─── Legacy compatibility ────────────────────────────────────────────────────
// These are still used by API routes that haven't been migrated yet.
// They now derive from the permissions map.

/** Roles that can manage admin features (settings, staff, payroll, branches) */
export const ADMIN_ROLES: string[] = ROLES.filter(
  (r) => canAccess(r, "staff_management")
);

/** Roles that can manage inventory items (view or higher) */
export const STAFF_ROLES: string[] = ROLES.filter(
  (r) => canAccess(r, "inventory")
);

/** Roles that can write/edit prescriptions */
export const PRESCRIBER_ROLES: string[] = ROLES.filter(
  (r) => canWrite(r, "prescriptions")
);

// ─── Built-in permission templates ───────────────────────────────────────────
// Read-only presets shipped with the product. Each clinic sees these plus any
// custom templates they create. Built-ins cannot be edited or deleted.

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  scope: "role" | "user";
  perms: Partial<Record<Module, AccessLevel>>;
  builtIn?: boolean;
}

export const BUILTIN_TEMPLATES: PermissionTemplate[] = [
  {
    id: "builtin:senior-receptionist",
    name: "Senior Receptionist",
    description: "Full billing + reports + staff view. For experienced front-desk leads.",
    scope: "user",
    perms: {
      billing: "full",
      reports: "view",
      staff_management: "view",
      commission: "view",
    },
    builtIn: true,
  },
  {
    id: "builtin:junior-doctor",
    name: "Junior Doctor",
    description: "Clinical access only — no inventory, no billing write.",
    scope: "user",
    perms: {
      inventory: "none",
      billing: "view",
      packages: "view",
    },
    builtIn: true,
  },
  {
    id: "builtin:locum-doctor",
    name: "Locum Doctor",
    description: "Temporary doctor — view-only on most things, own-scope on own work.",
    scope: "user",
    perms: {
      patients: "view",
      reports: "own",
      commission: "own",
      prescriptions: "write",
    },
    builtIn: true,
  },
  {
    id: "builtin:billing-specialist",
    name: "Billing Specialist",
    description: "Full billing, packages, reports. No clinical write access.",
    scope: "user",
    perms: {
      billing: "full",
      packages: "full",
      reports: "full",
      prescriptions: "view",
      inventory: "view",
    },
    builtIn: true,
  },
  {
    id: "builtin:inventory-manager",
    name: "Inventory Manager",
    description: "Full inventory + reports. For stock-focused staff.",
    scope: "user",
    perms: {
      inventory: "full",
      reports: "view",
      billing: "view",
    },
    builtIn: true,
  },
  {
    id: "builtin:lockdown-role",
    name: "Lockdown (view-only role)",
    description: "Applied to a role: downgrades write/full to view across the board. Good for audits.",
    scope: "role",
    perms: {
      patients: "view",
      appointments: "view",
      prescriptions: "view",
      inventory: "view",
      billing: "view",
      packages: "view",
      reports: "view",
      communications: "view",
    },
    builtIn: true,
  },
];

// ─── Sidebar visibility helper ───────────────────────────────────────────────

/**
 * Given a user role, returns which nav item hrefs should be visible.
 * Used by Sidebar component to show/hide menu items.
 * Accepts optional clinic-specific overrides.
 */
export function getVisibleNavItems(
  role: string,
  overrides?: RoleOverrides,
  userOverrides?: UserOverrides
): Record<string, boolean> {
  const a = (m: Module) => getUserEffectiveAccess(role, m, overrides, userOverrides) !== "none";
  const w = (m: Module) => {
    const lv = getUserEffectiveAccess(role, m, overrides, userOverrides);
    return lv === "full" || lv === "write" || lv === "own";
  };
  return {
    "/": a("dashboard") && !a("doctor_portal"),
    "/onboarding/dashboard": a("dashboard") && !a("doctor_portal"),
    "/doctor": a("doctor_portal"),
    "/patients": a("patients"),
    "/patients/new": w("patients"),
    "/appointments": a("appointments"),
    "/packages": a("packages"),
    "/prescriptions": a("prescriptions"),
    "/inventory": a("inventory"),
    "/billing": a("billing"),
    "/reports": a("reports"),
    "/communications": a("communications"),
    "/feedback": a("feedback"),
    "/admin/import": a("import"),
    "/admin": a("admin_settings"),
    "/security": a("security"),
  };
}
