/**
 * Bidirectional family-link helpers.
 *
 * Family relationships are stored as one-way `FamilyMember` rows
 * (patientId → linkedPatientId, with a `relation`). Most real-world
 * relations have an inverse (parent ↔ child) — these helpers keep both
 * directions in sync so opening either patient's profile shows the link.
 *
 * Reciprocal logic only applies when `linkedPatientId` is set (i.e. the
 * relative is a registered patient at the clinic). Free-text family
 * members stay one-way.
 */

import type { PrismaClient } from "@/generated/prisma/client";

export type FamilyRelation =
  | "spouse"
  | "parent"
  | "child"
  | "sibling"
  | "grandparent"
  | "grandchild"
  | "uncle_aunt"
  | "nephew_niece"
  | "cousin"
  | "other";

const INVERSE_MAP: Record<FamilyRelation, FamilyRelation> = {
  spouse: "spouse",
  parent: "child",
  child: "parent",
  sibling: "sibling",
  grandparent: "grandchild",
  grandchild: "grandparent",
  uncle_aunt: "nephew_niece",
  nephew_niece: "uncle_aunt",
  cousin: "cousin",
  other: "other",
};

export function inverseRelation(rel: string): FamilyRelation {
  return INVERSE_MAP[(rel as FamilyRelation)] ?? "other";
}

interface MemberRow {
  id: string;
  patientId: string;
  linkedPatientId: string | null;
  relation: string;
  clinicId?: string | null;
}

/**
 * Minimal Prisma surface area we need. We accept either the base PrismaClient
 * or the tenant-extended client (both expose .patient and .familyMember).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = PrismaClient | any;

/**
 * Creates the reverse FamilyMember row, if `linkedPatientId` is set and
 * one doesn't already exist. Idempotent.
 *
 * Returns the reverse row, or null if skipped (no link, or reverse exists).
 */
export async function createReciprocalLink(db: AnyPrisma, member: MemberRow) {
  if (!member.linkedPatientId) return null;

  // Already exists?
  const existing = await db.familyMember.findFirst({
    where: {
      patientId: member.linkedPatientId,
      linkedPatientId: member.patientId,
    },
  });
  if (existing) return null;

  // Fetch source patient to populate name/phone/gender on the reverse row
  const source = await db.patient.findUnique({
    where: { id: member.patientId },
    select: { firstName: true, lastName: true, phone: true, gender: true, clinicId: true },
  });
  if (!source) return null;

  const reverse = await db.familyMember.create({
    data: {
      // clinicId — let tenant-extended client inject if available; otherwise use source's
      clinicId: member.clinicId ?? source.clinicId ?? undefined,
      patientId: member.linkedPatientId,
      linkedPatientId: member.patientId,
      relation: inverseRelation(member.relation),
      memberName: `${source.firstName} ${source.lastName}`,
      memberPhone: source.phone || null,
      memberGender: source.gender || null,
    },
  });
  return reverse;
}

/**
 * Deletes the reverse FamilyMember row matching this member, if any.
 * Returns the deleted row, or null if no reverse existed.
 */
export async function deleteReciprocalLink(db: AnyPrisma, member: MemberRow) {
  if (!member.linkedPatientId) return null;
  const reverse = await db.familyMember.findFirst({
    where: {
      patientId: member.linkedPatientId,
      linkedPatientId: member.patientId,
    },
  });
  if (!reverse) return null;
  await db.familyMember.delete({ where: { id: reverse.id } });
  return reverse;
}

/**
 * Synchronises the reverse row when the forward row was updated.
 *
 * Cases:
 *  - linkedPatientId unchanged → update reverse.relation to inverse(new relation)
 *  - linkedPatientId changed from X to Y → delete old reverse (X), create new (Y)
 *  - linkedPatientId removed (set to null) → delete old reverse
 *  - linkedPatientId added (was null, now set) → create reverse
 */
export async function syncReciprocalLink(
  db: AnyPrisma,
  newMember: MemberRow,
  oldLinkedPatientId: string | null,
  oldRelation: string,
) {
  const oldLink = oldLinkedPatientId ?? null;
  const newLink = newMember.linkedPatientId ?? null;

  // Case: link removed → delete reverse (if any)
  if (oldLink && !newLink) {
    const old = { ...newMember, linkedPatientId: oldLink, relation: oldRelation };
    return deleteReciprocalLink(db, old);
  }

  // Case: link added → create reverse
  if (!oldLink && newLink) {
    return createReciprocalLink(db, newMember);
  }

  // Case: link changed (X → Y) → delete old, create new
  if (oldLink && newLink && oldLink !== newLink) {
    const old = { ...newMember, linkedPatientId: oldLink, relation: oldRelation };
    await deleteReciprocalLink(db, old);
    return createReciprocalLink(db, newMember);
  }

  // Case: link unchanged but relation changed → update reverse.relation
  if (oldLink && newLink && oldLink === newLink && oldRelation !== newMember.relation) {
    const reverse = await db.familyMember.findFirst({
      where: {
        patientId: newLink,
        linkedPatientId: newMember.patientId,
      },
    });
    if (reverse) {
      await db.familyMember.update({
        where: { id: reverse.id },
        data: { relation: inverseRelation(newMember.relation) },
      });
    }
    return reverse;
  }

  return null;
}
