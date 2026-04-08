import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/get-clinic-id";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthPayload();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const event = await prisma.cmeEvent.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify ownership
    const isSuperAdmin = auth.role === "admin" && !auth.clinicId;
    const isOwner =
      event.createdBy === auth.userId || event.clinicId === auth.clinicId;

    if (!isSuperAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Toggle between draft and published
    const newStatus = event.status === "published" ? "draft" : "published";

    const updated = await prisma.cmeEvent.update({
      where: { id },
      data: { status: newStatus },
    });

    return NextResponse.json({
      ...updated,
      message: `Event ${newStatus === "published" ? "published" : "unpublished"} successfully`,
    });
  } catch (error) {
    console.error("POST /api/cme/events/[id]/publish error:", error);
    return NextResponse.json(
      { error: "Failed to publish/unpublish event" },
      { status: 500 }
    );
  }
}
