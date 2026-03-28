import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.clinicalNote.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const note = await prisma.clinicalNote.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title.trim() }),
        ...(body.content && { content: body.content.trim() }),
        ...(body.type && { type: body.type }),
        ...(body.doctor !== undefined && { doctor: body.doctor || null }),
      },
    });
    return NextResponse.json(note);
  } catch (error) {
    console.error("PUT /api/clinical-notes/[id] error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.clinicalNote.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.clinicalNote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/clinical-notes/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
