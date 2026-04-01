import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

function substituteVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { body, patientId } = await request.json();

    if (!body) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    let variables: Record<string, string>;

    if (patientId) {
      const patient = await db.patient.findUnique({ where: { id: patientId } });
      if (!patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }

      variables = {
        patientName: `${patient.firstName} ${patient.lastName}`,
        appointmentDate: "27 Mar 2026",
        doctorName: "Dr. Smith",
        clinicName: "Ayurveda Clinic",
        amount: "S$100.00",
        time: "10:00 AM",
      };
    } else {
      variables = {
        patientName: "John Doe",
        appointmentDate: "27 Mar 2026",
        doctorName: "Dr. Smith",
        clinicName: "Ayurveda Clinic",
        amount: "S$100.00",
        time: "10:00 AM",
      };
    }

    const preview = substituteVariables(body, variables);

    return NextResponse.json({ preview });
  } catch (error) {
    console.error("[Templates Preview] Error:", error);
    return NextResponse.json({ error: "Failed to preview template" }, { status: 500 });
  }
}
