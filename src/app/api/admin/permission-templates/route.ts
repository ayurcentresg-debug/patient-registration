import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, ADMIN_ROLES, getClinicId } from "@/lib/get-clinic-id";
import {
  MODULES,
  ACCESS_LEVELS,
  BUILTIN_TEMPLATES,
  type AccessLevel,
  type Module,
} from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// GET — list all templates (custom + built-in) for the current clinic
export async function GET() {
  const payload = await requireRole(ADMIN_ROLES);
  if (!payload) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const clinicId = await getClinicId();
  const custom = clinicId
    ? await prisma.permissionTemplate.findMany({
        where: { clinicId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const customShaped = custom.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? "",
    scope: t.scope as "role" | "user",
    perms: safeParse(t.perms),
    builtIn: false,
  }));

  return NextResponse.json({ templates: [...customShaped, ...BUILTIN_TEMPLATES] });
}

// POST — create a new custom template. Body: { name, description?, scope, perms }
export async function POST(req: NextRequest) {
  const payload = await requireRole(ADMIN_ROLES);
  if (!payload) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const b = body as { name?: string; description?: string; scope?: string; perms?: Record<string, string> };

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const scope = b.scope === "role" ? "role" : "user";
  if (!b.perms || typeof b.perms !== "object") {
    return NextResponse.json({ error: "perms must be an object" }, { status: 400 });
  }

  const cleaned: Partial<Record<Module, AccessLevel>> = {};
  for (const [mod, lvl] of Object.entries(b.perms)) {
    if (!MODULES.includes(mod as Module)) continue;
    if (!ACCESS_LEVELS.includes(lvl as AccessLevel)) continue;
    cleaned[mod as Module] = lvl as AccessLevel;
  }
  if (Object.keys(cleaned).length === 0) {
    return NextResponse.json({ error: "perms is empty — nothing to save" }, { status: 400 });
  }

  const created = await prisma.permissionTemplate.create({
    data: {
      clinicId,
      name,
      description: b.description?.toString().trim() || null,
      scope,
      perms: JSON.stringify(cleaned),
      createdBy: payload.userId,
    },
  });

  try {
    await logAudit({
      action: "create",
      entity: "permission_template",
      entityId: created.id,
      details: { name, scope, moduleCount: Object.keys(cleaned).length },
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({
    template: {
      id: created.id,
      name: created.name,
      description: created.description ?? "",
      scope: created.scope,
      perms: cleaned,
      builtIn: false,
    },
  });
}

// DELETE — /api/admin/permission-templates?id=X
export async function DELETE(req: NextRequest) {
  const payload = await requireRole(ADMIN_ROLES);
  if (!payload) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (id.startsWith("builtin:")) {
    return NextResponse.json({ error: "Built-in templates cannot be deleted" }, { status: 400 });
  }

  const existing = await prisma.permissionTemplate.findUnique({ where: { id } });
  if (!existing || existing.clinicId !== clinicId) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.permissionTemplate.delete({ where: { id } });

  try {
    await logAudit({
      action: "delete",
      entity: "permission_template",
      entityId: id,
      details: { name: existing.name, scope: existing.scope },
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true });
}

function safeParse(raw: string): Partial<Record<Module, AccessLevel>> {
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object") return p;
  } catch { /* ignore */ }
  return {};
}
