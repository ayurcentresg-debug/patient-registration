/**
 * iCal feed — doctor subscribes to their own appointments in Google
 * Calendar / Apple Calendar / Outlook.
 *
 * GET /api/portal/ical/[token].ics
 *
 * Token is a long random string per User (User.icalToken). Generate via
 * POST /api/portal/ical-token (auth-required) — returns the URL to paste
 * into Google Cal / Apple Cal / Outlook subscription.
 *
 * Returns text/calendar (RFC 5545) with all upcoming + recently-completed
 * appointments for that user. Read-only — calendar apps poll every 12h.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function escapeICal(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatICalDate(date: Date, time: string): string {
  // YYYYMMDDTHHMMSSZ format (UTC)
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const cleanToken = token.replace(/\.ics$/, ""); // accept .ics suffix

    const user = await prisma.user.findFirst({
      where: { icalToken: cleanToken, isActive: true },
      select: { id: true, name: true, email: true, clinicId: true, branchId: true },
    });
    if (!user) {
      return new NextResponse("Invalid or expired calendar token", { status: 404 });
    }

    // Fetch this doctor's appointments — past 30 days + all upcoming
    const past = new Date();
    past.setDate(past.getDate() - 30);
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: user.id,
        date: { gte: past },
        status: { notIn: ["cancelled"] },
      },
      include: {
        patient: { select: { firstName: true, lastName: true, phone: true } },
      },
      orderBy: { date: "asc" },
      take: 500,
    });

    // Resolve branch names for the LOCATION field
    const branchIds = Array.from(new Set(appointments.map(a => a.branchId).filter(Boolean) as string[]));
    const branches = branchIds.length > 0
      ? await prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true, address: true } })
      : [];
    const branchMap = new Map(branches.map(b => [b.id, b]));

    // Build iCal
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//AyurGate//Doctor Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeICal(`${user.name} — AyurGate appointments`)}`,
      "X-WR-TIMEZONE:Asia/Singapore",
      "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
      "X-PUBLISHED-TTL:PT12H",
    ];

    const now = formatICalDate(new Date(), "00:00");
    for (const a of appointments) {
      const startTime = a.time || "09:00";
      const duration = a.duration || 30;
      const start = new Date(a.date);
      const [h, m] = startTime.split(":").map(Number);
      start.setHours(h || 0, m || 0, 0, 0);
      const end = new Date(start.getTime() + duration * 60000);
      const branch = a.branchId ? branchMap.get(a.branchId) : null;
      const patientName = a.patient
        ? `${a.patient.firstName} ${a.patient.lastName}`
        : (a.walkinName || "Walk-in");
      const summary = `${patientName}${a.treatmentName ? ` — ${a.treatmentName}` : ""}`;
      const desc = [
        `Patient: ${patientName}`,
        a.patient?.phone ? `Phone: ${a.patient.phone}` : (a.walkinPhone ? `Phone: ${a.walkinPhone}` : ""),
        a.treatmentName ? `Treatment: ${a.treatmentName}` : "",
        a.reason ? `Reason: ${a.reason}` : "",
        a.notes ? `Notes: ${a.notes}` : "",
        `Status: ${a.status}`,
        branch ? `Branch: ${branch.name}` : "",
      ].filter(Boolean).join("\\n");
      const location = branch ? `${branch.name}${branch.address ? `, ${branch.address}` : ""}` : "";

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${a.id}@ayurgate.com`);
      lines.push(`DTSTAMP:${now}`);
      lines.push(`DTSTART:${start.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`);
      lines.push(`DTEND:${end.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`);
      lines.push(`SUMMARY:${escapeICal(summary)}`);
      lines.push(`DESCRIPTION:${desc}`);
      if (location) lines.push(`LOCATION:${escapeICal(location)}`);
      lines.push(`STATUS:${a.status === "completed" ? "CONFIRMED" : a.status === "no-show" ? "TENTATIVE" : "CONFIRMED"}`);
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    return new NextResponse(lines.join("\r\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${user.name.replace(/[^a-z0-9]+/gi, "-")}-ayurgate.ics"`,
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch (err) {
    console.error("iCal feed error:", err);
    return new NextResponse("Calendar feed failed", { status: 500 });
  }
}
