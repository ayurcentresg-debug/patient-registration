import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/inventory/lookup?code=XXX
// Looks up an inventory item by SKU, manufacturerCode, or name (for barcode scanner)
export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim();

    if (!code) {
      return NextResponse.json({ error: "code parameter is required" }, { status: 400 });
    }

    // Try exact match on SKU first
    let item = await db.inventoryItem.findFirst({
      where: { sku: code },
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        unit: true,
        packing: true,
        manufacturerCode: true,
        currentStock: true,
        reorderLevel: true,
        costPrice: true,
        unitPrice: true,
        status: true,
      },
    });

    // Try exact match on manufacturerCode
    if (!item) {
      item = await db.inventoryItem.findFirst({
        where: { manufacturerCode: code },
        select: {
          id: true,
          sku: true,
          name: true,
          category: true,
          unit: true,
          packing: true,
          manufacturerCode: true,
          currentStock: true,
          reorderLevel: true,
          costPrice: true,
          unitPrice: true,
          status: true,
        },
      });
    }

    // Try partial match on name or SKU (for typed input)
    if (!item) {
      item = await db.inventoryItem.findFirst({
        where: {
          OR: [
            { sku: { contains: code } },
            { name: { contains: code } },
            { manufacturerCode: { contains: code } },
          ],
        },
        select: {
          id: true,
          sku: true,
          name: true,
          category: true,
          unit: true,
          packing: true,
          manufacturerCode: true,
          currentStock: true,
          reorderLevel: true,
          costPrice: true,
          unitPrice: true,
          status: true,
        },
      });
    }

    if (!item) {
      return NextResponse.json({ error: "Item not found", code }, { status: 404 });
    }

    // Also get branch stock if needed
    const branchStock = await db.branchStock.findMany({
      where: { itemId: item.id },
      include: { branch: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json({
      ...item,
      branchStock: branchStock.map((bs) => ({
        branchId: bs.branch.id,
        branchName: bs.branch.name,
        branchCode: bs.branch.code,
        quantity: bs.quantity,
      })),
    });
  } catch (error) {
    console.error("Error looking up inventory item:", error);
    return NextResponse.json({ error: "Failed to look up item" }, { status: 500 });
  }
}
