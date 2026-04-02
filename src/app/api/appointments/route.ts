import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendEmail } from "@/lib/email";
import { appointmentConfirmationEmail } from "@/lib/email-templates";
import { sendWhatsApp } from "@/lib/whatsapp";

const includeRelations = {
  patient: { select: { firstName: true, lastName: true, email: true, whatsapp: true, phone: true, patientIdNumber: true } },
  doctorRef: true,
  treatment: true,
  treatmentPkg: true,
};

export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get("patientId");
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const search = searchParams.get("search");
    const limit = searchParams.get("limit");

    const where: Record<string, unknown> = {};

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { walkinName: { contains: search } },
        { doctor: { contains: search } },
        { reason: { contains: search } },
        { patient: { firstName: { contains: search } } },
        { patient: { lastName: { contains: search } } },
      ];
    }

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      where.date = { gte: dayStart, lte: dayEnd };
    } else if (from && to) {
      const rangeStart = new Date(from);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(to);
      rangeEnd.setHours(23, 59, 59, 999);
      where.date = { gte: rangeStart, lte: rangeEnd };
    }

    const appointments = await db.appointment.findMany({
      where,
      orderBy: [{ date: "desc" }, { time: "asc" }],
      include: includeRelations,
      ...(limit ? { take: parseInt(limit) } : {}),
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("GET /api/appointments error:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();

    // Walk-in: require walkinName + walkinPhone instead of patientId
    const isWalkin = body.isWalkin === true;

    if (!isWalkin && !body.patientId) {
      return NextResponse.json(
        { error: "patientId is required for registered patients" },
        { status: 400 }
      );
    }

    if (isWalkin && (!body.walkinName || !body.walkinPhone)) {
      return NextResponse.json(
        { error: "walkinName and walkinPhone are required for walk-in appointments" },
        { status: 400 }
      );
    }

    if (!body.date || !body.time || !body.doctor) {
      return NextResponse.json(
        { error: "date, time, and doctor are required" },
        { status: 400 }
      );
    }

    // Conflict detection
    const appointmentDate = new Date(body.date);
    const dayStart = new Date(appointmentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(appointmentDate);
    dayEnd.setHours(23, 59, 59, 999);

    const conflict = await db.appointment.findFirst({
      where: {
        doctor: body.doctor,
        date: { gte: dayStart, lte: dayEnd },
        time: body.time,
        status: { notIn: ["cancelled", "no-show"] },
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Doctor already has an appointment at this date and time" },
        { status: 409 }
      );
    }

    // Walk-in package restriction: first-time walk-ins cannot book packages
    if (isWalkin && body.packageId) {
      // Check if this walk-in phone has any completed appointments
      const previousCompleted = await db.appointment.count({
        where: {
          walkinPhone: body.walkinPhone,
          status: "completed",
        },
      });
      if (previousCompleted === 0) {
        return NextResponse.json(
          { error: "First-time walk-in patients can only book single sessions. Packages are available after completing at least one session." },
          { status: 400 }
        );
      }
    }

    const commonData = {
      doctorId: body.doctorId || null,
      date: appointmentDate,
      time: body.time,
      endTime: body.endTime || null,
      duration: body.duration || 15,
      doctor: body.doctor,
      department: body.department || null,
      type: body.type || "consultation",
      reason: body.reason || null,
      notes: body.notes || null,
      status: body.status || "scheduled",
      isWalkin,
      walkinName: isWalkin ? body.walkinName : null,
      walkinPhone: isWalkin ? body.walkinPhone : null,
      // Treatment & package fields
      treatmentId: body.treatmentId || null,
      packageId: body.packageId || null,
      treatmentName: body.treatmentName || null,
      packageName: body.packageName || null,
      sessionPrice: body.sessionPrice != null ? parseFloat(body.sessionPrice) : null,
      packageTotal: body.packageTotal != null ? parseFloat(body.packageTotal) : null,
    };

    let appointment;

    if (isWalkin) {
      // Walk-in: create without include, then fetch separately to get doctorRef
      const created = await db.appointment.create({
        data: commonData,
      });
      // Re-fetch with doctorRef and treatment included
      const full = await db.appointment.findUnique({
        where: { id: created.id },
        include: { doctorRef: true, treatment: true, treatmentPkg: true },
      });
      appointment = { ...full, patient: null };
    } else {
      // Registered patient: include patient relation
      appointment = await db.appointment.create({
        data: { ...commonData, patientId: body.patientId },
        include: includeRelations,
      });
    }

    // Build confirmation message
    const patientName = isWalkin ? body.walkinName : `${(appointment as { patient?: { firstName?: string } }).patient?.firstName || ""}`;
    const msg = `Appointment Confirmed!\nDate: ${appointmentDate.toLocaleDateString()}\nTime: ${body.time}\nDoctor: ${body.doctor}${body.department ? `\nDepartment: ${body.department}` : ""}${body.type ? `\nType: ${body.type}` : ""}${body.reason ? `\nReason: ${body.reason}` : ""}`;

    // Send email confirmation (only for registered patients)
    try {
      const pat = (appointment as { patient?: { email?: string; firstName?: string } }).patient;
      if (!isWalkin && pat?.email) {
        await sendEmail({
          to: pat.email,
          subject: "Appointment Confirmed — AYUR GATE",
          html: appointmentConfirmationEmail({
            patientName,
            date: appointmentDate.toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
            time: body.time,
            doctor: body.doctor,
            type: body.type || "Consultation",
            notes: body.reason || undefined,
          }),
        });
      }
    } catch {
      // Email failure is non-critical
    }

    // Send WhatsApp confirmation
    try {
      const pat = (appointment as { patient?: { whatsapp?: string } }).patient;
      const whatsappNum = isWalkin ? body.walkinPhone : pat?.whatsapp;
      if (whatsappNum) {
        await sendWhatsApp({ to: whatsappNum, message: msg });
      }
    } catch (e) {
      console.error("Appointment WhatsApp failed:", e);
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments error:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
