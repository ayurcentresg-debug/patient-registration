import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Helper: recalculate plan totals from items
async function recalcPlanTotals(planId: string) {
  const items = await prisma.treatmentPlanItem.findMany({ where: { planId } });
  const totalSessions = items.reduce((sum, i) => sum + i.totalSessions, 0);
  const completedSessions = items.reduce((sum, i) => sum + i.completedSessions, 0);
  const totalCost = Math.round(items.reduce((sum, i) => sum + i.totalCost, 0) * 100) / 100;

  await prisma.treatmentPlan.update({
    where: { id: planId },
    data: { totalSessions, completedSessions, totalCost },
  });
}

// POST /api/treatment-plans/[id]/items - Add item to plan
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const plan = await prisma.treatmentPlan.findUnique({ where: { id } });
    if (!plan) {
      return NextResponse.json({ error: "Treatment plan not found" }, { status: 404 });
    }

    if (!body.treatmentName || !body.frequency || !body.totalSessions) {
      return NextResponse.json(
        { error: "treatmentName, frequency, and totalSessions are required" },
        { status: 400 }
      );
    }

    const sessionPrice = Math.round((body.sessionPrice || 0) * 100) / 100;
    const totalCost = Math.round(body.totalSessions * sessionPrice * 100) / 100;

    const item = await prisma.treatmentPlanItem.create({
      data: {
        planId: id,
        treatmentId: body.treatmentId || null,
        treatmentName: body.treatmentName,
        category: body.category || null,
        frequency: body.frequency,
        totalSessions: body.totalSessions,
        sessionPrice,
        totalCost,
        sequence: body.sequence ?? 0,
        notes: body.notes || null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    await recalcPlanTotals(id);

    const updatedPlan = await prisma.treatmentPlan.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sequence: "asc" } },
        milestones: { orderBy: { targetDate: "asc" } },
      },
    });

    return NextResponse.json({ item, plan: updatedPlan }, { status: 201 });
  } catch (error) {
    console.error("POST /api/treatment-plans/[id]/items error:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

// PUT /api/treatment-plans/[id]/items - Update item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const existing = await prisma.treatmentPlanItem.findUnique({ where: { id: body.itemId } });
    if (!existing || existing.planId !== id) {
      return NextResponse.json({ error: "Item not found in this plan" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (body.completedSessions !== undefined) data.completedSessions = body.completedSessions;
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.frequency !== undefined) data.frequency = body.frequency;

    // Auto-update item status based on completedSessions
    if (body.completedSessions !== undefined) {
      if (body.completedSessions >= existing.totalSessions) {
        data.status = "completed";
      } else if (body.completedSessions > 0 && existing.status === "pending") {
        data.status = "in_progress";
      }
    }

    const item = await prisma.treatmentPlanItem.update({
      where: { id: body.itemId },
      data,
    });

    // Recalculate plan totals if sessions changed
    if (body.completedSessions !== undefined) {
      await recalcPlanTotals(id);

      // Check if all items completed → update plan status
      const allItems = await prisma.treatmentPlanItem.findMany({ where: { planId: id } });
      const allCompleted = allItems.every((i) => i.status === "completed" || i.status === "skipped");
      if (allCompleted && allItems.length > 0) {
        await prisma.treatmentPlan.update({
          where: { id },
          data: { status: "completed", endDate: new Date() },
        });
      }
    }

    const updatedPlan = await prisma.treatmentPlan.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sequence: "asc" } },
        milestones: { orderBy: { targetDate: "asc" } },
      },
    });

    return NextResponse.json({ item, plan: updatedPlan });
  } catch (error) {
    console.error("PUT /api/treatment-plans/[id]/items error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

// DELETE /api/treatment-plans/[id]/items - Remove item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "itemId query parameter is required" }, { status: 400 });
    }

    const existing = await prisma.treatmentPlanItem.findUnique({ where: { id: itemId } });
    if (!existing || existing.planId !== id) {
      return NextResponse.json({ error: "Item not found in this plan" }, { status: 404 });
    }

    if (existing.completedSessions > 0) {
      return NextResponse.json(
        { error: "Cannot delete item with completed sessions" },
        { status: 400 }
      );
    }

    await prisma.treatmentPlanItem.delete({ where: { id: itemId } });
    await recalcPlanTotals(id);

    const updatedPlan = await prisma.treatmentPlan.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sequence: "asc" } },
        milestones: { orderBy: { targetDate: "asc" } },
      },
    });

    return NextResponse.json({ message: "Item deleted", plan: updatedPlan });
  } catch (error) {
    console.error("DELETE /api/treatment-plans/[id]/items error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
