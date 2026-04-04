import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES, STAFF_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendEmail } from "@/lib/email";
import { staffInviteEmail } from "@/lib/email-templates";
import crypto from "crypto";
import { logAudit } from "@/lib/audit";

const VALID_ROLES = ["admin", "doctor", "therapist", "pharmacist", "receptionist", "staff"];
const ROLE_PREFIXES: Record<string, string> = {
  doctor: "D",
  therapist: "T",
  pharmacist: "P",
  receptionist: "R",
  admin: "A",
  staff: "S",
};

// GET /api/staff — list staff with filters
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = request.nextUrl;
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const clinical = searchParams.get("clinical"); // "true" → only doctor/therapist

    const where: Record<string, unknown> = {};

    if (role && VALID_ROLES.includes(role)) {
      where.role = role;
    }

    if (clinical === "true") {
      where.role = { in: ["doctor", "therapist"] };
    }

    if (status === "active" || status === "inactive") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { staffIdNumber: { contains: search } },
      ];
    }

    const staff = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        avatar: true,
        staffIdNumber: true,
        gender: true,
        dateOfBirth: true,
        ethnicity: true,
        residencyStatus: true,
        prStartDate: true,
        specialization: true,
        department: true,
        consultationFee: true,
        schedule: true,
        slotDuration: true,
        status: true,
        dateOfJoining: true,
        lastWorkingDate: true,
        resignationDate: true,
        resignationReason: true,
        inviteToken: true,
        inviteExpiresAt: true,
        lastLogin: true,
        createdAt: true,
        _count: { select: { appointments: true } },
      },
    });

    return NextResponse.json(
      staff.map((s) => ({
        ...s,
        appointmentCount: s._count.appointments,
        _count: undefined,
        hasPassword: undefined,
        invitePending: !!s.inviteToken && (!s.inviteExpiresAt || new Date(s.inviteExpiresAt) > new Date()),
      }))
    );
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

// POST /api/staff — create staff member
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { name, email, phone, role, gender, dateOfBirth, ethnicity, residencyStatus, prStartDate, specialization, department, consultationFee, schedule, slotDuration, status, dateOfJoining, sendInvite } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
    }

    // Check duplicate email
    const existing = await db.user.findFirst({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "A staff member with this email already exists" }, { status: 409 });
    }

    // Auto-generate staffIdNumber
    const prefix = ROLE_PREFIXES[role || "staff"] || "S";
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

    // Generate invite token if requested
    let inviteToken: string | null = null;
    let inviteExpiresAt: Date | null = null;
    if (sendInvite) {
      inviteToken = crypto.randomUUID();
      inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }

    const isClinical = role === "doctor" || role === "therapist";

    const user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        role: role || "staff",
        staffIdNumber,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        ethnicity: ethnicity || null,
        residencyStatus: residencyStatus || null,
        prStartDate: prStartDate ? new Date(prStartDate) : null,
        specialization: isClinical ? (specialization || null) : null,
        department: department || null,
        consultationFee: isClinical && consultationFee !== undefined ? Number(consultationFee) : null,
        schedule: isClinical ? (schedule || "{}") : "{}",
        slotDuration: isClinical && slotDuration ? Number(slotDuration) : 30,
        status: status || "active",
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
        isActive: true,
        inviteToken,
        inviteExpiresAt,
      },
    });

    // Send invite email
    if (sendInvite && inviteToken) {
      const baseUrl = request.headers.get("origin") || request.headers.get("host") || process.env.NEXT_PUBLIC_APP_URL || "https://www.ayurgate.com";
      const inviteUrl = `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/invite/${inviteToken}`;
      const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Staff";

      try {
        await sendEmail({
          to: email,
          subject: `You're invited to join — AYUR GATE`,
          html: staffInviteEmail({
            staffName: name,
            role: roleLabel,
            clinicName: "AYUR GATE",
            inviteUrl,
            tempPassword: "",
          }),
        });
        // Invite email sent
      } catch (emailErr) {
        console.error("Failed to send invite email:", emailErr);
        // Don't fail the creation just because email failed
      }
    }

    await logAudit({
      action: "create",
      entity: "staff",
      entityId: user.id,
      details: { name, email, role: role || "staff" },
    });

    const { password: _, totpSecret: __, ...safeUser } = user as Record<string, unknown>;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error("Failed to create staff:", error);
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}
