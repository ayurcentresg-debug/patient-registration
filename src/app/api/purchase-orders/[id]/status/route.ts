import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["cancelled", "partial"],
  partial: ["received"],
};

// PUT /api/purchase-orders/[id]/status - Change PO status
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    const allowed = ALLOWED_TRANSITIONS[purchaseOrder.status];

    if (!allowed || !allowed.includes(body.status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from "${purchaseOrder.status}" to "${body.status}". Allowed transitions: ${allowed ? allowed.join(", ") : "none"}`,
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status: body.status,
    };

    if (body.status === "received") {
      updateData.receivedDate = new Date();
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    return NextResponse.json(updatedPO);
  } catch (error) {
    console.error("Error updating purchase order status:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order status" },
      { status: 500 }
    );
  }
}
