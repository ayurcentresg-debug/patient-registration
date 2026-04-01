import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/treatment-plans/[id] - Get single plan with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const plan = await db.treatmentPlan.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sequence: "asc" } },
        milestones: { orderBy: { targetDate: "asc" } },
        patient: {
          select: { id: true, firstName: true, lastName: true, patientIdNumber: true, phone: true, email: true },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Treatment plan not found" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("GET /api/treatment-plans/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch treatment plan" }, { status: 500 });
  }
}

// PUT /api/treatment-plans/[id] - Update plan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.treatmentPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Treatment plan not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name.trim();
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.diagnosis !== undefined) data.diagnosis = body.diagnosis?.trim() || null;
    if (body.goals !== undefined) data.goals = body.goals?.trim() || null;
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

    // Handle status changes
    if (body.status !== undefined && body.status !== existing.status) {
      data.status = body.status;
      if (body.status === "completed" && !existing.endDate && !body.endDate) {
        data.endDate = new Date();
      }
    }

    const plan = await db.treatmentPlan.update({
      where: { id },
      data,
      include: {
        items: { orderBy: { sequence: "asc" } },
        milestones: { orderBy: { targetDate: "asc" } },
        patient: {
          select: { id: true, firstName: true, lastName: true, patientIdNumber: true },
        },
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("PUT /api/treatment-plans/[id] error:", error);
    return NextResponse.json({ error: "Failed to update treatment plan" }, { status: 500 });
  }
}

// DELETE /api/treatment-plans/[id] - Delete plan (only if no completed sessions)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const existing = await db.treatmentPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Treatment plan not found" }, { status: 404 });
    }

    if (existing.completedSessions > 0) {
      return NextResponse.json(
        { error: "Cannot delete plan with completed sessions. Consider cancelling instead." },
        { status: 400 }
      );
    }

    await db.treatmentPlan.delete({ where: { id } });
    return NextResponse.json({ message: "Treatment plan deleted" });
  } catch (error) {
    console.error("DELETE /api/treatment-plans/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete treatment plan" }, { status: 500 });
  }
}
