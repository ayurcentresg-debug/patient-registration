import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOTP } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

// In-memory OTP store (in production, use Redis or DB)
const otpStore = new Map<string, { otp: string; expires: number }>();

export { otpStore };

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(ip, "/api/auth/forgot-password", {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      return NextResponse.json({
        message: "If an account with that email exists, a reset code has been sent.",
      });
    }

    const otp = generateOTP();
    otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 min expiry

    // Send OTP email
    try {
      await sendEmail({
        to: email,
        subject: "Password Reset Code - Ayur Centre",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #14532d; margin-bottom: 16px;">Password Reset</h2>
            <p style="color: #374151; font-size: 14px;">Hi ${user.name},</p>
            <p style="color: #374151; font-size: 14px;">Your password reset code is:</p>
            <div style="background: #d1f2e0; border: 2px solid #2d6a4f; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #14532d;">${otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send reset email:", emailErr);
      // Still return success - OTP is stored, user can retry
    }

    return NextResponse.json({
      message: "If an account with that email exists, a reset code has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
