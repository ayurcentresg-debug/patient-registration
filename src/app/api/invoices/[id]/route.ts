import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/invoices/[id] - Get single invoice with items and payments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        payments: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Don't allow editing items after paid
    if (existing.status === "paid" && body.items) {
      return NextResponse.json(
        { error: "Cannot edit items on a paid invoice" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.paymentMethod !== undefined) {
      updateData.paymentMethod = body.paymentMethod;
    }

    // Recalculate totals if discount changes
    if (body.discountPercent !== undefined) {
      const discountPercent = Number(body.discountPercent) || 0;
      const subtotal = existing.subtotal;
      const discountAmount = Math.round(subtotal * discountPercent / 100 * 100) / 100;
      const taxableAmount = Math.round((subtotal - discountAmount) * 100) / 100;

      // Recalculate GST on new taxable amount proportionally
      const originalTaxable = existing.taxableAmount || subtotal;
      const gstRatio = originalTaxable > 0 ? existing.gstAmount / originalTaxable : 0;
      const gstAmount = Math.round(taxableAmount * gstRatio * 100) / 100;

      const totalAmount = Math.round((taxableAmount + gstAmount) * 100) / 100;
      const balanceAmount = Math.round((totalAmount - existing.paidAmount) * 100) / 100;

      // Re-evaluate status based on new total
      let status = existing.status;
      if (existing.paidAmount >= totalAmount && totalAmount > 0) {
        status = "paid";
      } else if (existing.paidAmount > 0) {
        status = "partially_paid";
      } else {
        status = "pending";
      }

      updateData.discountPercent = discountPercent;
      updateData.discountAmount = discountAmount;
      updateData.taxableAmount = taxableAmount;
      updateData.gstAmount = gstAmount;
      updateData.totalAmount = totalAmount;
      updateData.balanceAmount = balanceAmount;
      updateData.status = body.status || status;
    }

    const invoice = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        payments: true,
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id] - Delete invoice (only draft)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft invoices can be deleted" },
        { status: 400 }
      );
    }

    // Restore inventory stock for medicine items
    const medicineItems = invoice.items.filter(
      (item) => item.type === "medicine" && item.inventoryItemId
    );

    if (medicineItems.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transactionOps: any[] = [];

      for (const item of medicineItems) {
        const inventoryItem = await db.inventoryItem.findUnique({
          where: { id: item.inventoryItemId! },
        });

        if (inventoryItem) {
          const newStock = inventoryItem.currentStock + item.quantity;

          transactionOps.push(
            db.inventoryItem.update({
              where: { id: item.inventoryItemId! },
              data: {
                currentStock: newStock,
                status: newStock > 0 ? "active" : inventoryItem.status,
              },
            })
          );

          transactionOps.push(
            db.stockTransaction.create({
              data: {
                itemId: item.inventoryItemId!,
                type: "return",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalAmount: item.unitPrice * item.quantity,
                previousStock: inventoryItem.currentStock,
                newStock,
                reference: invoice.invoiceNumber,
                notes: `Stock restored - invoice ${invoice.invoiceNumber} deleted`,
              },
            })
          );
        }
      }

      // Delete invoice and restore stock in a transaction
      transactionOps.push(
        db.invoice.delete({ where: { id } })
      );

      await prisma.$transaction(transactionOps);
    } else {
      await db.invoice.delete({ where: { id } });
    }

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
