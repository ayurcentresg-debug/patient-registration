import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createToken } from "@/lib/auth";
import { serialize } from "cookie";

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
 *   ownerName: string,
 *   password: string,
 *   country?: string,
 *   city?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clinicName, email, phone, ownerName, password, country, city } = body;

    // Validate required fields
    if (!clinicName || !email || !ownerName || !password) {
      return NextResponse.json(
        { error: "Clinic name, email, owner name, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
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

    // Calculate trial end date (7 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

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
        },
      });

      // 2. Create Subscription (7-day trial)
      await tx.clinicSubscription.create({
        data: {
          clinicId: clinic.id,
          plan: "trial",
          status: "active",
          trialEndsAt,
          maxUsers: 5,
          maxPatients: 100,
        },
      });

      // 3. Create Admin User
      const user = await tx.user.create({
        data: {
          clinicId: clinic.id,
          name: ownerName,
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
          state: country || "Singapore",
        },
      });

      return { clinic, user };
    });

    // Create JWT token and auto-login
    const token = await createToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
      clinicId: result.clinic.id,
    });

    const cookie = serialize("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

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
        daysRemaining: 7,
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
