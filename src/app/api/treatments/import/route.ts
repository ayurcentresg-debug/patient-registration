import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

/**
 * POST /api/treatments/import
 * Bulk-import treatments/services from CSV.
 * Expects: { treatments: Array<{ name, category, duration, basePrice }> }
 */
export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getTenantPrisma(clinicId);

    const { treatments } = await request.json();
    if (!Array.isArray(treatments) || treatments.length === 0) {
      return NextResponse.json({ error: "No treatments provided" }, { status: 400 });
    }
    if (treatments.length > 200) {
      return NextResponse.json({ error: "Maximum 200 treatments per import" }, { status: 400 });
    }

    // Check existing treatment names for duplicate detection
    const existing = await db.treatment.findMany({ select: { name: true } });
    const existingNames = new Set(existing.map((t: { name: string }) => t.name.toLowerCase()));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const validCategories = ["consultation", "therapy", "panchakarma", "massage", "detox", "specialty", "general"];

    for (let i = 0; i < treatments.length; i++) {
      const row = treatments[i];
      const rowNum = i + 2;

      if (!row.name || !row.name.trim()) {
        errors.push(`Row ${rowNum}: Missing name`);
        skipped++;
        continue;
      }

      const name = row.name.trim();
      if (existingNames.has(name.toLowerCase())) {
        skipped++;
        continue;
      }

      const category = validCategories.includes((row.category || "").toLowerCase())
        ? (row.category || "general").toLowerCase()
        : "general";

      try {
        await db.treatment.create({
          data: {
            name,
            category,
            duration: parseInt(row.duration) || 30,
            basePrice: parseFloat(row.basePrice || row.price) || 0,
            description: (row.description || "").trim() || null,
            isActive: true,
          },
        });
        existingNames.add(name.toLowerCase());
        imported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${rowNum}: ${message}`);
        skipped++;
      }
    }

    return NextResponse.json({ imported, skipped, errors: errors.slice(0, 20), total: treatments.length });
  } catch (error) {
    console.error("POST /api/treatments/import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

/**
 * GET /api/treatments/import
 * Download CSV template for treatment import
 */
export async function GET() {
  const headers = ["name", "category", "duration", "basePrice", "description"];
  const samples = [
    ["General Consultation", "consultation", "30", "50", "Initial patient consultation"],
    ["Abhyanga Massage", "massage", "60", "80", "Full body oil massage"],
    ["Shirodhara", "therapy", "45", "100", "Continuous pouring of warm oil on forehead"],
    ["Panchakarma - Vamana", "panchakarma", "90", "200", "Therapeutic emesis procedure"],
  ];

  const csv = [headers.join(","), ...samples.map((s) => s.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=treatment-import-template.csv",
    },
  });
}
