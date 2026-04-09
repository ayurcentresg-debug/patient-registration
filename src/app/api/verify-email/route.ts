import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken, generateOTP } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/verify-email
 *
 * Actions:
 *   { action: "send" }    → Generate OTP and email it
 *   { action: "verify", code: "123456" } → Verify the OTP
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    const clinicId = payload.clinicId;

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    if (action === "send") {
      // Rate limit: don't send if a code was sent less than 60s ago
      if (clinic.verifyCodeExpires) {
        const cooldown = new Date(clinic.verifyCodeExpires.getTime() - 10 * 60 * 1000 + 60 * 1000);
        if (new Date() < cooldown) {
          return NextResponse.json(
            { error: "Please wait 60 seconds before requesting a new code" },
            { status: 429 }
          );
        }
      }

      const code = generateOTP();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.clinic.update({
        where: { id: clinicId },
        data: { verifyCode: code, verifyCodeExpires: expires },
      });

      // Send verification email
      try {
        await sendEmail({
          to: clinic.email,
          subject: "Verify your email — AyurGate",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #14532d, #2d6a4f); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <span style="font-size: 32px;">&#127807;</span>
                <h1 style="color: white; margin: 8px 0 0; font-size: 20px; letter-spacing: 0.08em;">AyurGate</h1>
              </div>
              <div style="background: white; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
                <h2 style="color: #111; margin: 0 0 8px; font-size: 18px;">Verify your email</h2>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
                  Enter this code in your onboarding screen to verify <strong>${clinic.email}</strong>
                </p>
                <div style="background: #f0fdf4; border: 2px dashed #2d6a4f; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                  <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #14532d;">${code}</span>
                </div>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  This code expires in 10 minutes. If you didn't request this, you can safely ignore it.
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr);
        return NextResponse.json(
          { error: "Failed to send verification email. Please try again." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "Verification code sent" });
    }

    if (action === "verify") {
      const { code } = body;

      if (!code || typeof code !== "string") {
        return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
      }

      if (clinic.emailVerified) {
        return NextResponse.json({ success: true, message: "Email already verified" });
      }

      if (!clinic.verifyCode || !clinic.verifyCodeExpires) {
        return NextResponse.json(
          { error: "No verification code found. Please request a new one." },
          { status: 400 }
        );
      }

      if (new Date() > clinic.verifyCodeExpires) {
        return NextResponse.json(
          { error: "Verification code has expired. Please request a new one." },
          { status: 400 }
        );
      }

      if (clinic.verifyCode !== code.trim()) {
        return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
      }

      // Mark as verified
      await prisma.clinic.update({
        where: { id: clinicId },
        data: {
          emailVerified: true,
          verifyCode: null,
          verifyCodeExpires: null,
        },
      });

      return NextResponse.json({ success: true, message: "Email verified successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
