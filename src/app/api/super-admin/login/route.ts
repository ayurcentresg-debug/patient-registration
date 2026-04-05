import { NextRequest, NextResponse } from "next/server";
import {
  validateSuperAdminCredentials,
  createSuperAdminToken,
} from "@/lib/super-admin-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { logSuperAdminAction } from "@/lib/super-admin-audit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(ip, "/api/super-admin/login", {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!validateSuperAdminCredentials(email, password)) {
      await logSuperAdminAction({ action: "login_failed", entity: "system", details: { email, ip } });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await createSuperAdminToken();

    await logSuperAdminAction({ action: "login", entity: "system", details: { ip } });

    const response = NextResponse.json({ success: true });
    response.cookies.set("super_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return response;
  } catch (error) {
    console.error("Super admin login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
