import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/prescriptions/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prescription = await prisma.prescription.findUnique({
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
    const { id } = await params;
    const body = await request.json();
    const { status, diagnosis, notes, items } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (notes !== undefined) updateData.notes = notes;

    // If items provided, replace all items
    if (items && Array.isArray(items)) {
      await prisma.prescriptionItem.deleteMany({ where: { prescriptionId: id } });
      await prisma.prescriptionItem.createMany({
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

    const prescription = await prisma.prescription.update({
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
    const { id } = await params;
    await prisma.prescription.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/prescriptions/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete prescription" }, { status: 500 });
  }
}
