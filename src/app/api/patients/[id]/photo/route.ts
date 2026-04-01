import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const patient = await db.patient.findUnique({ where: { id } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Photo file is required" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "photos");
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name) || ".jpg";
    const uniqueName = `${id}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const photoUrl = `/uploads/photos/${uniqueName}`;

    // Delete old photo if exists
    if (patient.photoUrl) {
      try {
        const oldPath = path.join(process.cwd(), "public", patient.photoUrl);
        await unlink(oldPath);
      } catch {
        // Old file may not exist, ignore
      }
    }

    // Update patient record
    const updated = await db.patient.update({
      where: { id },
      data: { photoUrl },
    });

    return NextResponse.json({ photoUrl: updated.photoUrl }, { status: 200 });
  } catch (error) {
    console.error("POST /api/patients/[id]/photo error:", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const patient = await db.patient.findUnique({ where: { id } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Delete photo file
    if (patient.photoUrl) {
      try {
        const filePath = path.join(process.cwd(), "public", patient.photoUrl);
        await unlink(filePath);
      } catch {
        // File may not exist
      }
    }

    await db.patient.update({
      where: { id },
      data: { photoUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/patients/[id]/photo error:", error);
    return NextResponse.json({ error: "Failed to remove photo" }, { status: 500 });
  }
}
