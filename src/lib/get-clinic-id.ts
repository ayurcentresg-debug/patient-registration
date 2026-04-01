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
 * Useful when you need both clinicId and userId/role.
 */
export async function getAuthPayload() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;

    return await verifyToken(token);
  } catch {
    return null;
  }
}
