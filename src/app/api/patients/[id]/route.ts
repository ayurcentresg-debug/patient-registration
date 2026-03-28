import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: { orderBy: { date: "desc" } },
        communications: { orderBy: { sentAt: "desc" } },
        clinicalNotes: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { uploadedAt: "desc" } },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error("GET /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch patient" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields if they are being updated
    if ("firstName" in body && (!body.firstName || !body.firstName.trim())) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 });
    }
    if ("lastName" in body && (!body.lastName || !body.lastName.trim())) {
      return NextResponse.json({ error: "Last name is required" }, { status: 400 });
    }
    if ("phone" in body && (!body.phone || !body.phone.trim())) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    if ("email" in body && body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if ("gender" in body && !["male", "female", "other"].includes(body.gender)) {
      return NextResponse.json({ error: "Gender must be male, female, or other" }, { status: 400 });
    }
    if ("status" in body && !["active", "inactive"].includes(body.status)) {
      return NextResponse.json({ error: "Status must be active or inactive" }, { status: 400 });
    }

    // Check patient exists
    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Don't allow updating patientIdNumber or id
    const { patientIdNumber, id: _bodyId, ...updateData } = body;

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...updateData,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      },
    });

    return NextResponse.json(patient);
  } catch (error) {
    console.error("PUT /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Delete related records first, then patient
    await prisma.communication.deleteMany({ where: { patientId: id } });
    await prisma.appointment.deleteMany({ where: { patientId: id } });
    await prisma.clinicalNote.deleteMany({ where: { patientId: id } });
    await prisma.document.deleteMany({ where: { patientId: id } });
    await prisma.patient.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete patient" }, { status: 500 });
  }
}
