import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/doctors — list doctors with optional ?status= and ?search= filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const role = searchParams.get("role"); // "doctor" | "therapist"

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (role) {
      where.role = role;
    }

    if (search) {
      where.name = { contains: search };
    }

    const doctors = await prisma.doctor.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(doctors);
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return NextResponse.json(
      { error: "Failed to fetch doctors" },
      { status: 500 }
    );
  }
}

// POST /api/doctors — create a new doctor with auto-generated doctorIdNumber
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, role, gender, specialization, department, phone, email, consultationFee, schedule, slotDuration, status } = body;

    if (!name || !specialization || !department) {
      return NextResponse.json(
        { error: "Name, specialization, and department are required" },
        { status: 400 }
      );
    }

    // Auto-generate doctorIdNumber: D10001, D10002, ...
    const lastDoctor = await prisma.doctor.findFirst({
      where: {
        doctorIdNumber: { not: "" },
      },
      orderBy: { doctorIdNumber: "desc" },
    });

    let nextNumber = 10001;
    if (lastDoctor && lastDoctor.doctorIdNumber) {
      const numericPart = parseInt(lastDoctor.doctorIdNumber.replace("D", ""), 10);
      if (!isNaN(numericPart)) {
        nextNumber = numericPart + 1;
      }
    }

    // Use prefix based on role: D for doctors, T for therapists
    const prefix = role === "therapist" ? "T" : "D";
    const doctorIdFinal = `${prefix}${nextNumber}`;

    const doctor = await prisma.doctor.create({
      data: {
        doctorIdNumber: doctorIdFinal,
        name,
        role: role || "doctor",
        gender: gender || null,
        specialization,
        department,
        phone: phone || null,
        email: email || null,
        consultationFee: consultationFee !== undefined ? Number(consultationFee) : 0,
        schedule: schedule || "{}",
        slotDuration: slotDuration !== undefined ? Number(slotDuration) : 15,
        status: status || "active",
      },
    });

    return NextResponse.json(doctor, { status: 201 });
  } catch (error) {
    console.error("Failed to create doctor:", error);
    return NextResponse.json(
      { error: "Failed to create doctor" },
      { status: 500 }
    );
  }
}
