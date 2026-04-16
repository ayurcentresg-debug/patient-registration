import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveModule, canAccess } from "@/lib/permissions";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Feature flag → protected route prefixes mapping
const FEATURE_ROUTE_MAP: [string, string[]][] = [
  ["enableInventory", ["/inventory", "/api/inventory"]],
  ["enablePayroll", ["/payroll", "/api/payroll"]],
  ["enablePackages", ["/packages", "/api/packages"]],
  ["enableReports", ["/reports", "/api/reports"]],
  ["enableMultiBranch", ["/branches", "/api/branches"]],
  ["enableOnlineBooking", ["/book"]],
];

// In-memory cache for platform settings (refreshed every 60s)
let cachedFlags: Record<string, boolean> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds

async function getFeatureFlags(baseUrl: string): Promise<Record<string, boolean>> {
  if (cachedFlags && Date.now() - cacheTime < CACHE_TTL) return cachedFlags;
  try {
    const res = await fetch(`${baseUrl}/api/public/platform`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      cachedFlags = { ...data.features, maintenanceMode: data.maintenanceMode } as Record<string, boolean>;
      cacheTime = Date.now();
      return cachedFlags!;
    }
  } catch {
    // If fetch fails, allow access (fail open)
  }
  return cachedFlags || {};
}

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
  "/api/daily-report",
  "/api/cron",
  "/book",
  "/trial-expired",
  "/portal/login",
  "/api/portal/auth",
  "/review",
  "/api/public/feedback",
  "/api/admin/features",
  "/api/whatsapp/webhook",
  "/terms",
  "/privacy",
  "/api/auth/google",
  "/google-setup",
];

// Paths that require auth but are allowed during onboarding
const ONBOARDING_ALLOWED_PATHS = [
  "/onboarding",
  "/api/onboarding",
  "/api/verify-email",
  "/api/auth/me",
  "/api/settings",
  "/api/upload",
];

// Legacy constants kept for reference — access is now controlled by permissions.ts
// const ADMIN_ONLY_PATHS = ["/admin", "/reports", "/inventory", "/communications", "/billing"];
// const DOCTOR_PATHS = ["/doctor"];

// Paths that receive legitimate cross-origin POSTs (external webhooks, cron)
// and therefore must be exempted from the CSRF Origin check.
const CSRF_EXEMPT_PREFIXES = [
  "/api/stripe/webhook",
  "/api/whatsapp/webhook",
  "/api/cron",
  "/api/daily-report",
];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Rate-limit configuration. Auth surface is locked down tighter than the
// general API to slow brute-force attempts.
const AUTH_RATE_LIMIT_PREFIXES = [
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/super-admin/login",
  "/api/portal/auth",
  "/api/invite/",
];
const AUTH_RATE = { maxRequests: 10, windowMs: 60_000 };
const API_RATE = { maxRequests: 100, windowMs: 60_000 };

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/**
 * CSRF defense via Origin/Referer check.
 * Same-origin browser requests always carry an Origin header on mutating
 * methods; forged cross-site requests either carry a foreign Origin or none
 * at all (for legacy clients). Reject both.
 */
