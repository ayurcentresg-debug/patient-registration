import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface SuperAdminPayload {
  email: string;
  role: "super_admin";
}

/** Validate super admin credentials */
export function validateSuperAdminCredentials(
  email: string,
  password: string
): boolean {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || "ayurgate@gmail.com";
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "Veda@2026";
  return email === adminEmail && password === adminPassword;
}

/** Create a signed JWT for the super admin (expires in 12h) */
export async function createSuperAdminToken(): Promise<string> {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || "ayurgate@gmail.com";
  return new SignJWT({ email: adminEmail, role: "super_admin" })
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
