import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/suppliers - List all suppliers with optional search and purchase stats
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const suppliers = await (db.supplier.findMany as any)({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        purchaseOrders: {
          select: { totalAmount: true },
        },
      },
    });

    // Map to response shape with purchase stats (single query, no N+1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const suppliersWithStats = suppliers.map((supplier: any) => {
      const { purchaseOrders, ...rest } = supplier;
      return {
        ...rest,
        purchaseStats: {
          totalOrders: purchaseOrders.length,
          totalValue: Math.round(
            purchaseOrders.reduce((sum: number, po: { totalAmount: number }) => sum + po.totalAmount, 0) * 100
          ) / 100,
        },
      };
    });

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
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 }
      );
    }

    // Validate unique name
    const existingSupplier = await db.supplier.findFirst({
      where: { name: body.name },
    });

    if (existingSupplier) {
      return NextResponse.json(
        { error: "A supplier with this name already exists" },
        { status: 409 }
      );
    }

    const supplier = await db.supplier.create({
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
