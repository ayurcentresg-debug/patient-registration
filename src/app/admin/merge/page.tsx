"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminTabs from "@/components/AdminTabs";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toast from "@/components/Toast";
import { cardStyle } from "@/lib/styles";
import { formatDate } from "@/lib/formatters";

interface PatientSummary {
  id: string;
  patientIdNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  nricId: string | null;
  dateOfBirth: string | null;
  gender: string;
  status: string;
  createdAt: string;
  _count: { appointments: number; communications: number };
}

interface DuplicateGroup {
  patients: [PatientSummary, PatientSummary];
  matchType: string;
  confidence: "high" | "medium" | "low";
}

interface FamilyMember {
  id: string;
  relation: string;
  memberName: string;
  memberPhone?: string | null;
  linkedPatientId?: string | null;
}

// Full patient for comparison
interface PatientFull {
  id: string; patientIdNumber: string; firstName: string; lastName: string;
  nricId: string | null; email: string | null; phone: string;
  secondaryMobile: string | null; landline: string | null; whatsapp: string | null;
  dateOfBirth: string | null; age: number | null; gender: string;
  address: string | null; locality: string | null; city: string | null;
  state: string | null; zipCode: string | null; bloodGroup: string | null;
  ethnicity: string | null; nationality: string | null; occupation: string | null;
  referredBy: string | null; emergencyName: string | null; emergencyPhone: string | null;
  medicalHistory: string; otherHistory: string | null; allergies: string | null;
  medicalNotes: string | null; groups: string; status: string; createdAt: string;
  familyMembers: FamilyMember[];
  appointments: unknown[]; communications: unknown[]; clinicalNotes: unknown[]; documents: unknown[];
}

/* ─── Field config for the Merged Profile Preview ─── */
interface FieldDef { key: string; label: string; section: "personal" | "contact" | "address" | "medical" }

const MERGE_FIELDS: FieldDef[] = [
  // Personal Details
  { key: "name", label: "Name", section: "personal" },
  { key: "patientIdNumber", label: "Patient ID", section: "personal" },
  { key: "nricId", label: "NRIC ID", section: "personal" },
  { key: "gender", label: "Gender", section: "personal" },
  { key: "dateOfBirth", label: "DOB or Age", section: "personal" },
  { key: "bloodGroup", label: "Blood Group", section: "personal" },
  { key: "ethnicity", label: "Ethnicity", section: "personal" },
  { key: "nationality", label: "Nationality", section: "personal" },
  { key: "occupation", label: "Occupation", section: "personal" },
  { key: "referredBy", label: "Referred By", section: "personal" },
  // Contact
  { key: "email", label: "Email", section: "contact" },
  { key: "phone", label: "Primary Mobile", section: "contact" },
  { key: "secondaryMobile", label: "Secondary Mobile", section: "contact" },
  { key: "landline", label: "Landline Number", section: "contact" },
  { key: "whatsapp", label: "WhatsApp", section: "contact" },
  { key: "emergencyName", label: "Emergency Contact", section: "contact" },
  { key: "emergencyPhone", label: "Emergency Phone", section: "contact" },
  // Address
  { key: "address", label: "Street Address", section: "address" },
  { key: "locality", label: "Locality", section: "address" },
  { key: "city", label: "City", section: "address" },
  { key: "state", label: "State", section: "address" },
  { key: "zipCode", label: "Pincode", section: "address" },
  // Medical
  { key: "allergies", label: "Allergies", section: "medical" },
  { key: "medicalNotes", label: "Medical Notes", section: "medical" },
];

/** Parse a field that might be a JSON array string, comma-separated, or plain text */
function parseListField(val: string | null | undefined): string[] {
  if (!val || val === "[]" || val === "null") return [];
  // Try JSON parse first
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch { /* not JSON */ }
  // Comma-separated fallback
  return val.split(",").map(s => s.trim()).filter(Boolean);
}

