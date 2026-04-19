import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/doctors — backward-compat wrapper, queries User model
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const role = searchParams.get("role"); // "doctor" | "therapist"

    const where: Record<string, unknown> = {
      role: role ? role : { in: ["doctor", "therapist"] },
    };

    if (status) where.status = status;
    if (search) where.name = { contains: search };

    const staff = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Map to legacy Doctor shape for backward compat
    return NextResponse.json(
      staff.map((s) => ({
        id: s.id,
        doctorIdNumber: s.staffIdNumber || "",
        name: s.name,
        role: s.role,
        gender: s.gender,
        specialization: s.specialization || "",
        department: s.department || "",
        phone: s.phone,
        email: s.email,
        consultationFee: s.consultationFee ?? 0,
        schedule: s.schedule,
        slotDuration: s.slotDuration,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
    );
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    return NextResponse.json({ error: "Failed to fetch doctors" }, { status: 500 });
  }
}

// POST /api/doctors — backward-compat, creates via User model
export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { name, role, gender, specialization, department, phone, email, consultationFee, schedule, slotDuration, status } = body;

    if (!name || !specialization || !department) {
      return NextResponse.json({ error: "Name, specialization, and department are required" }, { status: 400 });
    }

    // Auto-generate staffIdNumber
    const prefix = role === "therapist" ? "T" : "D";
    const lastStaff = await db.user.findFirst({
      where: { staffIdNumber: { startsWith: prefix } },
      orderBy: { staffIdNumber: "desc" },
    });

    let nextNumber = 10001;
    if (lastStaff?.staffIdNumber) {
      const numericPart = parseInt(lastStaff.staffIdNumber.replace(/^[A-Z]/, ""), 10);
      if (!isNaN(numericPart)) nextNumber = numericPart + 1;
    }
    const staffIdNumber = `${prefix}${nextNumber}`;

    // Need a unique email
    const staffEmail = email || `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.${staffIdNumber.toLowerCase()}@staff.local`;

    const user = await db.user.create({
      data: {
        name,
        email: staffEmail,
        role: role || "doctor",
        gender: gender || null,
        specialization,
        department,
        phone: phone || null,
        consultationFee: consultationFee !== undefined ? Number(consultationFee) : 0,
        // Default: Mon–Sat 9am–6pm if caller didn't provide a schedule
        schedule: schedule || JSON.stringify({
          monday:    [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
          tuesday:   [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
          wednesday: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
          thursday:  [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
          friday:    [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
          saturday:  [{ start: "09:00", end: "13:00" }],
        }),
        slotDuration: slotDuration !== undefined ? Number(slotDuration) : 15,
        status: status || "active",
        staffIdNumber,
        isActive: true,
      },
    });

    return NextResponse.json({
      id: user.id,
      doctorIdNumber: user.staffIdNumber,
      name: user.name,
      role: user.role,
      gender: user.gender,
      specialization: user.specialization,
      department: user.department,
      phone: user.phone,
      email: user.email,
      consultationFee: user.consultationFee,
      schedule: user.schedule,
      slotDuration: user.slotDuration,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create doctor:", error);
    return NextResponse.json({ error: "Failed to create doctor" }, { status: 500 });
  }
}
