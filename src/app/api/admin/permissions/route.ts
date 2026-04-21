import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ADMIN_ROLES, getClinicId } from "@/lib/get-clinic-id";
import { MODULES, ROLES, ACCESS_LEVELS, parseOverrides, type RoleOverrides } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// GET — returns current clinic-level role overrides (or empty {})
export async function GET() {
  const payload = await requireRole(ADMIN_ROLES);
  if (!payload) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const clinicId = await getClinicId();
  if (!clinicId) {
    return NextResponse.json({ overrides: {} });
  }
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { rolePermissions: true },
  });
  return NextResponse.json({
    overrides: parseOverrides(clinic?.rolePermissions),
  });
}

// PUT — saves overrides. Body: { overrides: RoleOverrides }
export async function PUT(req: NextRequest) {
  const payload = await requireRole(ADMIN_ROLES);
  if (!payload) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const clinicId = await getClinicId();
  if (!clinicId) {
    return NextResponse.json({ error: "No clinic" }, { status: 400 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { overrides } = (body as { overrides?: RoleOverrides }) ?? {};
  if (!overrides || typeof overrides !== "object") {
    return NextResponse.json({ error: "overrides must be an object" }, { status: 400 });
  }

  // Validate structure: { role: { module: level } }
  const cleaned: RoleOverrides = {};
  for (const [role, mods] of Object.entries(overrides)) {
    if (!ROLES.includes(role as (typeof ROLES)[number])) continue;
    if (!mods || typeof mods !== "object") continue;
    const cleanedMods: Record<string, string> = {};
    for (const [mod, lvl] of Object.entries(mods)) {
      if (!MODULES.includes(mod as (typeof MODULES)[number])) continue;
      if (!ACCESS_LEVELS.includes(lvl as (typeof ACCESS_LEVELS)[number])) continue;
      cleanedMods[mod] = lvl as string;
    }
    if (Object.keys(cleanedMods).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (cleaned as any)[role] = cleanedMods;
    }
  }

  await prisma.clinic.update({
    where: { id: clinicId },
    data: { rolePermissions: JSON.stringify(cleaned) },
  });

  try {
    await logAudit({
      action: "update",
      entity: "clinic_permissions",
      entityId: clinicId,
      details: { rolesTouched: Object.keys(cleaned) },
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true, overrides: cleaned });
}
