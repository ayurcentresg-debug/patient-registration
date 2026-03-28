import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/credit-notes - List credit notes with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (status) {
      if (status.includes(",")) {
        where.status = { in: status.split(",").map((s) => s.trim()) };
      } else {
        where.status = status;
      }
    }

    const creditNotes = await prisma.creditNote.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            patientName: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(creditNotes);
  } catch (error) {
    console.error("Error fetching credit notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit notes" },
      { status: 500 }
    );
  }
}

// POST /api/credit-notes - Create a new credit note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.invoiceId || !body.reason || !body.items) {
      return NextResponse.json(
        { error: "invoiceId, reason, and items are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "items must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: body.invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Auto-generate credit note number: CN-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `CN-${yearMonth}-`;

    const lastCreditNote = await prisma.creditNote.findFirst({
      where: {
        creditNoteNumber: { startsWith: prefix },
      },
      orderBy: { creditNoteNumber: "desc" },
    });

    let sequence = 1;
    if (lastCreditNote) {
      const lastSeq = parseInt(lastCreditNote.creditNoteNumber.split("-").pop() || "0", 10);
      sequence = lastSeq + 1;
    }
    const creditNoteNumber = `${prefix}${String(sequence).padStart(4, "0")}`;

    // Calculate totals from items
    let subtotal = 0;
    let totalGst = 0;

    const processedItems = body.items.map(
      (item: { description: string; amount: number; gstAmount?: number }) => {
        const amount = Number(item.amount) || 0;
        const gstAmount = Number(item.gstAmount) || 0;
        subtotal += amount;
        totalGst += gstAmount;
        return {
          description: item.description || "",
          amount,
          gstAmount,
        };
      }
    );

    subtotal = Math.round(subtotal * 100) / 100;
    totalGst = Math.round(totalGst * 100) / 100;
    const totalAmount = Math.round((subtotal + totalGst) * 100) / 100;

    const creditNote = await prisma.creditNote.create({
      data: {
        creditNoteNumber,
        invoiceId: body.invoiceId,
        reason: body.reason,
        items: JSON.stringify(processedItems),
        subtotal,
        gstAmount: totalGst,
        totalAmount,
        status: "draft",
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            patientName: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(creditNote, { status: 201 });
  } catch (error) {
    console.error("Error creating credit note:", error);
    return NextResponse.json(
      { error: "Failed to create credit note" },
      { status: 500 }
    );
  }
}
