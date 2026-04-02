import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

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
        specialization: true,
        department: true,
        consultationFee: true,
        schedule: true,
        slotDuration: true,
        status: true,
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
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { name, email, phone, role, gender, specialization, department, consultationFee, schedule, slotDuration, status, sendInvite } = body;

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
        specialization: isClinical ? (specialization || null) : null,
        department: isClinical ? (department || null) : null,
        consultationFee: isClinical && consultationFee !== undefined ? Number(consultationFee) : null,
        schedule: isClinical ? (schedule || "{}") : "{}",
        slotDuration: isClinical && slotDuration ? Number(slotDuration) : 30,
        status: status || "active",
        isActive: true,
        inviteToken,
        inviteExpiresAt,
      },
    });

    // Send invite email
    if (sendInvite && inviteToken) {
      const baseUrl = request.headers.get("origin") || request.headers.get("host") || "http://localhost:3000";
      const inviteUrl = `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/invite/${inviteToken}`;
      const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Staff";

      try {
        await sendEmail({
          to: email,
          subject: "You're invited to join Ayur Centre",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 48px; height: 48px; background: #14532d; border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 18px;">AC</div>
              </div>
              <h2 style="color: #14532d; margin-bottom: 8px; text-align: center;">Welcome to Ayur Centre</h2>
              <p style="color: #374151; font-size: 14px;">Hi ${name},</p>
              <p style="color: #374151; font-size: 14px;">You've been invited to join <strong>Ayur Centre Pte. Ltd.</strong> as a <strong>${roleLabel}</strong>.</p>
              <p style="color: #374151; font-size: 14px;">Click the button below to set your password and activate your account:</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: #14532d; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Set Your Password</a>
              </div>
              <p style="color: #6b7280; font-size: 12px;">This link expires in 7 days. If you didn't expect this invitation, you can ignore this email.</p>
              <hr style="border-color: #e5e7eb; margin: 24px 0;" />
              <p style="color: #6b7280; font-size: 12px;">Ayur Centre Pte. Ltd.</p>
            </div>
          `,
        });
        // Invite email sent
      } catch (emailErr) {
        console.error("Failed to send invite email:", emailErr);
        // Don't fail the creation just because email failed
      }
    }

    const { password: _, totpSecret: __, ...safeUser } = user as Record<string, unknown>;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error("Failed to create staff:", error);
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}
