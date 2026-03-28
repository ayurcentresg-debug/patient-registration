import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";

// Auto-generate patient ID like P10001
async function generatePatientId(): Promise<string> {
  const count = await prisma.patient.count();
  const nextNum = 10001 + count;
  return `P${nextNum}`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { patientIdNumber: { contains: search } },
        { nricId: { contains: search } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { appointments: true, communications: true } } },
    });

    return NextResponse.json(patients);
  } catch (error) {
    console.error("GET /api/patients error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.firstName || !body.firstName.trim()) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 });
    }
    if (!body.lastName || !body.lastName.trim()) {
      return NextResponse.json({ error: "Last name is required" }, { status: 400 });
    }
    if (!body.phone || !body.phone.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    if (!body.gender || !["male", "female", "other"].includes(body.gender)) {
      return NextResponse.json({ error: "Valid gender is required (male, female, or other)" }, { status: 400 });
    }
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const patientIdNumber = await generatePatientId();

    const patient = await prisma.patient.create({
      data: {
        patientIdNumber,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        nricId: body.nricId || null,
        email: body.email || null,
        phone: body.phone.trim(),
        secondaryMobile: body.secondaryMobile || null,
        landline: body.landline || null,
        whatsapp: body.whatsapp || body.phone.trim(),
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        age: body.age ? parseInt(body.age, 10) : null,
        gender: body.gender,
        address: body.address || null,
        locality: body.locality || null,
        city: body.city || null,
        state: body.state || null,
        zipCode: body.zipCode || null,
        bloodGroup: body.bloodGroup || null,
        ethnicity: body.ethnicity || null,
        nationality: body.nationality || null,
        occupation: body.occupation || null,
        referredBy: body.referredBy || null,
        familyRelation: body.familyRelation || null,
        familyMemberName: body.familyMemberName || null,
        emergencyName: body.emergencyName || null,
        emergencyPhone: body.emergencyPhone || null,
        medicalHistory: body.medicalHistory || "[]",
        otherHistory: body.otherHistory || null,
        allergies: body.allergies || null,
        medicalNotes: body.medicalNotes || null,
        groups: body.groups || "[]",
      },
    });

    // Send welcome notifications
    const welcomeMessage = `Welcome ${patient.firstName}! You have been successfully registered at our clinic. Your Patient ID is ${patient.patientIdNumber}. For any queries, please contact us.`;

    try {
      if (patient.email) {
        await sendEmail({
          to: patient.email,
          subject: "Welcome to Ayur Centre - Registration Confirmed",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0d9488;">Registration Confirmed</h2>
              <p>Dear ${patient.firstName} ${patient.lastName},</p>
              <p>${welcomeMessage}</p>
              <p style="background: #f0fdfa; padding: 12px; border-radius: 8px;">
                <strong>Patient ID:</strong> ${patient.patientIdNumber}<br/>
                <strong>Name:</strong> ${patient.firstName} ${patient.lastName}<br/>
                <strong>Phone:</strong> ${patient.phone}
              </p>
              <p>Thank you for choosing our clinic.</p>
            </div>
          `,
        });

        await prisma.communication.create({
          data: { patientId: patient.id, type: "email", subject: "Welcome - Registration Confirmed", message: welcomeMessage, status: "sent" },
        });
      }
    } catch (e) {
      console.error("Email notification failed:", e);
    }

    try {
      if (patient.whatsapp) {
        await sendWhatsApp({ to: patient.whatsapp, message: welcomeMessage });
        await prisma.communication.create({
          data: { patientId: patient.id, type: "whatsapp", message: welcomeMessage, status: "sent" },
        });
      }
    } catch (e) {
      console.error("WhatsApp notification failed:", e);
    }

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error("POST /api/patients error:", error);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
}
