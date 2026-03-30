import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/patient-packages - List patient packages with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      if (status.includes(",")) {
        where.status = { in: status.split(",").map((s) => s.trim()) };
      } else {
        where.status = status;
      }
    }

    if (search) {
      where.OR = [
        { packageNumber: { contains: search } },
        { treatmentName: { contains: search } },
        { packageName: { contains: search } },
      ];
    }

    const packages = await prisma.patientPackage.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            patientIdNumber: true,
          },
        },
        sessions: {
          orderBy: { sessionNumber: "asc" },
        },
        shares: true,
        treatment: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Add computed fields
    const now = new Date();
    const packagesWithComputed = packages.map((pkg) => {
      const daysUntilExpiry = Math.ceil(
        (new Date(pkg.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        ...pkg,
        daysUntilExpiry,
        isExpiringSoon: daysUntilExpiry > 0 && daysUntilExpiry <= 30,
      };
    });

    return NextResponse.json(packagesWithComputed);
  } catch (error) {
    console.error("Error fetching patient packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient packages" },
      { status: 500 }
    );
  }
}

// POST /api/patient-packages - Create/sell a new patient package
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
    });
    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    let treatmentName = body.treatmentName || "";
    let packageName = body.packageName || "";
    let totalSessions = Number(body.totalSessions) || 0;
    let totalPrice = Number(body.totalPrice) || 0;
    let treatmentId = body.treatmentId || null;
    let treatmentPackageId = body.treatmentPackageId || null;

    // If treatmentPackageId is provided, pull details from the package definition
    if (body.treatmentPackageId) {
      const treatmentPkg = await prisma.treatmentPackage.findUnique({
        where: { id: body.treatmentPackageId },
        include: { treatment: true },
      });
      if (!treatmentPkg) {
        return NextResponse.json(
          { error: "Treatment package not found" },
          { status: 404 }
        );
      }
      treatmentName = treatmentPkg.treatment.name;
      packageName = treatmentPkg.name;
      totalSessions = treatmentPkg.sessionCount;
      totalPrice = treatmentPkg.totalPrice;
      treatmentId = treatmentPkg.treatmentId;
      treatmentPackageId = treatmentPkg.id;
    } else if (body.treatmentId) {
      // Custom package from a treatment
      const treatment = await prisma.treatment.findUnique({
        where: { id: body.treatmentId },
      });
      if (!treatment) {
        return NextResponse.json(
          { error: "Treatment not found" },
          { status: 404 }
        );
      }
      treatmentName = treatmentName || treatment.name;
    }

    if (!treatmentName || totalSessions <= 0) {
      return NextResponse.json(
        { error: "Treatment name and total sessions are required" },
        { status: 400 }
      );
    }

    // Auto-generate package number: PKG-YYYYMM-XXXX
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `PKG-${yearMonth}-`;

    const lastPackage = await prisma.patientPackage.findFirst({
      where: {
        packageNumber: { startsWith: prefix },
      },
      orderBy: { packageNumber: "desc" },
    });

    let sequence = 1;
    if (lastPackage) {
      const lastSeq = parseInt(
        lastPackage.packageNumber.split("-").pop() || "0",
        10
      );
      sequence = lastSeq + 1;
    }
    const packageNumber = `${prefix}${String(sequence).padStart(4, "0")}`;

    // Calculate fields
    const pricePerSession = totalSessions > 0 ? totalPrice / totalSessions : 0;
    const paidAmount = Number(body.paidAmount) || 0;
    const balanceAmount = totalPrice - paidAmount;

    // Expiry date: default 12 months from now, admin can override
    let expiryDate: Date;
    if (body.expiryDate) {
      expiryDate = new Date(body.expiryDate);
    } else {
      expiryDate = new Date(now);
      expiryDate.setMonth(expiryDate.getMonth() + 12);
    }

    // ─── Auto-generate invoice for package sale ────────────────────────────
    const invYearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const invPrefix = `INV-${invYearMonth}-`;
    const lastInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: invPrefix } },
      orderBy: { invoiceNumber: "desc" },
    });
    let invSeq = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split("-").pop() || "0", 10);
      invSeq = lastSeq + 1;
    }
    const invoiceNumber = `${invPrefix}${String(invSeq).padStart(4, "0")}`;

    const finalPackageName = packageName || `${totalSessions}-Session ${treatmentName} Package`;
    const roundedTotalPrice = Math.round(totalPrice * 100) / 100;
    const roundedPaidAmount = Math.round(paidAmount * 100) / 100;
    const roundedBalanceAmount = Math.round(balanceAmount * 100) / 100;
    const roundedPricePerSession = Math.round(pricePerSession * 100) / 100;

    // Determine invoice status
    let invoiceStatus = "pending";
    if (roundedPaidAmount >= roundedTotalPrice && roundedTotalPrice > 0) {
      invoiceStatus = "paid";
    } else if (roundedPaidAmount > 0) {
      invoiceStatus = "partially_paid";
    }

    // Use transaction to create both package + invoice atomically
    const [newPackage, invoice] = await prisma.$transaction(async (tx) => {
      // Create invoice
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          patientId: body.patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          patientPhone: patient.phone || null,
          subtotal: roundedTotalPrice,
          discountPercent: 0,
          discountAmount: 0,
          taxableAmount: roundedTotalPrice,
          gstAmount: 0,
          totalAmount: roundedTotalPrice,
          paidAmount: roundedPaidAmount,
          balanceAmount: roundedBalanceAmount,
          status: invoiceStatus,
          paymentMethod: body.paymentMethod || null,
          notes: `Package sale: ${finalPackageName}`,
          items: {
            create: [
              {
                type: "therapy",
                description: `${finalPackageName} (${totalSessions} sessions × S$${roundedPricePerSession.toFixed(2)}/session)`,
                quantity: 1,
                unitPrice: roundedTotalPrice,
                discount: 0,
                gstPercent: 0,
                gstAmount: 0,
                amount: roundedTotalPrice,
              },
            ],
          },
        },
      });

      // Create payment record if amount paid
      if (roundedPaidAmount > 0) {
        // Auto-generate receipt number
        const recPrefix = `REC-${invYearMonth}-`;
        const lastReceipt = await tx.payment.findFirst({
          where: { receiptNumber: { startsWith: recPrefix } },
          orderBy: { receiptNumber: "desc" },
        });
        let recSeq = 1;
        if (lastReceipt) {
          const lastRecSeq = parseInt(lastReceipt.receiptNumber?.split("-").pop() || "0", 10);
          recSeq = lastRecSeq + 1;
        }
        const receiptNumber = `${recPrefix}${String(recSeq).padStart(4, "0")}`;

        await tx.payment.create({
          data: {
            invoiceId: inv.id,
            receiptNumber,
            amount: roundedPaidAmount,
            method: body.paymentMethod || "cash",
            notes: `Payment for ${finalPackageName}`,
          },
        });
      }

      // Create patient package linked to invoice
      const pkg = await tx.patientPackage.create({
        data: {
          packageNumber,
          patientId: body.patientId,
          treatmentId,
          treatmentPackageId,
          treatmentName,
          packageName: finalPackageName,
          totalSessions,
          usedSessions: 0,
          remainingSessions: totalSessions,
          totalPrice: roundedTotalPrice,
          paidAmount: roundedPaidAmount,
          balanceAmount: roundedBalanceAmount,
          pricePerSession: roundedPricePerSession,
          expiryDate,
          status: "active",
          maxSharedUsers: Number(body.maxSharedUsers) || 0,
          consultationFeePolicy: body.consultationFeePolicy || "doctor_decides",
          purchaseBranchId: body.purchaseBranchId || null,
          soldById: body.soldById || null,
          invoiceId: inv.id,
          notes: body.notes || null,
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              patientIdNumber: true,
            },
          },
          treatment: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          treatmentPackage: true,
          sessions: true,
          shares: true,
        },
      });

      return [pkg, inv];
    });

    return NextResponse.json({ ...newPackage, invoice: { id: invoice.id, invoiceNumber: invoice.invoiceNumber } }, { status: 201 });
  } catch (error) {
    console.error("Error creating patient package:", error);
    return NextResponse.json(
      { error: "Failed to create patient package" },
      { status: 500 }
    );
  }
}
