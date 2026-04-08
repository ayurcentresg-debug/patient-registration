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

    // Verify event exists
    const event = await prisma.cmeEvent.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await request.json();

    if (!body.speakerId) {
      return NextResponse.json(
        { error: "speakerId is required" },
        { status: 400 }
      );
    }

    // Verify speaker exists
    const speaker = await prisma.cmeSpeaker.findUnique({
      where: { id: body.speakerId },
    });
    if (!speaker) {
      return NextResponse.json(
        { error: "Speaker not found" },
        { status: 404 }
      );
    }

    // Check if already linked
    const existing = await prisma.cmeEventSpeaker.findUnique({
      where: {
        eventId_speakerId: {
          eventId: id,
          speakerId: body.speakerId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Speaker already added to this event" },
        { status: 409 }
      );
    }

    const eventSpeaker = await prisma.cmeEventSpeaker.create({
      data: {
        eventId: id,
        speakerId: body.speakerId,
        role: body.role || "speaker",
        topic: body.topic || null,
        sortOrder: body.sortOrder || 0,
      },
      include: { speaker: true },
    });

    return NextResponse.json(eventSpeaker, { status: 201 });
  } catch (error) {
    console.error("POST /api/cme/events/[id]/speakers error:", error);
    return NextResponse.json(
      { error: "Failed to add speaker to event" },
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
    const body = await request.json();

    if (!body.speakerId) {
      return NextResponse.json(
        { error: "speakerId is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.cmeEventSpeaker.findUnique({
      where: {
        eventId_speakerId: {
          eventId: id,
          speakerId: body.speakerId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Speaker not linked to this event" },
        { status: 404 }
      );
    }

    await prisma.cmeEventSpeaker.delete({
      where: {
        eventId_speakerId: {
          eventId: id,
          speakerId: body.speakerId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Speaker removed from event",
    });
  } catch (error) {
    console.error("DELETE /api/cme/events/[id]/speakers error:", error);
    return NextResponse.json(
      { error: "Failed to remove speaker from event" },
      { status: 500 }
    );
  }
}
