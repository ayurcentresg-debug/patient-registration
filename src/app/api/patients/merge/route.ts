import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
      prisma.patient.findUnique({ where: { id: keepId } }),
      prisma.patient.findUnique({ where: { id: removeId } }),
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
      prisma.communication.count({ where: { patientId: removeId } }),
      prisma.appointment.count({ where: { patientId: removeId } }),
      prisma.clinicalNote.count({ where: { patientId: removeId } }),
      prisma.document.count({ where: { patientId: removeId } }),
      prisma.familyMember.count({ where: { patientId: removeId } }),
      prisma.vital.count({ where: { patientId: removeId } }),
      prisma.reminder.count({ where: { patientId: removeId } }),
      prisma.treatmentPlan.count({ where: { patientId: removeId } }),
      prisma.prescription.count({ where: { patientId: removeId } }),
      prisma.patientPackage.count({ where: { patientId: removeId } }),
      prisma.invoice.count({ where: { patientId: removeId } }),
      prisma.insuranceClaim.count({ where: { patientId: removeId } }),
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
      prisma.communication.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      prisma.appointment.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      prisma.clinicalNote.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      prisma.document.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      prisma.familyMember.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      prisma.vital.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      prisma.reminder.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      prisma.treatmentPlan.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      prisma.prescription.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),
      prisma.patientPackage.updateMany({ where: { patientId: removeId }, data: { patientId: keepId } }),

      // 2. Re-link Invoice & InsuranceClaim (no FK relation, plain string field)
      prisma.invoice.updateMany({
        where: { patientId: removeId },
        data: { patientId: keepId, patientName: mergedName },
      }),
      prisma.insuranceClaim.updateMany({
        where: { patientId: removeId },
        data: { patientId: keepId, patientName: mergedName },
      }),

      // 3. Fix cross-references: FamilyMember.linkedPatientId from OTHER patients
      prisma.familyMember.updateMany({
        where: { linkedPatientId: removeId },
        data: { linkedPatientId: keepId },
      }),

      // 4. Fix PackageShare cross-references
      prisma.packageShare.updateMany({
        where: { sharedWithPatientId: removeId },
        data: { sharedWithPatientId: keepId },
      }),
      prisma.packageShare.updateMany({
        where: { sharedByPatientId: removeId },
        data: { sharedByPatientId: keepId },
      }),

      // 5. Update the kept patient with merged fields
      prisma.patient.update({
        where: { id: keepId },
        data: updateData,
      }),

      // 6. Delete the removed patient (any remaining cascade children auto-removed)
      prisma.patient.delete({ where: { id: removeId } }),
    ]);

    // 7. Log the merge action
    try {
      await prisma.auditLog.create({
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
