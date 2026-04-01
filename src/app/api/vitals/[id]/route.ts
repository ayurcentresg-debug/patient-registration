import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const vital = await db.vital.findUnique({ where: { id } });
    if (!vital) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(vital);
  } catch (error) {
    console.error("GET /api/vitals/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch vital" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.vital.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Determine final weight and height for BMI recalculation
    const finalWeight = body.weight !== undefined ? body.weight : existing.weight;
    const finalHeight = body.height !== undefined ? body.height : existing.height;

    // Recalculate BMI if weight or height changed and both are present
    let bmi: number | null = existing.bmi;
    if (body.weight !== undefined || body.height !== undefined) {
      if (finalWeight && finalHeight) {
        const heightInMeters = finalHeight / 100;
        bmi = Math.round((finalWeight / (heightInMeters * heightInMeters)) * 10) / 10;
      } else {
        bmi = null;
      }
    }

    const vital = await db.vital.update({
      where: { id },
      data: {
        ...(body.appointmentId !== undefined && { appointmentId: body.appointmentId || null }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.bloodPressureSys !== undefined && { bloodPressureSys: body.bloodPressureSys }),
        ...(body.bloodPressureDia !== undefined && { bloodPressureDia: body.bloodPressureDia }),
        ...(body.pulse !== undefined && { pulse: body.pulse }),
        ...(body.temperature !== undefined && { temperature: body.temperature }),
        ...(body.weight !== undefined && { weight: body.weight }),
        ...(body.height !== undefined && { height: body.height }),
        bmi,
        ...(body.oxygenSaturation !== undefined && { oxygenSaturation: body.oxygenSaturation }),
        ...(body.respiratoryRate !== undefined && { respiratoryRate: body.respiratoryRate }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        ...(body.recordedBy !== undefined && { recordedBy: body.recordedBy || null }),
      },
    });
    return NextResponse.json(vital);
  } catch (error) {
    console.error("PUT /api/vitals/[id] error:", error);
    return NextResponse.json({ error: "Failed to update vital" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const existing = await db.vital.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.vital.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/vitals/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete vital" }, { status: 500 });
  }
}
