import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const patientId = request.nextUrl.searchParams.get("patientId");
    if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);

    const vitals = await prisma.vital.findMany({
      where: { patientId },
      orderBy: { date: "desc" },
      take: limit,
    });
    return NextResponse.json(vitals);
  } catch (error) {
    console.error("GET /api/vitals error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

    // Auto-calculate BMI if both weight (kg) and height (cm) are provided
    let bmi: number | null = null;
    if (body.weight && body.height) {
      const heightInMeters = body.height / 100;
      bmi = Math.round((body.weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }

    const vital = await prisma.vital.create({
      data: {
        patientId: body.patientId,
        appointmentId: body.appointmentId || null,
        date: body.date ? new Date(body.date) : new Date(),
        bloodPressureSys: body.bloodPressureSys ?? null,
        bloodPressureDia: body.bloodPressureDia ?? null,
        pulse: body.pulse ?? null,
        temperature: body.temperature ?? null,
        weight: body.weight ?? null,
        height: body.height ?? null,
        bmi,
        oxygenSaturation: body.oxygenSaturation ?? null,
        respiratoryRate: body.respiratoryRate ?? null,
        notes: body.notes || null,
        recordedBy: body.recordedBy || null,
      },
    });
    return NextResponse.json(vital, { status: 201 });
  } catch (error) {
    console.error("POST /api/vitals error:", error);
    return NextResponse.json({ error: "Failed to create vital record" }, { status: 500 });
  }
}
