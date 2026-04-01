import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextResponse } from "next/server";

// GET /api/inventory/indent - Generate Kottakkal-format indent for low-stock items
export async function GET() {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    // Fetch all active items where currentStock < reorderLevel
    const lowStockItems = await db.inventoryItem.findMany({
      where: {
        status: "active",
      },
      select: {
        manufacturerCode: true,
        name: true,
        packing: true,
        gstPercent: true,
        costPrice: true,
        unitPrice: true,
        currentStock: true,
        reorderLevel: true,
      },
    });

    // Filter in JS since Prisma doesn't support comparing two columns directly
    const indent = lowStockItems
      .filter((item) => item.currentStock < item.reorderLevel)
      .map((item) => {
        const qty = Math.max(item.reorderLevel - item.currentStock, 0);
        return {
          Code: item.manufacturerCode || "",
          "Name of Medicine": item.name,
          Unit: item.packing || "",
          GST: item.gstPercent / 100,
          "Basic Price": item.costPrice,
          MRP: item.unitPrice,
          Qty: qty,
          Value: qty * item.costPrice,
        };
      });

    return NextResponse.json(indent);
  } catch (error) {
    console.error("Error generating indent:", error);
    return NextResponse.json(
      { error: "Failed to generate indent" },
      { status: 500 }
    );
  }
}
