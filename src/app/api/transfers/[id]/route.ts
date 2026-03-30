import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/transfers/[id] - Get transfer detail
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        fromBranch: true,
        toBranch: true,
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                packing: true,
                unit: true,
                category: true,
                manufacturer: true,
              },
            },
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    // Fetch initiatedBy and receivedBy user names
    let initiatedByUser = null;
    let receivedByUser = null;

    if (transfer.initiatedBy) {
      initiatedByUser = await prisma.user.findUnique({
        where: { id: transfer.initiatedBy },
        select: { id: true, name: true },
      });
    }

    if (transfer.receivedBy) {
      receivedByUser = await prisma.user.findUnique({
        where: { id: transfer.receivedBy },
        select: { id: true, name: true },
      });
    }

    return NextResponse.json({
      ...transfer,
      initiatedByUser,
      receivedByUser,
    });
  } catch (error) {
    console.error("Error fetching transfer:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfer" },
      { status: 500 }
    );
  }
}

// PUT /api/transfers/[id] - Update draft transfer only
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    const existingTransfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingTransfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    if (existingTransfer.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft transfers can be updated" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    // Update branches if provided
    if (body.fromBranchId) {
      if (body.fromBranchId === (body.toBranchId || existingTransfer.toBranchId)) {
        return NextResponse.json(
          { error: "Source and destination branches must be different" },
          { status: 400 }
        );
      }
      const fromBranch = await prisma.branch.findUnique({
        where: { id: body.fromBranchId },
      });
      if (!fromBranch || !fromBranch.isActive) {
        return NextResponse.json(
          { error: "Source branch not found or not active" },
          { status: 400 }
        );
      }
      updateData.fromBranchId = body.fromBranchId;
    }

    if (body.toBranchId) {
      if ((body.fromBranchId || existingTransfer.fromBranchId) === body.toBranchId) {
        return NextResponse.json(
          { error: "Source and destination branches must be different" },
          { status: 400 }
        );
      }
      const toBranch = await prisma.branch.findUnique({
        where: { id: body.toBranchId },
      });
      if (!toBranch || !toBranch.isActive) {
        return NextResponse.json(
          { error: "Destination branch not found or not active" },
          { status: 400 }
        );
      }
      updateData.toBranchId = body.toBranchId;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    // If items are provided, replace all items
    if (body.items && Array.isArray(body.items)) {
      const sourceBranchId = (body.fromBranchId || existingTransfer.fromBranchId) as string;

      const transferItems: {
        itemId: string;
        variantId: string | null;
        quantitySent: number;
        notes: string | null;
      }[] = [];

      for (const item of body.items as {
        itemId: string;
        variantId?: string;
        quantitySent: number;
        notes?: string;
      }[]) {
        if (!item.itemId || !item.quantitySent || item.quantitySent <= 0) {
          return NextResponse.json(
            { error: "Each item must have itemId and quantitySent > 0" },
            { status: 400 }
          );
        }

        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: item.itemId },
        });

        if (!inventoryItem) {
          return NextResponse.json(
            { error: `Inventory item not found: ${item.itemId}` },
            { status: 400 }
          );
        }

        // Validate stock at source branch
        const branchStock = await prisma.branchStock.findFirst({
          where: {
            branchId: sourceBranchId,
            itemId: item.itemId,
            variantId: item.variantId || null,
          },
        });

        const availableQty = branchStock?.quantity || 0;
        if (availableQty < item.quantitySent) {
          return NextResponse.json(
            {
              error: `Insufficient stock for "${inventoryItem.name}" at source branch. Available: ${availableQty}, Requested: ${item.quantitySent}`,
            },
            { status: 400 }
          );
        }

        transferItems.push({
          itemId: item.itemId,
          variantId: item.variantId || null,
          quantitySent: item.quantitySent,
          notes: item.notes || null,
        });
      }

      // Delete existing items and create new ones
      await prisma.stockTransferItem.deleteMany({
        where: { transferId: id },
      });

      updateData.items = {
        create: transferItems,
      };
    }

    const transfer = await prisma.stockTransfer.update({
      where: { id },
      data: updateData,
      include: {
        fromBranch: { select: { id: true, name: true, code: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            item: {
              select: { id: true, name: true, sku: true, packing: true, unit: true },
            },
          },
        },
      },
    });

    return NextResponse.json(transfer);
  } catch (error) {
    console.error("Error updating transfer:", error);
    return NextResponse.json(
      { error: "Failed to update transfer" },
      { status: 500 }
    );
  }
}
