import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { comparePassword, createToken } from "@/lib/auth";
import { serialize } from "cookie";
import * as OTPAuth from "otpauth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(ip, "/api/auth/login", {
      maxRequests: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    const { email, password, totpCode } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user — with multi-tenancy, email is unique per clinic
    // Try exact match first (for existing single-tenant data with null clinicId)
    const user = await prisma.user.findFirst({ where: { email } });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "Account not set up. Please contact admin." },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled
    if (user.totpEnabled && user.totpSecret) {
      if (!totpCode) {
        // Password correct but need 2FA — return requires2FA flag
        return NextResponse.json({ requires2FA: true });
      }

      // Verify TOTP code
      const totp = new OTPAuth.TOTP({
        issuer: "AYUR GATE",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      });

      const delta = totp.validate({ token: totpCode, window: 1 });
      if (delta === null) {
        return NextResponse.json(
          { error: "Invalid authenticator code", requires2FA: true },
          { status: 401 }
        );
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Check onboarding status for this clinic
    let onboardingComplete = true;
    if (user.clinicId) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: user.clinicId },
        select: { onboardingComplete: true, createdAt: true },
      });

      // Safety net: clinics created before the onboarding feature (2026-04-02)
      // are auto-marked as onboarded so existing users aren't disrupted
      if (clinic && !clinic.onboardingComplete) {
        const onboardingLaunchDate = new Date("2026-04-02T00:00:00Z");
        if (clinic.createdAt < onboardingLaunchDate) {
          await prisma.clinic.update({
            where: { id: user.clinicId },
            data: { onboardingComplete: true, emailVerified: true },
          });
          onboardingComplete = true;
        } else {
          onboardingComplete = false;
        }
      } else {
        onboardingComplete = clinic?.onboardingComplete ?? true;
      }
    }

    // Create JWT with clinicId for multi-tenancy
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId || "",
      onboardingComplete,
    });

    // Set HTTP-only cookie
    const cookie = serialize("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });

    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
