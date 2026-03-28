"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const inputStyle = { border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", fontSize: "13px" };

const FAMILY_RELATIONS = [
  "spouse", "parent", "child", "sibling",
  "grandparent", "grandchild", "uncle_aunt", "nephew_niece", "cousin", "other",
];
const RELATION_LABELS: Record<string, string> = {
  spouse: "Spouse", parent: "Parent", child: "Child", sibling: "Sibling",
  grandparent: "Grandparent", grandchild: "Grandchild",
  uncle_aunt: "Uncle/Aunt", nephew_niece: "Nephew/Niece", cousin: "Cousin", other: "Other",
};

interface Patient {
  id: string; patientIdNumber: string; firstName: string; lastName: string; nricId: string | null;
  email: string | null; phone: string; secondaryMobile: string | null; landline: string | null;
  whatsapp: string | null; dateOfBirth: string | null; age: number | null; gender: string;
  address: string | null; locality: string | null; city: string | null; state: string | null;
  zipCode: string | null; bloodGroup: string | null; ethnicity: string | null; nationality: string | null;
  occupation: string | null; referredBy: string | null; familyRelation: string | null;
  familyMemberName: string | null; emergencyName: string | null; emergencyPhone: string | null;
  medicalHistory: string; otherHistory: string | null; allergies: string | null; medicalNotes: string | null;
  groups: string; photoUrl: string | null; status: string; createdAt: string;
  appointments: Array<{ id: string; date: string; time: string; doctor: string; department: string | null; reason: string | null; status: string }>;
  communications: Array<{ id: string; type: string; subject: string | null; message: string; status: string; sentAt: string }>;
}

interface ClinicalNote {
  id: string; patientId: string; type: string; title: string; content: string; doctor: string | null; createdAt: string; updatedAt: string;
}

interface PatientDocument {
  id: string; patientId: string; fileName: string; fileType: string; fileSize: number; filePath: string; category: string; description: string | null; uploadedAt: string;
}

interface TimelineEvent {
  id: string; type: string; title: string; description: string; date: string; time?: string;
}

interface VitalRecord {
  id: string; patientId: string; bloodPressureSys: number | null; bloodPressureDia: number | null; pulse: number | null; temperature: number | null; weight: number | null; height: number | null; oxygenSaturation: number | null; respiratoryRate: number | null; bmi: number | null; notes: string | null; recordedBy: string | null; date: string; createdAt: string;
}

interface VisitSummary {
  date: string; appointment?: { id: string; time: string; doctor: string; department: string | null; reason: string | null; status: string };
  notes: ClinicalNote[]; vitals: VitalRecord[]; documents: PatientDocument[];
  invoices: Array<{ id: string; invoiceNumber: string; totalAmount: number; status: string }>;
}

const NOTE_TYPES = [
  { value: "present_illness", label: "Present Illness" },
  { value: "past_history", label: "Past History" },
  { value: "personal_history", label: "Personal History" },
  { value: "examination", label: "Examination" },
  { value: "diagnosis", label: "Diagnosis" },
  { value: "treatment", label: "Treatment Plan" },
  { value: "general", label: "General Note" },
];

const DOC_CATEGORIES = [
  { value: "report", label: "Report" },
  { value: "lab", label: "Lab Result" },
  { value: "imaging", label: "Imaging / X-Ray" },
  { value: "prescription", label: "Prescription" },
  { value: "other", label: "Other" },
];

/* ─── Toast ─── */
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 text-[13px] font-semibold yoda-slide-in" role="alert"
      style={{ background: type === "success" ? "var(--green)" : "var(--red)", color: "#fff", borderRadius: "var(--radius-sm)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", minWidth: 260 }}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {type === "success" ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />}
      </svg>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100">&times;</button>
    </div>
  );
}

/* ─── Profile Row — Practo style: right-aligned label with colon, value on left ─── */
function ProfileRow({ label, value, href, always }: { label: string; value: string | null | undefined; href?: string; always?: boolean }) {
  if (!value && !always) return null;
  return (
    <tr>
      <td className="py-[8px] pr-4 text-[13px] font-normal text-right whitespace-nowrap align-top" style={{ color: "var(--grey-600)", width: 180 }}>{label} :</td>
      <td className="py-[8px] pl-2 text-[13px] font-medium align-top" style={{ color: value ? "var(--grey-900)" : "var(--grey-400)" }}>
        {href && value ? <a href={href} className="hover:underline" style={{ color: "var(--blue-500)" }}>{value}</a> : (value || "—")}
      </td>
    </tr>
  );
}

/* ─── Edit Row — Practo style ─── */
function EditRow({ label, name, value, type = "text", onChange }: { label: string; name: string; value: string; type?: string; onChange: (n: string, v: string) => void }) {
  return (
    <tr>
      <td className="py-[8px] pr-4 text-[13px] font-normal text-right whitespace-nowrap align-middle" style={{ color: "var(--grey-600)", width: 180 }}>{label} :</td>
      <td className="py-[8px] pl-2"><input type={type} value={value} onChange={(e) => onChange(name, e.target.value)} className="w-full max-w-sm px-2.5 py-1.5 text-[13px]" style={inputStyle} /></td>
    </tr>
  );
}

