import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendEmail } from "@/lib/email";
import { getBranding } from "@/lib/plan-enforcement";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/waitlist — List waitlist entries
 */
export async function GET(req: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const url = req.nextUrl;

    const status = url.searchParams.get("status");
    const doctorId = url.searchParams.get("doctorId");
    const date = url.searchParams.get("date");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status && status !== "all") where.status = status;
    if (doctorId) where.doctorId = doctorId;
    if (date) {
      const d = new Date(date + "T00:00:00");
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.preferredDate = { gte: d, lt: next };
    }

    const entries = await db.waitlist.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 100,
    });

    // Stats
    const [waiting, notified, booked] = await Promise.all([
      db.waitlist.count({ where: { status: "waiting" } }),
      db.waitlist.count({ where: { status: "notified" } }),
      db.waitlist.count({ where: { status: "booked" } }),
    ]);

    return NextResponse.json({ entries, stats: { waiting, notified, booked, total: entries.length } });
  } catch (error) {
    console.error("Waitlist GET error:", error);
    return NextResponse.json({ error: "Failed to load waitlist" }, { status: 500 });
  }
}

/**
 * POST /api/waitlist — Add to waitlist
 */
export async function POST(req: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const body = await req.json();

    const { patientId, patientName, patientPhone, patientEmail, doctorId, doctorName,
      preferredDate, preferredTime, treatmentId, treatmentName, reason, priority, notes } = body;

    if (!patientName || !patientPhone) {
      return NextResponse.json({ error: "Patient name and phone are required" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db.waitlist.findFirst({
      where: {
        patientPhone,
        doctorId: doctorId || undefined,
        status: { in: ["waiting", "notified"] },
        ...(preferredDate ? { preferredDate: new Date(preferredDate + "T00:00:00") } : {}),
      },
    });

    if (existing) {
      return NextResponse.json({ error: "This patient is already on the waitlist" }, { status: 409 });
    }

    const entry = await db.waitlist.create({
      data: {
        patientId: patientId || null,
        patientName,
        patientPhone,
        patientEmail: patientEmail || null,
        doctorId: doctorId || null,
        doctorName: doctorName || null,
        preferredDate: preferredDate ? new Date(preferredDate + "T00:00:00") : null,
        preferredTime: preferredTime || null,
        treatmentId: treatmentId || null,
        treatmentName: treatmentName || null,
        reason: reason || null,
        priority: priority || 0,
        notes: notes || null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day expiry
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Waitlist POST error:", error);
    return NextResponse.json({ error: "Failed to add to waitlist" }, { status: 500 });
  }
}

/**
 * PUT /api/waitlist — Update waitlist entry (notify, book, cancel)
 */
export async function PUT(req: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const body = await req.json();
    const { id, action } = body;

    if (!id) return NextResponse.json({ error: "Entry ID required" }, { status: 400 });

    const entry = await db.waitlist.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });

    // ── Notify patient (slot available) ──────────────────────────
    if (action === "notify") {
      await db.waitlist.update({
        where: { id },
        data: { status: "notified", notifiedAt: new Date() },
      });

      // Send email notification
      if (entry.patientEmail) {
        const branding = await getBranding();
        const dateStr = entry.preferredDate
          ? new Date(entry.preferredDate).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })
          : "your preferred date";

        try {
          await sendEmail({
            to: entry.patientEmail,
            subject: `A slot is now available! | ${branding.platformName}`,
            html: `
              <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
                <div style="background: #14532d; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: #fff; font-size: 18px; margin: 0;">${branding.platformName}</h1>
                </div>
                <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                  <p style="color: #374151; font-size: 15px;">Hi ${entry.patientName},</p>
                  <p style="color: #374151; font-size: 15px;">Great news! A slot has opened up${entry.doctorName ? ` with Dr. ${entry.doctorName}` : ""} on <strong>${dateStr}</strong>.</p>
                  <p style="color: #374151; font-size: 15px;">Please call us to confirm your appointment as slots fill up quickly.</p>
                  ${branding.supportPhone ? `<p style="font-size: 16px; font-weight: 700; color: #14532d; margin: 16px 0;">Call: ${branding.supportPhone}</p>` : ""}
                  <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">This notification will expire in 24 hours.</p>
                </div>
              </div>
            `,
          });
        } catch { /* non-blocking */ }
      }

      return NextResponse.json({ success: true, message: "Patient notified" });
    }

    // ── Mark as booked ───────────────────────────────────────────
    if (action === "book") {
      const { appointmentId } = body;
      await db.waitlist.update({
        where: { id },
        data: { status: "booked", bookedAppointmentId: appointmentId || null },
      });
      return NextResponse.json({ success: true, message: "Marked as booked" });
    }

    // ── Cancel ───────────────────────────────────────────────────
    if (action === "cancel") {
      await db.waitlist.update({
        where: { id },
        data: { status: "cancelled" },
      });
      return NextResponse.json({ success: true, message: "Removed from waitlist" });
    }

    // ── Update priority/notes ────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status) updateData.status = body.status;

    const updated = await db.waitlist.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Waitlist PUT error:", error);
    return NextResponse.json({ error: "Failed to update waitlist" }, { status: 500 });
  }
}

/**
 * DELETE /api/waitlist — Remove entry
 */
export async function DELETE(req: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.waitlist.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