function failsCsrfCheck(req: NextRequest): boolean {
  if (!MUTATING_METHODS.has(req.method)) return false;
  if (!req.nextUrl.pathname.startsWith("/api/")) return false;
  if (CSRF_EXEMPT_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p))) return false;

  const expectedHost = req.headers.get("host");
  if (!expectedHost) return true;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host !== expectedHost;
    } catch {
      return true;
    }
  }

  // No Origin header — fall back to Referer
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host !== expectedHost;
    } catch {
      return true;
    }
  }

  // Mutating request with neither Origin nor Referer → reject
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── CSRF defense: block mutating API requests from foreign origins ──
  if (failsCsrfCheck(req)) {
    return NextResponse.json(
      { error: "CSRF check failed: request origin not allowed" },
      { status: 403 }
    );
  }

  // ── Rate limiting: protect /api/* against brute-force and abuse ─────
  if (pathname.startsWith("/api/")) {
    const isAuthRoute = AUTH_RATE_LIMIT_PREFIXES.some((p) => pathname.startsWith(p));
    const opts = isAuthRoute ? AUTH_RATE : API_RATE;
    const bucket = isAuthRoute ? "auth" : "api";
    const ip = clientIp(req);
    const limit = checkRateLimit(ip, bucket, opts);
    if (!limit.allowed) {
      const retrySec = Math.max(1, Math.ceil(limit.retryAfterMs / 1000));
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retrySec),
            "X-RateLimit-Limit": String(opts.maxRequests),
            "X-RateLimit-Window": String(opts.windowMs),
          },
        }
      );
    }
  }

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
    // If logged in and visiting "/", redirect appropriately
    if (pathname === "/") {
      const token = req.cookies.get("auth_token")?.value;
      if (token) {
        try {
          const { payload } = await jwtVerify(token, secret);
          const role = payload.role as string;
          // New registrations → dashboard (setup checklist guides them)
          if (role === "admin" && payload.onboardingComplete === false) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
          }
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

  // ── Patient Portal routes ───────────────────────────────────────
  if (pathname.startsWith("/portal") || pathname.startsWith("/api/portal")) {
    // Public: login page and auth APIs are already in PUBLIC_PATHS
    if (pathname === "/portal/login" || pathname.startsWith("/api/portal/auth")) {
      return NextResponse.next();
    }

    const patientToken = req.cookies.get("patient_token")?.value;
    if (!patientToken) {
      if (pathname.startsWith("/api/portal")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/portal/login", req.url));
    }

    try {
      await jwtVerify(patientToken, secret);
      return NextResponse.next();
    } catch {
      const response = pathname.startsWith("/api/portal")
        ? NextResponse.json({ error: "Session expired" }, { status: 401 })
        : NextResponse.redirect(new URL("/portal/login", req.url));
      response.cookies.delete("patient_token");
      return response;
    }
  }

  // ── Maintenance mode & Feature flag check ────────────────────────
  const baseUrl = req.nextUrl.origin;
  const flags = await getFeatureFlags(baseUrl);

  // Maintenance mode: block all tenant pages/APIs (except login, super-admin, public)
  if (flags.maintenanceMode) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Platform is under maintenance. Please try again later." }, { status: 503 });
    }
    // Return a simple maintenance page for browser requests
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Maintenance</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;">
        <div style="text-align:center;max-width:440px;padding:40px;">
          <div style="font-size:48px;margin-bottom:16px;">&#128679;</div>
          <h1 style="font-size:24px;color:#111827;margin:0 0 8px;">Under Maintenance</h1>
          <p style="color:#6b7280;font-size:15px;">We're performing scheduled maintenance. Please check back shortly.</p>
        </div>
      </body></html>`,
      { status: 503, headers: { "Content-Type": "text/html" } }
    );
  }

  // Feature flag enforcement: block disabled module routes
  for (const [flag, routes] of FEATURE_ROUTE_MAP) {
    if (flags[flag] === false && routes.some((r) => pathname.startsWith(r))) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "This feature is not enabled on your plan." }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  const token = req.cookies.get("auth_token")?.value;

  // Allow super admins to access any API route (they use super_admin_token)
  if (!token && pathname.startsWith("/api/")) {
    const saToken = req.cookies.get("super_admin_token")?.value;
    if (saToken) {
      try {
        const { payload } = await jwtVerify(saToken, secret);
        if (payload.role === "super_admin") {
          return NextResponse.next();
        }
      } catch {
        // Invalid super admin token, fall through to normal auth
      }
    }
  }

  if (!token) {
    // Allow super admins to access tenant pages (e.g. /cme/admin)
    const saToken = req.cookies.get("super_admin_token")?.value;
    if (saToken) {
      try {
        const { payload } = await jwtVerify(saToken, secret);
        if (payload.role === "super_admin") {
          return NextResponse.next();
        }
      } catch {
        // Invalid super admin token, fall through to login redirect
      }
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    const onboardingComplete = payload.onboardingComplete as boolean | undefined;

    // ── New registrations go to dashboard (setup checklist guides them) ─────
    // No onboarding gate — all pages accessible immediately

    // If user is on /onboarding but already completed → redirect to dashboard
    if (pathname.startsWith("/onboarding") && onboardingComplete !== false) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // ── RBAC: check module-level permissions ──────────────────────────────
    const module = resolveModule(pathname);
    if (module) {
      if (!canAccess(role, module)) {
        // Redirect to appropriate dashboard based on role
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "You don't have permission to access this resource." },
            { status: 403 }
          );
        }
        const hasDoctorPortal = canAccess(role, "doctor_portal");
        return NextResponse.redirect(
          new URL(hasDoctorPortal ? "/doctor" : "/dashboard", req.url)
        );
      }
    }

    // Doctor/therapist accessing root "/" or "/dashboard" → redirect to doctor portal
    if (canAccess(role, "doctor_portal") && (pathname === "/" || pathname === "/dashboard")) {
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
