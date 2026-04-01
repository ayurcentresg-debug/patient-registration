import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const doc = await db.document.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete file from disk
    try {
      const fullPath = path.join(process.cwd(), "public", doc.filePath);
      await unlink(fullPath);
    } catch (e) {
      console.warn("File already removed:", e);
    }

    await db.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/documents/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
