import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

const VALID_ROLES = ["admin", "doctor", "therapist", "pharmacist", "receptionist", "staff"];
const ROLE_PREFIXES: Record<string, string> = {
  doctor: "D",
  therapist: "T",
  pharmacist: "P",
  receptionist: "R",
  admin: "A",
  staff: "S",
};
const CLINICAL_ROLES = ["doctor", "therapist"];
const DEFAULT_PASSWORD = "Welcome@123";
const MAX_ROWS = 200;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { staff: staffArray } = body;

    if (!Array.isArray(staffArray) || staffArray.length === 0) {
      return NextResponse.json({ error: "No staff records provided" }, { status: 400 });
    }

    if (staffArray.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Too many rows. Maximum ${MAX_ROWS} allowed per import.` },
        { status: 400 }
      );
    }

    // Hash default password once for all records
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    let created = 0;
    let skipped = 0;
    const errors: Array<{ row: number; email: string; error: string }> = [];

    for (let i = 0; i < staffArray.length; i++) {
      const record = staffArray[i];
      const rowNum = i + 1;
      const email = (record.email || "").trim().toLowerCase();
      const name = (record.name || "").trim();
      const role = (record.role || "").trim().toLowerCase();

      // Validate required fields
      if (!name) {
        errors.push({ row: rowNum, email: email || "(empty)", error: "Name is required" });
        continue;
      }
      if (!email) {
        errors.push({ row: rowNum, email: "(empty)", error: "Email is required" });
        continue;
      }
      if (!role) {
        errors.push({ row: rowNum, email, error: "Role is required" });
        continue;
      }
      if (!VALID_ROLES.includes(role)) {
        errors.push({ row: rowNum, email, error: `Invalid role '${role}'. Must be one of: ${VALID_ROLES.join(", ")}` });
        continue;
      }

      // Check duplicate email
      try {
        const existing = await db.user.findFirst({ where: { email } });
        if (existing) {
          skipped++;
          errors.push({ row: rowNum, email, error: "Email already exists (skipped)" });
          continue;
        }

        // Auto-generate staffIdNumber
        const prefix = ROLE_PREFIXES[role] || "S";
        const lastStaff = await db.user.findFirst({
          where: { staffIdNumber: { startsWith: prefix } },
          orderBy: { staffIdNumber: "desc" },
        });

        let nextNumber = 10001;
        if (lastStaff?.staffIdNumber) {
          const numericPart = parseInt(lastStaff.staffIdNumber.replace(/^[A-Z]/, ""), 10);
          if (!isNaN(numericPart)) nextNumber = numericPart + 1;
        }
        const staffIdNumber = `${prefix}${nextNumber}`;

        const isClinical = CLINICAL_ROLES.includes(role);
        const phone = (record.phone || "").trim() || null;
        const gender = (record.gender || "").trim().toLowerCase() || null;
        const ethnicity = (record.ethnicity || "").trim().toLowerCase() || null;
        const dateOfBirthRaw = (record.dateOfBirth || "").trim();
        const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;
        const residencyStatus = (record.residencyStatus || "").trim().toLowerCase() || null;
        const prStartDateRaw = (record.prStartDate || "").trim();
        const prStartDate = prStartDateRaw ? new Date(prStartDateRaw) : null;
        const dateOfJoiningRaw = (record.dateOfJoining || "").trim();
        const dateOfJoining = dateOfJoiningRaw ? new Date(dateOfJoiningRaw) : null;
        const specialization = isClinical ? ((record.specialization || "").trim() || null) : null;
        const department = (record.department || "").trim() || null;
        const consultationFee = isClinical && record.consultationFee
          ? Number(record.consultationFee)
          : null;
        const slotDuration = isClinical && record.slotDuration
          ? Number(record.slotDuration)
          : 30;

        await db.user.create({
          data: {
            name,
            email,
            phone,
            role,
            password: hashedPassword,
            staffIdNumber,
            gender,
            ethnicity,
            dateOfBirth: dateOfBirth && !isNaN(dateOfBirth.getTime()) ? dateOfBirth : null,
            residencyStatus,
            prStartDate: prStartDate && !isNaN(prStartDate.getTime()) ? prStartDate : null,
            dateOfJoining: dateOfJoining && !isNaN(dateOfJoining.getTime()) ? dateOfJoining : null,
            specialization,
            department,
            consultationFee: consultationFee !== null && !isNaN(consultationFee) ? consultationFee : null,
            schedule: "{}",
            slotDuration: !isNaN(slotDuration) ? slotDuration : 30,
            status: "active",
            isActive: true,
          },
        });

        created++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push({ row: rowNum, email, error: message });
      }
    }

    await logAudit({
      action: "create",
      entity: "staff",
      details: {
        bulkImport: true,
        totalRows: staffArray.length,
        created,
        skipped,
        errorCount: errors.length - skipped,
      },
    });

    return NextResponse.json({ created, skipped, errors });
  } catch (error) {
    console.error("Bulk staff import failed:", error);
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
  }
}
