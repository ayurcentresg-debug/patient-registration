/**
 * Extract clinicId from the JWT auth token cookie.
 *
 * Usage in API routes:
 *   const clinicId = await getClinicId();
 *   if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   const db = getTenantPrisma(clinicId);
 */

import { cookies } from "next/headers";
import { verifyToken } from "./auth";

/**
 * Extracts clinicId from the current request's auth cookie.
 * Returns null if no valid token or no clinicId in token.
 */
export async function getClinicId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    return payload.clinicId || null;
  } catch {
    return null;
  }
}

/**
 * Extracts the full JWT payload from the current request's auth cookie.
 * Also checks super_admin_token for super admin access.
 * Useful when you need both clinicId and userId/role.
 */
export async function getAuthPayload() {
  try {
    const cookieStore = await cookies();

    // Check regular auth token first
    const token = cookieStore.get("auth_token")?.value;
    if (token) {
      return await verifyToken(token);
    }

    // Fall back to super admin token
    const saToken = cookieStore.get("super_admin_token")?.value;
    if (saToken) {
      const payload = await verifyToken(saToken);
      if (payload && payload.role === "super_admin") {
        return { ...payload, role: "admin" as const };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Role arrays — now derived from the central permissions map.
 * Import directly from @/lib/permissions for new code.
 * These re-exports maintain backward compatibility with existing API routes.
 */
export {
  ADMIN_ROLES,
  STAFF_ROLES,
  PRESCRIBER_ROLES,
} from "@/lib/permissions";

/**
 * Branch scope helper for multi-branch RBAC (#I).
 * Returns the branchId the current user is RESTRICTED to (null = unrestricted).
 *
 * - If User.branchRestricted = true AND has branchId → returns that branchId
 * - Otherwise null (unrestricted: sees all branches)
 *
 * Use in API routes to scope queries:
 *   const restrictBranch = await getRestrictedBranchId();
 *   if (restrictBranch) where.branchId = restrictBranch;
 */
import { prisma } from "./db";
export async function getRestrictedBranchId(): Promise<string | null> {
  const payload = await getAuthPayload();
  if (!payload) return null;
  // Super-admin and clinic owner are never branch-restricted
  if (payload.role === "super_admin" || payload.role === "owner" || payload.role === "admin") return null;

  const userId = (payload as { userId?: string; sub?: string }).userId || (payload as { sub?: string }).sub;
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { branchId: true, branchRestricted: true },
  });
  if (!user || !user.branchRestricted || !user.branchId) return null;
  return user.branchId;
}

/**
 * Assert that a branch-restricted user owns this entity's branch.
 * Returns null if access is allowed; returns a 403 NextResponse if not.
 *
 * Use in detail routes and mutations:
 *   const denied = await assertBranchAccess(record.branchId);
 *   if (denied) return denied;
 *
 * Treats null entity.branchId as 'unassigned/legacy' — accessible to
 * branch-restricted users only if they have no restriction.
 */
import { NextResponse } from "next/server";
export async function assertBranchAccess(entityBranchId: string | null | undefined) {
  const restrict = await getRestrictedBranchId();
  if (!restrict) return null; // user not restricted
  if (entityBranchId && entityBranchId === restrict) return null; // same branch
  return NextResponse.json(
    { error: "Access denied: this record belongs to a different branch" },
    { status: 403 }
  );
}

/**
 * Checks if the authenticated user has one of the allowed roles.
 * Returns the payload if authorized, null otherwise.
 */
export async function requireRole(allowedRoles: string[]) {
  const payload = await getAuthPayload();
  if (!payload) return null;
  if (!allowedRoles.includes(payload.role)) return null;
  return payload;
}
