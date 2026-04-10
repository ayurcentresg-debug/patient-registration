import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createToken } from "@/lib/auth";
import { serialize } from "cookie";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTrialDuration, getPlanLimits } from "@/lib/platform-settings";
import { CURRENCY_MAP, TIMEZONE_MAP } from "@/lib/country-data";

/**
 * POST /api/clinic/register
 *
 * Registers a new clinic with a 7-day free trial.
 * Creates: Clinic + ClinicSubscription + Admin User + ClinicSettings
 *
 * Body: {
 *   clinicName: string,
 *   email: string,
 *   phone?: string,
 *   ownerName?: string,
 *   password: string,
 *   country?: string,
 *   city?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(ip, "/api/clinic/register", {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const { clinicName, email, phone, ownerName, password, country, city, clinicType, practitionerCount, referralSource, state, termsAccepted } = body;

    // Validate required fields
    if (!clinicName || !email || !password) {
      return NextResponse.json(
        { error: "Clinic name, email, and password are required" },
        { status: 400 }
      );
    }

    // ownerName is optional — fallback to clinic name or email prefix
    const resolvedOwnerName = ownerName || clinicName || email.split("@")[0];

    if (password.length < 12) {
      return NextResponse.json(
        { error: "Password must be at least 12 characters" },
        { status: 400 }
      );
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain a lowercase letter" },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain an uppercase letter" },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain a number" },
        { status: 400 }
      );
    }
    if (!/[#?!@$%^&*\-]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain a symbol (#?!@$%^&*-)" },
        { status: 400 }
      );
    }

    // Generate slug from clinic name
    let slug = clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug already exists
    const existingClinic = await prisma.clinic.findUnique({ where: { slug } });
    if (existingClinic) {
      // Append random suffix
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Check if email already registered as clinic admin
    const existingUser = await prisma.user.findFirst({
      where: { email, role: "admin" },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please login instead." },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Calculate trial end date from platform settings
    const trialDays = await getTrialDuration();
    const trialLimits = (await getPlanLimits()).trial;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Create clinic, subscription, admin user, and settings in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Clinic
      const clinic = await tx.clinic.create({
        data: {
          name: clinicName,
          slug,
          email,
          phone: phone || null,
          country: country || "Singapore",
          city: city || null,
          clinicType: clinicType || null,
          practitionerCount: practitionerCount || null,
          referralSource: referralSource || null,
          state: state || null,
          termsAcceptedAt: termsAccepted ? new Date() : null,
          currency: CURRENCY_MAP[country] || "SGD",
          timezone: TIMEZONE_MAP[country] || "Asia/Singapore",
        },
      });

      // 2. Create Subscription (7-day trial)
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

      // 3. Create Admin User
      const user = await tx.user.create({
        data: {
          clinicId: clinic.id,
          name: resolvedOwnerName,
          email,
          phone: phone || null,
          role: "admin",
          password: hashedPassword,
          staffIdNumber: "A10001",
          status: "active",
        },
      });

      // 4. Create default ClinicSettings
      await tx.clinicSettings.create({
        data: {
          clinicId: clinic.id,
          clinicName,
          email,
          phone: phone || "",
          city: city || "Singapore",
          state: state || country || "Singapore",
          currency: CURRENCY_MAP[country] || "SGD",
        },
      });

      // 5. Create OnboardingProgress if clinicType provided
      if (clinicType) {
        await tx.onboardingProgress.create({
          data: { clinicId: clinic.id, clinicType },
        });
      }

      return { clinic, user };
    });

    // Create JWT token and auto-login
    const token = await createToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
      clinicId: result.clinic.id,
      onboardingComplete: false,
    });

    const cookie = serialize("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    // Send notification email to admin
    try {
      await sendEmail({
        to: process.env.ADMIN_NOTIFICATION_EMAIL || "ayurcentresg@gmail.com",
        subject: `🏥 New Clinic Registered: ${clinicName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #14532d, #2d6a4f); padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px; letter-spacing: 0.08em;">AyurGate</h1>
              <p style="color: #a7f3d0; margin: 4px 0 0; font-size: 14px;">New Clinic Registration</p>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #111; margin: 0 0 16px; font-size: 18px;">A new clinic just registered!</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Clinic Name</td><td style="padding: 8px 0; font-weight: 600;">${clinicName}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Owner</td><td style="padding: 8px 0; font-weight: 600;">${resolvedOwnerName}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0;">${email}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Phone</td><td style="padding: 8px 0;">${phone || "—"}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Country</td><td style="padding: 8px 0;">${country || "Singapore"}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">City</td><td style="padding: 8px 0;">${city || "—"}</td></tr>
                ${clinicType ? `<tr><td style="padding: 8px 0; color: #6b7280;">Clinic Type</td><td style="padding: 8px 0; font-weight: 600;">${clinicType}</td></tr>` : ""}
                ${practitionerCount ? `<tr><td style="padding: 8px 0; color: #6b7280;">Team Size</td><td style="padding: 8px 0;">${practitionerCount}</td></tr>` : ""}
                ${referralSource ? `<tr><td style="padding: 8px 0; color: #6b7280;">Referral</td><td style="padding: 8px 0;">${referralSource}</td></tr>` : ""}
                <tr><td style="padding: 8px 0; color: #6b7280;">Terms Accepted</td><td style="padding: 8px 0;">${termsAccepted ? "Yes" : '<span style="color: #dc2626;">No</span>'}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Plan</td><td style="padding: 8px 0;"><span style="background: #ecfdf5; color: #065f46; padding: 2px 10px; border-radius: 100px; font-weight: 600;">${trialDays}-Day Trial</span></td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Trial Ends</td><td style="padding: 8px 0;">${trialEndsAt.toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Registered At</td><td style="padding: 8px 0;">${new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}</td></tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">This is an automated notification from AyurGate (www.ayurgate.com)</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      // Don't fail registration if email fails
      console.error("Failed to send registration notification:", emailErr);
    }

    // Send welcome email to the new clinic owner
    try {
      const loginUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.ayurgate.com";
      await sendEmail({
        to: email,
        subject: `Welcome to AyurGate! Your clinic is ready`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #14532d, #2d6a4f); padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px; letter-spacing: 0.08em;">AyurGate</h1>
              <p style="color: #a7f3d0; margin: 4px 0 0; font-size: 14px;">Your clinic management platform</p>
            </div>
            <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #111; margin: 0 0 8px; font-size: 20px;">Welcome, ${resolvedOwnerName}!</h2>
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px;">Your clinic <strong>${clinicName}</strong> is ready. Here's how to get started:</p>

              <div style="margin: 0 0 20px;">
                <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                  <span style="background: #ecfdf5; color: #14532d; font-weight: 700; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; flex-shrink: 0;">1</span>
                  <div><strong style="color: #111; font-size: 14px;">Add staff members</strong><br><span style="color: #6b7280; font-size: 13px;">Add doctors, therapists, and receptionists</span></div>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                  <span style="background: #ecfdf5; color: #14532d; font-weight: 700; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; flex-shrink: 0;">2</span>
                  <div><strong style="color: #111; font-size: 14px;">Set up treatments & pricing</strong><br><span style="color: #6b7280; font-size: 13px;">Create your treatment menu with prices</span></div>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                  <span style="background: #ecfdf5; color: #14532d; font-weight: 700; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 12px; flex-shrink: 0;">3</span>
                  <div><strong style="color: #111; font-size: 14px;">Start booking appointments</strong><br><span style="color: #6b7280; font-size: 13px;">Register patients and schedule visits</span></div>
                </div>
              </div>

              <a href="${loginUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #14532d, #2d6a4f); color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>

              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-top: 20px;">
                <p style="color: #6b7280; font-size: 13px; margin: 0;">
                  <strong style="color: #374151;">Your ${trialDays}-day free trial</strong> ends on ${trialEndsAt.toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. Full access to all features — no credit card required.
                </p>
              </div>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">Need help? Reply to this email or visit <a href="${loginUrl}" style="color: #2d6a4f;">ayurgate.com</a></p>
            </div>
          </div>
        `,
      });
    } catch (welcomeErr) {
      console.error("Failed to send welcome email:", welcomeErr);
    }

    const response = NextResponse.json({
      success: true,
      clinic: {
        id: result.clinic.id,
        name: result.clinic.name,
        slug: result.clinic.slug,
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      trial: {
        endsAt: trialEndsAt.toISOString(),
        daysRemaining: trialDays,
      },
    });

    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (error) {
    console.error("Clinic registration error:", error);
    return NextResponse.json(
      { error: "Failed to register clinic. Please try again." },
      { status: 500 }
    );
  }
}
