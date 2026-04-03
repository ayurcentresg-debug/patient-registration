import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// GET /api/staff/[id]/documents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const { id } = await params;

    const documents = await db.staffDocument.findMany({
      where: { userId: id },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Failed to fetch staff documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff documents" },
      { status: 500 }
    );
  }
}

// POST /api/staff/[id]/documents
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const { id } = await params;

    // Verify staff member exists
    const staff = await db.user.findUnique({ where: { id } });
    if (!staff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const category = formData.get("category") as string | null;
    const expiryDate = formData.get("expiryDate") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: "Document name is required" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX" },
        { status: 400 }
      );
    }

    // Create directory for user uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads", "staff-docs", id);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedName = `${timestamp}-${safeFileName}`;
    const filePath = path.join(uploadDir, storedName);
    const publicPath = `/uploads/staff-docs/${id}/${storedName}`;

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Create database record
    const document = await db.staffDocument.create({
      data: {
        userId: id,
        name: name.trim(),
        category,
        fileName: file.name,
        filePath: publicPath,
        fileSize: file.size,
        mimeType: file.type,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: notes?.trim() || null,
      },
    });

    await logAudit({
      action: "create",
      entity: "staffDocument",
      entityId: document.id,
      details: { staffId: id, name: name.trim(), category, fileName: file.name },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Failed to upload staff document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
