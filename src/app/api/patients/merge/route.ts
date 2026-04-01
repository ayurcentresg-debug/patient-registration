import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

/**
 * POST /api/patients/merge
 *
 * Merges two patient records into one:
 * - Re-links all child records (appointments, notes, invoices, etc.) from removeId → keepId
 * - Updates the kept patient with merged field values
 * - Deletes the removed patient
 * - Logs the merge action
 *
 * Body: { keepId: string, removeId: string, mergedFields: Record<string, unknown> }
 */

export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { keepId, removeId, mergedFields } = body;

    if (!keepId || !removeId) {
      return NextResponse.json({ error: "Both keepId and removeId are required" }, { status: 400 });
    }
    if (keepId === removeId) {
      return NextResponse.json({ error: "Cannot merge a patient with itself" }, { status: 400 });
    }

    // Verify both patients exist
    const [keepPatient, removePatient] = await Promise.all([
      db.patient.findUnique({ where: { id: keepId } }),
      db.patient.findUnique({ where: { id: removeId } }),
    ]);

    if (!keepPatient) {
      return NextResponse.json({ error: "Patient to keep not found" }, { status: 404 });
    }
    if (!removePatient) {
      return NextResponse.json({ error: "Patient to remove not found" }, { status: 404 });
    }

    // Build the merged name for denormalized fields
    const mergedName = mergedFields
      ? `${mergedFields.firstName || keepPatient.firstName} ${mergedFields.lastName || keepPatient.lastName}`
      : `${keepPatient.firstName} ${keepPatient.lastName}`;

    // Count records being transferred (for the response)
    const [
      commCount,
      apptCount,
      noteCount,
      docCount,
      famCount,
      vitalCount,
      reminderCount,
      planCount,
      rxCount,
      pkgCount,
      invCount,
      claimCount,
    ] = await Promise.all([
      db.communication.count({ where: { patientId: removeId } }),
      db.appointment.count({ where: { patientId: removeId } }),
      db.clinicalNote.count({ where: { patientId: removeId } }),
      db.document.count({ where: { patientId: removeId } }),
      db.familyMember.count({ where: { patientId: removeId } }),
      db.vital.count({ where: { patientId: removeId } }),
      db.reminder.count({ where: { patientId: removeId } }),
      db.treatmentPlan.count({ where: { patientId: removeId } }),
      db.prescription.count({ where: { patientId: removeId } }),
      db.patientPackage.count({ where: { patientId: removeId } }),
      db.invoice.count({ where: { patientId: removeId } }),
      db.insuranceClaim.count({ where: { patientId: removeId } }),
    ]);

    const totalTransferred = commCount + apptCount + noteCount + docCount + famCount +
      vitalCount + reminderCount + planCount + rxCount + pkgCount + invCount + claimCount;

    // Build update data for the kept patient
    const updateData: Record<string, unknown> = {};
    if (mergedFields) {
      const allowedFields = [
        "firstName", "lastName", "nricId", "email", "phone", "secondaryMobile",
        "landline", "whatsapp", "dateOfBirth", "age", "gender", "address",
        "locality", "city", "state", "zipCode", "bloodGroup", "ethnicity",
        "nationality", "occupation", "referredBy", "familyRelation",
        "familyMemberName", "emergencyName", "emergencyPhone",
        "medicalHistory", "otherHistory", "allergies", "medicalNotes", "groups",
      ];
      for (const key of allowedFields) {
        if (key in mergedFields && mergedFields[key] !== undefined) {
          if (key === "dateOfBirth" && mergedFields[key]) {
            updateData[key] = new Date(mergedFields[key] as string);
          } else {
            updateData[key] = mergedFields[key];
          }
        }
      }
    }

    // Execute the merge in a transaction
    await prisma.$transaction([
      // 1. Re-link all child records
      db.communication.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      db.appointment.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      db.clinicalNote.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      db.document.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      db.familyMember.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      db.vital.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      db.reminder.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      db.treatmentPlan.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      db.prescription.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      db.patientPackage.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),

      // 2. Re-link Invoice & InsuranceClaim (no FK relation, plain string field)
      db.invoice.updateMany({
        where: { patientId: removeId },
        data: { patientId: keepId, patientName: mergedName },
      }),
      db.insuranceClaim.updateMany({
        where: { patientId: removeId },
        data: { patientId: keepId, patientName: mergedName },
      }),

      // 3. Fix cross-references: FamilyMember.linkedPatientId from OTHER patients
      db.familyMember.updateMany({
        where: { linkedPatientId: removeId },
        data: { linkedPatientId: keepId },
      }),

      // 4. Fix PackageShare cross-references
      db.packageShare.updateMany({
        where: { sharedWithPatientId: removeId },
        data: { sharedWithPatientId: keepId },
      }),
      db.packageShare.updateMany({
        where: { sharedByPatientId: removeId },
        data: { sharedByPatientId: keepId },
      }),

      // 5. Update the kept patient with merged fields
      db.patient.update({
        where: { id: keepId },
        data: updateData,
      }),

      // 6. Delete the removed patient (any remaining cascade children auto-removed)
      db.patient.delete({ where: { id: removeId } }),
    ]);

    // 7. Log the merge action
    try {
      await db.auditLog.create({
        data: {
          userName: "System",
          action: "merge",
          entity: "patient",
          entityId: keepId,
          details: JSON.stringify({
            keptPatient: { id: keepId, name: `${keepPatient.firstName} ${keepPatient.lastName}`, patientIdNumber: keepPatient.patientIdNumber },
            removedPatient: { id: removeId, name: `${removePatient.firstName} ${removePatient.lastName}`, patientIdNumber: removePatient.patientIdNumber },
            recordsTransferred: totalTransferred,
            mergedFields: mergedFields ? Object.keys(mergedFields) : [],
          }),
        },
      });
    } catch {
      // Audit log failure shouldn't fail the merge
      console.warn("Failed to create audit log for merge");
    }

    return NextResponse.json({
      success: true,
      keptPatientId: keepId,
      removedPatientId: removeId,
      recordsTransferred: totalTransferred,
      breakdown: {
        communications: commCount,
        appointments: apptCount,
        clinicalNotes: noteCount,
        documents: docCount,
        familyMembers: famCount,
        vitals: vitalCount,
        reminders: reminderCount,
        treatmentPlans: planCount,
        prescriptions: rxCount,
        packages: pkgCount,
        invoices: invCount,
        insuranceClaims: claimCount,
      },
    });
  } catch (error) {
    console.error("POST /api/patients/merge error:", error);
    return NextResponse.json({ error: "Failed to merge patients" }, { status: 500 });
  }
}
