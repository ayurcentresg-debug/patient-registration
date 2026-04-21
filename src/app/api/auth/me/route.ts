import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Load clinic-level role overrides + country (best-effort)
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
    } catch { /* ignore */ }
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { permissionOverrides: true },
    });
    userPermissions = user?.permissionOverrides ?? null;
  } catch { /* ignore */ }

  return NextResponse.json({
    user: {
      id: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      clinicId: payload.clinicId || "",
      clinicCountry,
    },
    rolePermissions,
    userPermissions,
    clinicCountry,
  });
}
