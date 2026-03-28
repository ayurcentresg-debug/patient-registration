import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/credit-notes/[id] - Get single credit note with invoice details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const creditNote = await prisma.creditNote.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            items: true,
            payments: true,
          },
        },
      },
    });

    if (!creditNote) {
      return NextResponse.json(
        { error: "Credit note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(creditNote);
  } catch (error) {
    console.error("Error fetching credit note:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit note" },
      { status: 500 }
    );
  }
}

// PUT /api/credit-notes/[id] - Update credit note status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.creditNote.findUnique({
      where: { id },
      include: {
        invoice: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Credit note not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.status && body.status !== existing.status) {
      const currentStatus = existing.status;
      const newStatus = body.status;

      // draft → issued
      if (currentStatus === "draft" && newStatus === "issued") {
        updateData.status = "issued";
      }
      // issued → applied
      else if (currentStatus === "issued" && newStatus === "applied") {
        if (!body.refundMethod) {
          return NextResponse.json(
            { error: "refundMethod is required when applying a credit note" },
            { status: 400 }
          );
        }

        updateData.status = "applied";
        updateData.refundMethod = body.refundMethod;
        updateData.refundReference = body.refundReference || null;
        updateData.refundDate = body.refundDate ? new Date(body.refundDate) : new Date();

        // Check if total credits >= invoice total to mark as refunded
        const allCreditNotes = await prisma.creditNote.findMany({
          where: {
            invoiceId: existing.invoiceId,
            status: "applied",
          },
        });

        const existingCredits = allCreditNotes.reduce(
          (sum, cn) => sum + cn.totalAmount,
          0
        );
        const totalCreditsAfterThis = existingCredits + existing.totalAmount;

        if (totalCreditsAfterThis >= existing.invoice.totalAmount) {
          // Update invoice status to refunded in a transaction
          const [creditNote] = await prisma.$transaction([
            prisma.creditNote.update({
              where: { id },
              data: updateData,
              include: {
                invoice: {
                  select: {
                    id: true,
                    invoiceNumber: true,
                    totalAmount: true,
                    patientName: true,
                    status: true,
                  },
                },
              },
            }),
            prisma.invoice.update({
              where: { id: existing.invoiceId },
              data: { status: "refunded" },
            }),
          ]);

          return NextResponse.json(creditNote);
        }
      }
      // draft/issued → voided
      else if (
        (currentStatus === "draft" || currentStatus === "issued") &&
        newStatus === "voided"
      ) {
        updateData.status = "voided";
      }
      // Invalid transition
      else {
        return NextResponse.json(
          { error: `Invalid status transition from "${currentStatus}" to "${newStatus}"` },
          { status: 400 }
        );
      }
    }

    const creditNote = await prisma.creditNote.update({
      where: { id },
      data: updateData,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            patientName: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(creditNote);
  } catch (error) {
    console.error("Error updating credit note:", error);
    return NextResponse.json(
      { error: "Failed to update credit note" },
      { status: 500 }
    );
  }
}

// DELETE /api/credit-notes/[id] - Delete credit note (only drafts)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.creditNote.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Credit note not found" },
        { status: 404 }
      );
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft credit notes can be deleted" },
        { status: 400 }
      );
    }

    await prisma.creditNote.delete({ where: { id } });

    return NextResponse.json({ message: "Credit note deleted successfully" });
  } catch (error) {
    console.error("Error deleting credit note:", error);
    return NextResponse.json(
      { error: "Failed to delete credit note" },
      { status: 500 }
    );
  }
}
