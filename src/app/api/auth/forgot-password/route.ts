import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOTP } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-templates";
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
        subject: "Password Reset Code — AyurGate",
        html: passwordResetEmail(user.name, otp),
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
