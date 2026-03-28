import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get("patientId");
    if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

    const docs = await prisma.document.findMany({
      where: { patientId },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(docs);
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const patientId = formData.get("patientId") as string | null;
    const category = (formData.get("category") as string) || "report";
    const description = formData.get("description") as string | null;

    if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });
    if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", patientId);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `${Date.now()}_${safeName}`;
    const filePath = path.join(uploadDir, uniqueName);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const doc = await prisma.document.create({
      data: {
        patientId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        filePath: `/uploads/${patientId}/${uniqueName}`,
        category,
        description: description || null,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json({ error: "Failed to upload" }, { status: 500 });
  }
}
