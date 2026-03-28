import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/invoices/[id]/payments - List all payments for an invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const payments = await prisma.payment.findMany({
      where: { invoiceId: id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST /api/invoices/[id]/payments - Record a payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.amount || !body.method) {
      return NextResponse.json(
        { error: "Amount and method are required" },
        { status: 400 }
      );
    }

    const amount = Number(body.amount);
    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Validate payment doesn't exceed balance
    if (amount > invoice.balanceAmount) {
      return NextResponse.json(
        {
          error: `Payment amount (${amount}) exceeds balance (${invoice.balanceAmount})`,
        },
        { status: 400 }
      );
    }

    const newPaidAmount = Math.round((invoice.paidAmount + amount) * 100) / 100;
    const newBalanceAmount = Math.round((invoice.totalAmount - newPaidAmount) * 100) / 100;

    // Determine new status
    let newStatus = invoice.status;
    if (newPaidAmount >= invoice.totalAmount) {
      newStatus = "paid";
    } else if (newPaidAmount > 0) {
      newStatus = "partially_paid";
    }

    // Auto-generate receipt number: REC-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const recPrefix = `REC-${yearMonth}-`;

    const lastReceipt = await prisma.payment.findFirst({
      where: {
        receiptNumber: { startsWith: recPrefix },
      },
      orderBy: { receiptNumber: "desc" },
    });

    let recSequence = 1;
    if (lastReceipt) {
      const lastSeq = parseInt(lastReceipt.receiptNumber!.split("-").pop() || "0", 10);
      recSequence = lastSeq + 1;
    }
    const receiptNumber = `${recPrefix}${String(recSequence).padStart(4, "0")}`;

    // Create payment and update invoice in a transaction
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId: id,
          receiptNumber,
          amount,
          method: body.method,
          reference: body.reference || null,
          notes: body.notes || null,
          date: body.date ? new Date(body.date) : new Date(),
        },
      }),
      prisma.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus,
        },
      }),
    ]);

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error recording payment:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
