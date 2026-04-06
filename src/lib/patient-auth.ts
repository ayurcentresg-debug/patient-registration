import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");

export interface PatientPayload {
  patientId: string;
  clinicId: string;
  name: string;
  phone: string;
  role: "patient";
}

/**
 * Get the authenticated patient from the patient_token cookie.
 * Returns null if not authenticated.
 */
export async function getPatientAuth(): Promise<PatientPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("patient_token")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "patient") return null;

    return {
      patientId: payload.patientId as string,
      clinicId: payload.clinicId as string,
      name: payload.name as string,
      phone: payload.phone as string,
      role: "patient",
    };
  } catch {
    return null;
  }
}
