import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES, STAFF_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";

// GET /api/inventory/[id] - Get single item with transactions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const item = await db.inventoryItem.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 20,
        },
        variants: {
          orderBy: { packing: "asc" },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    // Collect unique invoice and PO references from transactions
    const invoiceRefs: string[] = [];
    const poRefs: string[] = [];
    for (const txn of item.transactions) {
      if (txn.reference) {
        if (txn.reference.startsWith("INV-")) {
          invoiceRefs.push(txn.reference);
        } else if (txn.reference.startsWith("PO-")) {
          poRefs.push(txn.reference);
        }
      }
    }

    // Batch lookups
    const [invoices, purchaseOrders] = await Promise.all([
      invoiceRefs.length > 0
        ? db.invoice.findMany({
            where: { invoiceNumber: { in: invoiceRefs } },
            select: { id: true, invoiceNumber: true, patientId: true, patientName: true },
          })
        : Promise.resolve([]),
      poRefs.length > 0
        ? db.purchaseOrder.findMany({
            where: { poNumber: { in: poRefs } },
            select: { id: true, poNumber: true },
          })
        : Promise.resolve([]),
    ]);

    // Build lookup maps
    const invoiceMap = new Map(
      invoices.map((inv) => [inv.invoiceNumber, inv])
    );
    const poMap = new Map(
      purchaseOrders.map((po) => [po.poNumber, po])
    );

    // Enrich transactions
    const enrichedTransactions = item.transactions.map((txn) => {
      const inv = txn.reference ? invoiceMap.get(txn.reference) : undefined;
      const po = txn.reference ? poMap.get(txn.reference) : undefined;
      return {
        ...txn,
        invoiceId: inv?.id ?? null,
        patientId: inv?.patientId ?? null,
        patientName: inv?.patientName ?? null,
        poId: po?.id ?? null,
      };
    });

    return NextResponse.json({
      ...item,
      transactions: enrichedTransactions,
    });
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}

// PUT /api/inventory/[id] - Update item fields
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;
    const body = await request.json();

    // Check if item exists
    const existingItem = await db.inventoryItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    // Check if currentStock is being changed
    const stockChanged =
      body.currentStock !== undefined &&
      body.currentStock !== existingItem.currentStock;

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "name",
      "category",
      "subcategory",
      "unit",
      "packing",
      "manufacturerCode",
      "unitPrice",
      "costPrice",
      "currentStock",
      "reorderLevel",
      "expiryDate",
      "batchNumber",
      "manufacturer",
      "supplier",
      "location",
      "hsnCode",
      "gstPercent",
      "description",
      "status",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "expiryDate") {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updatedItem = await db.inventoryItem.update({
      where: { id },
      data: updateData,
    });

    // If stock changed, auto-create an adjustment transaction
    if (stockChanged) {
      await db.stockTransaction.create({
        data: {
          itemId: id,
          type: "adjustment",
          quantity: body.currentStock - existingItem.currentStock,
          previousStock: existingItem.currentStock,
          newStock: body.currentStock,
          notes: "Stock adjusted via item update",
        },
      });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/[id] - Delete item only if no transactions exist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(STAFF_ROLES);
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { id } = await params;

    const item = await db.inventoryItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    if (item._count.transactions > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete item with existing transactions. Consider marking it as discontinued instead.",
        },
        { status: 409 }
      );
    }

    await db.inventoryItem.delete({
      where: { id },
    });

    await logAudit({
      action: "delete",
      entity: "inventory",
      entityId: id,
      details: { name: item.name },
    });

    return NextResponse.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
