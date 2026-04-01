import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/treatment-plans - List treatment plans with filters
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const doctorId = searchParams.get("doctorId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { diagnosis: { contains: search } },
        { planNumber: { contains: search } },
      ];
    }

    const [plans, total] = await Promise.all([
      db.treatmentPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, patientIdNumber: true },
          },
          _count: { select: { items: true } },
        },
      }),
      db.treatmentPlan.count({ where }),
    ]);

    return NextResponse.json({
      plans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/treatment-plans error:", error);
    return NextResponse.json({ error: "Failed to fetch treatment plans" }, { status: 500 });
  }
}

// POST /api/treatment-plans - Create new treatment plan
export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();

    if (!body.patientId || !body.doctorName || !body.name) {
      return NextResponse.json(
        { error: "patientId, doctorName, and name are required" },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await db.patient.findUnique({ where: { id: body.patientId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Auto-generate planNumber: TP-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `TP-${yearMonth}-`;
    const lastPlan = await db.treatmentPlan.findFirst({
      where: { planNumber: { startsWith: prefix } },
      orderBy: { planNumber: "desc" },
    });
    let nextNum = 1;
    if (lastPlan) {
      const lastNum = parseInt(lastPlan.planNumber.split("-").pop() || "0");
      nextNum = lastNum + 1;
    }
    const planNumber = `${prefix}${String(nextNum).padStart(4, "0")}`;

    // Prepare items
    const items = (body.items || []).map((item: {
      treatmentId?: string;
      treatmentName: string;
      category?: string;
      frequency: string;
      totalSessions: number;
      sessionPrice?: number;
      sequence?: number;
      notes?: string;
      startDate?: string;
      endDate?: string;
    }, idx: number) => {
      const sessionPrice = Math.round((item.sessionPrice || 0) * 100) / 100;
      const totalCost = Math.round(item.totalSessions * sessionPrice * 100) / 100;
      return {
        treatmentId: item.treatmentId || null,
        treatmentName: item.treatmentName,
        category: item.category || null,
        frequency: item.frequency,
        totalSessions: item.totalSessions,
        sessionPrice,
        totalCost,
        sequence: item.sequence ?? idx,
        notes: item.notes || null,
        startDate: item.startDate ? new Date(item.startDate) : null,
        endDate: item.endDate ? new Date(item.endDate) : null,
      };
    });

    // Calculate plan totals
    const totalSessions = items.reduce((sum: number, i: { totalSessions: number }) => sum + i.totalSessions, 0);
    const totalCost = Math.round(items.reduce((sum: number, i: { totalCost: number }) => sum + i.totalCost, 0) * 100) / 100;

    // Prepare milestones
    const milestones = (body.milestones || []).map((m: {
      title: string;
      description?: string;
      targetDate?: string;
      notes?: string;
    }) => ({
      title: m.title,
      description: m.description || null,
      targetDate: m.targetDate ? new Date(m.targetDate) : null,
      notes: m.notes || null,
    }));

    // Create in transaction
    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.treatmentPlan.create({
        data: {
          planNumber,
          patientId: body.patientId,
          doctorId: body.doctorId || null,
          doctorName: body.doctorName,
          name: body.name.trim(),
          description: body.description?.trim() || null,
          diagnosis: body.diagnosis?.trim() || null,
          goals: body.goals?.trim() || null,
          startDate: body.startDate ? new Date(body.startDate) : new Date(),
          endDate: body.endDate ? new Date(body.endDate) : null,
          totalSessions,
          totalCost,
          notes: body.notes?.trim() || null,
          items: { create: items },
          milestones: { create: milestones },
        },
        include: {
          items: { orderBy: { sequence: "asc" } },
          milestones: { orderBy: { targetDate: "asc" } },
          patient: {
            select: { id: true, firstName: true, lastName: true, patientIdNumber: true },
          },
        },
      });
      return created;
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("POST /api/treatment-plans error:", error);
    return NextResponse.json({ error: "Failed to create treatment plan" }, { status: 500 });
  }
}
