import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/get-clinic-id";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await prisma.cmeEvent.findUnique({
      where: { id },
      include: {
        speakers: {
          include: { speaker: true },
          orderBy: { sortOrder: "asc" },
        },
        sessions: {
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { registrations: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // If event is not published, only admin can view
    if (event.status !== "published") {
      const auth = await getAuthPayload();
      if (!auth || auth.role !== "admin") {
        return NextResponse.json(
          { error: "Event not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("GET /api/cme/events/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthPayload();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership: must be creator or super-admin
    const existing = await prisma.cmeEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const isSuperAdmin = auth.role === "admin" && !auth.clinicId;
    const isOwner =
      existing.createdBy === auth.userId ||
      existing.clinicId === auth.clinicId;

    if (!isSuperAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const event = await prisma.cmeEvent.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.shortDescription !== undefined && {
          shortDescription: body.shortDescription,
        }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.startDate !== undefined && {
          startDate: new Date(body.startDate),
        }),
        ...(body.endDate !== undefined && {
          endDate: new Date(body.endDate),
        }),
        ...(body.timezone !== undefined && { timezone: body.timezone }),
        ...(body.mode !== undefined && { mode: body.mode }),
        ...(body.venue !== undefined && { venue: body.venue }),
        ...(body.venueAddress !== undefined && {
          venueAddress: body.venueAddress,
        }),
        ...(body.platformType !== undefined && {
          platformType: body.platformType,
        }),
        ...(body.platformUrl !== undefined && {
          platformUrl: body.platformUrl,
        }),
        ...(body.platformMeetingId !== undefined && {
          platformMeetingId: body.platformMeetingId,
        }),
        ...(body.embedUrl !== undefined && { embedUrl: body.embedUrl }),
        ...(body.recordingUrl !== undefined && {
          recordingUrl: body.recordingUrl,
        }),
        ...(body.cmeCredits !== undefined && {
          cmeCredits: body.cmeCredits,
        }),
        ...(body.cmeAccreditor !== undefined && {
          cmeAccreditor: body.cmeAccreditor,
        }),
        ...(body.cmeAccreditationId !== undefined && {
          cmeAccreditationId: body.cmeAccreditationId,
        }),
        ...(body.maxAttendees !== undefined && {
          maxAttendees: body.maxAttendees,
        }),
        ...(body.registrationFee !== undefined && {
          registrationFee: body.registrationFee,
        }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.earlyBirdFee !== undefined && {
          earlyBirdFee: body.earlyBirdFee,
        }),
        ...(body.earlyBirdDeadline !== undefined && {
          earlyBirdDeadline: body.earlyBirdDeadline
            ? new Date(body.earlyBirdDeadline)
            : null,
        }),
        ...(body.bannerImageUrl !== undefined && {
          bannerImageUrl: body.bannerImageUrl,
        }),
        ...(body.thumbnailUrl !== undefined && {
          thumbnailUrl: body.thumbnailUrl,
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
        ...(body.isFeatured !== undefined && {
          isFeatured: body.isFeatured,
        }),
        ...(body.tags !== undefined && {
          tags: JSON.stringify(body.tags),
        }),
      },
      include: {
        speakers: { include: { speaker: true } },
        sessions: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("PUT /api/cme/events/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthPayload();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.cmeEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const isSuperAdmin = auth.role === "admin" && !auth.clinicId;
    const isOwner =
      existing.createdBy === auth.userId ||
      existing.clinicId === auth.clinicId;

    if (!isSuperAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.cmeEvent.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Event deleted" });
  } catch (error) {
    console.error("DELETE /api/cme/events/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
