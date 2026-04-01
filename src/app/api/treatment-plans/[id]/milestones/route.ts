import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// POST /api/treatment-plans/[id]/milestones - Add milestone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    const plan = await db.treatmentPlan.findUnique({ where: { id } });
    if (!plan) {
      return NextResponse.json({ error: "Treatment plan not found" }, { status: 404 });
    }

    if (!body.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const milestone = await db.treatmentMilestone.create({
      data: {
        planId: id,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
        notes: body.notes?.trim() || null,
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error("POST /api/treatment-plans/[id]/milestones error:", error);
    return NextResponse.json({ error: "Failed to add milestone" }, { status: 500 });
  }
}

// PUT /api/treatment-plans/[id]/milestones - Update milestone
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    if (!body.milestoneId) {
      return NextResponse.json({ error: "milestoneId is required" }, { status: 400 });
    }

    const existing = await db.treatmentMilestone.findUnique({ where: { id: body.milestoneId } });
    if (!existing || existing.planId !== id) {
      return NextResponse.json({ error: "Milestone not found in this plan" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = body.title.trim();
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.targetDate !== undefined) data.targetDate = body.targetDate ? new Date(body.targetDate) : null;
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === "achieved" && !existing.achievedDate) {
        data.achievedDate = new Date();
      }
    }
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

    const milestone = await db.treatmentMilestone.update({
      where: { id: body.milestoneId },
      data,
    });

    return NextResponse.json(milestone);
  } catch (error) {
    console.error("PUT /api/treatment-plans/[id]/milestones error:", error);
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
  }
}

// DELETE /api/treatment-plans/[id]/milestones - Remove milestone
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get("milestoneId");

    if (!milestoneId) {
      return NextResponse.json({ error: "milestoneId query parameter is required" }, { status: 400 });
    }

    const existing = await db.treatmentMilestone.findUnique({ where: { id: milestoneId } });
    if (!existing || existing.planId !== id) {
      return NextResponse.json({ error: "Milestone not found in this plan" }, { status: 404 });
    }

    await db.treatmentMilestone.delete({ where: { id: milestoneId } });
    return NextResponse.json({ message: "Milestone deleted" });
  } catch (error) {
    console.error("DELETE /api/treatment-plans/[id]/milestones error:", error);
    return NextResponse.json({ error: "Failed to delete milestone" }, { status: 500 });
  }
}
