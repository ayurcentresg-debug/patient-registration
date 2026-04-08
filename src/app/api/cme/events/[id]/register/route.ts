import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify event exists and is published
    const event = await prisma.cmeEvent.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } },
    });

    if (!event || event.status !== "published") {
      return NextResponse.json(
        { error: "Event not found or not open for registration" },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    // Check capacity
    if (
      event.maxAttendees &&
      event._count.registrations >= event.maxAttendees
    ) {
      return NextResponse.json(
        { error: "Event is at full capacity" },
        { status: 409 }
      );
    }

    // Check duplicate registration (unique email per event)
    const existingReg = await prisma.cmeRegistration.findUnique({
      where: {
        eventId_email: {
          eventId: id,
          email: body.email,
        },
      },
    });

    if (existingReg) {
      return NextResponse.json(
        {
          error: "Already registered for this event",
          registrationNo: existingReg.registrationNo,
        },
        { status: 409 }
      );
    }

    // Generate registrationNo: CME-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const count = await prisma.cmeRegistration.count({
      where: { eventId: id },
    });
    const seq = String(count + 1).padStart(4, "0");
    const registrationNo = `CME-${yearMonth}-${seq}`;

    // Determine fee
    let amountDue = event.registrationFee;
    if (
      event.earlyBirdFee &&
      event.earlyBirdDeadline &&
      now < event.earlyBirdDeadline
    ) {
      amountDue = event.earlyBirdFee;
    }

    const registration = await prisma.cmeRegistration.create({
      data: {
        eventId: id,
        registrationNo,
        userId: body.userId || null,
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        designation: body.designation || null,
        organization: body.organization || null,
        city: body.city || null,
        registrationSource: body.registrationSource || "web",
        amountPaid: amountDue === 0 ? 0 : (body.amountPaid || 0),
        paymentStatus:
          amountDue === 0 ? "waived" : (body.paymentStatus || "pending"),
        paymentMethod: body.paymentMethod || null,
        paymentReference: body.paymentReference || null,
        whatsappOptIn: body.whatsappOptIn || false,
      },
    });

    return NextResponse.json(registration, { status: 201 });
  } catch (error) {
    console.error("POST /api/cme/events/[id]/register error:", error);
    return NextResponse.json(
      { error: "Failed to register for event" },
      { status: 500 }
    );
  }
}
