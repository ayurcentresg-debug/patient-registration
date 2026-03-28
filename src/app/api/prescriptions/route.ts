import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/prescriptions?patientId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const prescriptions = await prisma.prescription.findMany({
      where,
      include: { items: { orderBy: { sequence: "asc" } } },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(prescriptions);
  } catch (error) {
    console.error("GET /api/prescriptions error:", error);
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}

// POST /api/prescriptions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, doctorId, doctorName, diagnosis, notes, items } = body;

    if (!patientId || !doctorName || !items || items.length === 0) {
      return NextResponse.json({ error: "Patient, doctor, and at least one medicine are required" }, { status: 400 });
    }

    // Generate prescription number: RX-YYYYMM-XXXX
    const now = new Date();
    const prefix = `RX-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const count = await prisma.prescription.count({
      where: { prescriptionNo: { startsWith: prefix } },
    });
    const prescriptionNo = `${prefix}-${String(count + 1).padStart(4, "0")}`;

    const prescription = await prisma.prescription.create({
      data: {
        prescriptionNo,
        patientId,
        doctorId: doctorId || null,
        doctorName,
        diagnosis: diagnosis || null,
        notes: notes || null,
        items: {
          create: items.map((item: {
            medicineName: string;
            inventoryItemId?: string;
            dosage: string;
            frequency: string;
            timing?: string;
            duration: string;
            quantity?: number;
            instructions?: string;
          }, idx: number) => ({
            medicineName: item.medicineName,
            inventoryItemId: item.inventoryItemId || null,
            dosage: item.dosage,
            frequency: item.frequency,
            timing: item.timing || null,
            duration: item.duration,
            quantity: item.quantity || null,
            instructions: item.instructions || null,
            sequence: idx,
          })),
        },
      },
      include: { items: { orderBy: { sequence: "asc" } } },
    });

    return NextResponse.json(prescription, { status: 201 });
  } catch (error) {
    console.error("POST /api/prescriptions error:", error);
    return NextResponse.json({ error: "Failed to create prescription" }, { status: 500 });
  }
}
