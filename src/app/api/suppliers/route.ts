import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/suppliers - List all suppliers with optional search and purchase stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Enrich with purchase stats
    const suppliersWithStats = await Promise.all(
      suppliers.map(async (supplier) => {
        const purchaseOrders = await prisma.purchaseOrder.findMany({
          where: { supplierId: supplier.id },
          select: { totalAmount: true },
        });

        return {
          ...supplier,
          purchaseStats: {
            totalOrders: purchaseOrders.length,
            totalValue: Math.round(
              purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0) * 100
            ) / 100,
          },
        };
      })
    );

    return NextResponse.json(suppliersWithStats);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

// POST /api/suppliers - Create a new supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 }
      );
    }

    // Validate unique name
    const existingSupplier = await prisma.supplier.findFirst({
      where: { name: body.name },
    });

    if (existingSupplier) {
      return NextResponse.json(
        { error: "A supplier with this name already exists" },
        { status: 409 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: body.name,
        contactPerson: body.contactPerson || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        gstNumber: body.gstNumber || null,
        status: body.status || "active",
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Error creating supplier:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
