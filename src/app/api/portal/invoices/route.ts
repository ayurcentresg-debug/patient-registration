import { prisma } from "@/lib/db";
import { getTenantPrisma } from "@/lib/tenant-db";
import { getPatientAuth } from "@/lib/patient-auth";
import { NextResponse } from "next/server";

/**
 * GET /api/portal/invoices — List patient's invoices and payments
 */
export async function GET() {
  try {
    const auth = await getPatientAuth();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = auth.clinicId ? getTenantPrisma(auth.clinicId) : prisma;

    const invoices = await db.invoice.findMany({
      where: { patientId: auth.patientId },
      orderBy: { date: "desc" },
      take: 30,
      include: {
        items: true,
        payments: { orderBy: { date: "desc" } },
      },
    });

    // Summary stats
    const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalOutstanding = invoices.reduce((s, i) => s + i.balanceAmount, 0);

    return NextResponse.json({
      invoices,
      summary: { totalBilled, totalPaid, totalOutstanding },
    });
  } catch (error) {
    console.error("Portal invoices error:", error);
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
  }
}
