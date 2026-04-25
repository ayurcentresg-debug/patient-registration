import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { createReciprocalLink, deleteReciprocalLink, syncReciprocalLink } from "@/lib/family-reciprocal";

// GET /api/patients/:id/family — list family members
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const members = await db.familyMember.findMany({
      where: { patientId: id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(members);
  } catch {
    return NextResponse.json({ error: "Failed to fetch family members" }, { status: 500 });
  }
}

// POST /api/patients/:id/family — add a family member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();

    if (!body.relation || !body.memberName) {
      return NextResponse.json({ error: "relation and memberName are required" }, { status: 400 });
    }

    // If linking to existing patient, fetch their details
    let memberGender = body.memberGender || null;
    let memberName = body.memberName;
    let memberPhone = body.memberPhone || null;

    if (body.linkedPatientId) {
      const linked = await db.patient.findUnique({
        where: { id: body.linkedPatientId },
        select: { firstName: true, lastName: true, phone: true, gender: true },
      });
      if (linked) {
        memberName = `${linked.firstName} ${linked.lastName}`;
        memberPhone = memberPhone || linked.phone;
        memberGender = linked.gender || memberGender;
      }
    }

    const member = await db.familyMember.create({
      data: {
        patientId: id,
        relation: body.relation,
        linkedPatientId: body.linkedPatientId || null,
        memberName,
        memberPhone,
        memberGender,
      },
    });

    // Create the reciprocal row (only if linkedPatientId is set; idempotent)
    try {
      await createReciprocalLink(db, member);
    } catch (e) {
      // Don't fail the user's add if reciprocal creation hits an issue —
      // log and continue. Backfill endpoint can heal it later.
      console.error("Reciprocal link creation failed:", e);
    }

    return NextResponse.json(member, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add family member" }, { status: 500 });
  }
}

// PUT /api/patients/:id/family — update an existing family member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { memberId, relation, memberName, memberPhone, memberGender, linkedPatientId } = body;

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    // Verify it belongs to this patient
    const existing = await db.familyMember.findFirst({
      where: { id: memberId, patientId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Family member not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (relation) updateData.relation = relation;
    if (memberName !== undefined) updateData.memberName = memberName;
    if (memberPhone !== undefined) updateData.memberPhone = memberPhone || null;
    if (memberGender !== undefined) updateData.memberGender = memberGender || null;
    if (linkedPatientId !== undefined) updateData.linkedPatientId = linkedPatientId || null;

    // If changing linkedPatientId, refresh details from linked patient
    if (linkedPatientId) {
      const linked = await db.patient.findUnique({
        where: { id: linkedPatientId },
        select: { firstName: true, lastName: true, phone: true, gender: true },
      });
      if (linked) {
        updateData.memberName = `${linked.firstName} ${linked.lastName}`;
        updateData.memberPhone = linked.phone;
        updateData.memberGender = linked.gender || null;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (db.familyMember.update as any)({
      where: { id: memberId },
      data: updateData,
    });

    // Sync reciprocal row to match (handles link change, relation change,
    // link removal, and link addition).
    try {
      await syncReciprocalLink(db, updated, existing.linkedPatientId, existing.relation);
    } catch (e) {
      console.error("Reciprocal link sync failed:", e);
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update family member" }, { status: 500 });
  }
}

// DELETE /api/patients/:id/family — remove a family member by memberId query param
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const memberId = request.nextUrl.searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "memberId query param required" }, { status: 400 });
  }

  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    // Verify it belongs to this patient
    const member = await db.familyMember.findFirst({
      where: { id: memberId, patientId: id },
    });
    if (!member) {
      return NextResponse.json({ error: "Family member not found" }, { status: 404 });
    }

    // Remove the reciprocal row first (if any) — best-effort
    try {
      await deleteReciprocalLink(db, member);
    } catch (e) {
      console.error("Reciprocal link deletion failed:", e);
    }

    await db.familyMember.delete({ where: { id: memberId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove family member" }, { status: 500 });
  }
}
