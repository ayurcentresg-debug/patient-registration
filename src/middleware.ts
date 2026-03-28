import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret-change-in-production"
);

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/forgot-password", "/api/auth/reset-password", "/invite", "/api/invite"];

// Routes only accessible by admin/receptionist/staff (not doctors)
const ADMIN_ONLY_PATHS = ["/admin", "/reports", "/inventory", "/communications", "/billing"];

// Routes only accessible by doctors/therapists
const DOCTOR_PATHS = ["/doctor"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths, static files, and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    // Doctor/therapist trying to access admin-only routes → redirect to doctor portal
    if ((role === "doctor" || role === "therapist") && ADMIN_ONLY_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/doctor", req.url));
    }

    // Non-doctor trying to access doctor portal → redirect to main dashboard
    if (DOCTOR_PATHS.some(p => pathname.startsWith(p)) && role !== "doctor" && role !== "therapist" && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Doctor/therapist accessing root "/" → redirect to doctor portal
    if ((role === "doctor" || role === "therapist") && pathname === "/") {
      return NextResponse.redirect(new URL("/doctor", req.url));
    }

    return NextResponse.next();
  } catch {
    // Invalid/expired token — clear cookie and redirect
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
