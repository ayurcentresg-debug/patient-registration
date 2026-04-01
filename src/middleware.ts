import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || ""
);

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/invite",
  "/api/invite",
  "/register",
  "/api/clinic/register",
  "/pricing",
  "/api/public",
  "/api/stripe/webhook",
  "/trial-expired",
];

// Routes only accessible by admin/receptionist/staff (not doctors)
const ADMIN_ONLY_PATHS = ["/admin", "/reports", "/inventory", "/communications", "/billing"];

// Routes only accessible by doctors/therapists
const DOCTOR_PATHS = ["/doctor"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Super Admin routes ──────────────────────────────────────────────
  if (pathname.startsWith("/super-admin") || pathname.startsWith("/api/super-admin")) {
    // Public: login page and login API
    if (pathname === "/super-admin/login" || pathname.startsWith("/api/super-admin/login")) {
      return NextResponse.next();
    }

    // All other /super-admin paths require valid super_admin_token
    const saToken = req.cookies.get("super_admin_token")?.value;
    if (!saToken) {
      return NextResponse.redirect(new URL("/super-admin/login", req.url));
    }

    try {
      const { payload } = await jwtVerify(saToken, secret);
      if (payload.role !== "super_admin") {
        return NextResponse.redirect(new URL("/super-admin/login", req.url));
      }
      return NextResponse.next();
    } catch {
      const response = NextResponse.redirect(new URL("/super-admin/login", req.url));
      response.cookies.delete("super_admin_token");
      return response;
    }
  }

  // Allow public paths, static files, and Next.js internals
  if (
    pathname === "/" ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    // If logged in and visiting "/", redirect to dashboard
    if (pathname === "/") {
      const token = req.cookies.get("auth_token")?.value;
      if (token) {
        try {
          const { payload } = await jwtVerify(token, secret);
          const role = payload.role as string;
          if (role === "doctor" || role === "therapist") {
            return NextResponse.redirect(new URL("/doctor", req.url));
          }
          return NextResponse.redirect(new URL("/dashboard", req.url));
        } catch {
          // Invalid token, show landing page
        }
      }
    }
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
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Doctor/therapist accessing root "/" or "/dashboard" → redirect to doctor portal
    if ((role === "doctor" || role === "therapist") && (pathname === "/" || pathname === "/dashboard")) {
      return NextResponse.redirect(new URL("/doctor", req.url));
    }

    // Logged-in user accessing "/" → redirect to dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
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
