/**
 * Super-admin only: additively seed the 7 dummy patients into Demo Clinic.
 *
 * POST /api/super-admin/seed-demo-patients
 *
 * Unlike /seed-demo which refuses to run if the clinic already exists, this
 * endpoint checks each of the 7 canonical demo patients by patientIdNumber
 * and creates ONLY the missing ones. Safe to run repeatedly. Preserves any
 * patients you've manually added.
 *
 * Use case: the demo clinic row exists but patient data was lost (e.g. a
 * Railway volume wipe). Running /seed-demo returns "already exists" and
 * doesn't recreate the patients. This endpoint fills the gap.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admin-auth";
import { createReciprocalLink } from "@/lib/family-reciprocal";

const DEMO_CLINIC_EMAIL = "demo@ayurgate.com";

interface PatientSeed {
  patientIdNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  gender: "male" | "female";
  dateOfBirth: string;
  address?: string;
  city: string;
  zipCode?: string;
  bloodGroup?: string;
}

const PATIENT_SEEDS: PatientSeed[] = [
  // Menon family of 4
  { patientIdNumber: "PT-0001", firstName: "Ravi", lastName: "Menon", phone: "+65 9500 1111", email: "ravi.menon@demo.sg", gender: "male", dateOfBirth: "1978-03-15", address: "Blk 123 Serangoon Ave 3, #05-12", city: "Singapore", zipCode: "550123", bloodGroup: "B+" },
  { patientIdNumber: "PT-0002", firstName: "Lakshmi", lastName: "Menon", phone: "+65 9500 1112", email: "lakshmi.menon@demo.sg", gender: "female", dateOfBirth: "1982-08-22", address: "Blk 123 Serangoon Ave 3, #05-12", city: "Singapore", zipCode: "550123", bloodGroup: "O+" },
  { patientIdNumber: "PT-0003", firstName: "Arjun", lastName: "Menon", phone: "+65 9500 1113", gender: "male", dateOfBirth: "2010-05-10", address: "Blk 123 Serangoon Ave 3, #05-12", city: "Singapore", zipCode: "550123", bloodGroup: "B+" },
  { patientIdNumber: "PT-0004", firstName: "Priya", lastName: "Menon", phone: "+65 9500 1114", gender: "female", dateOfBirth: "2013-11-03", address: "Blk 123 Serangoon Ave 3, #05-12", city: "Singapore", zipCode: "550123", bloodGroup: "O+" },
  // Individuals
  { patientIdNumber: "PT-0005", firstName: "Sarah", lastName: "Chen", phone: "+65 9600 1111", email: "sarah.chen@demo.sg", gender: "female", dateOfBirth: "1990-06-18", city: "Singapore", bloodGroup: "A+" },
  { patientIdNumber: "PT-0006", firstName: "Muhammad", lastName: "Hassan", phone: "+65 9600 2222", gender: "male", dateOfBirth: "1965-02-12", city: "Singapore", bloodGroup: "AB+" },
  { patientIdNumber: "PT-0007", firstName: "Emily", lastName: "Tan", phone: "+65 9600 3333", email: "emily.tan@demo.sg", gender: "female", dateOfBirth: "1995-09-25", city: "Singapore", bloodGroup: "O-" },
];

export async function POST() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clinic = await prisma.clinic.findFirst({
      where: { email: DEMO_CLINIC_EMAIL },
    });

    if (!clinic) {
      return NextResponse.json(
        { error: "Demo clinic does not exist. Run /api/super-admin/seed-demo first." },
        { status: 404 }
      );
    }

    const created: string[] = [];
    const skipped: string[] = [];
    const createdIds: Record<string, string> = {};

    for (const seed of PATIENT_SEEDS) {
      const existing = await prisma.patient.findFirst({
        where: { clinicId: clinic.id, patientIdNumber: seed.patientIdNumber },
        select: { id: true },
      });
      if (existing) {
        skipped.push(`${seed.firstName} ${seed.lastName}`);
        createdIds[seed.patientIdNumber] = existing.id;
        continue;
      }
      const p = await prisma.patient.create({
        data: {
          clinicId: clinic.id,
          patientIdNumber: seed.patientIdNumber,
          firstName: seed.firstName,
          lastName: seed.lastName,
          phone: seed.phone,
          email: seed.email ?? null,
          gender: seed.gender,
          dateOfBirth: new Date(seed.dateOfBirth),
          address: seed.address ?? null,
          city: seed.city,
          zipCode: seed.zipCode ?? null,
          bloodGroup: seed.bloodGroup ?? null,
        },
      });
      created.push(`${seed.firstName} ${seed.lastName}`);
      createdIds[seed.patientIdNumber] = p.id;
    }

    // Re-link Menon family (only links that don't already exist)
    const familyLinks: { patientKey: string; memberKey: string; memberName: string; memberPhone: string; memberGender: string; relation: string }[] = [
      { patientKey: "PT-0001", memberKey: "PT-0002", memberName: "Lakshmi Menon", memberPhone: "+65 9500 1112", memberGender: "female", relation: "spouse" },
      { patientKey: "PT-0001", memberKey: "PT-0003", memberName: "Arjun Menon",   memberPhone: "+65 9500 1113", memberGender: "male",   relation: "child"  },
      { patientKey: "PT-0001", memberKey: "PT-0004", memberName: "Priya Menon",   memberPhone: "+65 9500 1114", memberGender: "female", relation: "child"  },
      { patientKey: "PT-0002", memberKey: "PT-0001", memberName: "Ravi Menon",    memberPhone: "+65 9500 1111", memberGender: "male",   relation: "spouse" },
    ];

    let familyLinksCreated = 0;
    let reciprocalsCreated = 0;
    for (const link of familyLinks) {
      const patientId = createdIds[link.patientKey];
      const linkedPatientId = createdIds[link.memberKey];
      if (!patientId || !linkedPatientId) continue;
      const existingLink = await prisma.familyMember.findFirst({
        where: { clinicId: clinic.id, patientId, linkedPatientId },
        select: { id: true },
      });
      if (existingLink) {
        // Even if forward exists, ensure reciprocal exists
        const reverse = await createReciprocalLink(prisma, {
          id: existingLink.id, patientId, linkedPatientId, relation: link.relation, clinicId: clinic.id,
        });
        if (reverse) reciprocalsCreated++;
        continue;
      }
      const created = await prisma.familyMember.create({
        data: {
          clinicId: clinic.id,
          patientId,
          linkedPatientId,
          memberName: link.memberName,
          memberPhone: link.memberPhone,
          memberGender: link.memberGender,
          relation: link.relation,
        },
      });
      familyLinksCreated++;
      const reverse = await createReciprocalLink(prisma, created);
      if (reverse) reciprocalsCreated++;
    }

    return NextResponse.json({
      ok: true,
      clinicId: clinic.id,
      clinicName: clinic.name,
      created,
      skipped,
      familyLinksCreated,
      reciprocalsCreated,
      summary: `Created ${created.length} patient(s), skipped ${skipped.length} existing, ${familyLinksCreated} forward family link(s), ${reciprocalsCreated} reverse link(s).`,
    });
  } catch (err) {
    console.error("seed-demo-patients error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to seed demo patients" },
      { status: 500 }
    );
  }
}
