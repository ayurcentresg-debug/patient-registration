import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/insurance/claims/[id] - Get single claim with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const claim = await db.insuranceClaim.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            items: true,
            payments: true,
          },
        },
        provider: true,
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: "Insurance claim not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(claim);
  } catch (error) {
    console.error("Error fetching insurance claim:", error);
    return NextResponse.json(
      { error: "Failed to fetch insurance claim" },
      { status: 500 }
    );
  }
}

// PUT /api/insurance/claims/[id] - Update claim status with workflow validation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.insuranceClaim.findUnique({
      where: { id },
      include: {
        invoice: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Insurance claim not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    // Allow updating notes and preAuth fields at any time
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.preAuthNumber !== undefined) updateData.preAuthNumber = body.preAuthNumber;
    if (body.preAuthStatus !== undefined) updateData.preAuthStatus = body.preAuthStatus;
    if (body.preAuthAmount !== undefined) updateData.preAuthAmount = body.preAuthAmount ? Number(body.preAuthAmount) : null;

    // Status transition workflow
    if (body.status && body.status !== existing.status) {
      const currentStatus = existing.status;
      const newStatus = body.status;

      // submitted → under_review
      if (currentStatus === "submitted" && newStatus === "under_review") {
        updateData.status = "under_review";
        updateData.reviewDate = new Date();
      }
      // under_review → approved
      else if (currentStatus === "under_review" && newStatus === "approved") {
        if (body.approvedAmount === undefined || body.approvedAmount === null) {
          return NextResponse.json(
            { error: "approvedAmount is required for approval" },
            { status: 400 }
          );
        }
        updateData.status = "approved";
        updateData.approvedAmount = Number(body.approvedAmount);
        updateData.approvedDate = new Date();
      }
      // under_review → partially_approved
      else if (currentStatus === "under_review" && newStatus === "partially_approved") {
        if (body.approvedAmount === undefined || body.approvedAmount === null) {
          return NextResponse.json(
            { error: "approvedAmount is required for partial approval" },
            { status: 400 }
          );
        }
        const approvedAmount = Number(body.approvedAmount);
        if (approvedAmount >= existing.claimAmount) {
          return NextResponse.json(
            { error: "approvedAmount must be less than claimAmount for partial approval" },
            { status: 400 }
          );
        }
        updateData.status = "partially_approved";
        updateData.approvedAmount = approvedAmount;
        updateData.approvedDate = new Date();
      }
      // under_review → rejected
      else if (currentStatus === "under_review" && newStatus === "rejected") {
        if (!body.rejectionReason) {
          return NextResponse.json(
            { error: "rejectionReason is required for rejection" },
            { status: 400 }
          );
        }
        updateData.status = "rejected";
        updateData.rejectionReason = body.rejectionReason;
      }
      // approved/partially_approved → settled
      else if (
        (currentStatus === "approved" || currentStatus === "partially_approved") &&
        newStatus === "settled"
      ) {
        if (body.settledAmount === undefined || body.settledAmount === null) {
          return NextResponse.json(
            { error: "settledAmount is required for settlement" },
            { status: 400 }
          );
        }

        const settledAmount = Number(body.settledAmount);
        updateData.status = "settled";
        updateData.settledAmount = settledAmount;
        updateData.settledDate = new Date();

        // Auto-generate receipt number for the payment
        const now = new Date();
        const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
        const recPrefix = `REC-${yearMonth}-`;

        const lastReceipt = await db.payment.findFirst({
          where: {
            receiptNumber: { startsWith: recPrefix },
          },
          orderBy: { receiptNumber: "desc" },
        });

        let recSequence = 1;
        if (lastReceipt) {
          const lastSeq = parseInt(lastReceipt.receiptNumber!.split("-").pop() || "0", 10);
          recSequence = lastSeq + 1;
        }
        const receiptNumber = `${recPrefix}${String(recSequence).padStart(4, "0")}`;

        // Create payment on linked invoice and update claim in a transaction
        const invoice = existing.invoice;
        const newPaidAmount = Math.round((invoice.paidAmount + settledAmount) * 100) / 100;
        const newBalanceAmount = Math.round((invoice.totalAmount - newPaidAmount) * 100) / 100;

        let invoiceStatus = invoice.status;
        if (newPaidAmount >= invoice.totalAmount && invoice.totalAmount > 0) {
          invoiceStatus = "paid";
        } else if (newPaidAmount > 0) {
          invoiceStatus = "partially_paid";
        }

        const [claim] = await prisma.$transaction([
          db.insuranceClaim.update({
            where: { id },
            data: updateData,
            include: {
              invoice: true,
              provider: true,
            },
          }),
          db.payment.create({
            data: {
              invoiceId: existing.invoiceId,
              receiptNumber,
              amount: settledAmount,
              method: "insurance",
              reference: existing.claimNumber,
              notes: `Insurance settlement for claim ${existing.claimNumber}`,
              date: new Date(),
            },
          }),
          db.invoice.update({
            where: { id: existing.invoiceId },
            data: {
              paidAmount: newPaidAmount,
              balanceAmount: newBalanceAmount,
              status: invoiceStatus,
            },
          }),
        ]);

        return NextResponse.json(claim);
      }
      // Invalid transition
      else {
        return NextResponse.json(
          { error: `Invalid status transition from "${currentStatus}" to "${newStatus}"` },
          { status: 400 }
        );
      }
    }

    const claim = await db.insuranceClaim.update({
      where: { id },
      data: updateData,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
          },
        },
        provider: true,
      },
    });

    return NextResponse.json(claim);
  } catch (error) {
    console.error("Error updating insurance claim:", error);
    return NextResponse.json(
      { error: "Failed to update insurance claim" },
      { status: 500 }
    );
  }
}

// DELETE /api/insurance/claims/[id] - Delete claim (only if submitted)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const existing = await db.insuranceClaim.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Insurance claim not found" },
        { status: 404 }
      );
    }

    if (existing.status !== "submitted") {
      return NextResponse.json(
        { error: "Only claims with 'submitted' status can be deleted" },
        { status: 400 }
      );
    }

    await db.insuranceClaim.delete({ where: { id } });

    return NextResponse.json({ message: "Insurance claim deleted successfully" });
  } catch (error) {
    console.error("Error deleting insurance claim:", error);
    return NextResponse.json(
      { error: "Failed to delete insurance claim" },
      { status: 500 }
    );
  }
}
