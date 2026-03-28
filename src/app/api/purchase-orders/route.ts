import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/purchase-orders - List purchase orders with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (search) {
      where.OR = [
        { poNumber: { contains: search } },
        { supplierName: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    const result = purchaseOrders.map((po) => ({
      ...po,
      itemsCount: po.items.length,
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
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}

// POST /api/purchase-orders - Create a new purchase order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.supplierId || !body.supplierName) {
      return NextResponse.json(
        { error: "supplierId and supplierName are required" },
        { status: 400 }
      );
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Auto-generate PO number: PO-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `PO-${yearMonth}-`;

    const lastPO = await prisma.purchaseOrder.findFirst({
      where: { poNumber: { startsWith: prefix } },
      orderBy: { poNumber: "desc" },
    });

    let nextSeq = 1;
    if (lastPO) {
      const lastSeq = parseInt(lastPO.poNumber.replace(prefix, ""), 10);
      nextSeq = lastSeq + 1;
    }
    const poNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    // Calculate item totals
    const items = body.items.map(
      (item: {
        inventoryItemId?: string;
        itemName: string;
        sku?: string;
        quantity: number;
        unitPrice: number;
        gstPercent?: number;
        notes?: string;
      }) => {
        const gstPercent = item.gstPercent || 0;
        const totalAmount = Math.round(
          item.quantity * item.unitPrice * (1 + gstPercent / 100) * 100
        ) / 100;
        return {
          inventoryItemId: item.inventoryItemId || null,
          itemName: item.itemName,
          sku: item.sku || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstPercent,
          totalAmount,
          notes: item.notes || null,
        };
      }
    );

    // Calculate PO totals
    const subtotal = Math.round(
      items.reduce(
        (sum: number, item: { quantity: number; unitPrice: number }) =>
          sum + item.quantity * item.unitPrice,
        0
      ) * 100
    ) / 100;

    const gstAmount = Math.round(
      items.reduce(
        (sum: number, item: { totalAmount: number; quantity: number; unitPrice: number }) =>
          sum + (item.totalAmount - item.quantity * item.unitPrice),
        0
      ) * 100
    ) / 100;

    const totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: body.supplierId,
        supplierName: body.supplierName,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        notes: body.notes || null,
        createdBy: body.createdBy || null,
        subtotal,
        gstAmount,
        totalAmount,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}
