import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createToken } from "@/lib/auth";
import { serialize } from "cookie";
import { sendEmail } from "@/lib/email";
import { getTrialDuration, getPlanLimits } from "@/lib/platform-settings";
import { CURRENCY_MAP, TIMEZONE_MAP } from "@/lib/country-data";
import { hashPassword } from "@/lib/auth";

/**
 * POST /api/auth/google/complete
 * Completes Google OAuth registration by creating the clinic
 * Body: { clinicName, country }
 * Reads google_pending cookie for user info
 */
export async function POST(request: NextRequest) {
  try {
    const pendingCookie = request.cookies.get("google_pending")?.value;
    if (!pendingCookie) {
      return NextResponse.json(
        { error: "Google session expired. Please try signing in with Google again." },
        { status: 400 }
      );
    }

    let googleData: { email: string; name: string; picture: string; googleId: string };
    try {
      googleData = JSON.parse(Buffer.from(pendingCookie, "base64").toString());
    } catch {
      return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
    }

    const body = await request.json();
    const { clinicName, country } = body;

    if (!clinicName?.trim()) {
      return NextResponse.json({ error: "Clinic name is required" }, { status: 400 });
    }

    // Check if email already registered
    const existingUser = await prisma.user.findFirst({
      where: { email: googleData.email, role: "admin" },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    // Generate slug
    let slug = clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const existingClinic = await prisma.clinic.findUnique({ where: { slug } });
    if (existingClinic) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const selectedCountry = country || "Singapore";
    const trialDays = await getTrialDuration();
    const trialLimits = (await getPlanLimits()).trial;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Generate a random password for Google users (they won't need it, but field is required)
    const randomPassword = await hashPassword(
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    );

    const result = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: clinicName,
          slug,
          email: googleData.email,
          country: selectedCountry,
          clinicType: null,
          termsAcceptedAt: new Date(),
          currency: CURRENCY_MAP[selectedCountry] || "SGD",
          timezone: TIMEZONE_MAP[selectedCountry] || "Asia/Singapore",
        },
      });

      await tx.clinicSubscription.create({
        data: {
          clinicId: clinic.id,
          plan: "trial",
          status: "active",
          trialEndsAt,
          maxUsers: trialLimits.maxUsers,
          maxPatients: trialLimits.maxPatients,
        },
      });

      const user = await tx.user.create({
        data: {
          clinicId: clinic.id,
          name: googleData.name,
          email: googleData.email,
          role: "admin",
          password: randomPassword,
          staffIdNumber: "A10001",
          status: "active",
          lastLogin: new Date(),
        },
      });

      await tx.clinicSettings.create({
        data: {
          clinicId: clinic.id,
          clinicName,
          email: googleData.email,
          phone: "",
          city: selectedCountry,
          state: selectedCountry,
          currency: CURRENCY_MAP[selectedCountry] || "SGD",
        },
      });

      return { clinic, user };
    });

    // Create JWT and log in
    const token = await createToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
      clinicId: result.clinic.id,
      onboardingComplete: false,
    });

    const authCookie = serialize("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    // Clear the pending cookie
    const clearPending = serialize("google_pending", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    // Send admin notification
    try {
      await sendEmail({
        to: process.env.ADMIN_NOTIFICATION_EMAIL || "ayurcentresg@gmail.com",
        subject: `New Clinic (Google): ${clinicName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #14532d, #2d6a4f); padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">AyurGate</h1>
              <p style="color: #a7f3d0; margin: 4px 0 0; font-size: 14px;">New Google Sign-Up</p>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; font-size: 14px;">
                <tr><td style="padding: 8px 0; color: #6b7280;">Clinic</td><td style="font-weight: 600;">${clinicName}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Owner</td><td style="font-weight: 600;">${googleData.name}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td>${googleData.email}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Country</td><td>${selectedCountry}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Method</td><td><span style="background: #dbeafe; color: #1e40af; padding: 2px 10px; border-radius: 100px; font-weight: 600;">Google OAuth</span></td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Trial Ends</td><td>${trialEndsAt.toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td></tr>
              </table>
            </div>
          </div>
        `,
      });
    } catch (e) {
      console.error("Notification email failed:", e);
    }

    // Send welcome email
    try {
      const loginUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.ayurgate.com";
      await sendEmail({
        to: googleData.email,
        subject: `Welcome to AyurGate! Your clinic is ready`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #14532d, #2d6a4f); padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">AyurGate</h1>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #111; margin: 0 0 8px;">Welcome, ${googleData.name}!</h2>
              <p style="color: #6b7280; font-size: 14px;">Your clinic <strong>${clinicName}</strong> is ready. Sign in anytime with your Google account.</p>
              <a href="${loginUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #14532d, #2d6a4f); color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px;">Go to Dashboard</a>
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-top: 20px;">
                <p style="color: #6b7280; font-size: 13px; margin: 0;">Your <strong>${trialDays}-day free trial</strong> ends on ${trialEndsAt.toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.</p>
              </div>
            </div>
          </div>
        `,
      });
    } catch (e) {
      console.error("Welcome email failed:", e);
    }

    const response = NextResponse.json({ success: true });
    response.headers.append("Set-Cookie", authCookie);
    response.headers.append("Set-Cookie", clearPending);
    return response;
  } catch (err) {
    console.error("Google complete error:", err);
    return NextResponse.json({ error: "Failed to create clinic" }, { status: 500 });
  }
}
