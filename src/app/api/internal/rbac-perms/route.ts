import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Internal endpoint used by middleware to load RBAC overrides for the current
 * JWT holder. Returns the raw JSON strings — middleware parses them.
 *
 * Security: requires a valid auth_token cookie. Returns 401 otherwise.
 * Middleware calls this with the user's cookies forwarded.
 *
 * Exposes: { role, rolePermissions, userPermissions } — all derived from the
 * caller's own JWT + their own user/clinic row. Cannot be used to snoop on
 * other users' permissions.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "No token" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let rolePermissions: string | null = null;
  let userPermissions: string | null = null;
  let clinicCountry: string | null = null;

  if (payload.clinicId) {
    try {
      const clinic = await prisma.clinic.findUnique({
        where: { id: payload.clinicId },
        select: { rolePermissions: true, country: true },
      });
      rolePermissions = clinic?.rolePermissions ?? null;
      clinicCountry = clinic?.country ?? null;
    } catch { /* ignore — fall back to defaults */ }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { permissionOverrides: true },
    });
    userPermissions = user?.permissionOverrides ?? null;
  } catch { /* ignore */ }

  return NextResponse.json({
    userId: payload.userId,
    role: payload.role,
    rolePermissions,
    userPermissions,
    clinicCountry,
  });
}
