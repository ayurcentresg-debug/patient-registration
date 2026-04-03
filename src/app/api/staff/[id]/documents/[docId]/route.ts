import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";
import { unlink } from "fs/promises";
import path from "path";

// PUT /api/staff/[id]/documents/[docId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const { id, docId } = await params;

    const existing = await db.staffDocument.findFirst({
      where: { id: docId, userId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.expiryDate !== undefined) {
      updateData.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    }
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.isVerified !== undefined) updateData.isVerified = body.isVerified;

    const updated = await db.staffDocument.update({
      where: { id: docId },
      data: updateData,
    });

    await logAudit({
      action: "update",
      entity: "staffDocument",
      entityId: docId,
      details: { staffId: id, changes: Object.keys(updateData) },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update staff document:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/[id]/documents/[docId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const { id, docId } = await params;

    const existing = await db.staffDocument.findFirst({
      where: { id: docId, userId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete file from disk
    try {
      const filePath = path.join(process.cwd(), "public", existing.filePath);
      await unlink(filePath);
    } catch (e) {
      console.error("Failed to delete file from disk:", e);
      // Continue with DB deletion even if file removal fails
    }

    await db.staffDocument.delete({ where: { id: docId } });

    await logAudit({
      action: "delete",
      entity: "staffDocument",
      entityId: docId,
      details: { staffId: id, name: existing.name, fileName: existing.fileName },
    });

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Failed to delete staff document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
