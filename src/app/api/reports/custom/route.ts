/**
 * Custom report builder — runs an ad-hoc query over one of the supported
 * data sources with user-selected columns, filters, and grouping.
 *
 * POST /api/reports/custom
 *   body: {
 *     source: "appointments" | "invoices" | "patients",
 *     columns: string[],            // field names to include
 *     filters?: Record<string, unknown>,  // per-field filter
 *     dateFrom?: string,
 *     dateTo?: string,
 *     groupBy?: string,             // optional column to group by + count
 *     limit?: number,               // default 500
 *   }
 *   returns: { rows: Record<string, unknown>[], total: number, sourceMeta: SourceMeta }
 */

import { NextRequest, NextResponse } from "next/server";
import { getClinicId, getRestrictedBranchId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

interface FieldDef { key: string; label: string; type: "string" | "number" | "date" | "boolean" | "enum"; enumValues?: string[]; path?: string; }
interface SourceMeta { fields: FieldDef[]; defaultColumns: string[]; supportsBranch: boolean; }

const SOURCES: Record<string, SourceMeta> = {
  appointments: {
    fields: [
      { key: "date", label: "Date", type: "date" },
      { key: "time", label: "Time", type: "string" },
      { key: "patientName", label: "Patient", type: "string" },
      { key: "patientPhone", label: "Phone", type: "string" },
      { key: "doctor", label: "Doctor", type: "string" },
      { key: "department", label: "Department", type: "string" },
      { key: "type", label: "Type", type: "enum", enumValues: ["consultation", "follow-up", "procedure", "emergency"] },
      { key: "status", label: "Status", type: "enum", enumValues: ["scheduled", "confirmed", "in-progress", "completed", "cancelled", "no-show"] },
      { key: "treatmentName", label: "Treatment", type: "string" },
      { key: "packageName", label: "Package", type: "string" },
      { key: "sessionPrice", label: "Price", type: "number" },
      { key: "duration", label: "Duration (min)", type: "number" },
      { key: "isWalkin", label: "Walk-in?", type: "boolean" },
      { key: "branchName", label: "Branch", type: "string" },
      { key: "reason", label: "Reason", type: "string" },
    ],
    defaultColumns: ["date", "time", "patientName", "doctor", "status", "treatmentName"],
    supportsBranch: true,
  },
  invoices: {
    fields: [
      { key: "invoiceNumber", label: "Invoice #", type: "string" },
      { key: "date", label: "Date", type: "date" },
      { key: "dueDate", label: "Due Date", type: "date" },
      { key: "patientName", label: "Patient", type: "string" },
      { key: "subtotal", label: "Subtotal", type: "number" },
      { key: "discountAmount", label: "Discount", type: "number" },
      { key: "gstAmount", label: "GST", type: "number" },
      { key: "totalAmount", label: "Total", type: "number" },
      { key: "paidAmount", label: "Paid", type: "number" },
      { key: "balanceAmount", label: "Outstanding", type: "number" },
      { key: "status", label: "Status", type: "enum", enumValues: ["draft", "pending", "partially_paid", "paid", "overdue", "cancelled"] },
      { key: "branchName", label: "Branch", type: "string" },
    ],
    defaultColumns: ["invoiceNumber", "date", "patientName", "totalAmount", "balanceAmount", "status"],
    supportsBranch: true,
  },
  patients: {
    fields: [
      { key: "patientIdNumber", label: "Patient ID", type: "string" },
      { key: "firstName", label: "First Name", type: "string" },
      { key: "lastName", label: "Last Name", type: "string" },
      { key: "phone", label: "Phone", type: "string" },
      { key: "email", label: "Email", type: "string" },
      { key: "gender", label: "Gender", type: "enum", enumValues: ["male", "female"] },
      { key: "dateOfBirth", label: "DOB", type: "date" },
      { key: "bloodGroup", label: "Blood Group", type: "string" },
      { key: "city", label: "City", type: "string" },
      { key: "status", label: "Status", type: "enum", enumValues: ["active", "inactive", "archived"] },
      { key: "createdAt", label: "Registered", type: "date" },
      { key: "_appointmentCount", label: "Visit count", type: "number" },
    ],
    defaultColumns: ["patientIdNumber", "firstName", "lastName", "phone", "gender", "createdAt"],
    supportsBranch: false,
  },
};

export async function GET() {
  // Returns the meta (used by UI to populate the field picker)
  return NextResponse.json({ sources: SOURCES });
}

export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getTenantPrisma(clinicId);

    const body = await request.json();
    const sourceKey = body.source as string;
    const meta = SOURCES[sourceKey];
    if (!meta) return NextResponse.json({ error: "Invalid source" }, { status: 400 });

    const columns: string[] = Array.isArray(body.columns) && body.columns.length > 0
      ? body.columns.filter((c: string) => meta.fields.some(f => f.key === c))
      : meta.defaultColumns;
    const filters = (body.filters || {}) as Record<string, string | number | boolean>;
    const dateFrom = body.dateFrom ? new Date(body.dateFrom) : null;
    const dateTo = body.dateTo ? new Date(body.dateTo) : null;
    if (dateTo) dateTo.setHours(23, 59, 59, 999);
    const limit = Math.min(2000, Math.max(1, Number(body.limit) || 500));

    // Apply branch restriction
    const restrictBranch = await getRestrictedBranchId();
    const branchFilter = restrictBranch || (filters.branchId as string | undefined);

    let rawRows: Record<string, unknown>[] = [];

    if (sourceKey === "appointments") {
      const where: Record<string, unknown> = {};
      if (dateFrom || dateTo) where.date = { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) };
      if (filters.status) where.status = filters.status;
      if (filters.type) where.type = filters.type;
      if (filters.doctorId) where.doctorId = filters.doctorId;
      if (branchFilter) where.branchId = branchFilter;
      if (filters.isWalkin !== undefined) where.isWalkin = !!filters.isWalkin;
      const items = await db.appointment.findMany({
        where, orderBy: { date: "desc" }, take: limit,
        include: { patient: { select: { firstName: true, lastName: true, phone: true } } },
      });
      // Branch lookup
      const branchIds = Array.from(new Set(items.map(i => i.branchId).filter(Boolean) as string[]));
      const branches = branchIds.length > 0 ? await db.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } }) : [];
      const branchMap = new Map(branches.map(b => [b.id, b.name]));
      rawRows = items.map(a => ({
        date: a.date, time: a.time, doctor: a.doctor, department: a.department, type: a.type, status: a.status,
        treatmentName: a.treatmentName, packageName: a.packageName, sessionPrice: a.sessionPrice, duration: a.duration,
        isWalkin: a.isWalkin, reason: a.reason,
        patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : (a.walkinName || "Walk-in"),
        patientPhone: a.patient?.phone || a.walkinPhone || "",
        branchName: a.branchId ? branchMap.get(a.branchId) || "" : "",
      }));
    }
    else if (sourceKey === "invoices") {
      const where: Record<string, unknown> = {};
      if (dateFrom || dateTo) where.date = { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) };
      if (filters.status) where.status = filters.status;
      if (branchFilter) where.branchId = branchFilter;
      const items = await db.invoice.findMany({ where, orderBy: { date: "desc" }, take: limit });
      const branchIds = Array.from(new Set(items.map(i => i.branchId).filter(Boolean) as string[]));
      const branches = branchIds.length > 0 ? await db.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } }) : [];
      const branchMap = new Map(branches.map(b => [b.id, b.name]));
      rawRows = items.map(i => ({
        invoiceNumber: i.invoiceNumber, date: i.date, dueDate: i.dueDate,
        patientName: i.patientName, subtotal: i.subtotal, discountAmount: i.discountAmount,
        gstAmount: i.gstAmount, totalAmount: i.totalAmount, paidAmount: i.paidAmount,
        balanceAmount: i.balanceAmount, status: i.status,
        branchName: i.branchId ? branchMap.get(i.branchId) || "" : "",
      }));
    }
    else if (sourceKey === "patients") {
      const where: Record<string, unknown> = { deletedAt: null };
      if (filters.status) where.status = filters.status;
      if (filters.gender) where.gender = filters.gender;
      if (dateFrom || dateTo) where.createdAt = { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) };
      const items = await db.patient.findMany({
        where, orderBy: { createdAt: "desc" }, take: limit,
        include: { _count: { select: { appointments: true } } },
      });
      rawRows = items.map(p => ({
        patientIdNumber: p.patientIdNumber, firstName: p.firstName, lastName: p.lastName,
        phone: p.phone, email: p.email, gender: p.gender, dateOfBirth: p.dateOfBirth,
        bloodGroup: p.bloodGroup, city: p.city, status: p.status, createdAt: p.createdAt,
        _appointmentCount: p._count.appointments,
      }));
    }

    // Trim to requested columns
    const rows = rawRows.map(r => {
      const out: Record<string, unknown> = {};
      for (const c of columns) out[c] = r[c];
      return out;
    });

    // Optional group-by + count
    if (body.groupBy && columns.includes(body.groupBy)) {
      const counts: Record<string, number> = {};
      for (const r of rows) {
        const v = String(r[body.groupBy] ?? "(empty)");
        counts[v] = (counts[v] || 0) + 1;
      }
      const grouped = Object.entries(counts).map(([k, v]) => ({ [body.groupBy]: k, _count: v }));
      grouped.sort((a, b) => Number(b._count) - Number(a._count));
      return NextResponse.json({
        rows: grouped, total: grouped.length, columns: [body.groupBy, "_count"],
        sourceMeta: meta, groupBy: body.groupBy,
      });
    }

    return NextResponse.json({ rows, total: rows.length, columns, sourceMeta: meta });
  } catch (err) {
    console.error("custom report error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Report failed" }, { status: 500 });
  }
}
