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
    const body = await request.json();

    if (!body.registrationId) {
      return NextResponse.json(
        { error: "registrationId is required" },
        { status: 400 }
      );
    }

    // Verify registration belongs to this event
    const registration = await prisma.cmeRegistration.findUnique({
      where: { id: body.registrationId },
    });

    if (!registration || registration.eventId !== id) {
      return NextResponse.json(
        { error: "Registration not found for this event" },
        { status: 404 }
      );
    }

    const checkedIn = body.checkedIn !== undefined ? body.checkedIn : true;

    const updated = await prisma.cmeRegistration.update({
      where: { id: body.registrationId },
      data: {
        checkedIn,
        checkedInAt: checkedIn ? new Date() : null,
        status: checkedIn ? "attended" : "confirmed",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST /api/cme/events/[id]/check-in error:", error);
    return NextResponse.json(
      { error: "Failed to check in" },
      { status: 500 }
    );
  }
}
