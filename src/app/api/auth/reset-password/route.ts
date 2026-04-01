import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { otpStore } from "../forgot-password/route";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(ip, "/api/auth/reset-password", {
      maxRequests: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Email, OTP, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Verify OTP
    const stored = otpStore.get(email);
    if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
      return NextResponse.json(
        { error: "Invalid or expired reset code" },
        { status: 400 }
      );
    }

    // Hash new password and update
    const hashed = await hashPassword(newPassword);
    const userToUpdate = await prisma.user.findFirst({ where: { email } });
    if (!userToUpdate) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    await prisma.user.update({
      where: { id: userToUpdate.id },
      data: { password: hashed },
    });

    // Clear OTP
    otpStore.delete(email);

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
