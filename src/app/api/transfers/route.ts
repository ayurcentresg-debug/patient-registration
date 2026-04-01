import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/transfers - List transfers with optional filters
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const branchId = searchParams.get("branchId");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (branchId) {
      where.OR = [
        { fromBranchId: branchId },
        { toBranchId: branchId },
      ];
    }

    if (search) {
      // If branchId already set OR, we need to combine with AND
      if (where.OR) {
        const branchFilter = where.OR;
        delete where.OR;
        where.AND = [
          { OR: branchFilter },
          {
            OR: [
              { transferNumber: { contains: search } },
              { notes: { contains: search } },
            ],
          },
        ];
      } else {
        where.OR = [
          { transferNumber: { contains: search } },
          { notes: { contains: search } },
        ];
      }
    }

    if (dateFrom) {
      where.transferDate = {
        ...(where.transferDate as Record<string, unknown> || {}),
        gte: new Date(dateFrom),
      };
    }

    if (dateTo) {
      where.transferDate = {
        ...(where.transferDate as Record<string, unknown> || {}),
        lte: new Date(dateTo),
      };
    }

    const [transfers, total] = await Promise.all([
      db.stockTransfer.findMany({
        where,
        include: {
          fromBranch: { select: { id: true, name: true, code: true } },
          toBranch: { select: { id: true, name: true, code: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.stockTransfer.count({ where }),
    ]);

    const result = transfers.map((transfer) => ({
      ...transfer,
      itemCount: transfer.items.length,
      totalQtySent: transfer.items.reduce((sum, item) => sum + item.quantitySent, 0),
      totalQtyReceived: transfer.items.reduce((sum, item) => sum + item.quantityReceived, 0),
    }));

    return NextResponse.json({
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}

// POST /api/transfers - Create a new transfer (draft)
export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();

    // Validate required fields
    if (!body.fromBranchId || !body.toBranchId) {
      return NextResponse.json(
        { error: "fromBranchId and toBranchId are required" },
        { status: 400 }
      );
    }

    if (body.fromBranchId === body.toBranchId) {
      return NextResponse.json(
        { error: "Source and destination branches must be different" },
        { status: 400 }
      );
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Validate branches exist and are active
    const [fromBranch, toBranch] = await Promise.all([
      db.branch.findUnique({ where: { id: body.fromBranchId } }),
      db.branch.findUnique({ where: { id: body.toBranchId } }),
    ]);

    if (!fromBranch) {
      return NextResponse.json(
        { error: "Source branch not found" },
        { status: 400 }
      );
    }
    if (!fromBranch.isActive) {
      return NextResponse.json(
        { error: "Source branch is not active" },
        { status: 400 }
      );
    }
    if (!toBranch) {
      return NextResponse.json(
        { error: "Destination branch not found" },
        { status: 400 }
      );
    }
    if (!toBranch.isActive) {
      return NextResponse.json(
        { error: "Destination branch is not active" },
        { status: 400 }
      );
    }

    // Validate items
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

      // Validate item exists
      const inventoryItem = await db.inventoryItem.findUnique({
        where: { id: item.itemId },
      });

      if (!inventoryItem) {
        return NextResponse.json(
          { error: `Inventory item not found: ${item.itemId}` },
          { status: 400 }
        );
      }

      // Validate source branch has enough stock
      const branchStock = await db.branchStock.findFirst({
        where: {
          branchId: body.fromBranchId,
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

    // Auto-generate transfer number: TRF-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `TRF-${yearMonth}-`;

    const lastTransfer = await db.stockTransfer.findFirst({
      where: { transferNumber: { startsWith: prefix } },
      orderBy: { transferNumber: "desc" },
    });

    let nextSeq = 1;
    if (lastTransfer) {
      const lastSeq = parseInt(lastTransfer.transferNumber.replace(prefix, ""), 10);
      nextSeq = lastSeq + 1;
    }
    const transferNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    // Create the transfer
    const transfer = await db.stockTransfer.create({
      data: {
        transferNumber,
        fromBranchId: body.fromBranchId,
        toBranchId: body.toBranchId,
        status: "draft",
        initiatedBy: body.initiatedBy || null,
        notes: body.notes || null,
        items: {
          create: transferItems,
        },
      },
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

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    console.error("Error creating transfer:", error);
    return NextResponse.json(
      { error: "Failed to create transfer" },
      { status: 500 }
    );
  }
}
