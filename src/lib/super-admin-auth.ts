import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret-change-in-production"
);

const SUPER_ADMIN_EMAIL =
  process.env.SUPER_ADMIN_EMAIL || "superadmin@ayurgate.com";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

if (!SUPER_ADMIN_PASSWORD && process.env.NODE_ENV === "production") {
  console.warn("⚠️  SUPER_ADMIN_PASSWORD env var is not set — super admin login disabled in production");
}

export interface SuperAdminPayload {
  email: string;
  role: "super_admin";
}

/** Validate super admin credentials */
export function validateSuperAdminCredentials(
  email: string,
  password: string
): boolean {
  if (!SUPER_ADMIN_PASSWORD) return false;
  return email === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASSWORD;
}

/** Create a signed JWT for the super admin (expires in 12h) */
export async function createSuperAdminToken(): Promise<string> {
  return new SignJWT({ email: SUPER_ADMIN_EMAIL, role: "super_admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

/** Verify and decode the super_admin_token cookie */
export async function getSuperAdminPayload(): Promise<SuperAdminPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("super_admin_token")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "super_admin") return null;

    return payload as unknown as SuperAdminPayload;
  } catch {
    return null;
  }
}

/** Check if the current request is from a super admin */
export async function isSuperAdmin(): Promise<boolean> {
  const payload = await getSuperAdminPayload();
  return payload !== null;
}
