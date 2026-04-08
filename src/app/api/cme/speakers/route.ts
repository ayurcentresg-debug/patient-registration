import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/get-clinic-id";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const activeOnly = searchParams.get("active") !== "false";

    const where: Record<string, unknown> = {};

    if (activeOnly) where.isActive = true;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { organization: { contains: search } },
        { designation: { contains: search } },
      ];
    }

    const speakers = await prisma.cmeSpeaker.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        events: {
          include: {
            event: {
              select: { id: true, title: true, startDate: true, status: true },
            },
          },
        },
      },
    });

    return NextResponse.json(speakers);
  } catch (error) {
    console.error("GET /api/cme/speakers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch speakers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthPayload();
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const speaker = await prisma.cmeSpeaker.create({
      data: {
        userId: body.userId || null,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        title: body.title || null,
        designation: body.designation || null,
        organization: body.organization || null,
        bio: body.bio || null,
        photoUrl: body.photoUrl || null,
        specializations: body.specializations
          ? JSON.stringify(body.specializations)
          : "[]",
        linkedinUrl: body.linkedinUrl || null,
        websiteUrl: body.websiteUrl || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    return NextResponse.json(speaker, { status: 201 });
  } catch (error) {
    console.error("POST /api/cme/speakers error:", error);
    return NextResponse.json(
      { error: "Failed to create speaker" },
      { status: 500 }
    );
  }
}
