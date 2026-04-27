/**
 * Per-branch holidays — separate from doctor leave.
 *
 * GET    /api/branches/[id]/holidays                — list all holidays for this branch
 * POST   /api/branches/[id]/holidays                — add holiday { date, name, recurring?, notes? }
 * DELETE /api/branches/[id]/holidays?holidayId=xxx  — remove holiday
 *
 * Notes:
 *  - `recurring: true` means the same MM-DD repeats every year (Diwali, Christmas).
 *  - The (branchId + date + name) uniqueness prevents duplicate entries.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: branchId } = await params;
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const holidays = await db.branchHoliday.findMany({
      where: { branchId },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(holidays);
  } catch (err) {
    console.error("GET holidays error:", err);
    return NextResponse.json({ error: "Failed to load holidays" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: branchId } = await params;
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    if (!body.date || !body.name) {
      return NextResponse.json({ error: "date and name are required" }, { status: 400 });
    }

    const created = await db.branchHoliday.create({
      data: {
        branchId,
        date: new Date(body.date),
        name: String(body.name).trim(),
        recurring: !!body.recurring,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    // Unique constraint violation = same date+name+branch already exists
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "This holiday already exists for this branch" }, { status: 409 });
    }
    console.error("POST holiday error:", err);
    return NextResponse.json({ error: "Failed to create holiday" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: branchId } = await params;
  const holidayId = request.nextUrl.searchParams.get("holidayId");
  if (!holidayId) {
    return NextResponse.json({ error: "holidayId query param required" }, { status: 400 });
  }
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    // Verify it belongs to this branch
    const existing = await db.branchHoliday.findFirst({ where: { id: holidayId, branchId } });
    if (!existing) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    }
    await db.branchHoliday.delete({ where: { id: holidayId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE holiday error:", err);
    return NextResponse.json({ error: "Failed to delete holiday" }, { status: 500 });
  }
}
