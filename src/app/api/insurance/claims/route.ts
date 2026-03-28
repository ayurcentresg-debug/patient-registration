import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/insurance/claims - List claims with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const providerId = searchParams.get("providerId");
    const patientId = searchParams.get("patientId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status) {
      if (status.includes(",")) {
        where.status = { in: status.split(",").map((s) => s.trim()) };
      } else {
        where.status = status;
      }
    }

    if (providerId) {
      where.providerId = providerId;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
      where.submittedDate = dateFilter;
    }

    if (search) {
      where.OR = [
        { claimNumber: { contains: search } },
        { patientName: { contains: search } },
      ];
    }

    const claims = await prisma.insuranceClaim.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(claims);
  } catch (error) {
    console.error("Error fetching insurance claims:", error);
    return NextResponse.json(
      { error: "Failed to fetch insurance claims" },
      { status: 500 }
    );
  }
}

// POST /api/insurance/claims - Create a new claim
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.invoiceId || !body.providerId || !body.claimAmount) {
      return NextResponse.json(
        { error: "invoiceId, providerId, and claimAmount are required" },
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

    // Validate provider exists
    const provider = await prisma.insuranceProvider.findUnique({
      where: { id: body.providerId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Insurance provider not found" },
        { status: 404 }
      );
    }

    // Auto-generate claim number: CLM-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `CLM-${yearMonth}-`;

    const lastClaim = await prisma.insuranceClaim.findFirst({
      where: {
        claimNumber: { startsWith: prefix },
      },
      orderBy: { claimNumber: "desc" },
    });

    let sequence = 1;
    if (lastClaim) {
      const lastSeq = parseInt(lastClaim.claimNumber.split("-").pop() || "0", 10);
      sequence = lastSeq + 1;
    }
    const claimNumber = `${prefix}${String(sequence).padStart(4, "0")}`;

    const claim = await prisma.insuranceClaim.create({
      data: {
        claimNumber,
        invoiceId: body.invoiceId,
        providerId: body.providerId,
        patientId: body.patientId || invoice.patientId || null,
        patientName: body.patientName || invoice.patientName,
        claimAmount: Number(body.claimAmount),
        preAuthNumber: body.preAuthNumber || null,
        preAuthStatus: body.preAuthStatus || null,
        preAuthAmount: body.preAuthAmount ? Number(body.preAuthAmount) : null,
        notes: body.notes || null,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json(claim, { status: 201 });
  } catch (error) {
    console.error("Error creating insurance claim:", error);
    return NextResponse.json(
      { error: "Failed to create insurance claim" },
      { status: 500 }
    );
  }
}
