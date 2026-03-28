import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/inventory/[id]/transactions - List transactions for an item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Verify item exists
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const where: Record<string, unknown> = { itemId: id };
    if (type) {
      where.type = type;
    }

    const transactions = await prisma.stockTransaction.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// POST /api/inventory/[id]/transactions - Create a stock transaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.type || body.quantity === undefined) {
      return NextResponse.json(
        { error: "Type and quantity are required" },
        { status: 400 }
      );
    }

    const validTypes = [
      "purchase",
      "sale",
      "adjustment",
      "return",
      "expired",
      "damaged",
    ];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch the item
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const previousStock = item.currentStock;
    let newStock: number;
    const quantity = Number(body.quantity);

    switch (body.type) {
      case "purchase":
        newStock = previousStock + quantity;
        break;

      case "sale":
      case "damaged":
      case "expired":
        if (previousStock < quantity) {
          return NextResponse.json(
            {
              error: `Insufficient stock. Current stock: ${previousStock}, requested: ${quantity}`,
            },
            { status: 400 }
          );
        }
        newStock = previousStock - quantity;
        break;

      case "adjustment":
        // For adjustment, quantity is the target stock level
        newStock = quantity;
        break;

      case "return":
        newStock = previousStock + quantity;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid transaction type" },
          { status: 400 }
        );
    }

    // Determine new status
    let newStatus = item.status;
    if (newStock === 0) {
      newStatus = "out_of_stock";
    } else if (item.status === "out_of_stock" && newStock > 0) {
      newStatus = "active";
    }

    // Create the transaction and update the item in a transaction
    const [transaction] = await prisma.$transaction([
      prisma.stockTransaction.create({
        data: {
          itemId: id,
          type: body.type,
          quantity:
            body.type === "adjustment"
              ? newStock - previousStock
              : body.type === "sale" ||
                  body.type === "damaged" ||
                  body.type === "expired"
                ? -quantity
                : quantity,
          unitPrice: body.unitPrice ?? 0,
          totalAmount: body.totalAmount ?? 0,
          previousStock,
          newStock,
          reference: body.reference || null,
          notes: body.notes || null,
          performedBy: body.performedBy || null,
          date: body.date ? new Date(body.date) : new Date(),
        },
      }),
      prisma.inventoryItem.update({
        where: { id },
        data: {
          currentStock: newStock,
          status: newStatus,
        },
      }),
    ]);

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
