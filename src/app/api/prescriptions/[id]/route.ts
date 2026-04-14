import { prisma } from "@/lib/db";
import { getClinicId, requireRole } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

const PRESCRIBER_ROLES = ["admin", "doctor", "pharmacist"];

// GET /api/prescriptions/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const prescription = await db.prescription.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sequence: "asc" } },
        patient: { select: { firstName: true, lastName: true, patientIdNumber: true, phone: true, dateOfBirth: true, gender: true, allergies: true } },
      },
    });
    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }
    return NextResponse.json(prescription);
  } catch (error) {
    console.error("GET /api/prescriptions/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch prescription" }, { status: 500 });
  }
}

// PUT /api/prescriptions/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await requireRole(PRESCRIBER_ROLES);
    if (!payload) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();
    const { status, diagnosis, notes, items } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (notes !== undefined) updateData.notes = notes;

    // If items provided, replace all items
    if (items && Array.isArray(items)) {
      await db.prescriptionItem.deleteMany({ where: { prescriptionId: id } });
      await db.prescriptionItem.createMany({
        data: items.map((item: {
          medicineName: string;
          inventoryItemId?: string;
          dosage: string;
          frequency: string;
          timing?: string;
          duration: string;
          quantity?: number;
          instructions?: string;
        }, idx: number) => ({
          prescriptionId: id,
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
      });
    }

    const prescription = await db.prescription.update({
      where: { id },
      data: updateData,
      include: { items: { orderBy: { sequence: "asc" } } },
    });

    return NextResponse.json(prescription);
  } catch (error) {
    console.error("PUT /api/prescriptions/[id] error:", error);
    return NextResponse.json({ error: "Failed to update prescription" }, { status: 500 });
  }
}

// DELETE /api/prescriptions/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await requireRole(PRESCRIBER_ROLES);
    if (!payload) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    await db.prescription.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/prescriptions/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete prescription" }, { status: 500 });
  }
}
