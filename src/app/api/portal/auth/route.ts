import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { generateOTP } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getBranding } from "@/lib/plan-enforcement";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

interface PatientPayload {
  patientId: string;
  clinicId: string;
  name: string;
  phone: string;
  role: "patient";
}

async function createPatientToken(payload: PatientPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * POST /api/portal/auth
 * Actions: request_otp, verify_otp, logout
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Request OTP ───────────────────────────────────────────────
    if (action === "request_otp") {
      const { phone, clinicId } = body;

      if (!phone || !clinicId) {
        return NextResponse.json({ error: "Phone and clinic ID are required" }, { status: 400 });
      }

      // Find patient by phone in the specified clinic
      const patient = await prisma.patient.findFirst({
        where: {
          phone: phone.trim(),
          clinicId,
          status: "active",
          deletedAt: null,
        },
      });

      if (!patient) {
        return NextResponse.json({ error: "No patient found with this phone number" }, { status: 404 });
      }

      // Generate OTP
      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

      // Save OTP to patient record
      await prisma.patient.update({
        where: { id: patient.id },
        data: { otpCode: otp, otpExpiresAt },
      });

      // Send OTP via email if available
      if (patient.email) {
        const branding = await getBranding();
        await sendEmail({
          to: patient.email,
          subject: `Your login code: ${otp} | ${branding.platformName}`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
              <div style="background: #14532d; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: #fff; font-size: 18px; margin: 0;">${branding.platformName}</h1>
              </div>
              <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #374151; font-size: 15px;">Hi ${patient.firstName},</p>
                <p style="color: #374151; font-size: 15px;">Your one-time login code is:</p>
                <div style="text-align: center; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #14532d; background: #f0fdf4; padding: 12px 24px; border-radius: 8px; border: 2px solid #bbf7d0;">${otp}</span>
                </div>
                <p style="color: #6b7280; font-size: 13px;">This code expires in 5 minutes. Do not share it with anyone.</p>
              </div>
            </div>
          `,
        });
      }

      // In dev, also log OTP for testing
      if (process.env.NODE_ENV === "development") {
        console.log(`[Portal OTP] ${patient.firstName} ${patient.lastName}: ${otp}`);
      }

      return NextResponse.json({
        success: true,
        message: patient.email
          ? `OTP sent to ${patient.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")}`
          : "OTP generated. Please check with clinic staff.",
        patientId: patient.id,
        hasEmail: !!patient.email,
      });
    }

    // ── Verify OTP ────────────────────────────────────────────────
    if (action === "verify_otp") {
      const { patientId, otp } = body;

      if (!patientId || !otp) {
        return NextResponse.json({ error: "Patient ID and OTP are required" }, { status: 400 });
      }

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
      });

      if (!patient || !patient.otpCode || !patient.otpExpiresAt) {
        return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
      }

      if (new Date() > patient.otpExpiresAt) {
        // Clear expired OTP
        await prisma.patient.update({
          where: { id: patientId },
          data: { otpCode: null, otpExpiresAt: null },
        });
        return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
      }

      if (patient.otpCode !== otp.trim()) {
        return NextResponse.json({ error: "Incorrect OTP" }, { status: 400 });
      }

      // OTP verified — clear it and issue token
      await prisma.patient.update({
        where: { id: patientId },
        data: {
          otpCode: null,
          otpExpiresAt: null,
          lastPortalLogin: new Date(),
        },
      });

      const token = await createPatientToken({
        patientId: patient.id,
        clinicId: patient.clinicId || "",
        name: `${patient.firstName} ${patient.lastName}`,
        phone: patient.phone,
        role: "patient",
      });

      const response = NextResponse.json({
        success: true,
        patient: {
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName}`,
        },
      });

      response.cookies.set("patient_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });

      return response;
    }

    // ── Logout ────────────────────────────────────────────────────
    if (action === "logout") {
      const response = NextResponse.json({ success: true });
      response.cookies.delete("patient_token");
      return response;
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Portal auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
