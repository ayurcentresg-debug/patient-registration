import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken, createToken } from "@/lib/auth";
import { serialize } from "cookie";

/**
 * GET /api/onboarding
 * Returns current onboarding status and pre-filled data
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: payload.clinicId },
    });
    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    const [settings, progress] = await Promise.all([
      prisma.clinicSettings.findUnique({
        where: { clinicId: payload.clinicId },
      }),
      prisma.onboardingProgress.findUnique({
        where: { clinicId: payload.clinicId },
      }),
    ]);

    return NextResponse.json({
      onboardingComplete: clinic.onboardingComplete,
      emailVerified: clinic.emailVerified,
      clinic: {
        name: clinic.name,
        email: clinic.email,
        phone: clinic.phone,
        address: clinic.address,
        city: clinic.city,
        state: clinic.state,
        country: clinic.country,
        zipCode: clinic.zipCode,
        website: clinic.website,
        currency: clinic.currency,
        timezone: clinic.timezone,
        clinicType: clinic.clinicType || progress?.clinicType || null,
        practitionerCount: clinic.practitionerCount || null,
      },
      settings: settings
        ? {
            gstRegistrationNo: settings.gstRegistrationNo,
            currency: settings.currency,
            appointmentDuration: settings.appointmentDuration,
            workingHoursStart: settings.workingHoursStart,
            workingHoursEnd: settings.workingHoursEnd,
            workingDays: settings.workingDays,
          }
        : null,
    });
  } catch (error) {
    console.error("Onboarding GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/onboarding
 * Saves onboarding data step by step or all at once
 *
 * Body: {
 *   step: 1 | 2 | 3 | "complete",
 *   // Step 1: Clinic Profile
 *   address?: string,
 *   city?: string,
 *   state?: string,
 *   zipCode?: string,
 *   clinicEmail?: string,
 *   clinicPhone?: string,
 *   website?: string,
 *   registrationNo?: string,
 *   // Step 2: Working Hours & Preferences
 *   workingDays?: number[],
 *   workingHoursStart?: string,
 *   workingHoursEnd?: string,
 *   appointmentDuration?: number,
 *   currency?: string,
 *   taxRate?: string,
 *   // Step 3: just marks complete (first staff added via separate API)
 * }
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
    const { step } = body;

    const clinicId = payload.clinicId;

    if (step === 1) {
      // Update clinic profile
      await prisma.clinic.update({
        where: { id: clinicId },
        data: {
          address: body.address || undefined,
          city: body.city || undefined,
          state: body.state || undefined,
          zipCode: body.zipCode || undefined,
          phone: body.clinicPhone || undefined,
          website: body.website || undefined,
        },
      });

      // Update clinic settings
      await prisma.clinicSettings.upsert({
        where: { clinicId },
        update: {
          address: body.address || undefined,
          city: body.city || undefined,
          state: body.state || undefined,
          zipCode: body.zipCode || undefined,
          phone: body.clinicPhone || undefined,
          email: body.clinicEmail || undefined,
          website: body.website || undefined,
          gstRegistrationNo: body.registrationNo || undefined,
        },
        create: {
          clinicId,
          clinicName: (await prisma.clinic.findUnique({ where: { id: clinicId } }))?.name || "",
          address: body.address || "",
          city: body.city || "Singapore",
          state: body.state || "Singapore",
          zipCode: body.zipCode || "",
          phone: body.clinicPhone || "",
          email: body.clinicEmail || "",
          website: body.website || "",
          gstRegistrationNo: body.registrationNo || "",
        },
      });

      return NextResponse.json({ success: true, step: 1 });
    }

    if (step === 2) {
      // Update working hours & preferences
      const updateData: Record<string, unknown> = {};

      if (body.workingDays) {
        updateData.workingDays = JSON.stringify(body.workingDays);
      }
      if (body.workingHoursStart) {
        updateData.workingHoursStart = body.workingHoursStart;
      }
      if (body.workingHoursEnd) {
        updateData.workingHoursEnd = body.workingHoursEnd;
      }
      if (body.appointmentDuration) {
        updateData.appointmentDuration = body.appointmentDuration;
      }
      if (body.currency) {
        updateData.currency = body.currency;

        // Also update clinic currency
        await prisma.clinic.update({
          where: { id: clinicId },
          data: { currency: body.currency },
        });
      }
      if (body.taxRate !== undefined) {
        updateData.gstRegistrationNo = body.taxRate;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.clinicSettings.upsert({
          where: { clinicId },
          update: updateData,
          create: {
            clinicId,
            clinicName: (await prisma.clinic.findUnique({ where: { id: clinicId } }))?.name || "",
            ...updateData,
          } as Record<string, unknown> & { clinicId: string; clinicName: string },
        });
      }

      return NextResponse.json({ success: true, step: 2 });
    }

    if (step === 3 || step === "complete") {
      // Mark onboarding as complete
      await prisma.clinic.update({
        where: { id: clinicId },
        data: { onboardingComplete: true },
      });

      // Reissue JWT with onboardingComplete: true so middleware stops redirecting
      const newToken = await createToken({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.name,
        clinicId: payload.clinicId,
        onboardingComplete: true,
      });

      const cookie = serialize("auth_token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      const response = NextResponse.json({ success: true, onboardingComplete: true });
      response.headers.set("Set-Cookie", cookie);
      return response;
    }

    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  } catch (error) {
    console.error("Onboarding POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
