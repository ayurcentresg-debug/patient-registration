import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/public/book
 * Creates an appointment from the public booking page.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      clinicId,
      doctorId,
      date,
      time,
      patientName,
      patientPhone,
      patientEmail,
      treatmentId,
      treatmentName,
      reason,
      notes,
    } = body;

    // Validate required fields
    if (!clinicId || !doctorId || !date || !time || !patientName || !patientPhone) {
      return NextResponse.json(
        { error: "Missing required fields: clinicId, doctorId, date, time, patientName, patientPhone" },
        { status: 400 }
      );
    }

    const db = getTenantPrisma(clinicId);

    // Get doctor info
    const doctor = await db.user.findFirst({
      where: { id: doctorId, status: "active" },
      select: { id: true, name: true, slotDuration: true, consultationFee: true },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    // Check for conflicts
    const appointmentDate = new Date(date + "T00:00:00");
    const nextDay = new Date(appointmentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existing = await db.appointment.findFirst({
      where: {
        doctorId,
        date: { gte: appointmentDate, lt: nextDay },
        time,
        status: { notIn: ["cancelled"] },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "This time slot is no longer available. Please choose another time." }, { status: 409 });
    }

    // Check if patient already exists (by phone)
    let patient = await db.patient.findFirst({
      where: {
        OR: [
          { phone: patientPhone },
          ...(patientEmail ? [{ email: patientEmail }] : []),
        ],
      },
    });

    // If not found, create as new patient
    if (!patient) {
      const nameParts = patientName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "";

      patient = await db.patient.create({
        data: {
          firstName,
          lastName,
          phone: patientPhone,
          email: patientEmail || null,
          gender: "Not Specified",
          status: "active",
          medicalNotes: "Source: Online Booking",
        },
      });
    }

    // Calculate end time
    const duration = doctor.slotDuration || 30;
    const [h, m] = time.split(":").map(Number);
    const endMin = h * 60 + m + duration;
    const endTime = `${Math.floor(endMin / 60).toString().padStart(2, "0")}:${(endMin % 60).toString().padStart(2, "0")}`;

    // Create appointment
    const appointment = await db.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        doctor: doctor.name,
        date: appointmentDate,
        time,
        endTime,
        duration,
        type: "consultation",
        reason: reason || "Online Booking",
        notes: notes ? `[Online Booking] ${notes}` : "[Online Booking]",
        status: "confirmed",
        treatmentId: treatmentId || null,
        treatmentName: treatmentName || null,
        sessionPrice: doctor.consultationFee || null,
      },
    });

    // Get clinic info for confirmation email
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    const settings = await db.clinicSettings.findFirst({
      select: { address: true, phone: true, clinicName: true },
    });

    // Send confirmation email if patient has email
    if (patientEmail) {
      const dateFormatted = appointmentDate.toLocaleDateString("en-SG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // Convert 24h to 12h format
      const hour = parseInt(time.split(":")[0]);
      const minute = time.split(":")[1];
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const timeFormatted = `${hour12}:${minute} ${ampm}`;

      try {
        await sendEmail({
          to: patientEmail,
          subject: `Appointment Confirmed — ${clinic?.name || "Clinic"}`,
          html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:24px 16px;">
  <div style="background:linear-gradient(135deg,#14532d,#2d6a4f);border-radius:12px;padding:24px;margin-bottom:20px;">
    <div style="font-size:18px;font-weight:700;color:white;">${clinic?.name || "Clinic"}</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">Appointment Confirmation</div>
  </div>
  <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <p style="font-size:15px;color:#111827;margin:0 0 16px;">Hi <strong>${patientName}</strong>,</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">Your appointment has been confirmed.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;font-size:14px;">
        <tr><td style="color:#6b7280;padding:4px 0;">Date</td><td style="color:#111827;font-weight:600;text-align:right;">${dateFormatted}</td></tr>
        <tr><td style="color:#6b7280;padding:4px 0;">Time</td><td style="color:#111827;font-weight:600;text-align:right;">${timeFormatted}</td></tr>
        <tr><td style="color:#6b7280;padding:4px 0;">Doctor</td><td style="color:#111827;font-weight:600;text-align:right;">${doctor.name}</td></tr>
        ${treatmentName ? `<tr><td style="color:#6b7280;padding:4px 0;">Treatment</td><td style="color:#111827;font-weight:600;text-align:right;">${treatmentName}</td></tr>` : ""}
      </table>
    </div>
    ${settings ? `<p style="font-size:13px;color:#6b7280;margin:0;"><strong>Location:</strong> ${settings.address}${settings.phone ? ` | ${settings.phone}` : ""}</p>` : ""}
    <p style="font-size:12px;color:#9ca3af;margin:16px 0 0;">If you need to reschedule, please call the clinic directly.</p>
  </div>
  <div style="text-align:center;padding:16px 0;">
    <p style="font-size:11px;color:#9ca3af;">Powered by AyurGate</p>
  </div>
</div>
</body></html>`,
        });
      } catch (emailErr) {
        console.error("[Public Book] Email send failed:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        date: date,
        time,
        endTime,
        doctor: doctor.name,
        status: "confirmed",
      },
      message: "Appointment confirmed! You will receive a confirmation email shortly.",
    });
  } catch (error) {
    console.error("[Public Book] Error:", error);
    return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 });
  }
}
