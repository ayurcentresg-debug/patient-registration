import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get("slug");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const upcoming = searchParams.get("upcoming") !== "false";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Single event lookup by slug
    if (slug) {
      const event = await prisma.cmeEvent.findFirst({
        where: { slug, status: "published", isPublic: true },
        include: {
          speakers: {
            include: { speaker: true },
            orderBy: { sortOrder: "asc" },
          },
          sessions: { orderBy: { sortOrder: "asc" } },
          _count: { select: { registrations: true } },
        },
      });

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      return NextResponse.json({
        event: {
          ...event,
          spotsLeft: event.maxAttendees
            ? Math.max(0, event.maxAttendees - event._count.registrations)
            : null,
          isFull: event.maxAttendees
            ? event._count.registrations >= event.maxAttendees
            : false,
        },
      });
    }

    const where: Record<string, unknown> = {
      status: "published",
      isPublic: true,
    };

    if (upcoming) {
      where.endDate = { gte: new Date() };
    }

    if (category) where.category = category;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.cmeEvent.findMany({
        where,
        orderBy: { startDate: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          subtitle: true,
          shortDescription: true,
          category: true,
          startDate: true,
          endDate: true,
          timezone: true,
          mode: true,
          venue: true,
          cmeCredits: true,
          registrationFee: true,
          currency: true,
          earlyBirdFee: true,
          earlyBirdDeadline: true,
          bannerImageUrl: true,
          thumbnailUrl: true,
          isFeatured: true,
          maxAttendees: true,
          tags: true,
          speakers: {
            select: {
              role: true,
              topic: true,
              speaker: {
                select: {
                  id: true,
                  name: true,
                  designation: true,
                  organization: true,
                  photoUrl: true,
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
          _count: { select: { registrations: true } },
        },
      }),
      prisma.cmeEvent.count({ where }),
    ]);

    // Add capacity info without exposing raw registration count
    const enriched = events.map((event) => ({
      ...event,
      spotsLeft: event.maxAttendees
        ? Math.max(0, event.maxAttendees - event._count.registrations)
        : null,
      isFull: event.maxAttendees
        ? event._count.registrations >= event.maxAttendees
        : false,
    }));

    return NextResponse.json({
      events: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/public/cme/events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
