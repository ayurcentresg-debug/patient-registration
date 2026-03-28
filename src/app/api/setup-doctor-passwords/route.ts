import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret-change-in-production"
);

// POST /api/setup-doctor-passwords
// Admin-only endpoint to set default passwords for doctors who don't have one
export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const defaultPassword = body.password || "doctor123";

    if (defaultPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Find all doctors/therapists without passwords
    const doctorsWithoutPassword = await prisma.user.findMany({
      where: {
        role: { in: ["doctor", "therapist"] },
        OR: [
          { password: "" },
          { password: null },
        ],
      },
      select: { id: true, name: true, email: true, role: true },
    });

    if (doctorsWithoutPassword.length === 0) {
      return NextResponse.json({
        message: "All doctors already have passwords set",
        updated: 0,
      });
    }

    const hashed = await bcrypt.hash(defaultPassword, 12);

    // Update all at once
    const ids = doctorsWithoutPassword.map((d) => d.id);
    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { password: hashed },
    });

    return NextResponse.json({
      message: `Set password for ${doctorsWithoutPassword.length} doctor(s)`,
      updated: doctorsWithoutPassword.length,
      doctors: doctorsWithoutPassword.map((d) => ({
        name: d.name,
        email: d.email,
        role: d.role,
      })),
    });
  } catch (error) {
    console.error("Setup doctor passwords error:", error);
    return NextResponse.json({ error: "Failed to set passwords" }, { status: 500 });
  }
}
