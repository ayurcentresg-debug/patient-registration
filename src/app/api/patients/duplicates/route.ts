import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/patients/duplicates
 *
 * Scans all patients and returns groups of potential duplicates,
 * scored by match quality: NRIC > Phone > Email > Name+DOB.
 */

function normalizePhone(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-().]/g, "");
  if (/^\d{8}$/.test(cleaned) && /^[689]/.test(cleaned)) cleaned = "+65" + cleaned;
  else if (/^65\d{8}$/.test(cleaned)) cleaned = "+" + cleaned;
  else if (/^\d{10}$/.test(cleaned) && /^[6-9]/.test(cleaned)) cleaned = "+91" + cleaned;
  else if (/^91\d{10}$/.test(cleaned)) cleaned = "+" + cleaned;
  return cleaned;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

interface PatientSummary {
  id: string;
  patientIdNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  nricId: string | null;
  dateOfBirth: Date | null;
  gender: string;
  status: string;
  createdAt: Date;
  _count: { appointments: number; communications: number };
}

interface DuplicateGroup {
  patients: [PatientSummary, PatientSummary];
  matchType: string;
  confidence: "high" | "medium" | "low";
}

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        patientIdNumber: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        nricId: true,
        dateOfBirth: true,
        gender: true,
        status: true,
        createdAt: true,
        _count: { select: { appointments: true, communications: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const groups: DuplicateGroup[] = [];
    const seenPairs = new Set<string>();

    function addPair(a: PatientSummary, b: PatientSummary, matchType: string, confidence: "high" | "medium" | "low") {
      const key = [a.id, b.id].sort().join("|");
      if (seenPairs.has(key)) return;
      seenPairs.add(key);
      groups.push({ patients: [a, b], matchType, confidence });
    }

    // Index for faster lookups
    const byNric = new Map<string, PatientSummary[]>();
    const byPhone = new Map<string, PatientSummary[]>();
    const byEmail = new Map<string, PatientSummary[]>();
    const byName = new Map<string, PatientSummary[]>();

    for (const p of patients) {
      // NRIC index
      if (p.nricId) {
        const k = p.nricId.toUpperCase();
        if (!byNric.has(k)) byNric.set(k, []);
        byNric.get(k)!.push(p);
      }
      // Phone index (normalized)
      const normPhone = normalizePhone(p.phone);
      if (normPhone) {
        if (!byPhone.has(normPhone)) byPhone.set(normPhone, []);
        byPhone.get(normPhone)!.push(p);
      }
      // Email index
      if (p.email) {
        const k = p.email.toLowerCase();
        if (!byEmail.has(k)) byEmail.set(k, []);
        byEmail.get(k)!.push(p);
      }
      // Name index
      const fullName = normalizeName(`${p.firstName} ${p.lastName}`);
      if (!byName.has(fullName)) byName.set(fullName, []);
      byName.get(fullName)!.push(p);
    }

    // 1. Exact NRIC match (high confidence)
    for (const [, group] of byNric) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addPair(group[i], group[j], "Same NRIC", "high");
        }
      }
    }

    // 2. Exact phone match (high confidence)
    for (const [, group] of byPhone) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addPair(group[i], group[j], "Same Phone", "high");
        }
      }
    }

    // 3. Exact email match (medium confidence)
    for (const [, group] of byEmail) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addPair(group[i], group[j], "Same Email", "medium");
        }
      }
    }

    // 4. Same full name (medium if same DOB or phone suffix, low otherwise)
    for (const [, group] of byName) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i], b = group[j];
          const sameDob = a.dateOfBirth && b.dateOfBirth &&
            a.dateOfBirth.toISOString().split("T")[0] === b.dateOfBirth.toISOString().split("T")[0];
          const phoneA = normalizePhone(a.phone).slice(-8);
          const phoneB = normalizePhone(b.phone).slice(-8);
          const samePhoneSuffix = phoneA.length >= 7 && phoneA === phoneB;

          if (sameDob) {
            addPair(a, b, "Same Name + DOB", "high");
          } else if (samePhoneSuffix) {
            addPair(a, b, "Same Name + Phone", "high");
          } else {
            addPair(a, b, "Same Name", "low");
          }
        }
      }
    }

    // Sort: high first, then medium, then low
    const order = { high: 0, medium: 1, low: 2 };
    groups.sort((a, b) => order[a.confidence] - order[b.confidence]);

    return NextResponse.json(groups);
  } catch (error) {
    console.error("GET /api/patients/duplicates error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
