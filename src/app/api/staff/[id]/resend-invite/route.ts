import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { sendEmail } from "@/lib/email";
import { staffInviteEmail } from "@/lib/email-templates";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(ADMIN_ROLES);
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Generate new invite token and expiry (7 days)
    const inviteToken = crypto.randomUUID();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.user.update({
      where: { id },
      data: { inviteToken, inviteExpiresAt },
    });

    // Build invite URL
    const baseUrl =
      request.headers.get("origin") ||
      request.headers.get("host") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://www.ayurgate.com";
    const inviteUrl = `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/invite/${inviteToken}`;
    const roleLabel = user.role
      ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
      : "Staff";

    await sendEmail({
      to: user.email,
      subject: `You're invited to join — AyurGate`,
      html: staffInviteEmail({
        staffName: user.name,
        role: roleLabel,
        clinicName: "AyurGate",
        inviteUrl,
        tempPassword: "",
      }),
    });

    await logAudit({
      action: "update",
      entity: "staff",
      entityId: id,
      details: { action: "resend_invite", email: user.email },
    });

    return NextResponse.json({ success: true, message: `Invite resent to ${user.email}` });
  } catch (error: unknown) {
    console.error("Failed to resend invite:", error);
    const message = error instanceof Error ? error.message : "Failed to resend invite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
