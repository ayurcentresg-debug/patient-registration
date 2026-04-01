import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const patientId = request.nextUrl.searchParams.get("patientId");
    if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

    const notes = await db.clinicalNote.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(notes);
  } catch (error) {
    console.error("GET /api/clinical-notes error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    if (!body.patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });
    if (!body.type) return NextResponse.json({ error: "type required" }, { status: 400 });
    if (!body.title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
    if (!body.content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });

    const note = await db.clinicalNote.create({
      data: {
        patientId: body.patientId,
        type: body.type,
        title: body.title.trim(),
        content: body.content.trim(),
        doctor: body.doctor || null,
      },
    });
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("POST /api/clinical-notes error:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
