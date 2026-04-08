import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/get-clinic-id";

export async function GET(
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { eventId: id };

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { registrationNo: { contains: search } },
        { organization: { contains: search } },
      ];
    }

    const [registrations, total] = await Promise.all([
      prisma.cmeRegistration.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { certificate: true },
      }),
      prisma.cmeRegistration.count({ where }),
    ]);

    return NextResponse.json({
      registrations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/cme/events/[id]/registrations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}
