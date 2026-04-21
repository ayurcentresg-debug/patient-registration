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

  // Load clinic-level role overrides (best-effort; don't fail auth if missing)
  let rolePermissions: string | null = null;
  if (payload.clinicId) {
    try {
      const clinic = await prisma.clinic.findUnique({
        where: { id: payload.clinicId },
        select: { rolePermissions: true },
      });
      rolePermissions = clinic?.rolePermissions ?? null;
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    user: {
      id: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      clinicId: payload.clinicId || "",
    },
    rolePermissions,
  });
}
