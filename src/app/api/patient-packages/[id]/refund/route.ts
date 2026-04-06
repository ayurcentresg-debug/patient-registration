import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_FEE = 100; // S$100 CaseTrust admin fee

// Helper: count working days between two dates (Mon-Fri)
function workingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// POST /api/patient-packages/[id]/refund - Process refund request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    const pkg = await db.patientPackage.findUnique({
      where: { id },
      include: {
        sessions: { where: { status: "completed" } },
      },
    });

    if (!pkg) {
      return NextResponse.json(
        { error: "Patient package not found" },
        { status: 404 }
      );
    }

    if (pkg.status === "refunded") {
      return NextResponse.json(
        { error: "Package has already been refunded" },
        { status: 400 }
      );
    }

    if (pkg.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot refund a cancelled package" },
        { status: 400 }
      );
    }

    const requestDate = new Date();
    const purchaseDate = new Date(pkg.purchaseDate);
    const firstTreatmentDate = pkg.firstSessionDate
      ? new Date(pkg.firstSessionDate)
      : null;

    // Determine refund type based on CaseTrust policy
    const workingDaysSincePurchase = workingDaysBetween(purchaseDate, requestDate);

    let refundType: string;
    let adminFee = 0;
    let completedSessionsValue = 0;
    let refundAmount = 0;

    if (workingDaysSincePurchase <= 5) {
      // Within 5 working days of purchase = cooling-off period = full refund
      refundType = "cooling_off";
      refundAmount = pkg.paidAmount;
    } else if (
      firstTreatmentDate &&
      workingDaysBetween(firstTreatmentDate, requestDate) <= 5
    ) {
      // After cooling-off, within 5 days of first treatment
      refundType = "after_cooling_off_within_5days";
      completedSessionsValue = pkg.usedSessions * pkg.pricePerSession;
      completedSessionsValue = Math.round(completedSessionsValue * 100) / 100;
      refundAmount = pkg.paidAmount - completedSessionsValue;
    } else {
      // Beyond 5 days after first treatment
      refundType = "beyond_5days";
      completedSessionsValue = pkg.usedSessions * pkg.pricePerSession;
      completedSessionsValue = Math.round(completedSessionsValue * 100) / 100;
      adminFee = ADMIN_FEE;
      refundAmount = pkg.paidAmount - completedSessionsValue - adminFee;
    }

    // Refund cannot be negative
    refundAmount = Math.max(0, Math.round(refundAmount * 100) / 100);

    // Auto-generate refund number: REF-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const refPrefix = `REF-${yearMonth}-`;

    const lastRefund = await db.packageRefund.findFirst({
      where: {
        refundNumber: { startsWith: refPrefix },
      },
      orderBy: { refundNumber: "desc" },
    });

    let sequence = 1;
    if (lastRefund) {
      const lastSeq = parseInt(
        lastRefund.refundNumber.split("-").pop() || "0",
        10
      );
      sequence = lastSeq + 1;
    }
    const refundNumber = `${refPrefix}${String(sequence).padStart(4, "0")}`;

    // Create refund and update package status in a transaction
    const [refund] = await db.$transaction([
      db.packageRefund.create({
        data: {
          patientPackageId: id,
          refundNumber,
          refundType,
          purchaseDate: pkg.purchaseDate,
          firstTreatmentDate: pkg.firstSessionDate,
          requestDate,
          totalPackagePrice: pkg.totalPrice,
          completedSessionsValue,
          adminFee,
          refundAmount,
          status: "pending",
          reason: body.reason || null,
          notes: body.notes || null,
        },
      }),
      db.patientPackage.update({
        where: { id },
        data: { status: "refunded" },
      }),
    ]);

    return NextResponse.json(
      {
        refund,
        breakdown: {
          totalPackagePrice: pkg.totalPrice,
          amountPaid: pkg.paidAmount,
          sessionsUsed: pkg.usedSessions,
          completedSessionsValue,
          adminFee,
          refundAmount,
          refundType,
          workingDaysSincePurchase,
          policy:
            refundType === "cooling_off"
              ? "Full refund within 5 working day cooling-off period"
              : refundType === "after_cooling_off_within_5days"
                ? "Completed sessions value deducted (within 5 days of first treatment)"
                : "Completed sessions value + S$100 admin fee deducted (beyond 5 days)",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error processing package refund:", error);
    return NextResponse.json(
      { error: "Failed to process package refund" },
      { status: 500 }
    );
  }
}
