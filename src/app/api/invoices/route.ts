import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/invoices - List invoices with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search");
    const branchId = searchParams.get("branchId");

    const where: Record<string, unknown> = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      if (status.includes(",")) {
        where.status = { in: status.split(",").map(s => s.trim()) };
      } else {
        where.status = status;
      }
    }

    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
      where.date = dateFilter;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { patientName: { contains: search } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        _count: {
          select: { items: true },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            date: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    // Check which invoices are linked to packages
    const invoiceIds = invoices.map((inv) => inv.id);
    const packageLinks = await prisma.patientPackage.findMany({
      where: { invoiceId: { in: invoiceIds } },
      select: { invoiceId: true, packageNumber: true, packageName: true, id: true },
    });
    const packageMap = new Map(packageLinks.map((p) => [p.invoiceId, p]));

    const enriched = invoices.map((inv) => {
      const pkg = packageMap.get(inv.id);
      return {
        ...inv,
        isPackageSale: !!pkg,
        packageInfo: pkg ? { id: pkg.id, packageNumber: pkg.packageNumber, packageName: pkg.packageName } : null,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create a new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.patientName) {
      return NextResponse.json(
        { error: "Patient name is required" },
        { status: 400 }
      );
    }

    // ─── Resolve branchId ────────────────────────────────────────────────────
    let branchId: string | null = body.branchId || null;
    if (!branchId) {
      // Default to the main branch
      const mainBranch = await prisma.branch.findFirst({
        where: { isMainBranch: true, isActive: true },
      });
      if (mainBranch) {
        branchId = mainBranch.id;
      }
    }

    // Auto-generate invoice number: INV-YYYYMM-0001
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `INV-${yearMonth}-`;

    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: "desc" },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split("-").pop() || "0", 10);
      sequence = lastSeq + 1;
    }
    const invoiceNumber = `${prefix}${String(sequence).padStart(4, "0")}`;

    // Process items
    const items: Array<{
      type: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      gstPercent: number;
      gstAmount: number;
      amount: number;
      inventoryItemId?: string;
      variantId?: string;
    }> = [];

    const inventoryUpdates: Array<{
      itemId: string;
      variantId?: string;
      quantity: number;
      previousStock: number;
      newStock: number;
      unitPrice: number;
    }> = [];

    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        const quantity = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        const discount = Number(item.discount) || 0;
        const gstPercent = Number(item.gstPercent) || 0;

        const lineTotal = unitPrice * quantity - discount;
        const gstAmount = lineTotal * gstPercent / 100;
        const amount = lineTotal + gstAmount;

        const processedItem: typeof items[0] = {
          type: item.type || "other",
          description: item.description || "",
          quantity,
          unitPrice,
          discount,
          gstPercent,
          gstAmount: Math.round(gstAmount * 100) / 100,
          amount: Math.round(amount * 100) / 100,
        };

        if (item.inventoryItemId) {
          processedItem.inventoryItemId = item.inventoryItemId;
        }
        if (item.variantId) {
          processedItem.variantId = item.variantId;
        }

        // If medicine with inventoryItemId, validate and prepare stock deduction
        if (item.type === "medicine" && item.inventoryItemId) {
          // Check if this is a variant sale
          if (item.variantId) {
            const variant = await prisma.inventoryVariant.findUnique({
              where: { id: item.variantId },
            });
            if (!variant) {
              return NextResponse.json(
                { error: `Variant not found: ${item.variantId}` },
                { status: 404 }
              );
            }
            if (variant.currentStock < quantity) {
              return NextResponse.json(
                { error: `Insufficient stock for variant "${variant.packing}". Available: ${variant.currentStock}, requested: ${quantity}` },
                { status: 400 }
              );
            }
            inventoryUpdates.push({
              itemId: item.inventoryItemId,
              variantId: item.variantId,
              quantity,
              previousStock: variant.currentStock,
              newStock: variant.currentStock - quantity,
              unitPrice,
            });
          } else {
            // Base item stock deduction
            const inventoryItem = await prisma.inventoryItem.findUnique({
              where: { id: item.inventoryItemId },
            });

            if (!inventoryItem) {
              return NextResponse.json(
                { error: `Inventory item not found: ${item.inventoryItemId}` },
                { status: 404 }
              );
            }

            if (inventoryItem.currentStock < quantity) {
              return NextResponse.json(
                {
                  error: `Insufficient stock for "${inventoryItem.name}". Available: ${inventoryItem.currentStock}, requested: ${quantity}`,
                },
                { status: 400 }
              );
            }

            inventoryUpdates.push({
              itemId: item.inventoryItemId,
              quantity,
              previousStock: inventoryItem.currentStock,
              newStock: inventoryItem.currentStock - quantity,
              unitPrice,
            });
          }
        }

        items.push(processedItem);
      }
    }

    // Calculate invoice totals
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity - item.discount), 0);
    const totalGst = items.reduce((sum, item) => sum + item.gstAmount, 0);
    const discountPercent = Number(body.discountPercent) || 0;
    const discountAmount = Math.round(subtotal * discountPercent / 100 * 100) / 100;
    const taxableAmount = Math.round((subtotal - discountAmount) * 100) / 100;
    const gstAmount = Math.round(totalGst * 100) / 100;
    const totalAmount = Math.round((taxableAmount + gstAmount) * 100) / 100;
    const paidAmount = Number(body.paidAmount) || 0;
    const balanceAmount = Math.round((totalAmount - paidAmount) * 100) / 100;

    // Determine status
    let status = "pending";
    if (paidAmount >= totalAmount && totalAmount > 0) {
      status = "paid";
    } else if (paidAmount > 0) {
      status = "partially_paid";
    }

    // Create invoice, items, stock transactions, and inventory updates in a single transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactionOps: any[] = [];

    // Create the invoice
    const invoiceCreate = prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId: body.patientId || null,
        appointmentId: body.appointmentId || null,
        branchId: branchId,
        patientName: body.patientName,
        patientPhone: body.patientPhone || null,
        subtotal: Math.round(subtotal * 100) / 100,
        discountPercent,
        discountAmount,
        taxableAmount,
        gstAmount,
        totalAmount,
        paidAmount,
        balanceAmount,
        status,
        paymentMethod: body.paymentMethod || null,
        notes: body.notes || null,
        items: {
          create: items.map((item) => ({
            type: item.type,
            description: item.description,
            inventoryItemId: item.inventoryItemId || null,
            variantId: item.variantId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            gstPercent: item.gstPercent,
            gstAmount: item.gstAmount,
            amount: item.amount,
          })),
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    if (inventoryUpdates.length === 0) {
      // No inventory updates needed, just create the invoice
      const invoice = await invoiceCreate;
      return NextResponse.json(invoice, { status: 201 });
    }

    // Use $transaction for inventory updates + invoice creation
    transactionOps.push(invoiceCreate);

    for (const update of inventoryUpdates) {
      if (update.variantId) {
        // Deduct from variant stock
        transactionOps.push(
          prisma.inventoryVariant.update({
            where: { id: update.variantId },
            data: { currentStock: update.newStock },
          })
        );
      } else {
        // Deduct from base item stock
        transactionOps.push(
          prisma.inventoryItem.update({
            where: { id: update.itemId },
            data: {
              currentStock: update.newStock,
              status: update.newStock === 0 ? "out_of_stock" : "active",
            },
          })
        );
      }

      // ─── BranchStock deduction ──────────────────────────────────────────────
      if (branchId) {
        // BranchStock has @@unique([branchId, itemId, variantId]) — variantId may be null
        const branchStock = await prisma.branchStock.findFirst({
          where: {
            branchId: branchId,
            itemId: update.itemId,
            variantId: update.variantId ?? null,
          },
        });

        if (branchStock) {
          if (branchStock.quantity < update.quantity) {
            console.warn(
              `[Invoice ${invoiceNumber}] Branch stock insufficient for item ${update.itemId} at branch ${branchId}. ` +
              `Branch qty: ${branchStock.quantity}, sale qty: ${update.quantity}. Proceeding anyway.`
            );
          }
          const newBranchQty = Math.max(branchStock.quantity - update.quantity, 0);
          transactionOps.push(
            prisma.branchStock.update({
              where: { id: branchStock.id },
              data: { quantity: newBranchQty },
            })
          );
        } else {
          console.warn(
            `[Invoice ${invoiceNumber}] No BranchStock record found for item ${update.itemId} ` +
            `(variant: ${update.variantId ?? "none"}) at branch ${branchId}. Skipping branch deduction.`
          );
        }
      }

      transactionOps.push(
        prisma.stockTransaction.create({
          data: {
            itemId: update.itemId,
            variantId: update.variantId || null,
            type: "sale",
            quantity: -update.quantity,
            unitPrice: update.unitPrice,
            totalAmount: update.unitPrice * update.quantity,
            previousStock: update.previousStock,
            newStock: update.newStock,
            reference: invoiceNumber,
            notes: branchId
              ? `Sale via invoice ${invoiceNumber} [branch:${branchId}]`
              : `Sale via invoice ${invoiceNumber}`,
          },
        })
      );
    }

    const results = await prisma.$transaction(transactionOps);
    const invoice = results[0];

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
