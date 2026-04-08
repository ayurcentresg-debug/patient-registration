import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId } = body;

    if (!eventId || !body.name || !body.email) {
      return NextResponse.json(
        { error: "eventId, name, and email are required" },
        { status: 400 }
      );
    }

    const event = await prisma.cmeEvent.findUnique({
      where: { id: eventId },
      include: { _count: { select: { registrations: true } } },
    });

    if (!event || event.status !== "published" || !event.isPublic) {
      return NextResponse.json(
        { error: "Event not found or not open for registration" },
        { status: 404 }
      );
    }

    if (
      event.maxAttendees &&
      event._count.registrations >= event.maxAttendees
    ) {
      return NextResponse.json(
        { error: "Event is at full capacity" },
        { status: 409 }
      );
    }

    const existingReg = await prisma.cmeRegistration.findUnique({
      where: {
        eventId_email: {
          eventId,
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

    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const count = await prisma.cmeRegistration.count({
      where: { eventId },
    });
    const seq = String(count + 1).padStart(4, "0");
    const registrationNo = `CME-${yearMonth}-${seq}`;

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
        eventId,
        registrationNo,
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        designation: body.designation || null,
        organization: body.organization || null,
        city: body.city || null,
        registrationSource: "web",
        amountPaid: amountDue === 0 ? 0 : 0,
        paymentStatus: amountDue === 0 ? "waived" : "pending",
        whatsappOptIn: body.whatsappOptIn || false,
      },
    });

    return NextResponse.json(
      { registrationNo: registration.registrationNo, id: registration.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/public/cme/register error:", error);
    return NextResponse.json(
      { error: "Failed to register for event" },
      { status: 500 }
    );
  }
}
