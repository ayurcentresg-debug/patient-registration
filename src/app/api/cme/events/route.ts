import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/get-clinic-id";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthPayload();
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Public users only see published events
    if (!auth || auth.role !== "admin") {
      where.status = "published";
      where.isPublic = true;
    } else {
      // Admin sees all events for their clinic, including drafts
      if (auth.clinicId) {
        where.clinicId = auth.clinicId;
      }
      if (status) {
        where.status = status;
      }
    }

    if (category) where.category = category;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.cmeEvent.findMany({
        where,
        orderBy: { startDate: "desc" },
        skip,
        take: limit,
        include: {
          speakers: {
            include: { speaker: true },
            orderBy: { sortOrder: "asc" },
          },
          _count: { select: { registrations: true } },
        },
      }),
      prisma.cmeEvent.count({ where }),
    ]);

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/cme/events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
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

    if (!body.title || !body.description || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "title, description, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    // Generate unique slug from title
    let slug = slugify(body.title);
    const existing = await prisma.cmeEvent.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const event = await prisma.cmeEvent.create({
      data: {
        clinicId: auth.clinicId || null,
        createdBy: auth.userId,
        slug,
        title: body.title,
        subtitle: body.subtitle || null,
        description: body.description,
        shortDescription: body.shortDescription || null,
        category: body.category || "cme",
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        timezone: body.timezone || "Asia/Singapore",
        mode: body.mode || "online",
        venue: body.venue || null,
        venueAddress: body.venueAddress || null,
        platformType: body.platformType || null,
        platformUrl: body.platformUrl || null,
        platformMeetingId: body.platformMeetingId || null,
        embedUrl: body.embedUrl || null,
        cmeCredits: body.cmeCredits || 0,
        cmeAccreditor: body.cmeAccreditor || null,
        cmeAccreditationId: body.cmeAccreditationId || null,
        maxAttendees: body.maxAttendees || null,
        registrationFee: body.registrationFee || 0,
        currency: body.currency || "INR",
        earlyBirdFee: body.earlyBirdFee || null,
        earlyBirdDeadline: body.earlyBirdDeadline
          ? new Date(body.earlyBirdDeadline)
          : null,
        bannerImageUrl: body.bannerImageUrl || null,
        thumbnailUrl: body.thumbnailUrl || null,
        status: body.status || "draft",
        isPublic: body.isPublic !== undefined ? body.isPublic : true,
        isFeatured: body.isFeatured || false,
        tags: body.tags ? JSON.stringify(body.tags) : "[]",
      },
      include: {
        speakers: { include: { speaker: true } },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("POST /api/cme/events error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