function genderRelationLabel(relation: string, gender?: string | null): string {
  const labels: Record<string, string> = {
    spouse: "Spouse", parent: "Parent", child: "Child", sibling: "Sibling",
    grandparent: "Grandparent", grandchild: "Grandchild",
    uncle_aunt: "Uncle/Aunt", nephew_niece: "Nephew/Niece", cousin: "Cousin", other: "Other",
  };
  if (!gender) return labels[relation] || relation;
  const map: Record<string, Record<string, string>> = {
    spouse: { male: "Husband", female: "Wife" },
    parent: { male: "Father", female: "Mother" },
    child: { male: "Son", female: "Daughter" },
    sibling: { male: "Brother", female: "Sister" },
    grandparent: { male: "Grandfather", female: "Grandmother" },
    grandchild: { male: "Grandson", female: "Granddaughter" },
    uncle_aunt: { male: "Uncle", female: "Aunt" },
    nephew_niece: { male: "Nephew", female: "Niece" },
  };
  return map[relation]?.[gender] || labels[relation] || relation;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatCurrency(amount: number): string {
  return `S$${(amount ?? 0).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calcAge(dob: string | null): string {
  if (!dob) return "";
  const b = new Date(dob), t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return `${a} Years`;
}

/* ═══ Sidebar nav ═══ */
const sidebarNav = [
  { key: "profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", group: "Patient" },
  { key: "appointments", label: "Appointments", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", group: "Patient" },
  { key: "timeline", label: "Timeline", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", group: "Patient" },
  { key: "vitals", label: "Vitals", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", group: "Patient" },
  { key: "visit-summary", label: "Visit Summary", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", group: "Patient" },
  { key: "communications", label: "Communications", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", group: "Patient" },
  { key: "clinical", label: "Clinical Notes", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01", group: "Medical" },
  { key: "documents", label: "Documents", icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z", group: "Medical" },
  { key: "emergency", label: "Emergency Contact", icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z", group: "Medical" },
  { key: "allergies", label: "Allergies & Notes", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", group: "Medical" },
];

export default function PatientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("profile");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [showMsgForm, setShowMsgForm] = useState(false);
  const [msgType, setMsgType] = useState<"email" | "whatsapp">("whatsapp");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);
  const [noteInput, setNoteInput] = useState("");

  // Clinical Notes state
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteType, setNoteType] = useState("present_illness");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteDoctor, setNoteDoctor] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteFilter, setNoteFilter] = useState("all");

  // Documents state
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("report");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Family members state
  const [familyMembers, setFamilyMembers] = useState<Array<{ id: string; relation: string; memberName: string; memberPhone?: string | null; memberGender?: string | null; linkedPatientId?: string | null }>>([]);
  const [famRelation, setFamRelation] = useState("");
  const [famSearch, setFamSearch] = useState("");
  const [famResults, setFamResults] = useState<Array<{ id: string; firstName: string; lastName: string; phone: string; patientIdNumber: string; gender?: string }>>([]);
  const [famSearchLoading, setFamSearchLoading] = useState(false);
  const [showFamDropdown, setShowFamDropdown] = useState(false);
  const [editingFamId, setEditingFamId] = useState<string | null>(null);
  const [editFamRelation, setEditFamRelation] = useState("");
  const famSearchRef = useRef<HTMLDivElement>(null);

  // Pending balance state
  const [pendingBalance, setPendingBalance] = useState<{ total: number; invoices: Array<{ id: string; invoiceNumber: string; totalAmount: number; paidAmount: number; balanceAmount: number; date: string }> }>({ total: 0, invoices: [] });
  const [familyBalances, setFamilyBalances] = useState<Array<{ patientId: string; name: string; relation: string; balance: number }>>([]);
  const [sendingReminder, setSendingReminder] = useState(false);

  // Timeline state
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineFilters, setTimelineFilters] = useState<Record<string, boolean>>({ appointment: true, note: true, document: true, communication: true, vital: true, invoice: true });
  const [timelineLimit, setTimelineLimit] = useState(20);
  const [timelineHasMore, setTimelineHasMore] = useState(false);

  // Vitals state
  const [vitals, setVitals] = useState<VitalRecord[]>([]);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [savingVital, setSavingVital] = useState(false);
  const [vitalForm, setVitalForm] = useState({ bloodPressureSys: "", bloodPressureDia: "", pulse: "", temperature: "", weight: "", height: "", oxygenSaturation: "", respiratoryRate: "", notes: "", recordedBy: "" });
  const [expandedVitalId, setExpandedVitalId] = useState<string | null>(null);

  // Visit Summary state
  const [visitSummaries, setVisitSummaries] = useState<VisitSummary[]>([]);
  const [visitSummaryLoading, setVisitSummaryLoading] = useState(false);
  const [expandedVisitDate, setExpandedVisitDate] = useState<string | null>(null);

  // Treatment Progress state
  const [treatmentPackages, setTreatmentPackages] = useState<Array<{ packageId: string; treatmentName: string; packageName: string; sessionsCompleted: number; sessionsTotal: number }>>([]);

  // Quick Actions FAB state
  const [fabOpen, setFabOpen] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error") => setToast({ message, type }), []);

  const fetchPatient = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/patients/${id}`);
      if (!res.ok) throw new Error(res.status === 404 ? "Patient not found" : "Failed to load");
      setPatient(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  }, [id]);

  const fetchClinicalNotes = useCallback(async () => {
    try { const r = await fetch(`/api/clinical-notes?patientId=${id}`); if (r.ok) setClinicalNotes(await r.json()); } catch { /* ignore */ }
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    try { const r = await fetch(`/api/documents?patientId=${id}`); if (r.ok) setDocuments(await r.json()); } catch { /* ignore */ }
  }, [id]);

  const fetchFamilyMembers = useCallback(async () => {
    try { const r = await fetch(`/api/patients/${id}/family`); if (r.ok) setFamilyMembers(await r.json()); } catch { /* ignore */ }
  }, [id]);

  const fetchPendingBalance = useCallback(async () => {
    try {
      const r = await fetch(`/api/invoices?patientId=${id}&status=pending,partially_paid`);
      if (r.ok) {
        const invoices = await r.json();
        const list = Array.isArray(invoices) ? invoices : invoices.invoices || [];
        const mapped = list.map((inv: Record<string, unknown>) => ({
          id: inv.id as string,
          invoiceNumber: inv.invoiceNumber as string,
          totalAmount: (inv.totalAmount as number) ?? 0,
          paidAmount: (inv.paidAmount as number) ?? 0,
          balanceAmount: (inv.balanceAmount as number) ?? 0,
          date: inv.date as string,
        }));
        setPendingBalance({ total: mapped.reduce((s: number, i: { balanceAmount: number }) => s + i.balanceAmount, 0), invoices: mapped });
      }
    } catch { /* ignore */ }
  }, [id]);

  const fetchFamilyBalances = useCallback(async () => {
    if (familyMembers.length === 0) return;
    const balances: Array<{ patientId: string; name: string; relation: string; balance: number }> = [];
    for (const fm of familyMembers) {
      if (!fm.linkedPatientId) continue;
      try {
        const r = await fetch(`/api/invoices?patientId=${fm.linkedPatientId}&status=pending,partially_paid`);
        if (r.ok) {
          const data = await r.json();
          const list = Array.isArray(data) ? data : data.invoices || [];
          const bal = list.reduce((s: number, inv: Record<string, unknown>) => s + ((inv.balanceAmount as number) ?? 0), 0);
          if (bal > 0) balances.push({ patientId: fm.linkedPatientId, name: fm.memberName, relation: fm.relation, balance: bal });
        }
      } catch { /* ignore */ }
    }
    setFamilyBalances(balances);
  }, [familyMembers]);

  // Timeline fetch
  const fetchTimeline = useCallback(async (limit = 20) => {
    setTimelineLoading(true);
    try {
      const r = await fetch(`/api/patients/${id}/timeline?limit=${limit + 1}`);
      if (r.ok) {
        const data = await r.json();
        const events = Array.isArray(data) ? data : data.events || [];
        setTimelineHasMore(events.length > limit);
        setTimelineEvents(events.slice(0, limit));
      } else {
        // Build timeline from existing data
        const events: TimelineEvent[] = [];
        if (patient) {
          patient.appointments.forEach(a => events.push({ id: `appt-${a.id}`, type: "appointment", title: `Appointment with Dr. ${a.doctor}`, description: a.reason || a.department || "Consultation", date: a.date, time: a.time }));
          patient.communications.forEach(c => events.push({ id: `comm-${c.id}`, type: "communication", title: c.subject || `${c.type} message`, description: c.message.substring(0, 120), date: c.sentAt }));
        }
        clinicalNotes.forEach(n => events.push({ id: `note-${n.id}`, type: "note", title: n.title, description: n.content.substring(0, 120), date: n.createdAt }));
        documents.forEach(d => events.push({ id: `doc-${d.id}`, type: "document", title: d.fileName, description: d.description || d.category, date: d.uploadedAt }));
        vitals.forEach(v => events.push({ id: `vital-${v.id}`, type: "vital", title: "Vitals Recorded", description: [v.bloodPressureSys && `BP: ${v.bloodPressureSys}/${v.bloodPressureDia}`, v.pulse && `Pulse: ${v.pulse}`, v.temperature && `Temp: ${v.temperature}`].filter(Boolean).join(", ") || "Vital signs", date: v.date || v.createdAt }));
        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTimelineEvents(events.slice(0, limit));
        setTimelineHasMore(events.length > limit);
      }
    } catch { /* ignore */ }
    finally { setTimelineLoading(false); }
  }, [id, patient, clinicalNotes, documents, vitals]);

  // Vitals fetch
  const fetchVitals = useCallback(async () => {
    setVitalsLoading(true);
    try {
      const r = await fetch(`/api/vitals?patientId=${id}`);
      if (r.ok) { const data = await r.json(); setVitals(Array.isArray(data) ? data : data.vitals || []); }
    } catch { /* ignore */ }
    finally { setVitalsLoading(false); }
  }, [id]);

  // Visit Summary builder
  const buildVisitSummaries = useCallback(async () => {
    setVisitSummaryLoading(true);
    try {
      const dateMap = new Map<string, VisitSummary>();
      if (patient) {
        for (const a of patient.appointments) {
          const dateKey = a.date.split("T")[0];
          if (!dateMap.has(dateKey)) dateMap.set(dateKey, { date: dateKey, notes: [], vitals: [], documents: [], invoices: [] });
          dateMap.get(dateKey)!.appointment = a;
        }
      }
      for (const n of clinicalNotes) {
        const dateKey = n.createdAt.split("T")[0];
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, { date: dateKey, notes: [], vitals: [], documents: [], invoices: [] });
        dateMap.get(dateKey)!.notes.push(n);
      }
      for (const v of vitals) {
        const dateKey = (v.date || v.createdAt).split("T")[0];
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, { date: dateKey, notes: [], vitals: [], documents: [], invoices: [] });
        dateMap.get(dateKey)!.vitals.push(v);
      }
      for (const d of documents) {
        const dateKey = d.uploadedAt.split("T")[0];
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, { date: dateKey, notes: [], vitals: [], documents: [], invoices: [] });
        dateMap.get(dateKey)!.documents.push(d);
      }
      // Try to fetch invoices for this patient
      try {
        const r = await fetch(`/api/invoices?patientId=${id}`);
        if (r.ok) {
          const data = await r.json();
          const list = Array.isArray(data) ? data : data.invoices || [];
          for (const inv of list) {
            const dateKey = ((inv.date || inv.createdAt) as string)?.split("T")[0];
            if (!dateKey) continue;
            if (!dateMap.has(dateKey)) dateMap.set(dateKey, { date: dateKey, notes: [], vitals: [], documents: [], invoices: [] });
            dateMap.get(dateKey)!.invoices.push({ id: inv.id as string, invoiceNumber: inv.invoiceNumber as string, totalAmount: (inv.totalAmount as number) ?? 0, status: inv.status as string });
          }
        }
      } catch { /* ignore */ }
      const summaries = Array.from(dateMap.values()).sort((a, b) => b.date.localeCompare(a.date));
      setVisitSummaries(summaries);
    } catch { /* ignore */ }
    finally { setVisitSummaryLoading(false); }
  }, [patient, clinicalNotes, vitals, documents, id]);

  // Treatment packages
  const buildTreatmentPackages = useCallback(async () => {
    if (!patient) return;
    try {
      const appts = patient.appointments;
      const pkgMap = new Map<string, { packageId: string; treatmentName: string; packageName: string; sessionsCompleted: number; sessionsTotal: number }>();
      // Try fetching treatment packages from API
      const r = await fetch(`/api/treatment-packages?patientId=${id}`);
      if (r.ok) {
        const data = await r.json();
        const list = Array.isArray(data) ? data : data.packages || [];
        for (const pkg of list) {
          pkgMap.set(pkg.id || pkg.packageId, {
            packageId: pkg.id || pkg.packageId,
            treatmentName: (pkg.treatmentName || pkg.treatment || "Treatment") as string,
            packageName: (pkg.packageName || pkg.name || "Package") as string,
            sessionsCompleted: (pkg.sessionsCompleted ?? pkg.completedSessions ?? 0) as number,
            sessionsTotal: (pkg.sessionsTotal ?? pkg.totalSessions ?? 0) as number,
          });
        }
      } else {
        // Fallback: group appointments by packageId
        for (const a of appts) {
          const pkgId = (a as Record<string, unknown>).packageId as string | undefined;
          if (!pkgId) continue;
          if (!pkgMap.has(pkgId)) pkgMap.set(pkgId, { packageId: pkgId, treatmentName: (a as Record<string, unknown>).treatmentName as string || "Treatment", packageName: pkgId, sessionsCompleted: 0, sessionsTotal: 0 });
          const pkg = pkgMap.get(pkgId)!;
          pkg.sessionsTotal++;
          if (a.status === "completed") pkg.sessionsCompleted++;
        }
      }
      setTreatmentPackages(Array.from(pkgMap.values()));
    } catch { /* ignore */ }
  }, [patient, id]);

  useEffect(() => { setMounted(true); fetchPatient(); fetchClinicalNotes(); fetchDocuments(); fetchFamilyMembers(); fetchPendingBalance(); fetchVitals(); }, [fetchPatient, fetchClinicalNotes, fetchDocuments, fetchFamilyMembers, fetchPendingBalance, fetchVitals]);

  useEffect(() => { fetchFamilyBalances(); }, [fetchFamilyBalances]);

  // Fetch timeline when section activated
  useEffect(() => { if (activeSection === "timeline") fetchTimeline(timelineLimit); }, [activeSection, fetchTimeline, timelineLimit]);
  // Fetch visit summaries when section activated
  useEffect(() => { if (activeSection === "visit-summary") buildVisitSummaries(); }, [activeSection, buildVisitSummaries]);
  // Fetch treatment packages when appointments section activated
  useEffect(() => { if (activeSection === "appointments") buildTreatmentPackages(); }, [activeSection, buildTreatmentPackages]);

  // Family search with debounce
  useEffect(() => {
    if (!famSearch.trim() || famSearch.length < 2) { setFamResults([]); return; }
    const timer = setTimeout(async () => {
      setFamSearchLoading(true);
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(famSearch)}`);
        if (res.ok) { setFamResults((await res.json()).slice(0, 8)); setShowFamDropdown(true); }
      } catch { /* ignore */ }
      setFamSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [famSearch]);

  // Close family dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (famSearchRef.current && !famSearchRef.current.contains(e.target as Node)) setShowFamDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function addFamilyFromSearch(p: { id: string; firstName: string; lastName: string; phone: string; gender?: string }) {
    await fetch(`/api/patients/${id}/family`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relation: famRelation, linkedPatientId: p.id, memberName: `${p.firstName} ${p.lastName}`, memberPhone: p.phone, memberGender: p.gender || null }),
    });
    setFamRelation(""); setFamSearch(""); setFamResults([]); setShowFamDropdown(false);
    fetchFamilyMembers();
    showToast("Family member added", "success");
  }

  async function addFamilyManual() {
    if (!famRelation || !famSearch.trim()) return;
    await fetch(`/api/patients/${id}/family`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relation: famRelation, memberName: famSearch.trim() }),
    });
    setFamRelation(""); setFamSearch(""); setFamResults([]); setShowFamDropdown(false);
    fetchFamilyMembers();
    showToast("Family member added", "success");
  }

  async function sendPaymentReminder(channel: "email" | "whatsapp", targetPatientId?: string) {
    setSendingReminder(true);
    try {
      const targetId = targetPatientId || id;
      const res = await fetch(`/api/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: targetId,
          type: channel,
          subject: "Payment Reminder — Outstanding Balance",
          message: `Dear Patient,\n\nThis is a friendly reminder that you have an outstanding balance of S$${(targetPatientId ? familyBalances.find(f => f.patientId === targetPatientId)?.balance ?? 0 : pendingBalance.total).toFixed(2)} with our clinic.\n\nPlease arrange payment at your earliest convenience. You can pay at the clinic reception or contact us for alternative arrangements.\n\nThank you for your prompt attention.\n\nWarm regards,\nAyurveda Clinic`,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`${channel === "email" ? "Email" : "WhatsApp"} reminder sent`, "success");
    } catch { showToast("Failed to send reminder", "error"); }
    finally { setSendingReminder(false); }
  }

  async function updateFamilyRelation(memberId: string, newRelation: string) {
    try {
      const res = await fetch(`/api/patients/${id}/family`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, relation: newRelation }),
      });
      if (!res.ok) throw new Error("Failed");
      fetchFamilyMembers();
      setEditingFamId(null);
      showToast("Family relation updated", "success");
    } catch { showToast("Failed to update relation", "error"); }
  }

  const medicalHistory: string[] = patient ? (() => { try { return JSON.parse(patient.medicalHistory); } catch { return []; } })() : [];
  const groups: string[] = patient ? (() => { try { return JSON.parse(patient.groups); } catch { return []; } })() : [];

  function startEdit() {
    if (!patient) return;
    setEditData({
      firstName: patient.firstName, lastName: patient.lastName, nricId: patient.nricId || "",
      email: patient.email || "", phone: patient.phone, secondaryMobile: patient.secondaryMobile || "",
      landline: patient.landline || "", whatsapp: patient.whatsapp || "",
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split("T")[0] : "", gender: patient.gender,
      address: patient.address || "", locality: patient.locality || "", city: patient.city || "",
      state: patient.state || "", zipCode: patient.zipCode || "", bloodGroup: patient.bloodGroup || "",
      ethnicity: patient.ethnicity || "", nationality: patient.nationality || "", occupation: patient.occupation || "",
      referredBy: patient.referredBy || "", familyRelation: patient.familyRelation || "", familyMemberName: patient.familyMemberName || "",
      emergencyName: patient.emergencyName || "", emergencyPhone: patient.emergencyPhone || "",
      allergies: patient.allergies || "", otherHistory: patient.otherHistory || "", medicalNotes: patient.medicalNotes || "",
    });
    setEditing(true);
  }
  function ec(n: string, v: string) { setEditData((p) => ({ ...p, [n]: v })); }

  async function saveEdit() {
    if (!editData.firstName?.trim() || !editData.lastName?.trim() || !editData.phone?.trim()) { showToast("Name and phone are required", "error"); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...editData };
      Object.keys(payload).forEach((k) => { if (payload[k] === "" && !["firstName", "lastName", "phone", "gender"].includes(k)) payload[k] = null; });
      if (!payload.dateOfBirth) delete payload.dateOfBirth;
      const res = await fetch(`/api/patients/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed"); }
      await fetchPatient(); setEditing(false); showToast("Patient updated successfully", "success");
    } catch (e) { showToast(e instanceof Error ? e.message : "Update failed", "error"); }
    finally { setSaving(false); }
  }

  async function toggleStatus() {
    if (!patient) return; setTogglingStatus(true);
    const ns = patient.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/patients/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: ns }) });
      if (!res.ok) throw new Error(); setPatient((p) => p ? { ...p, status: ns } : p); showToast(`Marked as ${ns}`, "success");
    } catch { showToast("Failed", "error"); } finally { setTogglingStatus(false); }
  }

  async function sendMessage() {
    if (!msgBody.trim()) return; setSending(true);
    try {
      const res = await fetch("/api/communications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: id, type: msgType, subject: msgSubject || undefined, message: msgBody }) });
      if (!res.ok) throw new Error();
      const c = await res.json(); setPatient((p) => p ? { ...p, communications: [c, ...p.communications] } : p);
      setMsgBody(""); setMsgSubject(""); setShowMsgForm(false); showToast("Message sent", "success");
    } catch { showToast("Failed to send", "error"); } setSending(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this patient permanently?")) return;
    try { const r = await fetch(`/api/patients/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error(); router.push("/patients"); }
    catch { showToast("Failed to delete", "error"); }
  }

  function handlePrintSummary() {
    if (!patient) return;
    const upcomingAppts = patient.appointments
      .filter(a => new Date(a.date) >= new Date() && a.status !== "cancelled")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
    const recentVitalsData = vitals.slice(0, 3);
    const pastAppts = patient.appointments
      .filter(a => new Date(a.date) < new Date() || a.status === "completed")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    const printWindow = window.open("", "_blank");
    if (!printWindow) { showToast("Popup blocked — please allow popups", "error"); return; }
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Patient Summary — ${patient.firstName} ${patient.lastName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #292524; padding: 32px; font-size: 13px; line-height: 1.5; }
        h1 { font-size: 20px; color: #b45309; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #b45309; border-bottom: 2px solid #fef3c7; padding-bottom: 4px; margin: 20px 0 10px; }
        .meta { color: #78716c; font-size: 11px; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 8px; }
        .label { color: #78716c; font-size: 11px; } .value { font-weight: 600; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th { text-align: left; font-size: 11px; color: #78716c; border-bottom: 1px solid #e7e5e4; padding: 6px 8px; }
        td { font-size: 12px; border-bottom: 1px solid #f5f5f4; padding: 6px 8px; }
        .badge { display: inline-block; padding: 1px 8px; border-radius: 100px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .badge-active { background: #ecfdf5; color: #059669; } .badge-cancelled { background: #fef2f2; color: #dc2626; }
        .footer { margin-top: 30px; text-align: center; color: #a8a29e; font-size: 10px; border-top: 1px solid #e7e5e4; padding-top: 12px; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      <h1>${patient.firstName} ${patient.lastName}</h1>
      <p class="meta">Patient ID: ${patient.patientIdNumber} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
      <h2>Patient Information</h2>
      <div class="grid">
        <div><span class="label">Gender:</span> <span class="value">${patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : "—"}</span></div>
        <div><span class="label">Date of Birth:</span> <span class="value">${patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "—"}</span></div>
        <div><span class="label">Age:</span> <span class="value">${calcAge(patient.dateOfBirth)|| "—"}</span></div>
        <div><span class="label">Blood Group:</span> <span class="value">${patient.bloodGroup || "—"}</span></div>
        <div><span class="label">Phone:</span> <span class="value">${patient.phone}</span></div>
        <div><span class="label">Email:</span> <span class="value">${patient.email || "—"}</span></div>
        <div><span class="label">Address:</span> <span class="value">${[patient.address, patient.city, patient.state, patient.zipCode].filter(Boolean).join(", ") || "—"}</span></div>
        <div><span class="label">Allergies:</span> <span class="value">${patient.allergies || "None recorded"}</span></div>
      </div>
      ${recentVitalsData.length > 0 ? `<h2>Recent Vitals</h2><table><thead><tr><th>Date</th><th>BP</th><th>Pulse</th><th>Temp</th><th>SpO2</th><th>Weight</th></tr></thead><tbody>${recentVitalsData.map(v => `<tr><td>${formatDate(v.date)}</td><td>${v.bloodPressureSys && v.bloodPressureDia ? v.bloodPressureSys + "/" + v.bloodPressureDia + " mmHg" : "—"}</td><td>${v.pulse ? v.pulse + " bpm" : "—"}</td><td>${v.temperature ? v.temperature + " °C" : "—"}</td><td>${v.oxygenSaturation ? v.oxygenSaturation + "%" : "—"}</td><td>${v.weight ? v.weight + " kg" : "—"}</td></tr>`).join("")}</tbody></table>` : ""}
      ${upcomingAppts.length > 0 ? `<h2>Upcoming Appointments</h2><table><thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Reason</th><th>Status</th></tr></thead><tbody>${upcomingAppts.map(a => `<tr><td>${formatDate(a.date)}</td><td>${a.time}</td><td>${a.doctor}</td><td>${a.reason || "—"}</td><td><span class="badge badge-active">${a.status}</span></td></tr>`).join("")}</tbody></table>` : ""}
      ${pastAppts.length > 0 ? `<h2>Visit History</h2><table><thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Reason</th><th>Status</th></tr></thead><tbody>${pastAppts.map(a => `<tr><td>${formatDate(a.date)}</td><td>${a.time}</td><td>${a.doctor}</td><td>${a.reason || "—"}</td><td><span class="badge ${a.status === "cancelled" ? "badge-cancelled" : "badge-active"}">${a.status}</span></td></tr>`).join("")}</tbody></table>` : ""}
      <div class="footer">Confidential Patient Summary &mdash; Printed from Yoda Clinic Management</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  }

  function handleShareWhatsApp() {
    if (!patient) return;
    const nextAppt = patient.appointments
      .filter(a => new Date(a.date) >= new Date() && a.status !== "cancelled")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    const lines = [
      `Patient: ${patient.firstName} ${patient.lastName}`,
      `ID: ${patient.patientIdNumber}`,
      `Phone: ${patient.phone}`,
      nextAppt ? `Next Appointment: ${formatDate(nextAppt.date)} at ${nextAppt.time} with ${nextAppt.doctor}` : "No upcoming appointments",
    ];
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  async function saveNote() {
    if (!noteInput.trim() || !patient) return;
    const notes = patient.medicalNotes ? `${patient.medicalNotes}\n${noteInput.trim()}` : noteInput.trim();
    try {
      const res = await fetch(`/api/patients/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ medicalNotes: notes }) });
      if (res.ok) { setPatient((p) => p ? { ...p, medicalNotes: notes } : p); setNoteInput(""); showToast("Note saved", "success"); }
    } catch { showToast("Failed", "error"); }
  }

  // ─── Clinical Notes CRUD ───
  async function saveClinicalNote() {
    if (!noteTitle.trim() || !noteContent.trim()) { showToast("Title and content are required", "error"); return; }
    setSavingNote(true);
    try {
      const url = editingNoteId ? `/api/clinical-notes/${editingNoteId}` : "/api/clinical-notes";
      const method = editingNoteId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: id, type: noteType, title: noteTitle, content: noteContent, doctor: noteDoctor || undefined }) });
      if (!res.ok) throw new Error();
      await fetchClinicalNotes();
      setShowNoteForm(false); setNoteTitle(""); setNoteContent(""); setNoteDoctor(""); setNoteType("present_illness"); setEditingNoteId(null);
      showToast(editingNoteId ? "Note updated" : "Clinical note saved", "success");
    } catch { showToast("Failed to save note", "error"); }
    finally { setSavingNote(false); }
  }

  function editClinicalNote(note: ClinicalNote) {
    setEditingNoteId(note.id); setNoteType(note.type); setNoteTitle(note.title); setNoteContent(note.content); setNoteDoctor(note.doctor || ""); setShowNoteForm(true);
  }

  async function deleteClinicalNote(noteId: string) {
    if (!confirm("Delete this clinical note?")) return;
    try { const r = await fetch(`/api/clinical-notes/${noteId}`, { method: "DELETE" }); if (r.ok) { setClinicalNotes(p => p.filter(n => n.id !== noteId)); showToast("Note deleted", "success"); } }
    catch { showToast("Failed to delete", "error"); }
  }

  // ─── Document Upload ───
  async function uploadDocument() {
    if (!selectedFile) { showToast("Select a file", "error"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("patientId", id as string);
      fd.append("category", uploadCategory);
      if (uploadDesc) fd.append("description", uploadDesc);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Upload failed"); }
      await fetchDocuments();
      setShowUploadForm(false); setSelectedFile(null); setUploadDesc(""); setUploadCategory("report");
      showToast("Document uploaded", "success");
    } catch (e) { showToast(e instanceof Error ? e.message : "Upload failed", "error"); }
    finally { setUploading(false); }
  }

  async function deleteDocument(docId: string) {
    if (!confirm("Delete this document?")) return;
    try { const r = await fetch(`/api/documents/${docId}`, { method: "DELETE" }); if (r.ok) { setDocuments(p => p.filter(d => d.id !== docId)); showToast("Document deleted", "success"); } }
    catch { showToast("Failed to delete", "error"); }
  }

  // ─── Vitals CRUD ───
  async function saveVital() {
    setSavingVital(true);
    try {
      const payload: Record<string, unknown> = { patientId: id };
      if (vitalForm.bloodPressureSys) payload.bloodPressureSys = parseInt(vitalForm.bloodPressureSys);
      if (vitalForm.bloodPressureDia) payload.bloodPressureDia = parseInt(vitalForm.bloodPressureDia);
      if (vitalForm.pulse) payload.pulse = parseInt(vitalForm.pulse);
      if (vitalForm.temperature) payload.temperature = parseFloat(vitalForm.temperature);
      if (vitalForm.weight) payload.weight = parseFloat(vitalForm.weight);
      if (vitalForm.height) payload.height = parseFloat(vitalForm.height);
      if (vitalForm.oxygenSaturation) payload.oxygenSaturation = parseInt(vitalForm.oxygenSaturation);
      if (vitalForm.respiratoryRate) payload.respiratoryRate = parseInt(vitalForm.respiratoryRate);
      if (vitalForm.notes) payload.notes = vitalForm.notes;
      if (vitalForm.recordedBy) payload.recordedBy = vitalForm.recordedBy;
      const res = await fetch("/api/vitals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      await fetchVitals();
      setShowVitalsForm(false);
      setVitalForm({ bloodPressureSys: "", bloodPressureDia: "", pulse: "", temperature: "", weight: "", height: "", oxygenSaturation: "", respiratoryRate: "", notes: "", recordedBy: "" });
      showToast("Vitals recorded", "success");
    } catch { showToast("Failed to save vitals", "error"); }
    finally { setSavingVital(false); }
  }

  function getCalculatedBMI(): string {
    if (!vitalForm.weight || !vitalForm.height) return "";
    const w = parseFloat(vitalForm.weight);
    const hm = parseFloat(vitalForm.height) / 100;
    if (!w || !hm) return "";
    const bmi = w / (hm * hm);
    return bmi.toFixed(1);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  /* SSR + Loading: render a consistent placeholder on both server and client */
  if (!mounted || loading) return (
    <div className="p-6 md:p-8">
      <div className="space-y-4">
        <div className="h-14 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
        <div className="h-64 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
        <div className="h-48 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
      </div>
    </div>
  );

  /* Error */
  if (error) return (
    <div className="p-8 text-center py-24">
      <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--red-light)", borderRadius: "var(--radius-pill)" }}>
        <svg className="w-7 h-7" style={{ color: "var(--red)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
      </div>
      <p className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>{error}</p>
      <div className="flex justify-center gap-3 mt-4">
        <button onClick={fetchPatient} className="px-4 py-2 text-[13px] font-semibold text-white" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>Try Again</button>
        <Link href="/patients" className="px-4 py-2 text-[13px] font-semibold" style={{ color: "var(--blue-500)" }}>Back</Link>
      </div>
    </div>
  );

  if (!patient) return null;

  const sectionCounts: Record<string, number> = { appointments: patient.appointments.length, communications: patient.communications.length, clinical: clinicalNotes.length, documents: documents.length };

  return (
    <div className="yoda-fade-in flex flex-col" style={{ minHeight: "100vh" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ══════════ COMPACT TOP BAR ══════════ */}
      <div className="flex-shrink-0 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" style={{ background: "var(--white)", borderBottom: "1px solid var(--grey-200)" }}>
        <div className="flex items-center gap-2.5">
          <Link href="/patients" className="p-1 hover:bg-gray-100 rounded" style={{ color: "var(--grey-400)" }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="w-9 h-9 flex items-center justify-center text-[13px] font-bold flex-shrink-0" style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}>
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[15px] font-bold tracking-tight truncate" style={{ color: "var(--grey-900)" }}>{patient.firstName} {patient.lastName}</h1>
              <button onClick={toggleStatus} disabled={togglingStatus}
                className="px-2 py-px text-[9px] font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50 flex-shrink-0"
                style={{ borderRadius: "var(--radius-pill)", background: patient.status === "active" ? "var(--green-light)" : "var(--grey-200)", color: patient.status === "active" ? "var(--green)" : "var(--grey-600)", border: "none" }}>
                {togglingStatus ? "..." : patient.status}
              </button>
            </div>
            <p className="text-[11px] truncate" style={{ color: "var(--grey-500)" }}>
              {patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1)}{patient.dateOfBirth ? `, ${calcAge(patient.dateOfBirth)}` : ""} &nbsp;&middot;&nbsp; ID : {patient.patientIdNumber}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 print:hidden">
          <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>Call
          </a>
          <a href={`https://wa.me/${(patient.whatsapp || patient.phone).replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--green-light)", border: "1px solid var(--green)", borderRadius: "var(--radius-sm)", color: "var(--green)" }}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>WhatsApp
          </a>
          {patient.email && (
            <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--blue-50)", border: "1px solid var(--blue-500)", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Email
            </a>
          )}
          <div style={{ width: 1, height: 20, background: "var(--grey-300)" }} />
          <button onClick={() => window.print()} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>Print Label
          </button>
          <button onClick={handlePrintSummary} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--blue-50)", border: "1px solid var(--blue-500)", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Print Summary
          </button>
          <button onClick={handleShareWhatsApp} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--green-light)", border: "1px solid var(--green)", borderRadius: "var(--radius-sm)", color: "var(--green)" }}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>Share via WhatsApp
          </button>
          {!editing ? (
            <button onClick={startEdit} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>Edit Patient Profile
            </button>
          ) : (
            <>
              <button onClick={saveEdit} disabled={saving} className="px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50" style={{ background: "var(--green)", borderRadius: "var(--radius-sm)" }}>{saving ? "Saving..." : "Save Changes"}</button>
              <button onClick={() => setEditing(false)} className="px-2.5 py-1 text-[11px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>Cancel</button>
            </>
          )}
          <button onClick={handleDelete} className="p-1" style={{ color: "var(--red)" }} title="Delete patient">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {/* ══════════ 3-COLUMN BODY ══════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── LEFT SIDEBAR ─── */}
        <aside className="hidden lg:flex lg:flex-col flex-shrink-0 overflow-y-auto" style={{ width: 210, background: "var(--white)", borderRight: "1px solid var(--grey-200)" }}>
          <nav className="py-3 flex-1">
            {["Patient", "Medical"].map((group) => (
              <div key={group} className="mb-3">
                <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: group === "Patient" ? "var(--blue-500)" : "var(--green)" }}>{group}</p>
                {sidebarNav.filter((n) => n.group === group).map((item) => {
                  const active = activeSection === item.key;
                  const count = sectionCounts[item.key] || 0;
                  return (
                    <button key={item.key} onClick={() => { setActiveSection(item.key); if (item.key !== "profile" && editing) setEditing(false); }}
                      className="w-full flex items-center gap-2 px-4 py-[7px] text-[12.5px] font-medium transition-all"
                      style={{ background: active ? "var(--blue-50)" : "transparent", color: active ? "var(--blue-500)" : "var(--grey-700)", borderLeft: active ? "3px solid var(--blue-500)" : "3px solid transparent" }}>
                      <svg className="w-[15px] h-[15px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} /></svg>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {count > 0 && <span className="text-[10px] font-bold px-1.5 py-px" style={{ color: "var(--grey-500)", background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* ─── Mobile tabs ─── */}
        <div className="lg:hidden fixed bottom-[52px] left-0 right-0 z-40 px-3 py-2 overflow-x-auto flex gap-1.5" style={{ background: "var(--white)", borderTop: "1px solid var(--grey-200)", boxShadow: "0 -2px 8px rgba(0,0,0,0.04)" }}>
          {sidebarNav.map((item) => (
            <button key={item.key} onClick={() => setActiveSection(item.key)}
              className="px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap flex-shrink-0"
              style={{ borderRadius: "var(--radius-pill)", background: activeSection === item.key ? "var(--blue-500)" : "var(--white)", color: activeSection === item.key ? "#fff" : "var(--grey-600)", border: activeSection === item.key ? "none" : "1px solid var(--grey-300)" }}>
              {item.label}
            </button>
          ))}
        </div>

        {/* ─── CENTER CONTENT ─── */}
        <main className="flex-1 overflow-y-auto p-5 md:p-6" style={{ background: "var(--background)" }}>

          {/* ═══ PROFILE ═══ */}
          {activeSection === "profile" && (
            <div>

              {/* Pending Balance Banner */}
              {(pendingBalance.total > 0 || familyBalances.length > 0) && (
                <div className="mb-4 p-4" style={{ background: "#fff3e0", border: "1px solid #ffb74d", borderRadius: "var(--radius)" }}>
                  {pendingBalance.total > 0 && (
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" style={{ color: "#f57c00" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div>
                          <p className="text-[14px] font-bold" style={{ color: "#e65100" }}>Pending Balance: {formatCurrency(pendingBalance.total)}</p>
                          <p className="text-[11px]" style={{ color: "#f57c00" }}>{pendingBalance.invoices.length} unpaid invoice{pendingBalance.invoices.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => sendPaymentReminder("whatsapp")}
                          disabled={sendingReminder}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                          style={{ background: "#25d366", color: "#fff", borderRadius: "var(--radius-sm)" }}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                          Send Reminder
                        </button>
                        {patient?.email && (
                          <button
                            onClick={() => sendPaymentReminder("email")}
                            disabled={sendingReminder}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                            style={{ background: "var(--blue-500)", color: "#fff", borderRadius: "var(--radius-sm)" }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            Email Reminder
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {pendingBalance.total > 0 && pendingBalance.invoices.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {pendingBalance.invoices.map((inv) => (
                        <Link key={inv.id} href={`/billing/${inv.id}`} className="flex items-center justify-between px-3 py-1.5 text-[11px] rounded hover:bg-white/60 transition-colors" style={{ background: "rgba(255,255,255,0.3)" }}>
                          <span className="font-semibold" style={{ color: "#e65100" }}>{inv.invoiceNumber}</span>
                          <span style={{ color: "#f57c00" }}>Total: {formatCurrency(inv.totalAmount)} &middot; Paid: {formatCurrency(inv.paidAmount)} &middot; <strong>Due: {formatCurrency(inv.balanceAmount)}</strong></span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {familyBalances.length > 0 && (
                    <div className={pendingBalance.total > 0 ? "mt-3 pt-3" : ""} style={pendingBalance.total > 0 ? { borderTop: "1px solid #ffcc80" } : {}}>
                      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#f57c00" }}>Family Members with Pending Balance</p>
                      {familyBalances.map((fb) => (
                        <div key={fb.patientId} className="flex items-center justify-between px-3 py-1.5 text-[12px] rounded mb-1" style={{ background: "rgba(255,255,255,0.3)" }}>
                          <div>
                            <span className="font-semibold" style={{ color: "#e65100" }}>{genderRelationLabel(fb.relation, null)}</span>
                            <span style={{ color: "#f57c00" }}> : </span>
                            <Link href={`/patients/${fb.patientId}`} className="font-medium hover:underline" style={{ color: "#e65100" }}>{fb.name}</Link>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold" style={{ color: "#e65100" }}>{formatCurrency(fb.balance)}</span>
                            <button
                              onClick={() => sendPaymentReminder("whatsapp", fb.patientId)}
                              disabled={sendingReminder}
                              className="px-1.5 py-0.5 text-[10px] font-semibold disabled:opacity-50"
                              style={{ background: "#25d366", color: "#fff", borderRadius: "var(--radius-sm)" }}
                              title="Send WhatsApp reminder"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!editing ? (
                <div className="px-6 py-5" style={{ background: "var(--white)", borderRadius: "var(--radius)" }}>

                  <div className="flex flex-col sm:flex-row gap-8 items-start">
                    {/* Photo — Practo size */}
                    <div className="flex-shrink-0 text-center">
                      <div className="w-[140px] h-[170px] mx-auto flex items-center justify-center overflow-hidden" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)", border: "1px solid var(--grey-300)" }}>
                        <svg className="w-16 h-16" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <button className="text-[11px] font-semibold mt-2 hover:underline" style={{ color: "var(--blue-500)" }}>Change Photo</button>
                    </div>
                    {/* Data */}
                    <div className="flex-1 min-w-0">
                      <table className="w-full" style={{ borderCollapse: "collapse" }}><tbody>
                        <ProfileRow label="Patient Name" value={`${patient.firstName} ${patient.lastName}`} always />
                        <ProfileRow label="Patient ID" value={patient.patientIdNumber} always />
                        <ProfileRow label="NRIC ID" value={patient.nricId} />
                        <ProfileRow label="Gender" value={patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1)} always />
                        <ProfileRow label="Date of Birth" value={patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null} />
                        <ProfileRow label="Or age" value={patient.dateOfBirth ? calcAge(patient.dateOfBirth) : patient.age ? `${patient.age} Years` : null} />
                        <ProfileRow label="Referred by" value={patient.referredBy} />
                        <ProfileRow label="Blood Group" value={patient.bloodGroup} />
                        {familyMembers.length > 0 ? (
                          <tr>
                            <td className="py-[8px] pr-4 text-[13px] font-normal text-right whitespace-nowrap align-top" style={{ color: "var(--grey-600)", width: 180 }}>Family :</td>
                            <td className="py-[8px] pl-2">
                              <div className="space-y-1">
                                {familyMembers.map((fm) => (
                                  <div key={fm.id} className="text-[13px]">
                                    <span className="font-semibold" style={{ color: "var(--grey-700)" }}>{genderRelationLabel(fm.relation, fm.memberGender)}</span>
                                    <span style={{ color: "var(--grey-500)" }}> : </span>
                                    {fm.linkedPatientId ? (
                                      <Link href={`/patients/${fm.linkedPatientId}`} className="font-medium hover:underline" style={{ color: "var(--blue-500)" }}>{fm.memberName}</Link>
                                    ) : (
                                      <span className="font-medium" style={{ color: "var(--grey-900)" }}>{fm.memberName}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <ProfileRow label="Family" value={patient.familyRelation && patient.familyMemberName ? `${patient.familyRelation.charAt(0).toUpperCase() + patient.familyRelation.slice(1)} : ${patient.familyMemberName}` : null} />
                        )}
                        <ProfileRow label="Ethnicity" value={patient.ethnicity} />
                        <ProfileRow label="Nationality" value={patient.nationality} />
                        <ProfileRow label="Occupation" value={patient.occupation} />
                      </tbody></table>
                    </div>
                  </div>

                  {/* Contact Details — Practo style heading */}
                  <h4 className="text-[15px] font-semibold mt-6 mb-3 pt-4" style={{ color: "var(--grey-800)", borderTop: "1px solid var(--grey-200)" }}>Contact Details</h4>
                  <table className="w-full" style={{ borderCollapse: "collapse" }}><tbody>
                    <ProfileRow label="Primary Mobile No." value={patient.phone} href={`tel:${patient.phone}`} always />
                    <ProfileRow label="Secondary Mobile No." value={patient.secondaryMobile} href={patient.secondaryMobile ? `tel:${patient.secondaryMobile}` : undefined} />
                    <ProfileRow label="Land Line Nos." value={patient.landline} />
                    <ProfileRow label="Email Address" value={patient.email} href={patient.email ? `mailto:${patient.email}` : undefined} />
                  </tbody></table>

                  {/* Address */}
                  {(patient.address || patient.locality || patient.city || patient.state || patient.zipCode) && (<>
                    <div className="mt-2">
                      <table className="w-full" style={{ borderCollapse: "collapse" }}><tbody>
                        <ProfileRow label="Street Address" value={patient.address} />
                        <ProfileRow label="Locality" value={patient.locality} />
                        <ProfileRow label="City" value={patient.city} />
                        <ProfileRow label="State" value={patient.state} />
                        <ProfileRow label="Postal Code" value={patient.zipCode} />
                      </tbody></table>
                    </div>
                  </>)}
                </div>
              ) : (
                /* Edit Mode */
                <div className="px-6 py-5" style={{ background: "var(--white)", borderRadius: "var(--radius)" }}>
                  <div className="mb-4 px-3 py-2 flex items-center gap-2 text-[12px] font-medium" style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-sm)", border: "1px solid var(--blue-100)" }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Editing — click Save Changes when done
                  </div>

                  <table className="w-full" style={{ borderCollapse: "collapse" }}><tbody>
                    <EditRow label="First Name *" name="firstName" value={editData.firstName} onChange={ec} />
                    <EditRow label="Last Name *" name="lastName" value={editData.lastName} onChange={ec} />
                    <EditRow label="NRIC ID" name="nricId" value={editData.nricId} onChange={ec} />
                    <tr>
                      <td className="py-[8px] pr-4 text-[13px] font-normal text-right align-middle" style={{ color: "var(--grey-600)", width: 180 }}>Gender :</td>
                      <td className="py-[8px] pl-2"><div className="flex gap-5">{["male", "female", "other"].map((g) => (
                        <label key={g} className="flex items-center gap-1.5 text-[13px] cursor-pointer" style={{ color: "var(--grey-800)" }}>
                          <input type="radio" checked={editData.gender === g} onChange={() => ec("gender", g)} /> {g.charAt(0).toUpperCase() + g.slice(1)}
                        </label>
                      ))}</div></td>
                    </tr>
                    <EditRow label="Date of Birth" name="dateOfBirth" value={editData.dateOfBirth} type="date" onChange={ec} />
                    <EditRow label="Blood Group" name="bloodGroup" value={editData.bloodGroup} onChange={ec} />
                    <EditRow label="Referred by" name="referredBy" value={editData.referredBy} onChange={ec} />
                    <tr>
                      <td className="py-[8px] pr-4 text-[13px] font-normal text-right whitespace-nowrap align-top" style={{ color: "var(--grey-600)", width: 180 }}>Family :</td>
                      <td className="py-[8px] pl-2">
                        {familyMembers.length > 0 && (
                          <div className="space-y-1.5 mb-3">
                            {familyMembers.map((fm) => (
                              <div key={fm.id} className="flex items-center gap-2 px-3 py-1.5 rounded text-[13px]" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)" }}>
                                {editingFamId === fm.id ? (
                                  <select value={editFamRelation} onChange={(e) => setEditFamRelation(e.target.value)} className="px-1.5 py-0.5 text-[12px]" style={inputStyle}>
                                    {FAMILY_RELATIONS.map((r) => <option key={r} value={r}>{RELATION_LABELS[r]}</option>)}
                                  </select>
                                ) : (
                                  <button type="button" onClick={() => { setEditingFamId(fm.id); setEditFamRelation(fm.relation); }}
                                    className="font-semibold hover:underline cursor-pointer" style={{ color: "var(--grey-700)" }} title="Click to change relation">
                                    {genderRelationLabel(fm.relation, fm.memberGender)}
                                  </button>
                                )}
                                <span style={{ color: "var(--grey-500)" }}>:</span>
                                {fm.linkedPatientId ? (
                                  <Link href={`/patients/${fm.linkedPatientId}`} className="font-medium flex-1 hover:underline" style={{ color: "var(--blue-500)" }}>{fm.memberName}</Link>
                                ) : (
                                  <span className="font-medium flex-1" style={{ color: "var(--blue-500)" }}>{fm.memberName}</span>
                                )}
                                {fm.memberPhone && <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>{fm.memberPhone}</span>}
                                {editingFamId === fm.id ? (
                                  <div className="flex gap-1">
                                    <button type="button" onClick={() => updateFamilyRelation(fm.id, editFamRelation)} className="px-1.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: "var(--green)", borderRadius: "var(--radius-sm)" }}>Save</button>
                                    <button type="button" onClick={() => setEditingFamId(null)} className="px-1.5 py-0.5 text-[11px] font-semibold" style={{ color: "var(--grey-500)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}>Cancel</button>
                                  </div>
                                ) : (
                                  <button type="button" onClick={async () => {
                                    await fetch(`/api/patients/${id}/family?memberId=${fm.id}`, { method: "DELETE" });
                                    fetchFamilyMembers();
                                    showToast("Family member removed", "success");
                                  }} className="text-[16px] font-bold leading-none hover:opacity-70" style={{ color: "var(--grey-400)" }}>&times;</button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 max-w-md" ref={famSearchRef}>
                          <select value={famRelation} onChange={(e) => { setFamRelation(e.target.value); setFamSearch(""); setFamResults([]); }} className="w-1/3 px-2 py-1.5 text-[13px]" style={inputStyle}>
                            <option value="">Relation</option>
                            {FAMILY_RELATIONS.map((r) => <option key={r} value={r}>{RELATION_LABELS[r]}</option>)}
                          </select>
                          <div className="flex-1 relative">
                            <input
                              value={famSearch}
                              onChange={(e) => { setFamSearch(e.target.value); if (e.target.value.length >= 2) setShowFamDropdown(true); }}
                              onFocus={() => { if (famResults.length > 0) setShowFamDropdown(true); }}
                              placeholder={famRelation ? "Search patient..." : "Select relation first"}
                              disabled={!famRelation}
                              className="w-full px-2.5 py-1.5 text-[13px]"
                              style={inputStyle}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFamilyManual(); } }}
                            />
                            {showFamDropdown && famRelation && famSearch.length >= 2 && (
                              <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                                {famSearchLoading ? (
                                  <div className="px-3 py-2 text-[12px]" style={{ color: "var(--grey-500)" }}>Searching...</div>
                                ) : famResults.length > 0 ? (
                                  famResults.map((p) => (
                                    <button key={p.id} type="button" onClick={() => addFamilyFromSearch(p)} className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                                      <span className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{p.firstName} {p.lastName}</span>
                                      <span className="text-[11px] ml-2" style={{ color: "var(--grey-500)" }}>{p.patientIdNumber} · {p.phone}{p.gender ? ` · ${p.gender.charAt(0).toUpperCase() + p.gender.slice(1)}` : ""}</span>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-3 py-2">
                                    <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>No patients found</p>
                                    <button type="button" onClick={addFamilyManual} className="text-[12px] font-semibold mt-1" style={{ color: "var(--blue-500)" }}>+ Add &quot;{famSearch}&quot; manually</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    <EditRow label="Ethnicity" name="ethnicity" value={editData.ethnicity} onChange={ec} />
                    <EditRow label="Nationality" name="nationality" value={editData.nationality} onChange={ec} />
                    <EditRow label="Occupation" name="occupation" value={editData.occupation} onChange={ec} />
                  </tbody></table>

                  <h4 className="text-[15px] font-semibold mt-6 mb-3 pt-4" style={{ color: "var(--grey-800)", borderTop: "1px solid var(--grey-200)" }}>Contact Details</h4>
                  <table className="w-full" style={{ borderCollapse: "collapse" }}><tbody>
                    <EditRow label="Primary Mobile *" name="phone" value={editData.phone} type="tel" onChange={ec} />
                    <EditRow label="Secondary Mobile" name="secondaryMobile" value={editData.secondaryMobile} type="tel" onChange={ec} />
                    <EditRow label="Land Line Nos." name="landline" value={editData.landline} type="tel" onChange={ec} />
                    <EditRow label="Email Address" name="email" value={editData.email} type="email" onChange={ec} />
                  </tbody></table>

                  <h4 className="text-[15px] font-semibold mt-6 mb-3 pt-4" style={{ color: "var(--grey-800)", borderTop: "1px solid var(--grey-200)" }}>Address</h4>
                  <table className="w-full" style={{ borderCollapse: "collapse" }}><tbody>
                    <EditRow label="Street Address" name="address" value={editData.address} onChange={ec} />
                    <EditRow label="Locality" name="locality" value={editData.locality} onChange={ec} />
                    <EditRow label="City" name="city" value={editData.city} onChange={ec} />
                    <EditRow label="State" name="state" value={editData.state} onChange={ec} />
                    <EditRow label="Postal Code" name="zipCode" value={editData.zipCode} onChange={ec} />
                  </tbody></table>
                </div>
              )}
            </div>
          )}

          {/* ═══ APPOINTMENTS ═══ */}
          {activeSection === "appointments" && (
            <div>
              {/* Treatment Progress */}
              {treatmentPackages.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-[13px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--grey-600)" }}>Treatment Progress</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {treatmentPackages.map((pkg) => {
                      const pct = pkg.sessionsTotal > 0 ? Math.round((pkg.sessionsCompleted / pkg.sessionsTotal) * 100) : 0;
                      const onTrack = pct >= ((pkg.sessionsCompleted / Math.max(pkg.sessionsTotal, 1)) * 100) - 10;
                      const barColor = onTrack ? "var(--green)" : "#f57c00";
                      return (
                        <div key={pkg.packageId} className="p-4" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{pkg.treatmentName}</p>
                            <span className="text-[11px] font-bold" style={{ color: barColor }}>{pct}%</span>
                          </div>
                          <p className="text-[11px] mb-2" style={{ color: "var(--grey-500)" }}>{pkg.packageName} &middot; {pkg.sessionsCompleted} / {pkg.sessionsTotal} sessions</p>
                          <div style={{ height: 6, background: "var(--grey-100)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.3s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="mb-5">
                <h2 className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>Appointments</h2>
              </div>
              {patient.appointments.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-[13px] font-medium" style={{ color: "var(--grey-500)" }}>No appointments scheduled</p>
                </div>
              ) : (
                <div className="space-y-2">{patient.appointments.map((a) => (
                  <div key={a.id} className="p-4 hover:shadow-sm transition-shadow" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                    <div className="flex items-center justify-between">
                      <div><p className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>Dr. {a.doctor}</p>{a.department && <p className="text-[11px]" style={{ color: "var(--grey-500)" }}>{a.department}</p>}</div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5" style={{ borderRadius: "var(--radius-sm)", background: a.status === "scheduled" ? "var(--blue-50)" : a.status === "completed" ? "var(--green-light)" : "var(--grey-100)", color: a.status === "scheduled" ? "var(--blue-500)" : a.status === "completed" ? "var(--green)" : "var(--grey-600)" }}>{a.status}</span>
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: "var(--grey-500)" }}>{formatDate(a.date)} at {a.time}{a.reason && ` · ${a.reason}`}</p>
                  </div>
                ))}</div>
              )}
            </div>
          )}

          {/* ═══ COMMUNICATIONS ═══ */}
          {activeSection === "communications" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>Communications</h2>
                <button onClick={() => setShowMsgForm(!showMsgForm)} className="px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>+ New Message</button>
              </div>
              {showMsgForm && (
                <div className="p-4 mb-4 yoda-slide-in" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <div className="space-y-3">
                    <div className="flex gap-2">{(["whatsapp", "email"] as const).map((t) => (
                      <button key={t} onClick={() => setMsgType(t)} className="flex-1 px-3 py-2 text-[12px] font-semibold transition-all" style={{ borderRadius: "var(--radius-sm)", border: msgType === t ? `2px solid ${t === "whatsapp" ? "var(--green)" : "var(--blue-500)"}` : "1px solid var(--grey-300)", background: msgType === t ? (t === "whatsapp" ? "var(--green-light)" : "var(--blue-50)") : "var(--white)", color: msgType === t ? (t === "whatsapp" ? "var(--green)" : "var(--blue-500)") : "var(--grey-600)" }}>{t === "whatsapp" ? "WhatsApp" : "Email"}</button>
                    ))}</div>
                    {msgType === "email" && <input type="text" placeholder="Subject" value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} className="w-full px-3 py-2" style={inputStyle} />}
                    <textarea placeholder="Type your message..." value={msgBody} onChange={(e) => setMsgBody(e.target.value)} rows={3} className="w-full px-3 py-2" style={inputStyle} />
                    <div className="flex gap-2">
                      <button onClick={sendMessage} disabled={sending || !msgBody.trim()} className="text-white px-4 py-1.5 text-[12px] font-semibold disabled:opacity-50" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>{sending ? "Sending..." : "Send"}</button>
                      <button onClick={() => setShowMsgForm(false)} className="px-4 py-1.5 text-[12px] font-semibold" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
              {patient.communications.length === 0 ? (
                <div className="py-16 text-center"><p className="text-[13px] font-medium" style={{ color: "var(--grey-500)" }}>No messages sent yet</p></div>
              ) : (
                <div className="space-y-2">{patient.communications.map((c) => (
                  <div key={c.id} className="p-4 hover:shadow-sm transition-shadow" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase" style={{ borderRadius: "var(--radius-sm)", background: c.type === "whatsapp" ? "var(--green-light)" : "var(--blue-50)", color: c.type === "whatsapp" ? "var(--green)" : "var(--blue-500)" }}>{c.type}</span>
                        {c.subject && <span className="text-[12px] font-semibold" style={{ color: "var(--grey-900)" }}>{c.subject}</span>}
                      </div>
                      <span className="text-[9px] font-bold uppercase" style={{ color: c.status === "sent" ? "var(--green)" : "var(--red)" }}>{c.status}</span>
                    </div>
                    <p className="text-[12px] line-clamp-2" style={{ color: "var(--grey-700)" }}>{c.message}</p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--grey-400)" }}>{formatDate(c.sentAt)}</p>
                  </div>
                ))}</div>
              )}
            </div>
          )}

          {/* ═══ CLINICAL NOTES ═══ */}
          {activeSection === "clinical" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-semibold" style={{ color: "var(--grey-800)" }}>Clinical Notes</h2>
                <button onClick={() => { setShowNoteForm(true); setEditingNoteId(null); setNoteTitle(""); setNoteContent(""); setNoteDoctor(""); setNoteType("present_illness"); }}
                  className="px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>+ Add Note</button>
              </div>

              {/* Filter tabs */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                <button onClick={() => setNoteFilter("all")} className="px-3 py-1 text-[11px] font-semibold"
                  style={{ borderRadius: "var(--radius-pill)", background: noteFilter === "all" ? "var(--blue-500)" : "var(--white)", color: noteFilter === "all" ? "#fff" : "var(--grey-600)", border: noteFilter === "all" ? "none" : "1px solid var(--grey-300)" }}>All</button>
                {NOTE_TYPES.map(t => (
                  <button key={t.value} onClick={() => setNoteFilter(t.value)} className="px-3 py-1 text-[11px] font-semibold"
                    style={{ borderRadius: "var(--radius-pill)", background: noteFilter === t.value ? "var(--blue-500)" : "var(--white)", color: noteFilter === t.value ? "#fff" : "var(--grey-600)", border: noteFilter === t.value ? "none" : "1px solid var(--grey-300)" }}>{t.label}</button>
                ))}
              </div>

              {/* Note Form */}
              {showNoteForm && (
                <div className="p-5 mb-4 yoda-slide-in" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <h3 className="text-[14px] font-semibold mb-4" style={{ color: "var(--grey-800)" }}>{editingNoteId ? "Edit Clinical Note" : "New Clinical Note"}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[12px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Note Type</label>
                      <div className="flex flex-wrap gap-1.5">
                        {NOTE_TYPES.map(t => (
                          <button key={t.value} onClick={() => setNoteType(t.value)} className="px-3 py-1.5 text-[11px] font-semibold transition-all"
                            style={{ borderRadius: "var(--radius-sm)", border: noteType === t.value ? "2px solid var(--blue-500)" : "1px solid var(--grey-300)", background: noteType === t.value ? "var(--blue-50)" : "var(--white)", color: noteType === t.value ? "var(--blue-500)" : "var(--grey-600)" }}>{t.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[12px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Title *</label>
                      <input type="text" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="e.g. Chief complaint, Follow-up assessment..." className="w-full px-3 py-2 text-[13px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[12px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Content *</label>
                      <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Enter clinical details..." rows={5} className="w-full px-3 py-2 text-[13px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[12px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Doctor / Clinician</label>
                      <input type="text" value={noteDoctor} onChange={e => setNoteDoctor(e.target.value)} placeholder="Dr. Name" className="w-full max-w-xs px-3 py-2 text-[13px]" style={inputStyle} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveClinicalNote} disabled={savingNote} className="px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>{savingNote ? "Saving..." : editingNoteId ? "Update Note" : "Save Note"}</button>
                      <button onClick={() => { setShowNoteForm(false); setEditingNoteId(null); }} className="px-4 py-1.5 text-[12px] font-semibold" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes List */}
              {clinicalNotes.filter(n => noteFilter === "all" || n.type === noteFilter).length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <p className="text-[13px] font-medium" style={{ color: "var(--grey-500)" }}>No clinical notes yet</p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--grey-400)" }}>Click &quot;+ Add Note&quot; to record present illness, past history, and more</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clinicalNotes.filter(n => noteFilter === "all" || n.type === noteFilter).map(note => {
                    const typeLabel = NOTE_TYPES.find(t => t.value === note.type)?.label || note.type;
                    const typeColors: Record<string, { bg: string; color: string }> = {
                      present_illness: { bg: "var(--red-light)", color: "var(--red)" },
                      past_history: { bg: "var(--orange-light)", color: "var(--orange)" },
                      personal_history: { bg: "var(--purple-light)", color: "var(--purple)" },
                      examination: { bg: "var(--blue-50)", color: "var(--blue-500)" },
                      diagnosis: { bg: "var(--green-light)", color: "var(--green)" },
                      treatment: { bg: "var(--blue-50)", color: "var(--blue-700)" },
                      general: { bg: "var(--grey-100)", color: "var(--grey-700)" },
                    };
                    const tc = typeColors[note.type] || typeColors.general;
                    return (
                      <div key={note.id} className="p-4" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase" style={{ borderRadius: "var(--radius-sm)", background: tc.bg, color: tc.color }}>{typeLabel}</span>
                            <h4 className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{note.title}</h4>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => editClinicalNote(note)} className="p-1 hover:bg-gray-100 rounded" style={{ color: "var(--grey-500)" }} title="Edit">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => deleteClinicalNote(note.id)} className="p-1 hover:bg-gray-100 rounded" style={{ color: "var(--red)" }} title="Delete">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                        <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--grey-700)" }}>{note.content}</p>
                        <div className="flex items-center gap-3 mt-3 pt-2" style={{ borderTop: "1px solid var(--grey-100)" }}>
                          {note.doctor && <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>By: <strong>{note.doctor}</strong></span>}
                          <span className="text-[11px]" style={{ color: "var(--grey-400)" }}>{formatDate(note.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ DOCUMENTS ═══ */}
          {activeSection === "documents" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[15px] font-semibold" style={{ color: "var(--grey-800)" }}>Documents & Reports</h2>
                <button onClick={() => { setShowUploadForm(true); setSelectedFile(null); setUploadDesc(""); setUploadCategory("report"); }}
                  className="px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>+ Upload Document</button>
              </div>

              {/* Upload Form */}
              {showUploadForm && (
                <div className="p-5 mb-4 yoda-slide-in" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <h3 className="text-[14px] font-semibold mb-4" style={{ color: "var(--grey-800)" }}>Upload Document</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[12px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Category</label>
                      <div className="flex flex-wrap gap-1.5">
                        {DOC_CATEGORIES.map(c => (
                          <button key={c.value} onClick={() => setUploadCategory(c.value)} className="px-3 py-1.5 text-[11px] font-semibold transition-all"
                            style={{ borderRadius: "var(--radius-sm)", border: uploadCategory === c.value ? "2px solid var(--blue-500)" : "1px solid var(--grey-300)", background: uploadCategory === c.value ? "var(--blue-50)" : "var(--white)", color: uploadCategory === c.value ? "var(--blue-500)" : "var(--grey-600)" }}>{c.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[12px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Select File * (max 10MB)</label>
                      <div className="relative">
                        <input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="text-[12px] w-full"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.xls,.xlsx,.csv,.txt,.rtf,.dicom,.dcm" />
                        {selectedFile && (
                          <p className="text-[11px] mt-1" style={{ color: "var(--grey-500)" }}>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-[12px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Description (optional)</label>
                      <input type="text" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} placeholder="e.g. Blood test results, CT scan report..." className="w-full px-3 py-2 text-[13px]" style={inputStyle} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={uploadDocument} disabled={uploading || !selectedFile} className="px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>{uploading ? "Uploading..." : "Upload"}</button>
                      <button onClick={() => setShowUploadForm(false)} className="px-4 py-1.5 text-[12px] font-semibold" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents List */}
              {documents.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  <p className="text-[13px] font-medium" style={{ color: "var(--grey-500)" }}>No documents uploaded</p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--grey-400)" }}>Upload reports, lab results, prescriptions, and imaging files</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => {
                    const catLabel = DOC_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category;
                    const catColors: Record<string, { bg: string; color: string }> = {
                      report: { bg: "var(--blue-50)", color: "var(--blue-500)" },
                      lab: { bg: "var(--green-light)", color: "var(--green)" },
                      imaging: { bg: "var(--purple-light)", color: "var(--purple)" },
                      prescription: { bg: "var(--orange-light)", color: "var(--orange)" },
                      other: { bg: "var(--grey-100)", color: "var(--grey-700)" },
                    };
                    const cc = catColors[doc.category] || catColors.other;
                    const isImage = doc.fileType.startsWith("image/");
                    const isPdf = doc.fileType === "application/pdf";
                    return (
                      <div key={doc.id} className="p-4 flex items-center gap-4" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                        {/* File icon */}
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: cc.bg, borderRadius: "var(--radius-sm)" }}>
                          {isImage ? (
                            <svg className="w-5 h-5" style={{ color: cc.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          ) : isPdf ? (
                            <svg className="w-5 h-5" style={{ color: cc.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          ) : (
                            <svg className="w-5 h-5" style={{ color: cc.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          )}
                        </div>
                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-px text-[9px] font-bold uppercase" style={{ borderRadius: "var(--radius-sm)", background: cc.bg, color: cc.color }}>{catLabel}</span>
                            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>{doc.fileName}</p>
                          </div>
                          {doc.description && <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--grey-500)" }}>{doc.description}</p>}
                          <p className="text-[10px] mt-0.5" style={{ color: "var(--grey-400)" }}>{formatFileSize(doc.fileSize)} · {formatDate(doc.uploadedAt)}</p>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <a href={doc.filePath} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 rounded" style={{ color: "var(--blue-500)" }} title="View / Download">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </a>
                          <button onClick={() => deleteDocument(doc.id)} className="p-1.5 hover:bg-gray-100 rounded" style={{ color: "var(--red)" }} title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ EMERGENCY ═══ */}
          {activeSection === "emergency" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>Emergency Contact</h2>
              </div>
              <div className="p-5" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                {editing ? (
                  <table className="w-full"><tbody>
                    <EditRow label="Contact Name" name="emergencyName" value={editData.emergencyName} onChange={ec} />
                    <EditRow label="Contact Phone" name="emergencyPhone" value={editData.emergencyPhone} type="tel" onChange={ec} />
                  </tbody></table>
                ) : patient.emergencyName || patient.emergencyPhone ? (
                  <table className="w-full"><tbody>
                    <ProfileRow label="Contact Name" value={patient.emergencyName} always />
                    <ProfileRow label="Contact Phone" value={patient.emergencyPhone} href={patient.emergencyPhone ? `tel:${patient.emergencyPhone}` : undefined} always />
                  </tbody></table>
                ) : (
                  <p className="text-[13px] text-center py-8" style={{ color: "var(--grey-400)" }}>No emergency contact added</p>
                )}
              </div>
            </div>
          )}

          {/* ═══ ALLERGIES & NOTES ═══ */}
          {activeSection === "allergies" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>Allergies & Medical Notes</h2>
              </div>
              <div className="space-y-4">
                <div className="p-5" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <h3 className="text-[13px] font-bold mb-2" style={{ color: "var(--grey-800)" }}>Allergies</h3>
                  {editing ? <textarea value={editData.allergies} onChange={(e) => ec("allergies", e.target.value)} rows={3} className="w-full px-3 py-2" style={inputStyle} />
                    : <p className="text-[13px]" style={{ color: patient.allergies ? "var(--red)" : "var(--grey-400)" }}>{patient.allergies || "None reported"}</p>}
                </div>
                <div className="p-5" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <h3 className="text-[13px] font-bold mb-2" style={{ color: "var(--grey-800)" }}>Other History</h3>
                  {editing ? <textarea value={editData.otherHistory} onChange={(e) => ec("otherHistory", e.target.value)} rows={3} className="w-full px-3 py-2" style={inputStyle} />
                    : <p className="text-[13px]" style={{ color: patient.otherHistory ? "var(--grey-700)" : "var(--grey-400)" }}>{patient.otherHistory || "None"}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ═══ TIMELINE ═══ */}
          {activeSection === "timeline" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>Medical History Timeline</h2>
              </div>

              {/* Filter checkboxes */}
              <div className="flex flex-wrap gap-3 mb-5 p-3" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                <span className="text-[11px] font-bold uppercase tracking-wide self-center" style={{ color: "var(--grey-500)" }}>Filter:</span>
                {([
                  { key: "appointment", label: "Appointments", color: "#f57c00" },
                  { key: "note", label: "Notes", color: "#2563eb" },
                  { key: "document", label: "Documents", color: "#7c3aed" },
                  { key: "communication", label: "Communications", color: "#16a34a" },
                  { key: "vital", label: "Vitals", color: "#0d9488" },
                  { key: "invoice", label: "Invoices", color: "#d97706" },
                ] as const).map((f) => (
                  <label key={f.key} className="flex items-center gap-1.5 text-[12px] cursor-pointer" style={{ color: "var(--grey-700)" }}>
                    <input type="checkbox" checked={timelineFilters[f.key]} onChange={() => setTimelineFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))} className="w-3.5 h-3.5" />
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
                    {f.label}
                  </label>
                ))}
              </div>

              {timelineLoading ? (
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--blue-500)", borderTopColor: "transparent" }} /></div>
              ) : timelineEvents.filter(e => timelineFilters[e.type] !== false).length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-[13px] font-medium" style={{ color: "var(--grey-500)" }}>No timeline events yet</p>
                </div>
              ) : (
                <div className="relative" style={{ paddingLeft: 140 }}>
                  {/* Vertical line */}
                  <div className="absolute" style={{ left: 136, top: 8, bottom: 8, width: 2, background: "var(--grey-300)" }} />

                  {timelineEvents.filter(e => timelineFilters[e.type] !== false).map((event, idx) => {
                    const typeColors: Record<string, string> = { appointment: "#f57c00", note: "#2563eb", document: "#7c3aed", communication: "#16a34a", vital: "#0d9488", invoice: "#d97706" };
                    const typeBgColors: Record<string, string> = { appointment: "#fff7ed", note: "#eff6ff", document: "#f5f3ff", communication: "#f0fdf4", vital: "#f0fdfa", invoice: "#fffbeb" };
                    const dotColor = typeColors[event.type] || "var(--grey-400)";
                    const eventDate = new Date(event.date);
                    const dateStr = `${eventDate.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][eventDate.getMonth()]} ${eventDate.getFullYear()}`;
                    const timeStr = event.time || eventDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

                    return (
                      <div key={event.id || idx} className="relative mb-4 flex items-start">
                        {/* Date on left */}
                        <div className="absolute text-right" style={{ left: -140, width: 128 }}>
                          <p className="text-[12px] font-semibold" style={{ color: "var(--grey-700)" }}>{dateStr}</p>
                          <p className="text-[10px]" style={{ color: "var(--grey-400)" }}>{timeStr}</p>
                        </div>

                        {/* Dot */}
                        <div className="absolute flex-shrink-0" style={{ left: -7, top: 6, width: 12, height: 12, borderRadius: "50%", background: dotColor, border: "2px solid var(--white)", boxShadow: `0 0 0 2px ${dotColor}40` }} />

                        {/* Event card */}
                        <div className="ml-5 flex-1 p-3" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)", borderLeft: `3px solid ${dotColor}` }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-px text-[9px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: typeBgColors[event.type] || "var(--grey-100)", color: dotColor }}>{event.type}</span>
                            <p className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{event.title}</p>
                          </div>
                          {event.description && <p className="text-[12px] leading-relaxed" style={{ color: "var(--grey-600)" }}>{event.description}</p>}
                        </div>
                      </div>
                    );
                  })}

                  {/* Load more */}
                  {timelineHasMore && (
                    <div className="text-center pt-4">
                      <button onClick={() => setTimelineLimit(prev => prev + 20)} className="px-4 py-1.5 text-[12px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ VITALS ═══ */}
          {activeSection === "vitals" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>Vitals Tracking</h2>
                <button onClick={() => setShowVitalsForm(!showVitalsForm)} className="px-3 py-1.5 text-[12px] font-semibold text-white" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>
                  {showVitalsForm ? "Hide Form" : "+ Record Vitals"}
                </button>
              </div>

              {/* Record Vitals Form */}
              {showVitalsForm && (
                <div className="p-5 mb-5 yoda-slide-in" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <h3 className="text-[14px] font-semibold mb-4" style={{ color: "var(--grey-800)" }}>Record Vitals</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>BP Systolic (mmHg)</label>
                      <input type="number" value={vitalForm.bloodPressureSys} onChange={e => setVitalForm(p => ({ ...p, bloodPressureSys: e.target.value }))} placeholder="120" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>BP Diastolic (mmHg)</label>
                      <input type="number" value={vitalForm.bloodPressureDia} onChange={e => setVitalForm(p => ({ ...p, bloodPressureDia: e.target.value }))} placeholder="80" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Pulse (bpm)</label>
                      <input type="number" value={vitalForm.pulse} onChange={e => setVitalForm(p => ({ ...p, pulse: e.target.value }))} placeholder="72" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Temperature (°C)</label>
                      <input type="number" step="0.1" value={vitalForm.temperature} onChange={e => setVitalForm(p => ({ ...p, temperature: e.target.value }))} placeholder="36.6" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Weight (kg)</label>
                      <input type="number" step="0.1" value={vitalForm.weight} onChange={e => setVitalForm(p => ({ ...p, weight: e.target.value }))} placeholder="70" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Height (cm)</label>
                      <input type="number" step="0.1" value={vitalForm.height} onChange={e => setVitalForm(p => ({ ...p, height: e.target.value }))} placeholder="170" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>SpO2 (%)</label>
                      <input type="number" value={vitalForm.oxygenSaturation} onChange={e => setVitalForm(p => ({ ...p, oxygenSaturation: e.target.value }))} placeholder="98" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Respiratory Rate (/min)</label>
                      <input type="number" value={vitalForm.respiratoryRate} onChange={e => setVitalForm(p => ({ ...p, respiratoryRate: e.target.value }))} placeholder="16" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                    </div>
                  </div>
                  {/* BMI auto-display */}
                  {getCalculatedBMI() && (
                    <div className="mb-4 px-3 py-2 flex items-center gap-2" style={{ background: "var(--blue-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--blue-100)" }}>
                      <span className="text-[12px] font-medium" style={{ color: "var(--blue-500)" }}>Calculated BMI:</span>
                      <span className="text-[14px] font-bold" style={{ color: "var(--blue-500)" }}>{getCalculatedBMI()}</span>
                      <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>
                        ({parseFloat(getCalculatedBMI()) < 18.5 ? "Underweight" : parseFloat(getCalculatedBMI()) < 25 ? "Normal" : parseFloat(getCalculatedBMI()) < 30 ? "Overweight" : "Obese"})
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                      <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Notes</label>
                      <textarea value={vitalForm.notes} onChange={e => setVitalForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional observations..." className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Recorded By</label>
                      <input type="text" value={vitalForm.recordedBy} onChange={e => setVitalForm(p => ({ ...p, recordedBy: e.target.value }))} placeholder="Dr. Name / Nurse" className="w-full px-2.5 py-1.5 text-[13px]" style={inputStyle} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveVital} disabled={savingVital} className="px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>{savingVital ? "Saving..." : "Save Vitals"}</button>
                    <button onClick={() => setShowVitalsForm(false)} className="px-4 py-1.5 text-[12px] font-semibold" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Trend Charts - pure CSS sparklines */}
              {vitals.length >= 2 && (
                <div className="mb-5">
                  <h3 className="text-[13px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--grey-600)" }}>Trends (Last 10 Readings)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Weight trend */}
                    {(() => {
                      const data = vitals.filter(v => v.weight != null).slice(0, 10).reverse();
                      if (data.length < 2) return null;
                      const vals = data.map(v => v.weight!);
                      const min = Math.min(...vals); const max = Math.max(...vals);
                      const range = max - min || 1;
                      return (
                        <div className="p-3" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                          <p className="text-[11px] font-bold mb-2" style={{ color: "var(--grey-600)" }}>Weight (kg)</p>
                          <svg width="100%" height="50" viewBox={`0 0 ${(data.length - 1) * 30} 50`} style={{ overflow: "visible" }}>
                            <polyline fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" points={vals.map((v, i) => `${i * 30},${45 - ((v - min) / range) * 40}`).join(" ")} />
                            {vals.map((v, i) => (
                              <g key={i}>
                                <circle cx={i * 30} cy={45 - ((v - min) / range) * 40} r="3" fill="#2563eb" />
                                <text x={i * 30} y={45 - ((v - min) / range) * 40 - 6} textAnchor="middle" fill="var(--grey-500)" fontSize="8">{v}</text>
                              </g>
                            ))}
                          </svg>
                        </div>
                      );
                    })()}
                    {/* BP trend */}
                    {(() => {
                      const data = vitals.filter(v => v.bloodPressureSys != null).slice(0, 10).reverse();
                      if (data.length < 2) return null;
                      const sysVals = data.map(v => v.bloodPressureSys!);
                      const diaVals = data.map(v => v.bloodPressureDia!);
                      const allVals = [...sysVals, ...diaVals];
                      const min = Math.min(...allVals); const max = Math.max(...allVals);
                      const range = max - min || 1;
                      return (
                        <div className="p-3" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                          <p className="text-[11px] font-bold mb-2" style={{ color: "var(--grey-600)" }}>Blood Pressure</p>
                          <svg width="100%" height="50" viewBox={`0 0 ${(data.length - 1) * 30} 50`} style={{ overflow: "visible" }}>
                            <polyline fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" points={sysVals.map((v, i) => `${i * 30},${45 - ((v - min) / range) * 40}`).join(" ")} />
                            <polyline fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4,2" points={diaVals.map((v, i) => `${i * 30},${45 - ((v - min) / range) * 40}`).join(" ")} />
                            {sysVals.map((v, i) => <circle key={`s${i}`} cx={i * 30} cy={45 - ((v - min) / range) * 40} r="3" fill="#ef4444" />)}
                            {diaVals.map((v, i) => <circle key={`d${i}`} cx={i * 30} cy={45 - ((v - min) / range) * 40} r="2.5" fill="#3b82f6" />)}
                          </svg>
                          <div className="flex gap-3 mt-1">
                            <span className="text-[9px] flex items-center gap-1" style={{ color: "var(--grey-500)" }}><span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />Systolic</span>
                            <span className="text-[9px] flex items-center gap-1" style={{ color: "var(--grey-500)" }}><span className="w-2 h-2 rounded-full" style={{ background: "#3b82f6" }} />Diastolic</span>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Pulse trend */}
                    {(() => {
                      const data = vitals.filter(v => v.pulse != null).slice(0, 10).reverse();
                      if (data.length < 2) return null;
                      const vals = data.map(v => v.pulse!);
                      const min = Math.min(...vals); const max = Math.max(...vals);
                      const range = max - min || 1;
                      return (
                        <div className="p-3" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                          <p className="text-[11px] font-bold mb-2" style={{ color: "var(--grey-600)" }}>Pulse (bpm)</p>
                          <svg width="100%" height="50" viewBox={`0 0 ${(data.length - 1) * 30} 50`} style={{ overflow: "visible" }}>
                            <polyline fill="none" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round" points={vals.map((v, i) => `${i * 30},${45 - ((v - min) / range) * 40}`).join(" ")} />
                            {vals.map((v, i) => (
                              <g key={i}>
                                <circle cx={i * 30} cy={45 - ((v - min) / range) * 40} r="3" fill="#16a34a" />
                                <text x={i * 30} y={45 - ((v - min) / range) * 40 - 6} textAnchor="middle" fill="var(--grey-500)" fontSize="8">{v}</text>
                              </g>
                            ))}
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Vitals History Table */}
              {vitalsLoading ? (
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--blue-500)", borderTopColor: "transparent" }} /></div>
              ) : vitals.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  <p className="text-[13px] font-medium" style={{ color: "var(--grey-500)" }}>No vitals recorded yet</p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--grey-400)" }}>Click &quot;+ Record Vitals&quot; to add the first reading</p>
                </div>
              ) : (
                <div style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
                          <th className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--grey-600)" }}>Date</th>
                          <th className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--grey-600)" }}>BP</th>
                          <th className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--grey-600)" }}>Pulse</th>
                          <th className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--grey-600)" }}>Temp</th>
                          <th className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--grey-600)" }}>Weight</th>
                          <th className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--grey-600)" }}>BMI</th>
                          <th className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--grey-600)" }}>SpO2</th>
                          <th className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--grey-600)" }}>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vitals.map((v) => (
                          <React.Fragment key={v.id}>
                            <tr className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpandedVitalId(expandedVitalId === v.id ? null : v.id)} style={{ borderBottom: "1px solid var(--grey-100)" }}>
                              <td className="px-3 py-2.5 font-medium" style={{ color: "var(--grey-900)" }}>{formatDate(v.date || v.createdAt)}</td>
                              <td className="px-3 py-2.5" style={{ color: "var(--grey-700)" }}>{v.bloodPressureSys && v.bloodPressureDia ? `${v.bloodPressureSys}/${v.bloodPressureDia}` : "—"}</td>
                              <td className="px-3 py-2.5" style={{ color: "var(--grey-700)" }}>{v.pulse ?? "—"}</td>
                              <td className="px-3 py-2.5" style={{ color: "var(--grey-700)" }}>{v.temperature ? `${v.temperature}°C` : "—"}</td>
                              <td className="px-3 py-2.5" style={{ color: "var(--grey-700)" }}>{v.weight ? `${v.weight} kg` : "—"}</td>
                              <td className="px-3 py-2.5" style={{ color: "var(--grey-700)" }}>{v.bmi ?? "—"}</td>
                              <td className="px-3 py-2.5" style={{ color: "var(--grey-700)" }}>{v.oxygenSaturation ? `${v.oxygenSaturation}%` : "—"}</td>
                              <td className="px-3 py-2.5 text-center">
                                <svg className={`w-4 h-4 mx-auto transition-transform ${expandedVitalId === v.id ? "rotate-180" : ""}`} style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </td>
                            </tr>
                            {expandedVitalId === v.id && (
                              <tr>
                                <td colSpan={8} className="px-4 py-3" style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                                    <div><span style={{ color: "var(--grey-500)" }}>Height:</span> <strong style={{ color: "var(--grey-800)" }}>{v.height ? `${v.height} cm` : "—"}</strong></div>
                                    <div><span style={{ color: "var(--grey-500)" }}>Resp. Rate:</span> <strong style={{ color: "var(--grey-800)" }}>{v.respiratoryRate ? `${v.respiratoryRate}/min` : "—"}</strong></div>
                                    <div><span style={{ color: "var(--grey-500)" }}>Recorded By:</span> <strong style={{ color: "var(--grey-800)" }}>{v.recordedBy || "—"}</strong></div>
                                    <div><span style={{ color: "var(--grey-500)" }}>Time:</span> <strong style={{ color: "var(--grey-800)" }}>{new Date(v.date || v.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</strong></div>
                                    {v.notes && <div className="col-span-2 md:col-span-4"><span style={{ color: "var(--grey-500)" }}>Notes:</span> <span style={{ color: "var(--grey-700)" }}>{v.notes}</span></div>}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ VISIT SUMMARY ═══ */}
          {activeSection === "visit-summary" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>Visit Summary</h2>
                <p className="text-[11px] mt-1" style={{ color: "var(--grey-500)" }}>All patient activity grouped by date</p>
              </div>

              {visitSummaryLoading ? (
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--blue-500)", borderTopColor: "transparent" }} /></div>
              ) : visitSummaries.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  <p className="text-[13px] font-medium" style={{ color: "var(--grey-500)" }}>No visits recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visitSummaries.map((visit) => {
                    const isExpanded = expandedVisitDate === visit.date;
                    const itemCount = (visit.appointment ? 1 : 0) + visit.notes.length + visit.vitals.length + visit.documents.length + visit.invoices.length;
                    return (
                      <div key={visit.date} style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                        {/* Header */}
                        <button onClick={() => setExpandedVisitDate(isExpanded ? null : visit.date)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: "var(--blue-50)", borderRadius: "var(--radius-sm)" }}>
                              <svg className="w-5 h-5" style={{ color: "var(--blue-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                              <p className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>{formatDate(visit.date)}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {visit.appointment && <span className="text-[10px] font-bold px-1.5 py-px" style={{ background: "#fff7ed", color: "#f57c00", borderRadius: "var(--radius-sm)" }}>Appointment</span>}
                                {visit.notes.length > 0 && <span className="text-[10px] font-bold px-1.5 py-px" style={{ background: "#eff6ff", color: "#2563eb", borderRadius: "var(--radius-sm)" }}>{visit.notes.length} Note{visit.notes.length > 1 ? "s" : ""}</span>}
                                {visit.vitals.length > 0 && <span className="text-[10px] font-bold px-1.5 py-px" style={{ background: "#f0fdfa", color: "#0d9488", borderRadius: "var(--radius-sm)" }}>Vitals</span>}
                                {visit.documents.length > 0 && <span className="text-[10px] font-bold px-1.5 py-px" style={{ background: "#f5f3ff", color: "#7c3aed", borderRadius: "var(--radius-sm)" }}>{visit.documents.length} Doc{visit.documents.length > 1 ? "s" : ""}</span>}
                                {visit.invoices.length > 0 && <span className="text-[10px] font-bold px-1.5 py-px" style={{ background: "#fffbeb", color: "#d97706", borderRadius: "var(--radius-sm)" }}>Invoice</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium" style={{ color: "var(--grey-400)" }}>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </button>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--grey-100)" }}>
                            {/* Appointment */}
                            {visit.appointment && (
                              <div className="mt-3 p-3" style={{ background: "#fff7ed", borderRadius: "var(--radius-sm)", borderLeft: "3px solid #f57c00" }}>
                                <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: "#f57c00" }}>Appointment</p>
                                <p className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>Dr. {visit.appointment.doctor}</p>
                                <p className="text-[11px]" style={{ color: "var(--grey-600)" }}>
                                  {visit.appointment.time}{visit.appointment.department ? ` · ${visit.appointment.department}` : ""}{visit.appointment.reason ? ` · ${visit.appointment.reason}` : ""}
                                </p>
                                <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold uppercase" style={{ borderRadius: "var(--radius-sm)", background: visit.appointment.status === "completed" ? "var(--green-light)" : "var(--blue-50)", color: visit.appointment.status === "completed" ? "var(--green)" : "var(--blue-500)" }}>{visit.appointment.status}</span>
                              </div>
                            )}

                            {/* Clinical Notes */}
                            {visit.notes.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5 mt-2" style={{ color: "#2563eb" }}>Clinical Notes</p>
                                {visit.notes.map(n => (
                                  <div key={n.id} className="p-2.5 mb-1.5" style={{ background: "#eff6ff", borderRadius: "var(--radius-sm)", borderLeft: "3px solid #2563eb" }}>
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="px-1.5 py-px text-[9px] font-bold uppercase" style={{ background: "#dbeafe", color: "#2563eb", borderRadius: "var(--radius-sm)" }}>{NOTE_TYPES.find(t => t.value === n.type)?.label || n.type}</span>
                                      <p className="text-[12px] font-semibold" style={{ color: "var(--grey-900)" }}>{n.title}</p>
                                    </div>
                                    <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: "var(--grey-700)" }}>{n.content}</p>
                                    {n.doctor && <p className="text-[10px] mt-1" style={{ color: "var(--grey-500)" }}>By: {n.doctor}</p>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Vitals */}
                            {visit.vitals.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5 mt-2" style={{ color: "#0d9488" }}>Vitals</p>
                                {visit.vitals.map(v => (
                                  <div key={v.id} className="p-2.5 mb-1.5" style={{ background: "#f0fdfa", borderRadius: "var(--radius-sm)", borderLeft: "3px solid #0d9488" }}>
                                    <div className="flex flex-wrap gap-3 text-[11px]">
                                      {v.bloodPressureSys && <span style={{ color: "var(--grey-700)" }}>BP: <strong>{v.bloodPressureSys}/{v.bloodPressureDia}</strong></span>}
                                      {v.pulse && <span style={{ color: "var(--grey-700)" }}>Pulse: <strong>{v.pulse}</strong></span>}
                                      {v.temperature && <span style={{ color: "var(--grey-700)" }}>Temp: <strong>{v.temperature}°C</strong></span>}
                                      {v.weight && <span style={{ color: "var(--grey-700)" }}>Weight: <strong>{v.weight} kg</strong></span>}
                                      {v.oxygenSaturation && <span style={{ color: "var(--grey-700)" }}>SpO2: <strong>{v.oxygenSaturation}%</strong></span>}
                                      {v.bmi && <span style={{ color: "var(--grey-700)" }}>BMI: <strong>{v.bmi}</strong></span>}
                                    </div>
                                    {v.recordedBy && <p className="text-[10px] mt-1" style={{ color: "var(--grey-500)" }}>By: {v.recordedBy}</p>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Documents */}
                            {visit.documents.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5 mt-2" style={{ color: "#7c3aed" }}>Documents</p>
                                {visit.documents.map(d => (
                                  <div key={d.id} className="flex items-center gap-2 p-2.5 mb-1.5" style={{ background: "#f5f3ff", borderRadius: "var(--radius-sm)", borderLeft: "3px solid #7c3aed" }}>
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#7c3aed" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[12px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>{d.fileName}</p>
                                      <p className="text-[10px]" style={{ color: "var(--grey-500)" }}>{DOC_CATEGORIES.find(c => c.value === d.category)?.label || d.category} · {formatFileSize(d.fileSize)}</p>
                                    </div>
                                    <a href={d.filePath} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold" style={{ color: "#7c3aed" }}>View</a>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Invoices */}
                            {visit.invoices.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5 mt-2" style={{ color: "#d97706" }}>Invoices</p>
                                {visit.invoices.map(inv => (
                                  <Link key={inv.id} href={`/billing/${inv.id}`} className="flex items-center justify-between p-2.5 mb-1.5 hover:opacity-80 transition-opacity" style={{ background: "#fffbeb", borderRadius: "var(--radius-sm)", borderLeft: "3px solid #d97706" }}>
                                    <div>
                                      <p className="text-[12px] font-semibold" style={{ color: "var(--grey-900)" }}>{inv.invoiceNumber}</p>
                                      <span className="text-[10px] font-bold uppercase px-1.5 py-px" style={{ borderRadius: "var(--radius-sm)", background: inv.status === "paid" ? "var(--green-light)" : "#fef3c7", color: inv.status === "paid" ? "var(--green)" : "#d97706" }}>{inv.status}</span>
                                    </div>
                                    <p className="text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(inv.totalAmount)}</p>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>

        {/* ─── RIGHT SIDEBAR ─── */}
        <aside className="hidden xl:flex xl:flex-col flex-shrink-0 overflow-y-auto" style={{ width: 300, background: "var(--white)", borderLeft: "1px solid var(--grey-200)" }}>
          <div className="px-5 py-5 space-y-6">

            {/* Medical History — Practo style */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Medical History</h3>
                <button onClick={() => { setActiveSection("profile"); startEdit(); }} className="text-[13px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>+ Add New</button>
              </div>
              {medicalHistory.length > 0 ? (
                <div className="space-y-2">{medicalHistory.map((c) => (
                  <label key={c} className="flex items-center gap-2.5 text-[13px]" style={{ color: "var(--grey-800)" }}>
                    <input type="checkbox" checked readOnly className="w-4 h-4" />
                    {c}
                  </label>
                ))}</div>
              ) : <p className="text-[12px]" style={{ color: "var(--grey-400)" }}>No history recorded</p>}
            </div>

            <div style={{ height: 1, background: "var(--grey-200)" }} />

            {/* Other History — Practo style */}
            <div>
              <h3 className="text-[16px] font-bold mb-3" style={{ color: "var(--grey-900)" }}>Other History :</h3>
              {patient.otherHistory ? (
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--grey-700)" }}>{patient.otherHistory}</p>
              ) : (
                <div className="px-3 py-4 text-[12px]" style={{ border: "1px solid var(--grey-200)", borderRadius: "var(--radius-sm)", color: "var(--grey-400)" }}>Enter any other medical history...</div>
              )}
            </div>

            <div style={{ height: 1, background: "var(--grey-200)" }} />

            {/* Allergies */}
            <div>
              <h3 className="text-[16px] font-bold mb-3" style={{ color: "var(--grey-900)" }}>Allergies</h3>
              {patient.allergies ? (
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--red)" }}>{patient.allergies}</p>
              ) : (
                <div className="px-3 py-4 text-[12px]" style={{ border: "1px solid var(--grey-200)", borderRadius: "var(--radius-sm)", color: "var(--grey-400)" }}>List any known allergies...</div>
              )}
            </div>

            <div style={{ height: 1, background: "var(--grey-200)" }} />

            {/* Groups — Practo style */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Groups</h3>
                <button onClick={() => { setActiveSection("profile"); startEdit(); }} className="text-[13px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>Add New</button>
              </div>
              {groups.length > 0 ? (
                <div className="space-y-2">{groups.map((g) => (
                  <label key={g} className="flex items-center gap-2.5 text-[13px]" style={{ color: "var(--grey-800)" }}>
                    <input type="checkbox" checked readOnly className="w-4 h-4" />
                    {g}
                  </label>
                ))}</div>
              ) : <p className="text-[12px]" style={{ color: "var(--grey-400)" }}>No groups assigned</p>}
            </div>

            <div style={{ height: 1, background: "var(--grey-200)" }} />

            {/* Patient Notes */}
            <div>
              <h3 className="text-[16px] font-bold mb-3" style={{ color: "var(--grey-900)" }}>Patient Notes</h3>
              <div className="flex gap-1.5 mb-2">
                <input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Type note here" className="flex-1 px-2.5 py-1.5 text-[12px]" style={inputStyle}
                  onKeyDown={(e) => { if (e.key === "Enter") saveNote(); }} />
                <button onClick={saveNote} disabled={!noteInput.trim()} className="px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>Add</button>
              </div>
              {patient.medicalNotes ? (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {patient.medicalNotes.split("\n").filter(Boolean).map((note, i) => (
                    <p key={i} className="text-[11px] px-2 py-1.5 leading-snug" style={{ color: "var(--grey-700)", background: "var(--grey-50)", borderRadius: "var(--radius-sm)", borderLeft: "2px solid var(--blue-500)" }}>{note}</p>
                  ))}
                </div>
              ) : <p className="text-[12px]" style={{ color: "var(--grey-400)" }}>No notes yet</p>}
            </div>
          </div>
        </aside>
      </div>

      {/* ══════════ QUICK ACTIONS FAB ══════════ */}
      <div className="fixed bottom-6 right-6 z-50 print:hidden" style={{ display: "flex", flexDirection: "column-reverse", alignItems: "flex-end", gap: 8 }}>
        {/* FAB menu items */}
        {fabOpen && (
          <div className="flex flex-col gap-2 mb-2 yoda-fade-in">
            <Link href={`/appointments?patientId=${id}&patientName=${encodeURIComponent(patient.firstName + " " + patient.lastName)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold shadow-lg"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-pill)", color: "var(--grey-800)", boxShadow: "var(--shadow-md)", whiteSpace: "nowrap" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--blue-500)" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Book Appointment
            </Link>
            <button onClick={() => { setActiveSection("vitals"); setFabOpen(false); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold shadow-lg cursor-pointer"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-pill)", color: "var(--grey-800)", boxShadow: "var(--shadow-md)", whiteSpace: "nowrap" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--green)" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              Record Vitals
            </button>
            <button onClick={() => { setActiveSection("communications"); setShowMsgForm(true); setFabOpen(false); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold shadow-lg cursor-pointer"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-pill)", color: "var(--grey-800)", boxShadow: "var(--shadow-md)", whiteSpace: "nowrap" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--orange)" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Send Reminder
            </button>
          </div>
        )}
        {/* FAB toggle button */}
        <button onClick={() => setFabOpen(!fabOpen)}
          className="w-12 h-12 flex items-center justify-center shadow-lg transition-transform duration-200"
          style={{ background: "var(--blue-500)", borderRadius: "var(--radius-pill)", border: "none", boxShadow: "var(--shadow-lg)", color: "#fff", cursor: "pointer", transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>
    </div>
  );
}
