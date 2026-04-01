import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// POST /api/treatment-plans/[id]/progress - Record session progress
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    if (!body.itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const plan = await db.treatmentPlan.findUnique({ where: { id } });
    if (!plan) {
      return NextResponse.json({ error: "Treatment plan not found" }, { status: 404 });
    }

    const item = await db.treatmentPlanItem.findUnique({ where: { id: body.itemId } });
    if (!item || item.planId !== id) {
      return NextResponse.json({ error: "Item not found in this plan" }, { status: 404 });
    }

    if (item.status === "completed") {
      return NextResponse.json({ error: "Item is already completed" }, { status: 400 });
    }

    // Increment completedSessions by 1
    const newCompleted = item.completedSessions + 1;
    let newStatus = item.status;

    if (newStatus === "pending") {
      newStatus = "in_progress";
    }
    if (newCompleted >= item.totalSessions) {
      newStatus = "completed";
    }

    await db.treatmentPlanItem.update({
      where: { id: body.itemId },
      data: {
        completedSessions: newCompleted,
        status: newStatus,
        notes: body.notes ? (item.notes ? `${item.notes}\n${body.notes}` : body.notes) : item.notes,
      },
    });

    // Recalculate plan completedSessions
    const allItems = await db.treatmentPlanItem.findMany({ where: { planId: id } });
    const planCompletedSessions = allItems.reduce((sum, i) => {
      // Use updated value for the current item
      if (i.id === body.itemId) return sum + newCompleted;
      return sum + i.completedSessions;
    }, 0);

    // Check if all items completed
    const allCompleted = allItems.every((i) => {
      if (i.id === body.itemId) return newStatus === "completed" || newStatus === "skipped";
      return i.status === "completed" || i.status === "skipped";
    });

    const planUpdate: Record<string, unknown> = { completedSessions: planCompletedSessions };
    if (allCompleted && allItems.length > 0) {
      planUpdate.status = "completed";
      if (!plan.endDate) planUpdate.endDate = new Date();
    }

    await db.treatmentPlan.update({
      where: { id },
      data: planUpdate,
    });

    // Return updated plan with items
    const updatedPlan = await db.treatmentPlan.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sequence: "asc" } },
        milestones: { orderBy: { targetDate: "asc" } },
        patient: {
          select: { id: true, firstName: true, lastName: true, patientIdNumber: true },
        },
      },
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error("POST /api/treatment-plans/[id]/progress error:", error);
    return NextResponse.json({ error: "Failed to record progress" }, { status: 500 });
  }
}
