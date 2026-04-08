import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/get-clinic-id";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const speaker = await prisma.cmeSpeaker.findUnique({
      where: { id },
      include: {
        events: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                slug: true,
                startDate: true,
                endDate: true,
                status: true,
                category: true,
                thumbnailUrl: true,
              },
            },
          },
          orderBy: { event: { startDate: "desc" } },
        },
      },
    });

    if (!speaker) {
      return NextResponse.json(
        { error: "Speaker not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(speaker);
  } catch (error) {
    console.error("GET /api/cme/speakers/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch speaker" },
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

    const existing = await prisma.cmeSpeaker.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Speaker not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const speaker = await prisma.cmeSpeaker.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.designation !== undefined && {
          designation: body.designation,
        }),
        ...(body.organization !== undefined && {
          organization: body.organization,
        }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl }),
        ...(body.specializations !== undefined && {
          specializations: JSON.stringify(body.specializations),
        }),
        ...(body.linkedinUrl !== undefined && {
          linkedinUrl: body.linkedinUrl,
        }),
        ...(body.websiteUrl !== undefined && {
          websiteUrl: body.websiteUrl,
        }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(speaker);
  } catch (error) {
    console.error("PUT /api/cme/speakers/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update speaker" },
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

    const existing = await prisma.cmeSpeaker.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Speaker not found" },
        { status: 404 }
      );
    }

    await prisma.cmeSpeaker.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Speaker deleted" });
  } catch (error) {
    console.error("DELETE /api/cme/speakers/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete speaker" },
      { status: 500 }
    );
  }
}