function getFieldValue(patient: PatientFull, key: string): string {
  if (key === "name") return `${patient.firstName} ${patient.lastName}`;
  const val = (patient as unknown as Record<string, unknown>)[key];
  if (val === null || val === undefined || val === "") return "";
  if (key === "dateOfBirth") return formatDate(val as string);
  if (key === "gender") return (val as string).charAt(0).toUpperCase() + (val as string).slice(1);
  return String(val);
}

/* ─── Collapsible Section ─── */
function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--grey-200)" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-5 py-4 text-left">
        <svg className={`w-4 h-4 transition-transform ${open ? "rotate-0" : "-rotate-90"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>{title}</span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

/* ─── Radio Field (Practo-style) ─── */
function RadioField({ label, valueA, valueB, selected, onSelect }: {
  label: string; valueA: string; valueB: string; selected: "a" | "b"; onSelect: (v: "a" | "b") => void;
}) {
  const hasA = valueA !== "";
  const hasB = valueB !== "";
  const isDiff = valueA !== valueB;

  // If both empty or both identical, just show the value
  if (!hasA && !hasB) {
    return (
      <div>
        <label className="text-[13px] font-bold block mb-2" style={{ color: "var(--grey-700)" }}>{label}</label>
        <p className="text-[14px]" style={{ color: "var(--grey-400)" }}>—</p>
      </div>
    );
  }
  if (!isDiff) {
    return (
      <div>
        <label className="text-[13px] font-bold block mb-2" style={{ color: "var(--grey-700)" }}>{label}</label>
        <p className="text-[14px]" style={{ color: "var(--grey-900)" }}>{valueA}</p>
      </div>
    );
  }

  // Conflicting values — show radio buttons
  return (
    <div>
      <label className="text-[13px] font-bold block mb-2" style={{ color: "var(--grey-700)" }}>{label}</label>
      <div className="space-y-1.5">
        {hasA && (
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="radio" name={`merge-${label}`} checked={selected === "a"} onChange={() => onSelect("a")}
              className="w-4 h-4 accent-[#2d6a4f]" />
            <span className={`text-[14px] ${selected === "a" ? "font-semibold" : ""}`}
              style={{ color: selected === "a" ? "var(--grey-900)" : "var(--grey-600)" }}>
              {valueA}
            </span>
          </label>
        )}
        {hasB && (
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="radio" name={`merge-${label}`} checked={selected === "b"} onChange={() => onSelect("b")}
              className="w-4 h-4 accent-[#2d6a4f]" />
            <span className={`text-[14px] ${selected === "b" ? "font-semibold" : ""}`}
              style={{ color: selected === "b" ? "var(--grey-900)" : "var(--grey-600)" }}>
              {valueB}
            </span>
          </label>
        )}
      </div>
    </div>
  );
}

const confidenceColors: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5" },
  medium: { bg: "#faf3e6", text: "#b68d40", border: "#fcd34d" },
  low: { bg: "#f0faf4", text: "#2d6a4f", border: "#a7e3bd" },
};

export default function MergeDuplicatesPage() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Manual search state
  const [manualSearch1, setManualSearch1] = useState("");
  const [manualSearch2, setManualSearch2] = useState("");
  const [manualResults1, setManualResults1] = useState<PatientSummary[]>([]);
  const [manualResults2, setManualResults2] = useState<PatientSummary[]>([]);
  const [manualPicked1, setManualPicked1] = useState<PatientSummary | null>(null);
  const [manualPicked2, setManualPicked2] = useState<PatientSummary | null>(null);
  const [showDrop1, setShowDrop1] = useState(false);
  const [showDrop2, setShowDrop2] = useState(false);

  // Compare view state
  const [comparing, setComparing] = useState(false);
  const [patientA, setPatientA] = useState<PatientFull | null>(null);
  const [patientB, setPatientB] = useState<PatientFull | null>(null);
  const [fieldSelections, setFieldSelections] = useState<Record<string, "a" | "b">>({});
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Family members & medical history merge selections
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<Set<string>>(new Set());
  const [selectedMedicalHistory, setSelectedMedicalHistory] = useState<Set<string>>(new Set());

  // Merge state
  const [merging, setMerging] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string; confirmLabel: string;
    variant: "danger" | "warning" | "default"; onConfirm: () => void;
  }>({ open: false, title: "", message: "", confirmLabel: "Confirm", variant: "default", onConfirm: () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patients/duplicates");
      if (res.ok) setDuplicates(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDuplicates(); }, [fetchDuplicates]);

  // Manual patient search with debounce
  useEffect(() => {
    if (manualSearch1.length < 2) { setManualResults1([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/patients?search=${encodeURIComponent(manualSearch1)}`);
        if (r.ok) { const data = await r.json(); setManualResults1(data.slice(0, 6)); setShowDrop1(true); }
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [manualSearch1]);

  useEffect(() => {
    if (manualSearch2.length < 2) { setManualResults2([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/patients?search=${encodeURIComponent(manualSearch2)}`);
        if (r.ok) { const data = await r.json(); setManualResults2(data.slice(0, 6)); setShowDrop2(true); }
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [manualSearch2]);

  function startManualCompare() {
    if (!manualPicked1 || !manualPicked2) return;
    if (manualPicked1.id === manualPicked2.id) { setToast({ message: "Cannot merge a patient with itself", type: "error" }); return; }
    const group: DuplicateGroup = {
      patients: [manualPicked1, manualPicked2],
      matchType: "Manual Selection",
      confidence: "high",
    };
    openCompare(group);
  }

  async function openCompare(group: DuplicateGroup) {
    setLoadingCompare(true);
    setComparing(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/patients/${group.patients[0].id}`),
        fetch(`/api/patients/${group.patients[1].id}`),
      ]);
      if (!resA.ok || !resB.ok) throw new Error("Failed to load patients");
      const a: PatientFull = await resA.json();
      const b: PatientFull = await resB.json();
      setPatientA(a);
      setPatientB(b);

      // Auto-select field values: prefer non-empty from A (Patient 1), fallback to B
      const selections: Record<string, "a" | "b"> = {};
      for (const { key } of MERGE_FIELDS) {
        const aVal = getFieldValue(a, key);
        const bVal = getFieldValue(b, key);
        if (aVal === "" && bVal !== "") {
          selections[key] = "b";
        } else {
          selections[key] = "a";
        }
      }
      setFieldSelections(selections);

      // Pre-select all family members from both patients
      const allFamIds = new Set<string>();
      (a.familyMembers || []).forEach(f => allFamIds.add(f.id));
      (b.familyMembers || []).forEach(f => allFamIds.add(f.id));
      setSelectedFamilyIds(allFamIds);

      // Pre-select all medical history items from both patients
      const allMedical = new Set<string>();
      const aMedical = parseListField(a.medicalHistory);
      const bMedical = parseListField(b.medicalHistory);
      [...aMedical, ...bMedical].forEach(m => allMedical.add(m));
      setSelectedMedicalHistory(allMedical);

    } catch {
      setToast({ message: "Failed to load patient details", type: "error" });
      setComparing(false);
    }
    finally { setLoadingCompare(false); }
  }

  function buildMergedFields(): Record<string, unknown> {
    if (!patientA || !patientB) return {};
    const merged: Record<string, unknown> = {};

    for (const { key } of MERGE_FIELDS) {
      if (key === "name") {
        // Special: name splits into firstName and lastName
        const source = fieldSelections[key] === "a" ? patientA : patientB;
        merged["firstName"] = source.firstName;
        merged["lastName"] = source.lastName;
        continue;
      }
      if (key === "patientIdNumber") continue; // don't merge patient ID
      const source = fieldSelections[key] === "a" ? patientA : patientB;
      merged[key] = (source as unknown as Record<string, unknown>)[key];
    }

    // Merge medical history from selected checkboxes
    merged["medicalHistory"] = Array.from(selectedMedicalHistory).join(",");

    // Merge groups from both patients
    const aGroups = parseListField(patientA.groups);
    const bGroups = parseListField(patientB.groups);
    const allGroups = [...new Set([...aGroups, ...bGroups])];
    merged["groups"] = allGroups.join(",");

    return merged;
  }

  function startMerge() {
    if (!patientA || !patientB) return;
    // Patient 2 is always the "keep" — Patient 1 is the "remove" (per Practo convention)
    const keepId = patientB.id;
    const removeId = patientA.id;
    const removeName = `${patientA.firstName} ${patientA.lastName} (${patientA.patientIdNumber})`;
    const keepName = `${patientB.firstName} ${patientB.lastName} (${patientB.patientIdNumber})`;

    setConfirmDialog({
      open: true,
      title: "Merge Patients",
      message: `This will merge all records from "${removeName}" into "${keepName}". The duplicate record "${removeName}" will be permanently deleted. This action cannot be undone.`,
      confirmLabel: "Merge",
      variant: "danger",
      onConfirm: async () => {
        setConfirmLoading(true);
        setMerging(true);
        try {
          const res = await fetch("/api/patients/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keepId, removeId, mergedFields: buildMergedFields() }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Merge failed");
          }
          const result = await res.json();
          setToast({ message: `Merged successfully. ${result.recordsTransferred} records transferred.`, type: "success" });
          setComparing(false);
          setPatientA(null);
          setPatientB(null);
          setManualPicked1(null);
          setManualPicked2(null);
          fetchDuplicates();
        } catch (e) {
          setToast({ message: e instanceof Error ? e.message : "Merge failed", type: "error" });
        }
        finally {
          setMerging(false);
          setConfirmLoading(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
    });
  }

  // Helper: get relation label
  function relationLabel(r: string) {
    const map: Record<string, string> = {
      spouse: "Spouse", parent: "Parent", child: "Child", sibling: "Sibling",
      grandparent: "Grandparent", grandchild: "Grandchild", uncle_aunt: "Uncle/Aunt",
      nephew_niece: "Nephew/Niece", cousin: "Cousin", other: "Other",
      wife: "Wife", husband: "Husband", son: "Son", daughter: "Daughter",
      brother: "Brother", sister: "Sister", father: "Father", mother: "Mother",
    };
    return map[r.toLowerCase()] || r.charAt(0).toUpperCase() + r.slice(1);
  }

  // ─── COMPARE VIEW (Practo-style Merged Profile Preview) ───
  if (comparing && patientA && patientB) {
    const allFamilyMembers = [
      ...(patientA.familyMembers || []).map(f => ({ ...f, from: "a" as const })),
      ...(patientB.familyMembers || []).map(f => ({ ...f, from: "b" as const })),
    ];
    // De-duplicate family members by linkedPatientId or name
    const seenFam = new Set<string>();
    const uniqueFamily = allFamilyMembers.filter(f => {
      const key = f.linkedPatientId || f.memberName.toLowerCase();
      if (seenFam.has(key)) return false;
      seenFam.add(key);
      return true;
    });

    const aMedical = parseListField(patientA.medicalHistory);
    const bMedical = parseListField(patientB.medicalHistory);
    const allMedical = [...new Set([...aMedical, ...bMedical])];

    const aGroups = parseListField(patientA.groups);
    const bGroups = parseListField(patientB.groups);
    const allGroups = [...new Set([...aGroups, ...bGroups])];

    // Count records to transfer
    const transferCount = (patientA.appointments?.length || 0) + (patientA.communications?.length || 0) +
      (patientA.clinicalNotes?.length || 0) + (patientA.documents?.length || 0);

    const personalFields = MERGE_FIELDS.filter(f => f.section === "personal");
    const contactFields = MERGE_FIELDS.filter(f => f.section === "contact");
    const addressFields = MERGE_FIELDS.filter(f => f.section === "address");
    const medicalFields = MERGE_FIELDS.filter(f => f.section === "medical");

    return (
      <div className="p-4 md:p-6 yoda-fade-in">
        <AdminTabs />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <ConfirmDialog
          open={confirmDialog.open} title={confirmDialog.title} message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel} variant={confirmDialog.variant} loading={confirmLoading}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => { setConfirmDialog(prev => ({ ...prev, open: false })); setConfirmLoading(false); }}
        />

        {/* Page Title */}
        <div className="mb-5">
          <button onClick={() => { setComparing(false); setPatientA(null); setPatientB(null); }}
            className="inline-flex items-center gap-1 text-[14px] font-semibold hover:underline mb-2" style={{ color: "var(--grey-500)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <h1 className="text-[24px] font-bold" style={{ color: "var(--grey-900)" }}>Merge Patients</h1>
        </div>

        {/* Yellow warning banner */}
        <div className="mb-5 p-3 text-[14px] font-medium text-center"
          style={{ background: "#fef3cd", color: "#856404", borderRadius: "var(--radius-sm)", border: "1px solid #ffeeba" }}>
          Profile details and records of Patient 1 will be moved to Patient 2. You cannot undo this action once done.
        </div>

        {/* Patient 1 and Patient 2 display */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center mb-6">
          <div className="text-center">
            <p className="text-[15px] font-bold mb-2" style={{ color: "var(--grey-800)" }}>Patient 1</p>
            <div className="inline-flex items-center gap-2 px-4 py-2.5"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}>
              <svg className="w-4 h-4" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>
                {patientA.firstName} {patientA.lastName} - {patientA.patientIdNumber}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center justify-center">
            <span className="text-[20px] font-light" style={{ color: "var(--grey-400)" }}>+</span>
          </div>
          <div className="text-center">
            <p className="text-[15px] font-bold mb-2" style={{ color: "var(--grey-800)" }}>Patient 2</p>
            <div className="inline-flex items-center gap-2 px-4 py-2.5"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}>
              <svg className="w-4 h-4" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>
                {patientB.firstName} {patientB.lastName} - {patientB.patientIdNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Merged Profile Preview */}
        <div style={cardStyle} className="overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--grey-200)" }}>
            <h2 className="text-[18px] font-bold" style={{ color: "var(--grey-900)" }}>Merged Profile Preview</h2>
            <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>
              Please verify the merged data. In case of conflicting values, you can choose the one to use. Click &quot;Merge&quot; to complete the merge.
            </p>
          </div>

          {/* Transfer info */}
          {transferCount > 0 && (
            <div className="mx-5 mt-4 p-3 flex items-center gap-2 text-[14px]" style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "var(--radius-sm)", color: "#0369a1" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span><strong>{transferCount} records</strong> (appointments, notes, communications, documents) from Patient 1 will be transferred to Patient 2.</span>
            </div>
          )}

          {/* ── Personal Details ── */}
          <Section title="Personal Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
              {personalFields.map(({ key, label }) => (
                <RadioField
                  key={key}
                  label={label}
                  valueA={getFieldValue(patientA, key)}
                  valueB={getFieldValue(patientB, key)}
                  selected={fieldSelections[key] || "a"}
                  onSelect={(v) => setFieldSelections(prev => ({ ...prev, [key]: v }))}
                />
              ))}
            </div>
          </Section>

          {/* ── Contact Details ── */}
          <Section title="Contact Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
              {contactFields.map(({ key, label }) => (
                <RadioField
                  key={key}
                  label={label}
                  valueA={getFieldValue(patientA, key)}
                  valueB={getFieldValue(patientB, key)}
                  selected={fieldSelections[key] || "a"}
                  onSelect={(v) => setFieldSelections(prev => ({ ...prev, [key]: v }))}
                />
              ))}
            </div>
          </Section>

          {/* ── Address ── */}
          <Section title="Address">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
              {addressFields.map(({ key, label }) => (
                <RadioField
                  key={key}
                  label={label}
                  valueA={getFieldValue(patientA, key)}
                  valueB={getFieldValue(patientB, key)}
                  selected={fieldSelections[key] || "a"}
                  onSelect={(v) => setFieldSelections(prev => ({ ...prev, [key]: v }))}
                />
              ))}
            </div>
          </Section>

          {/* ── Family Members ── */}
          <Section title="Family Members">
            {uniqueFamily.length === 0 ? (
              <p className="text-[14px]" style={{ color: "var(--grey-400)" }}>No family members to merge</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {uniqueFamily.map((f) => (
                  <label key={f.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={selectedFamilyIds.has(f.id)}
                      onChange={(e) => {
                        const next = new Set(selectedFamilyIds);
                        if (e.target.checked) next.add(f.id); else next.delete(f.id);
                        setSelectedFamilyIds(next);
                      }}
                      className="w-4 h-4 accent-[#2d6a4f] rounded" />
                    <span className="text-[14px]" style={{ color: "var(--grey-900)" }}>
                      {f.memberName} - {relationLabel(f.relation)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </Section>

          {/* ── Groups ── */}
          <Section title="Groups">
            {allGroups.length === 0 ? (
              <p className="text-[14px]" style={{ color: "var(--grey-400)" }}>No groups to merge</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allGroups.map((g) => (
                  <span key={g} className="px-3 py-1 text-[13px] font-medium"
                    style={{ background: "var(--green-light, #f0faf4)", color: "var(--green, #2d6a4f)", borderRadius: "var(--radius-pill)", border: "1px solid #a7e3bd" }}>
                    {g}
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* ── Medical History ── */}
          <Section title="Medical History">
            {allMedical.length === 0 ? (
              <p className="text-[14px]" style={{ color: "var(--grey-400)" }}>No medical history to merge</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allMedical.map((m) => (
                  <label key={m} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={selectedMedicalHistory.has(m)}
                      onChange={(e) => {
                        const next = new Set(selectedMedicalHistory);
                        if (e.target.checked) next.add(m); else next.delete(m);
                        setSelectedMedicalHistory(next);
                      }}
                      className="w-4 h-4 accent-[#2d6a4f] rounded" />
                    <span className="text-[14px]" style={{ color: "var(--grey-900)" }}>{m}</span>
                  </label>
                ))}
              </div>
            )}
          </Section>

          {/* ── Medical Notes & Allergies ── */}
          <Section title="Other Medical Info">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {medicalFields.map(({ key, label }) => (
                <RadioField
                  key={key}
                  label={label}
                  valueA={getFieldValue(patientA, key)}
                  valueB={getFieldValue(patientB, key)}
                  selected={fieldSelections[key] || "a"}
                  onSelect={(v) => setFieldSelections(prev => ({ ...prev, [key]: v }))}
                />
              ))}
            </div>
          </Section>
        </div>

        {/* Bottom action buttons */}
        <div className="flex justify-end mt-5 gap-3">
          <button onClick={() => { setComparing(false); setPatientA(null); setPatientB(null); }}
            className="px-5 py-2.5 text-[14px] font-semibold"
            style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>
            Cancel
          </button>
          <button onClick={startMerge} disabled={merging}
            className="px-6 py-2.5 text-[14px] font-bold text-white disabled:opacity-50"
            style={{ background: "#dc2626", borderRadius: "var(--radius-sm)" }}>
            {merging ? "Merging..." : "Merge"}
          </button>
        </div>
      </div>
    );
  }

  // ─── DUPLICATE LIST VIEW ───
  return (
    <div className="p-4 md:p-6 yoda-fade-in">
      <AdminTabs />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: "var(--grey-900)" }}>Merge Duplicates</h1>
          <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>
            {loading ? "Scanning for duplicates..." : `${duplicates.length} potential duplicate${duplicates.length !== 1 ? " pairs" : " pair"} found`}
          </p>
        </div>
        <button onClick={fetchDuplicates} disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold disabled:opacity-50"
          style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>
          <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Rescan
        </button>
      </div>

      {/* ── Manual Merge (Practo-style) ── */}
      <div className="mb-6 p-5" style={cardStyle}>
        <div className="mb-3 p-2.5 text-[13px] font-medium text-center" style={{ background: "#fef3cd", color: "#856404", borderRadius: "var(--radius-sm)", border: "1px solid #ffeeba" }}>
          Profile details and records of Patient 1 will be moved to Patient 2. You cannot undo this action once done.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-start">
          {/* Patient 1 */}
          <div>
            <p className="text-[14px] font-bold mb-2 text-center" style={{ color: "var(--grey-700)" }}>Patient 1</p>
            <div className="relative">
              {manualPicked1 ? (
                <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-[14px] font-semibold flex-1" style={{ color: "var(--grey-900)" }}>
                    {manualPicked1.firstName} {manualPicked1.lastName} - {manualPicked1.patientIdNumber}
                  </span>
                  <button onClick={() => { setManualPicked1(null); setManualSearch1(""); }} className="text-[16px] font-bold" style={{ color: "var(--grey-400)" }}>&times;</button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input value={manualSearch1} onChange={(e) => setManualSearch1(e.target.value)} onFocus={() => { if (manualResults1.length > 0) setShowDrop1(true); }}
                      placeholder="Search patient to merge profile" className="w-full pl-10 pr-3 py-2.5 text-[14px]"
                      style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", background: "var(--white)", color: "var(--grey-900)" }} />
                  </div>
                  {showDrop1 && manualResults1.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg)" }}>
                      {manualResults1.map(p => (
                        <button key={p.id} onClick={() => { setManualPicked1(p); setShowDrop1(false); setManualSearch1(""); }}
                          className="w-full text-left px-3 py-2 hover:bg-green-50 transition-colors flex items-center gap-2" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                          <div className="w-7 h-7 flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "#f0faf4", color: "#2d6a4f", borderRadius: "var(--radius-pill)" }}>{p.firstName[0]}{p.lastName[0]}</div>
                          <div>
                            <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{p.firstName} {p.lastName}</span>
                            <span className="text-[12px] ml-2" style={{ color: "var(--grey-500)" }}>{p.patientIdNumber} &middot; {p.phone}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDrop1 && manualSearch1.length >= 2 && manualResults1.length === 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 px-3 py-3 text-[13px]" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-500)" }}>No Patients Found</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Plus icon */}
          <div className="hidden sm:flex items-center justify-center pt-8">
            <div className="w-8 h-8 flex items-center justify-center text-[18px] font-light" style={{ color: "var(--grey-400)" }}>+</div>
          </div>

          {/* Patient 2 */}
          <div>
            <p className="text-[14px] font-bold mb-2 text-center" style={{ color: "var(--grey-700)" }}>Patient 2</p>
            <div className="relative">
              {manualPicked2 ? (
                <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-[14px] font-semibold flex-1" style={{ color: "var(--grey-900)" }}>
                    {manualPicked2.firstName} {manualPicked2.lastName} - {manualPicked2.patientIdNumber}
                  </span>
                  <button onClick={() => { setManualPicked2(null); setManualSearch2(""); }} className="text-[16px] font-bold" style={{ color: "var(--grey-400)" }}>&times;</button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input value={manualSearch2} onChange={(e) => setManualSearch2(e.target.value)} onFocus={() => { if (manualResults2.length > 0) setShowDrop2(true); }}
                      placeholder="Search patient to merge profile" className="w-full pl-10 pr-3 py-2.5 text-[14px]"
                      style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", background: "var(--white)", color: "var(--grey-900)" }} />
                  </div>
                  {showDrop2 && manualResults2.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg)" }}>
                      {manualResults2.map(p => (
                        <button key={p.id} onClick={() => { setManualPicked2(p); setShowDrop2(false); setManualSearch2(""); }}
                          className="w-full text-left px-3 py-2 hover:bg-green-50 transition-colors flex items-center gap-2" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                          <div className="w-7 h-7 flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "#f0faf4", color: "#2d6a4f", borderRadius: "var(--radius-pill)" }}>{p.firstName[0]}{p.lastName[0]}</div>
                          <div>
                            <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{p.firstName} {p.lastName}</span>
                            <span className="text-[12px] ml-2" style={{ color: "var(--grey-500)" }}>{p.patientIdNumber} &middot; {p.phone}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDrop2 && manualSearch2.length >= 2 && manualResults2.length === 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 px-3 py-3 text-[13px]" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-500)" }}>No Patients Found</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Merge button */}
        <div className="flex justify-center mt-4">
          <button onClick={startManualCompare} disabled={!manualPicked1 || !manualPicked2}
            className="px-6 py-2 text-[14px] font-bold text-white disabled:opacity-40"
            style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>
            Review & Merge
          </button>
        </div>
      </div>

      {/* ── Auto-detected Duplicates ── */}
      {duplicates.length > 0 && (
        <h3 className="text-[14px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--grey-500)" }}>
          Auto-detected Duplicates
        </h3>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && duplicates.length === 0 && (
        <div className="py-16 text-center" style={cardStyle}>
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center" style={{ background: "#f0faf4", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-8 h-8" style={{ color: "#2d6a4f" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-[17px] font-bold mb-1" style={{ color: "var(--grey-800)" }}>No Duplicates Found</h3>
          <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>All patient records appear to be unique. Great job keeping data clean!</p>
        </div>
      )}

      {/* Duplicate pairs list */}
      {!loading && duplicates.length > 0 && (
        <div className="space-y-3">
          {duplicates.map((group, idx) => {
            const [a, b] = group.patients;
            const colors = confidenceColors[group.confidence];
            return (
              <div key={idx} className="p-4 transition-shadow hover:shadow-md" style={cardStyle}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Match badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                        style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: "var(--radius-pill)" }}>
                        {group.confidence} confidence
                      </span>
                      <span className="text-[13px] font-semibold" style={{ color: "var(--grey-500)" }}>{group.matchType}</span>
                    </div>

                    {/* Two patient cards side by side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[a, b].map((p) => (
                        <div key={p.id} className="p-3" style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)" }}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-8 h-8 flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                              style={{ background: "#f0faf4", color: "#2d6a4f", borderRadius: "var(--radius-pill)" }}>
                              {p.firstName[0]}{p.lastName[0]}
                            </div>
                            <div className="min-w-0">
                              <Link href={`/patients/${p.id}`} className="text-[15px] font-bold hover:underline block truncate" style={{ color: "var(--grey-900)" }}>
                                {p.firstName} {p.lastName}
                              </Link>
                              <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>{p.patientIdNumber}</p>
                            </div>
                            <span className="ml-auto px-1.5 py-px text-[10px] font-bold uppercase flex-shrink-0"
                              style={{ borderRadius: "var(--radius-pill)", background: p.status === "active" ? "var(--green-light)" : "var(--grey-200)", color: p.status === "active" ? "var(--green)" : "var(--grey-600)" }}>
                              {p.status}
                            </span>
                          </div>
                          <div className="text-[13px] space-y-0.5" style={{ color: "var(--grey-600)" }}>
                            <p>{p.phone}{p.email ? ` · ${p.email}` : ""}</p>
                            <p>{p.gender?.charAt(0).toUpperCase() + p.gender?.slice(1)}
                              {p.dateOfBirth ? ` · ${formatDate(p.dateOfBirth)}` : ""}
                              {p.nricId ? ` · ${p.nricId}` : ""}
                            </p>
                            <p className="text-[12px]" style={{ color: "var(--grey-400)" }}>
                              {p._count.appointments} visits · {p._count.communications} msgs · Since {formatDate(p.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <button onClick={() => openCompare(group)} disabled={loadingCompare}
                    className="flex-shrink-0 px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
                    style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>
                    Review & Merge
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
