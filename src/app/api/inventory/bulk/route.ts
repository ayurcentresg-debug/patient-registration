import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// PUT /api/inventory/bulk - Bulk update inventory items
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, action, status } = body as {
      ids: string[];
      action: "updateStatus";
      status?: string;
    };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No items selected" },
        { status: 400 }
      );
    }

    if (action === "updateStatus") {
      const validStatuses = ["active", "inactive", "discontinued"];
      if (!status || !validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }

      const result = await prisma.inventoryItem.updateMany({
        where: { id: { in: ids } },
        data: { status },
      });

      return NextResponse.json({
        message: `${result.count} item(s) updated to "${status}"`,
        count: result.count,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error bulk updating inventory:", error);
    return NextResponse.json(
      { error: "Failed to bulk update inventory" },
      { status: 500 }
    );
  }
}
