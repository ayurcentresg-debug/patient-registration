"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import { DetailPageSkeleton } from "@/components/Skeleton";
import { validateName } from "@/lib/validation";

const inputStyle = { border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", fontSize: "15px" };
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" };
const drName = (name: string) => name.match(/^Dr\.?\s/i) ? name : `Dr. ${name}`;

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
    <div className="fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 text-[15px] font-semibold yoda-slide-in" role="alert"
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
      <td className="py-[8px] pr-4 text-[15px] font-normal text-right whitespace-nowrap align-top" style={{ color: "var(--grey-600)", width: 180 }}>{label} :</td>
      <td className="py-[8px] pl-2 text-[15px] font-medium align-top" style={{ color: value ? "var(--grey-900)" : "var(--grey-400)" }}>
        {href && value ? <a href={href} className="hover:underline" style={{ color: "#2d6a4f" }}>{value}</a> : (value || "—")}
      </td>
    </tr>
  );
}

/* ─── Edit Row — Practo style ─── */
function EditRow({ label, name, value, type = "text", onChange }: { label: string; name: string; value: string; type?: string; onChange: (n: string, v: string) => void }) {
  return (
    <tr>
      <td className="py-[8px] pr-4 text-[15px] font-normal text-right whitespace-nowrap align-middle" style={{ color: "var(--grey-600)", width: 180 }}>{label} :</td>
      <td className="py-[8px] pl-2"><input type={type} value={value} onChange={(e) => onChange(name, e.target.value)} className="w-full max-w-sm px-2.5 py-1.5 text-[15px]" style={inputStyle} /></td>
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
  // ── Patient ──
  { key: "profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", group: "Patient" },
  { key: "appointments", label: "Appointments", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", group: "Patient" },
  { key: "communications", label: "Communications", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", group: "Patient" },
  // ── EMR ──
  { key: "clinical", label: "Clinical Notes", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01", group: "EMR" },
  { key: "treatment-plans", label: "Treatment Plans", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", group: "EMR" },
  { key: "completed-procedures", label: "Completed Procedures", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", group: "EMR" },
  { key: "documents", label: "Files", icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z", group: "EMR" },
  { key: "prescriptions", label: "Prescriptions", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", group: "EMR" },
  { key: "vitals", label: "Vitals", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", group: "EMR" },
  { key: "timeline", label: "Timeline", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", group: "EMR" },
  { key: "allergies", label: "Allergies & Notes", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", group: "EMR" },
  { key: "emergency", label: "Emergency Contact", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z", group: "EMR" },
  { key: "visit-summary", label: "Visit Summary", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", group: "EMR" },
  // ── Billing ──
  { key: "invoices", label: "Invoices", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z", group: "Billing" },
  { key: "payments", label: "Payments", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", group: "Billing" },
  { key: "packages", label: "Packages", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", group: "Billing" },
  { key: "ledger", label: "Ledger", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", group: "Billing" },
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

  // Patient Packages state
  interface PatientPkg {
    id: string; packageNumber: string; treatmentName: string; packageName: string;
    totalSessions: number; usedSessions: number; remainingSessions: number;
    totalPrice: number; paidAmount: number; balanceAmount: number; pricePerSession: number;
    purchaseDate: string; expiryDate: string; status: string; daysUntilExpiry: number;
    isExpiringSoon: boolean; consultationFeePolicy: string; maxSharedUsers: number;
    sessions: Array<{ id: string; sessionNumber: number; date: string; doctorName: string | null; status: string; usedByName: string | null }>;
    shares: Array<{ id: string; sharedWithName: string; relation: string; isActive: boolean }>;
  }
  const [patientPackages, setPatientPackages] = useState<PatientPkg[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  // Treatment Plans state
  interface TreatmentPlanRecord {
    id: string; planNumber: string; name: string; doctorName: string; diagnosis: string | null;
    status: string; startDate: string; endDate: string | null; totalSessions: number;
    completedSessions: number; totalCost: number; notes: string | null; createdAt: string;
    _count?: { items: number };
  }
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlanRecord[]>([]);
  const [treatmentPlansLoading, setTreatmentPlansLoading] = useState(false);
  const [treatmentPlansFetched, setTreatmentPlansFetched] = useState(false);

  // Completed Procedures state
  interface CompletedProcedure {
    id: string; date: string; time: string; doctor: string; department: string | null;
    treatmentName: string | null; status: string; reason: string | null; notes: string | null;
    sessionPrice: number | null; packageName: string | null;
  }
  const [completedProcedures, setCompletedProcedures] = useState<CompletedProcedure[]>([]);
  const [completedProceduresLoading, setCompletedProceduresLoading] = useState(false);
  const [completedProceduresFetched, setCompletedProceduresFetched] = useState(false);

  // Patient Invoices state
  interface PatientInvoice {
    id: string; invoiceNumber: string; date: string; patientName: string; totalAmount: number;
    paidAmount: number; balanceAmount: number; status: string; paymentMethod: string | null;
    notes: string | null; _count?: { payments: number }; isPackageSale?: boolean;
    packageInfo?: { id: string; packageNumber: string; packageName: string } | null;
    items?: Array<{ id: string; treatmentName: string; quantity: number; unitPrice: number; total: number }>;
  }
  const [patientInvoices, setPatientInvoices] = useState<PatientInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesFetched, setInvoicesFetched] = useState(false);

  // Patient Payments state
  interface PatientPayment {
    id: string; receiptNumber: string | null; amount: number; method: string;
    reference: string | null; notes: string | null; date: string;
    invoice: { id: string; invoiceNumber: string; patientName: string; totalAmount: number };
  }
  const [patientPayments, setPatientPayments] = useState<PatientPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsFetched, setPaymentsFetched] = useState(false);

  // Ledger state
  interface LedgerEntry {
    id: string; date: string; type: "invoice" | "payment" | "refund" | "credit";
    description: string; reference: string; debit: number; credit: number; balance: number;
  }
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerFetched, setLedgerFetched] = useState(false);

  // Document viewer state
  const [viewingDoc, setViewingDoc] = useState<PatientDocument | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Appointment booking state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string; specialization: string | null; department: string | null; slotDuration: number }>>([]);
  const [bookingDoctor, setBookingDoctor] = useState("");
  const [bookingDoctorId, setBookingDoctorId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingSlots, setBookingSlots] = useState<Array<{ time: string; available: boolean }>>([]);
  const [bookingTime, setBookingTime] = useState("");
  const [bookingType, setBookingType] = useState("consultation");
  const [bookingReason, setBookingReason] = useState("");
  const [bookingDept, setBookingDept] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);

  // Photo upload state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoCropScale, setPhotoCropScale] = useState(1);
  const [photoCropOffset, setPhotoCropOffset] = useState({ x: 0, y: 0 });
  const photoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);

  // Prescription state
  interface PrescriptionItem { medicineName: string; inventoryItemId?: string; dosage: string; frequency: string; timing: string; duration: string; quantity: number | null; instructions: string; }
  interface Prescription { id: string; prescriptionNo: string; doctorName: string; doctorId: string | null; diagnosis: string | null; notes: string | null; status: string; date: string; items: Array<PrescriptionItem & { id: string; sequence: number }>; }
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [showRxForm, setShowRxForm] = useState(false);
  const [rxDoctor, setRxDoctor] = useState("");
  const [rxDoctorId, setRxDoctorId] = useState("");
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [rxNotes, setRxNotes] = useState("");
  const [rxItems, setRxItems] = useState<PrescriptionItem[]>([{ medicineName: "", dosage: "", frequency: "twice_daily", timing: "after_food", duration: "", quantity: null, instructions: "" }]);
  const [rxSaving, setRxSaving] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicineSuggestions, setMedicineSuggestions] = useState<Array<{ id: string; name: string; unit: string; subcategory: string | null; packing: string | null }>>([]);
  const [activeMedIdx, setActiveMedIdx] = useState<number | null>(null);
  const [rxMedCategory, setRxMedCategory] = useState("all");
  const [convertingRx, setConvertingRx] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: "danger" | "warning" | "default";
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", confirmLabel: "Confirm", variant: "default", onConfirm: () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Quick Actions FAB state
  const [fabOpen, setFabOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

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
          patient.appointments.forEach(a => events.push({ id: `appt-${a.id}`, type: "appointment", title: `Appointment with ${drName(a.doctor)}`, description: a.reason || a.department || "Consultation", date: a.date, time: a.time }));
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

  // Close more-menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenuOpen(false); };
    if (moreMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreMenuOpen]);

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
    const fnCheck = validateName(editData.firstName ?? "", "First name");
    if (!fnCheck.valid) { showToast(fnCheck.error!, "error"); return; }
    const lnCheck = validateName(editData.lastName ?? "", "Last name");
    if (!lnCheck.valid) { showToast(lnCheck.error!, "error"); return; }
    if (!editData.phone?.trim()) { showToast("Phone number is required", "error"); return; }
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

  // ─── Appointment Booking ───
  const fetchDoctors = useCallback(async () => {
    try {
      const r = await fetch("/api/doctors?status=active");
      if (r.ok) {
        const data = await r.json();
        setDoctors(data.map((d: Record<string, unknown>) => ({ id: d.id as string, name: d.name as string, specialization: d.specialization as string | null, department: d.department as string | null, slotDuration: (d.slotDuration as number) || 30 })));
      }
    } catch { /* ignore */ }
  }, []);

  async function fetchSlots(doctorId: string, date: string) {
    if (!doctorId || !date) return;
    setSlotsLoading(true);
    setBookingSlots([]);
    setBookingTime("");
    try {
      const r = await fetch(`/api/doctors/${doctorId}/slots?date=${date}`);
      if (r.ok) {
        const data = await r.json();
        setBookingSlots(data.slots || []);
      }
    } catch { /* ignore */ }
    finally { setSlotsLoading(false); }
  }

  function openBookingForm() {
    setShowBookingForm(true);
    setBookingDoctor(""); setBookingDoctorId(""); setBookingDate(""); setBookingSlots([]);
    setBookingTime(""); setBookingType("consultation"); setBookingReason(""); setBookingDept("");
    const today = new Date(); setBookingDate(today.toISOString().split("T")[0]);
    if (doctors.length === 0) fetchDoctors();
  }

  async function submitBooking() {
    if (!bookingDoctorId || !bookingDate || !bookingTime) { showToast("Select a doctor, date, and time", "error"); return; }
    setBookingSaving(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: id,
          doctorId: bookingDoctorId,
          doctor: bookingDoctor,
          date: bookingDate,
          time: bookingTime,
          type: bookingType,
          reason: bookingReason || undefined,
          department: bookingDept || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed to book"); }
      const appt = await res.json();
      setPatient(p => p ? { ...p, appointments: [{ id: appt.id, date: appt.date, time: appt.time, doctor: appt.doctor, department: appt.department, reason: appt.reason, status: appt.status }, ...p.appointments] } : p);
      setShowBookingForm(false);
      showToast("Appointment booked", "success");
    } catch (e) { showToast(e instanceof Error ? e.message : "Booking failed", "error"); }
    finally { setBookingSaving(false); }
  }

  // ─── Prescriptions ───
  const FREQ_OPTIONS = [
    { value: "once_daily", label: "Once daily", short: "OD" },
    { value: "twice_daily", label: "Twice daily", short: "BD" },
    { value: "thrice_daily", label: "Thrice daily", short: "TDS" },
    { value: "four_times", label: "Four times daily", short: "QID" },
    { value: "every_6h", label: "Every 6 hours", short: "Q6H" },
    { value: "every_8h", label: "Every 8 hours", short: "Q8H" },
    { value: "every_12h", label: "Every 12 hours", short: "Q12H" },
    { value: "once_weekly", label: "Once weekly", short: "QW" },
    { value: "as_needed", label: "As needed", short: "SOS" },
    { value: "at_bedtime", label: "At bedtime", short: "HS" },
  ];
  const TIMING_OPTIONS = [
    { value: "before_food", label: "Before food" },
    { value: "after_food", label: "After food" },
    { value: "with_food", label: "With food" },
    { value: "empty_stomach", label: "Empty stomach" },
    { value: "any_time", label: "Any time" },
  ];
  const freqLabel = (v: string) => FREQ_OPTIONS.find(f => f.value === v)?.label || v;
  const freqShort = (v: string) => FREQ_OPTIONS.find(f => f.value === v)?.short || v;
  const timingLabel = (v: string) => TIMING_OPTIONS.find(t => t.value === v)?.label || v;

  const fetchPrescriptions = useCallback(async () => {
    setPrescriptionsLoading(true);
    try {
      const r = await fetch(`/api/prescriptions?patientId=${id}`);
      if (r.ok) { const data = await r.json(); setPrescriptions(Array.isArray(data) ? data : []); }
    } catch { /* ignore */ }
    finally { setPrescriptionsLoading(false); }
  }, [id]);

  useEffect(() => { if (activeSection === "prescriptions" && prescriptions.length === 0 && !prescriptionsLoading) fetchPrescriptions(); }, [activeSection, prescriptions.length, prescriptionsLoading, fetchPrescriptions]);

  // Fetch patient packages
  const [packagesFetched, setPackagesFetched] = useState(false);
  const fetchPatientPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const r = await fetch(`/api/patient-packages?patientId=${id}`);
      if (r.ok) { const data = await r.json(); setPatientPackages(Array.isArray(data) ? data : []); }
    } catch { /* ignore */ }
    finally { setPackagesLoading(false); setPackagesFetched(true); }
  }, [id]);

  useEffect(() => { if (activeSection === "packages" && !packagesFetched && !packagesLoading) fetchPatientPackages(); }, [activeSection, packagesFetched, packagesLoading, fetchPatientPackages]);

  // Fetch treatment plans
  const fetchTreatmentPlans = useCallback(async () => {
    setTreatmentPlansLoading(true);
    try {
      const r = await fetch(`/api/treatment-plans?patientId=${id}&limit=100`);
      if (r.ok) { const data = await r.json(); setTreatmentPlans(Array.isArray(data) ? data : data.plans || []); }
    } catch { /* ignore */ }
    finally { setTreatmentPlansLoading(false); setTreatmentPlansFetched(true); }
  }, [id]);
  useEffect(() => { if (activeSection === "treatment-plans" && !treatmentPlansFetched && !treatmentPlansLoading) fetchTreatmentPlans(); }, [activeSection, treatmentPlansFetched, treatmentPlansLoading, fetchTreatmentPlans]);

  // Fetch completed procedures (completed appointments with treatment info)
  const fetchCompletedProcedures = useCallback(async () => {
    setCompletedProceduresLoading(true);
    try {
      const r = await fetch(`/api/appointments?patientId=${id}&status=completed&limit=200`);
      if (r.ok) {
        const data = await r.json();
        const appts = Array.isArray(data) ? data : data.appointments || [];
        setCompletedProcedures(appts.filter((a: CompletedProcedure) => a.status === "completed"));
      }
    } catch { /* ignore */ }
    finally { setCompletedProceduresLoading(false); setCompletedProceduresFetched(true); }
  }, [id]);
  useEffect(() => { if (activeSection === "completed-procedures" && !completedProceduresFetched && !completedProceduresLoading) fetchCompletedProcedures(); }, [activeSection, completedProceduresFetched, completedProceduresLoading, fetchCompletedProcedures]);

  // Fetch patient invoices
  const fetchPatientInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const r = await fetch(`/api/invoices?patientId=${id}`);
      if (r.ok) { const data = await r.json(); setPatientInvoices(Array.isArray(data) ? data : []); }
    } catch { /* ignore */ }
    finally { setInvoicesLoading(false); setInvoicesFetched(true); }
  }, [id]);
  useEffect(() => { if (activeSection === "invoices" && !invoicesFetched && !invoicesLoading) fetchPatientInvoices(); }, [activeSection, invoicesFetched, invoicesLoading, fetchPatientInvoices]);

  // Fetch patient payments (from all invoices)
  const fetchPatientPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      // Get invoices first, then payments for each
      const ir = await fetch(`/api/invoices?patientId=${id}`);
      if (ir.ok) {
        const invoices = await ir.json();
        const allPayments: PatientPayment[] = [];
        for (const inv of (Array.isArray(invoices) ? invoices : [])) {
          const pr = await fetch(`/api/invoices/${inv.id}/payments`);
          if (pr.ok) {
            const pays = await pr.json();
            for (const p of (Array.isArray(pays) ? pays : [])) {
              allPayments.push({ ...p, invoice: { id: inv.id, invoiceNumber: inv.invoiceNumber, patientName: inv.patientName, totalAmount: inv.totalAmount } });
            }
          }
        }
        allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPatientPayments(allPayments);
      }
    } catch { /* ignore */ }
    finally { setPaymentsLoading(false); setPaymentsFetched(true); }
  }, [id]);
  useEffect(() => { if (activeSection === "payments" && !paymentsFetched && !paymentsLoading) fetchPatientPayments(); }, [activeSection, paymentsFetched, paymentsLoading, fetchPatientPayments]);

  // Build ledger entries from invoices and payments
  const fetchLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const ir = await fetch(`/api/invoices?patientId=${id}`);
      if (ir.ok) {
        const invoices = await ir.json();
        const entries: LedgerEntry[] = [];
        let runningBalance = 0;
        // Collect all events
        const events: Array<{ date: string; type: "invoice" | "payment"; data: Record<string, unknown> }> = [];
        for (const inv of (Array.isArray(invoices) ? invoices : [])) {
          events.push({ date: inv.date, type: "invoice", data: inv });
          const pr = await fetch(`/api/invoices/${inv.id}/payments`);
          if (pr.ok) {
            const pays = await pr.json();
            for (const p of (Array.isArray(pays) ? pays : [])) {
              events.push({ date: p.date, type: "payment", data: { ...p, invoiceNumber: inv.invoiceNumber } });
            }
          }
        }
        // Sort chronologically
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        for (const ev of events) {
          if (ev.type === "invoice") {
            const inv = ev.data as Record<string, unknown>;
            runningBalance += (inv.totalAmount as number) || 0;
            entries.push({ id: inv.id as string, date: ev.date, type: "invoice", description: `Invoice for ${inv.patientName || "services"}`, reference: inv.invoiceNumber as string, debit: (inv.totalAmount as number) || 0, credit: 0, balance: runningBalance });
          } else {
            const pay = ev.data as Record<string, unknown>;
            runningBalance -= (pay.amount as number) || 0;
            entries.push({ id: pay.id as string, date: ev.date, type: "payment", description: `Payment via ${pay.method || "cash"}`, reference: (pay.receiptNumber as string) || (pay.invoiceNumber as string) || "", debit: 0, credit: (pay.amount as number) || 0, balance: runningBalance });
          }
        }
        setLedgerEntries(entries);
      }
    } catch { /* ignore */ }
    finally { setLedgerLoading(false); setLedgerFetched(true); }
  }, [id]);
  useEffect(() => { if (activeSection === "ledger" && !ledgerFetched && !ledgerLoading) fetchLedger(); }, [activeSection, ledgerFetched, ledgerLoading, fetchLedger]);

  const searchMedicines = useCallback(async (query: string, subcategory?: string) => {
    if (query.length < 1) { setMedicineSuggestions([]); return; }
    try {
      const params = new URLSearchParams({ search: query });
      if (subcategory && subcategory !== "all") params.set("subcategory", subcategory);
      const r = await fetch(`/api/medicines?${params}`);
      if (r.ok) {
        const data = await r.json();
        const list = Array.isArray(data) ? data : [];
        setMedicineSuggestions(list.map((m: { id: string; name: string; unit: string; subcategory: string | null; packing: string | null }) => ({
          id: m.id, name: m.name, unit: m.unit, subcategory: m.subcategory, packing: m.packing,
        })));
      }
    } catch { setMedicineSuggestions([]); }
  }, []);

  function addRxItem() {
    setRxItems(prev => [...prev, { medicineName: "", dosage: "", frequency: "twice_daily", timing: "after_food", duration: "", quantity: null, instructions: "" }]);
  }
  function removeRxItem(idx: number) {
    if (rxItems.length <= 1) return;
    setRxItems(prev => prev.filter((_, i) => i !== idx));
  }
  function updateRxItem(idx: number, field: keyof PrescriptionItem, value: string | number | null) {
    setRxItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  async function saveRx() {
    if (!patient || !rxDoctor) { showToast("Select a doctor", "error"); return; }
    const validItems = rxItems.filter(i => i.medicineName.trim() && i.dosage.trim() && i.duration.trim());
    if (validItems.length === 0) { showToast("Add at least one medicine with dosage and duration", "error"); return; }
    setRxSaving(true);
    try {
      const r = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: id, doctorId: rxDoctorId || null, doctorName: rxDoctor, diagnosis: rxDiagnosis, notes: rxNotes, items: validItems }),
      });
      if (!r.ok) throw new Error();
      const newRx = await r.json();
      setPrescriptions(prev => [newRx, ...prev]);
      setShowRxForm(false);
      setRxDoctor(""); setRxDoctorId(""); setRxDiagnosis(""); setRxNotes("");
      setRxItems([{ medicineName: "", dosage: "", frequency: "twice_daily", timing: "after_food", duration: "", quantity: null, instructions: "" }]);
      showToast("Prescription created", "success");
    } catch { showToast("Failed to save prescription", "error"); }
    finally { setRxSaving(false); }
  }

  function openRxForm() {
    setShowRxForm(true);
    if (doctors.length === 0) fetchDoctors();
  }

  function printPrescription(rx: Prescription) {
    if (!patient) return;
    const rows = rx.items.map((item, i) => `<tr>
      <td style="font-weight:600">${i + 1}</td>
      <td><strong>${item.medicineName}</strong>${item.instructions ? `<br/><span style="color:#78716c;font-size:10px">${item.instructions}</span>` : ""}</td>
      <td>${item.dosage}</td>
      <td>${freqLabel(item.frequency)}</td>
      <td>${timingLabel(item.timing)}</td>
      <td>${item.duration}</td>
      <td>${item.quantity || "—"}</td>
    </tr>`).join("");

    openPdfWindow(`Prescription ${rx.prescriptionNo} — ${patient.firstName} ${patient.lastName}`,
      `${pdfHeader("Prescription", "doc-type-visit", `Prescription ${rx.prescriptionNo}`, `Date: ${formatDate(rx.date)}`)}
      <div class="grid" style="margin-bottom:16px">
        <div><span class="label">Patient</span><br/><span class="value">${patient.firstName} ${patient.lastName}</span></div>
        <div><span class="label">Patient ID</span><br/><span class="value">${patient.patientIdNumber}</span></div>
        <div><span class="label">Age / Gender</span><br/><span class="value">${calcAge(patient.dateOfBirth) || "—"} / ${patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : "—"}</span></div>
        <div><span class="label">Prescribing Doctor</span><br/><span class="value">${drName(rx.doctorName)}</span></div>
      </div>
      ${rx.diagnosis ? `<div style="background:#faf3e6;border-left:3px solid #b68d40;padding:8px 14px;border-radius:0 6px 6px 0;margin-bottom:16px"><span style="font-size:10px;color:#8b6914;font-weight:700;text-transform:uppercase;letter-spacing:0.3px">Diagnosis</span><br/><span style="font-size:13px;font-weight:600">${rx.diagnosis}</span></div>` : ""}
      <h2>Medicines</h2>
      <table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Timing</th><th>Duration</th><th>Qty</th></tr></thead><tbody>${rows}</tbody></table>
      ${rx.notes ? `<h2>Notes</h2><div class="note-card"><div class="note-body">${rx.notes}</div></div>` : ""}
      <div style="margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end">
        <div style="font-size:11px;color:#78716c">
          <p><strong>Allergies:</strong> ${patient.allergies || "None recorded"}</p>
        </div>
        <div style="text-align:center">
          <div style="width:180px;border-top:1px solid #292524;padding-top:6px;font-size:11px;color:#78716c">${drName(rx.doctorName)}<br/>Signature</div>
        </div>
      </div>`
    );
  }

  async function deleteRx(rxId: string, rxNo: string) {
    setConfirmDialog({
      open: true, title: "Delete Prescription", variant: "danger",
      message: `Delete prescription ${rxNo}? This action cannot be undone.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const r = await fetch(`/api/prescriptions/${rxId}`, { method: "DELETE" });
          if (r.ok) { setPrescriptions(prev => prev.filter(p => p.id !== rxId)); showToast("Prescription deleted", "success"); }
        } catch { showToast("Failed to delete", "error"); }
        finally { setConfirmLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
      },
    });
  }

  function shareRxWhatsApp(rx: Prescription) {
    if (!patient) return;
    const items = rx.items.map((item, i) =>
      `${i + 1}. *${item.medicineName}* — ${item.dosage}, ${freqLabel(item.frequency)}, ${timingLabel(item.timing)}, ${item.duration}${item.instructions ? ` (${item.instructions})` : ""}`
    ).join("\n");
    const text = `*${rx.prescriptionNo}*\nDate: ${formatDate(rx.date)}\nDoctor: ${rx.doctorName}\nPatient: ${patient.firstName} ${patient.lastName}\n${rx.diagnosis ? `Diagnosis: ${rx.diagnosis}\n` : ""}\n*Medicines:*\n${items}\n${rx.notes ? `\nNotes: ${rx.notes}` : ""}`;
    const phone = (patient.whatsapp || patient.phone || "").replace(/[^0-9]/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  async function convertRxToInvoice(rx: Prescription) {
    setConvertingRx(rx.id);
    try {
      const r = await fetch(`/api/prescriptions/${rx.id}/convert-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await r.json();
      if (r.ok) {
        showToast(`Invoice ${data.invoiceNumber} created`, "success");
        setPrescriptions(prev => prev.map(p => p.id === rx.id ? { ...p, status: "completed" } : p));
        // Open invoice in new tab
        window.open(`/billing?search=${data.invoiceNumber}`, "_blank");
      } else {
        if (data.invoiceId) {
          showToast(data.error, "error");
        } else {
          showToast(data.error || "Failed to convert", "error");
        }
      }
    } catch { showToast("Failed to convert prescription to invoice", "error"); }
    finally { setConvertingRx(null); }
  }

  // ─── Photo Upload ───
  function handlePhotoSelect(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("Please select an image file", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB", "error"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoCropScale(1);
    setPhotoCropOffset({ x: 0, y: 0 });
    setShowPhotoModal(true);
  }

  async function cropAndUploadPhoto() {
    if (!photoFile || !cropImgRef.current || !canvasRef.current) return;
    setUploadingPhoto(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d")!;
      const img = cropImgRef.current;
      const size = 400; // Output size
      canvas.width = size;
      canvas.height = Math.round(size * 1.21); // 140:170 aspect ratio

      // Calculate crop from the visible area
      const displayW = 280;
      const displayH = 340;
      const imgNatW = img.naturalWidth;
      const imgNatH = img.naturalHeight;

      // Image is scaled to cover the display area
      const coverScale = Math.max(displayW / imgNatW, displayH / imgNatH) * photoCropScale;
      const scaledW = imgNatW * coverScale;
      const scaledH = imgNatH * coverScale;

      // Offset from center
      const srcX = (scaledW - displayW) / 2 - photoCropOffset.x;
      const srcY = (scaledH - displayH) / 2 - photoCropOffset.y;

      // Map back to natural image coordinates
      const natSrcX = srcX / coverScale;
      const natSrcY = srcY / coverScale;
      const natSrcW = displayW / coverScale;
      const natSrcH = displayH / coverScale;

      ctx.drawImage(img, natSrcX, natSrcY, natSrcW, natSrcH, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9));
      const croppedFile = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });

      const fd = new FormData();
      fd.append("photo", croppedFile);
      const res = await fetch(`/api/patients/${id}/photo`, { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Upload failed"); }
      const data = await res.json();
      setPatient(p => p ? { ...p, photoUrl: data.photoUrl } : p);
      setShowPhotoModal(false);
      setPhotoFile(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
      showToast("Photo updated", "success");
    } catch (e) { showToast(e instanceof Error ? e.message : "Upload failed", "error"); }
    finally { setUploadingPhoto(false); }
  }

  async function removePhoto() {
    setConfirmDialog({
      open: true,
      title: "Remove Photo",
      message: "Remove this patient's photo? The default avatar will be shown instead.",
      confirmLabel: "Remove Photo",
      variant: "warning",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const r = await fetch(`/api/patients/${id}/photo`, { method: "DELETE" });
          if (r.ok) { setPatient(p => p ? { ...p, photoUrl: null } : p); showToast("Photo removed", "success"); }
        } catch { showToast("Failed to remove photo", "error"); }
        finally { setConfirmLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
      },
    });
  }

  function handleDelete() {
    setConfirmDialog({
      open: true,
      title: "Delete Patient",
      message: `This will permanently remove ${patient?.firstName} ${patient?.lastName} and all associated records. This action cannot be undone.`,
      confirmLabel: "Delete Patient",
      variant: "danger",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const r = await fetch(`/api/patients/${id}`, { method: "DELETE" });
          if (!r.ok) throw new Error();
          setConfirmDialog(prev => ({ ...prev, open: false }));
          router.push("/patients");
        } catch { showToast("Failed to delete", "error"); }
        finally { setConfirmLoading(false); }
      },
    });
  }

  // ═══════ PDF EXPORT HELPERS ═══════
  const pdfStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #292524; padding: 36px 40px; font-size: 13px; line-height: 1.55; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #2d6a4f; }
    .header h1 { font-size: 22px; color: #2d6a4f; margin-bottom: 2px; }
    .header .subtitle { font-size: 12px; color: #78716c; }
    .header .clinic { text-align: right; font-size: 11px; color: #78716c; line-height: 1.6; }
    .header .clinic strong { color: #2d6a4f; font-size: 13px; }
    .doc-type { display: inline-block; font-size: 9px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; padding: 3px 10px; border-radius: 3px; margin-bottom: 6px; }
    .doc-type-summary { background: #ecfdf5; color: #059669; }
    .doc-type-visit { background: #faf3e6; color: #8b6914; }
    .doc-type-billing { background: #f0f4ff; color: #3b5ea6; }
    h2 { font-size: 13px; color: #2d6a4f; border-bottom: 2px solid #d1f2e0; padding-bottom: 4px; margin: 22px 0 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 28px; margin-bottom: 8px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px 20px; margin-bottom: 8px; }
    .label { color: #78716c; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
    .value { font-weight: 600; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { text-align: left; font-size: 10px; color: #fff; background: #2d6a4f; padding: 6px 10px; text-transform: uppercase; letter-spacing: 0.3px; }
    th:first-child { border-radius: 4px 0 0 0; } th:last-child { border-radius: 0 4px 0 0; }
    td { font-size: 12px; border-bottom: 1px solid #f0eeec; padding: 7px 10px; }
    tr:nth-child(even) td { background: #fafaf9; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 100px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .badge-scheduled, .badge-active { background: #ecfdf5; color: #059669; }
    .badge-completed { background: #f0faf4; color: #2d6a4f; }
    .badge-cancelled { background: #fef2f2; color: #dc2626; }
    .badge-paid { background: #ecfdf5; color: #059669; }
    .badge-pending, .badge-partially_paid { background: #faf3e6; color: #8b6914; }
    .badge-draft { background: #f5f5f4; color: #78716c; }
    .note-card { background: #f8faf9; border-left: 3px solid #2d6a4f; padding: 10px 14px; margin: 8px 0; border-radius: 0 6px 6px 0; }
    .note-card .note-title { font-size: 12px; font-weight: 700; color: #292524; margin-bottom: 2px; }
    .note-card .note-meta { font-size: 10px; color: #78716c; margin-bottom: 4px; }
    .note-card .note-body { font-size: 12px; color: #44403c; white-space: pre-wrap; }
    .summary-box { background: #f0faf4; border: 1px solid #d1f2e0; border-radius: 6px; padding: 14px 18px; margin: 16px 0; }
    .summary-box .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
    .summary-box .row.total { font-size: 15px; font-weight: 700; color: #2d6a4f; border-top: 2px solid #2d6a4f; margin-top: 6px; padding-top: 8px; }
    .summary-box .row .lbl { color: #78716c; }
    .footer { margin-top: 32px; text-align: center; color: #a8a29e; font-size: 9px; border-top: 1px solid #e7e5e4; padding-top: 10px; }
    .page-break { page-break-before: always; }
    @media print { body { padding: 20px; } @page { margin: 12mm 15mm; } }
    .empty-msg { color: #a8a29e; font-style: italic; font-size: 12px; padding: 8px 0; }
  `;
  const pdfHeader = (docType: string, docTypeClass: string, title: string, subtitle: string) =>
    `<div class="header"><div><div class="doc-type ${docTypeClass}">${docType}</div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div><div class="clinic"><strong>Ayur Centre</strong><br/>Generated: ${new Date().toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div></div>`;
  const pdfFooter = `<div class="footer">Confidential Document &mdash; Generated from Yoda Clinic Management System &mdash; Not valid without authorized clinic stamp</div>`;
  const openPdfWindow = (title: string, body: string) => {
    const w = window.open("", "_blank");
    if (!w) { showToast("Popup blocked — please allow popups", "error"); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${pdfStyles}</style></head><body>${body}${pdfFooter}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  function handlePrintSummary() {
    if (!patient) return;
    const upcomingAppts = patient.appointments
      .filter(a => new Date(a.date) >= new Date() && a.status !== "cancelled")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
    const recentVitalsData = vitals.slice(0, 3);
    const allNotes = clinicalNotes.slice(0, 5);
    const medHist = patient.medicalHistory ? JSON.parse(patient.medicalHistory) : {};
    const medLabels: Record<string, string> = { diabetes: "Diabetes", hypertension: "Hypertension", heart_disease: "Heart Disease", asthma: "Asthma", thyroid: "Thyroid", arthritis: "Arthritis", skin_conditions: "Skin Conditions", digestive_issues: "Digestive Issues", neurological: "Neurological" };
    const activeConditions = Object.entries(medHist).filter(([, v]) => v).map(([k]) => medLabels[k] || k).join(", ");

    openPdfWindow(`Patient Summary — ${patient.firstName} ${patient.lastName}`,
      `${pdfHeader("Patient Summary", "doc-type-summary", `${patient.firstName} ${patient.lastName}`, `Patient ID: ${patient.patientIdNumber} &nbsp;·&nbsp; Status: ${patient.status.toUpperCase()}`)}
      <h2>Personal Information</h2>
      <div class="grid">
        <div><span class="label">Gender</span><br/><span class="value">${patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : "—"}</span></div>
        <div><span class="label">Date of Birth</span><br/><span class="value">${patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "—"}</span></div>
        <div><span class="label">Age</span><br/><span class="value">${calcAge(patient.dateOfBirth) || "—"}</span></div>
        <div><span class="label">Blood Group</span><br/><span class="value">${patient.bloodGroup || "—"}</span></div>
        <div><span class="label">Phone</span><br/><span class="value">${patient.phone}</span></div>
        <div><span class="label">Email</span><br/><span class="value">${patient.email || "—"}</span></div>
        <div><span class="label">Address</span><br/><span class="value">${[patient.address, patient.locality, patient.city, patient.state, patient.zipCode].filter(Boolean).join(", ") || "—"}</span></div>
        <div><span class="label">Nationality / Ethnicity</span><br/><span class="value">${[patient.nationality, patient.ethnicity].filter(Boolean).join(" / ") || "—"}</span></div>
      </div>
      <h2>Medical Profile</h2>
      <div class="grid">
        <div><span class="label">Allergies</span><br/><span class="value">${patient.allergies || "None recorded"}</span></div>
        <div><span class="label">Known Conditions</span><br/><span class="value">${activeConditions || "None recorded"}</span></div>
        <div><span class="label">Other History</span><br/><span class="value">${patient.otherHistory || "—"}</span></div>
        <div><span class="label">Emergency Contact</span><br/><span class="value">${patient.emergencyName ? patient.emergencyName + (patient.emergencyPhone ? " (" + patient.emergencyPhone + ")" : "") : "—"}</span></div>
      </div>
      ${recentVitalsData.length > 0 ? `<h2>Recent Vitals</h2><table><thead><tr><th>Date</th><th>BP</th><th>Pulse</th><th>Temp</th><th>SpO2</th><th>Weight</th><th>BMI</th></tr></thead><tbody>${recentVitalsData.map(v => `<tr><td>${formatDate(v.date)}</td><td>${v.bloodPressureSys && v.bloodPressureDia ? v.bloodPressureSys + "/" + v.bloodPressureDia : "—"}</td><td>${v.pulse || "—"}</td><td>${v.temperature ? v.temperature + "°C" : "—"}</td><td>${v.oxygenSaturation ? v.oxygenSaturation + "%" : "—"}</td><td>${v.weight ? v.weight + " kg" : "—"}</td><td>${v.bmi ? v.bmi.toFixed(1) : "—"}</td></tr>`).join("")}</tbody></table>` : ""}
      ${upcomingAppts.length > 0 ? `<h2>Upcoming Appointments</h2><table><thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Department</th><th>Reason</th></tr></thead><tbody>${upcomingAppts.map(a => `<tr><td>${formatDate(a.date)}</td><td>${a.time}</td><td>${a.doctor}</td><td>${a.department || "—"}</td><td>${a.reason || "—"}</td></tr>`).join("")}</tbody></table>` : ""}
      ${allNotes.length > 0 ? `<h2>Recent Clinical Notes</h2>${allNotes.map(n => `<div class="note-card"><div class="note-title">${n.title}</div><div class="note-meta">${n.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} ${n.doctor ? "· " + n.doctor : ""} · ${formatDate(n.createdAt)}</div><div class="note-body">${n.content.length > 300 ? n.content.slice(0, 300) + "..." : n.content}</div></div>`).join("") }` : ""}
      ${patient.medicalNotes ? `<h2>Patient Notes</h2><div class="note-card"><div class="note-body">${patient.medicalNotes}</div></div>` : ""}`
    );
  }

  function handlePrintVisitHistory() {
    if (!patient) return;
    const allAppts = [...patient.appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const allNotes = [...clinicalNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const allVitals = [...vitals].sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

    openPdfWindow(`Visit History — ${patient.firstName} ${patient.lastName}`,
      `${pdfHeader("Visit History", "doc-type-visit", `${patient.firstName} ${patient.lastName}`, `Patient ID: ${patient.patientIdNumber} &nbsp;·&nbsp; Total Visits: ${allAppts.length}`)}
      <h2>Appointment History (${allAppts.length})</h2>
      ${allAppts.length > 0 ? `<table><thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Department</th><th>Type / Reason</th><th>Status</th></tr></thead><tbody>${allAppts.map(a => `<tr><td>${formatDate(a.date)}</td><td>${a.time}</td><td>${a.doctor}</td><td>${a.department || "—"}</td><td>${a.reason || "—"}</td><td><span class="badge badge-${a.status}">${a.status}</span></td></tr>`).join("")}</tbody></table>` : `<p class="empty-msg">No appointments recorded.</p>`}
      ${allNotes.length > 0 ? `<h2>Clinical Notes (${allNotes.length})</h2>${allNotes.map(n => `<div class="note-card"><div class="note-title">${n.title}</div><div class="note-meta">${n.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} ${n.doctor ? "· " + n.doctor : ""} · ${formatDate(n.createdAt)}</div><div class="note-body">${n.content}</div></div>`).join("")}` : ""}
      ${allVitals.length > 0 ? `<h2>Vitals History (${allVitals.length})</h2><table><thead><tr><th>Date</th><th>BP (mmHg)</th><th>Pulse (bpm)</th><th>Temp (°C)</th><th>SpO2 (%)</th><th>Weight (kg)</th><th>Height (cm)</th><th>BMI</th><th>Resp Rate</th></tr></thead><tbody>${allVitals.map(v => `<tr><td>${formatDate(v.date || v.createdAt)}</td><td>${v.bloodPressureSys && v.bloodPressureDia ? v.bloodPressureSys + "/" + v.bloodPressureDia : "—"}</td><td>${v.pulse || "—"}</td><td>${v.temperature || "—"}</td><td>${v.oxygenSaturation || "—"}</td><td>${v.weight || "—"}</td><td>${v.height || "—"}</td><td>${v.bmi ? v.bmi.toFixed(1) : "—"}</td><td>${v.respiratoryRate || "—"}</td></tr>`).join("")}</tbody></table>` : ""}`
    );
  }

  async function handlePrintBillingStatement() {
    if (!patient) return;
    showToast("Generating billing statement...", "success");
    try {
      const r = await fetch(`/api/invoices?patientId=${id}`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      const invoices = (Array.isArray(data) ? data : data.invoices || []) as Array<{
        id: string; invoiceNumber: string; date: string; dueDate: string | null;
        subtotal: number; discountAmount: number; gstAmount: number; totalAmount: number;
        paidAmount: number; balanceAmount: number; status: string; paymentMethod: string | null;
        notes: string | null; items?: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
        payments?: Array<{ amount: number; method: string; date: string; receiptNumber?: string }>;
        _count?: { items: number };
      }>;
      const sorted = invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const totalBilled = sorted.reduce((s, i) => s + (i.totalAmount || 0), 0);
      const totalPaid = sorted.reduce((s, i) => s + (i.paidAmount || 0), 0);
      const totalBalance = sorted.reduce((s, i) => s + (i.balanceAmount || 0), 0);
      const fmt = (n: number) => `S$${n.toFixed(2)}`;

      openPdfWindow(`Billing Statement — ${patient.firstName} ${patient.lastName}`,
        `${pdfHeader("Billing Statement", "doc-type-billing", `${patient.firstName} ${patient.lastName}`, `Patient ID: ${patient.patientIdNumber} &nbsp;·&nbsp; Phone: ${patient.phone}`)}
        <div class="summary-box">
          <div class="row"><span class="lbl">Total Invoices</span><span>${sorted.length}</span></div>
          <div class="row"><span class="lbl">Total Billed</span><span>${fmt(totalBilled)}</span></div>
          <div class="row"><span class="lbl">Total Paid</span><span style="color:#059669">${fmt(totalPaid)}</span></div>
          <div class="row total"><span>Outstanding Balance</span><span>${fmt(totalBalance)}</span></div>
        </div>
        <h2>Invoice Details</h2>
        ${sorted.length > 0 ? `<table><thead><tr><th>Invoice #</th><th>Date</th><th>Subtotal</th><th>Discount</th><th>GST</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>${sorted.map(inv => `<tr><td style="font-weight:600">${inv.invoiceNumber}</td><td>${formatDate(inv.date)}</td><td>${fmt(inv.subtotal || 0)}</td><td>${inv.discountAmount ? fmt(inv.discountAmount) : "—"}</td><td>${inv.gstAmount ? fmt(inv.gstAmount) : "—"}</td><td style="font-weight:600">${fmt(inv.totalAmount || 0)}</td><td style="color:#059669">${fmt(inv.paidAmount || 0)}</td><td style="color:${(inv.balanceAmount || 0) > 0 ? "#dc2626" : "#059669"};font-weight:600">${fmt(inv.balanceAmount || 0)}</td><td><span class="badge badge-${inv.status}">${inv.status.replace(/_/g, " ")}</span></td></tr>`).join("")}</tbody></table>` : `<p class="empty-msg">No invoices found for this patient.</p>`}
        ${sorted.filter(i => i.payments && i.payments.length > 0).length > 0 ? `<h2>Payment History</h2><table><thead><tr><th>Invoice</th><th>Receipt #</th><th>Date</th><th>Amount</th><th>Method</th></tr></thead><tbody>${sorted.flatMap(inv => (inv.payments || []).map(p => `<tr><td>${inv.invoiceNumber}</td><td>${(p as {receiptNumber?: string}).receiptNumber || "—"}</td><td>${formatDate(p.date)}</td><td style="font-weight:600;color:#059669">${fmt(p.amount)}</td><td>${p.method ? p.method.charAt(0).toUpperCase() + p.method.slice(1).replace(/_/g, " ") : "—"}</td></tr>`)).join("")}</tbody></table>` : ""}`
      );
    } catch {
      showToast("Failed to load billing data", "error");
    }
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

  function deleteClinicalNote(noteId: string) {
    const note = clinicalNotes.find(n => n.id === noteId);
    setConfirmDialog({
      open: true,
      title: "Delete Clinical Note",
      message: `Remove "${note?.title || "this note"}"? This cannot be undone.`,
      confirmLabel: "Delete Note",
      variant: "danger",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const r = await fetch(`/api/clinical-notes/${noteId}`, { method: "DELETE" });
          if (r.ok) { setClinicalNotes(p => p.filter(n => n.id !== noteId)); showToast("Note deleted", "success"); }
        } catch { showToast("Failed to delete", "error"); }
        finally { setConfirmLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
      },
    });
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

  function deleteDocument(docId: string) {
    const doc = documents.find(d => d.id === docId);
    setConfirmDialog({
      open: true,
      title: "Delete Document",
      message: `Remove "${doc?.fileName || "this document"}"? The file will be permanently deleted.`,
      confirmLabel: "Delete Document",
      variant: "danger",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const r = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
          if (r.ok) { setDocuments(p => p.filter(d => d.id !== docId)); showToast("Document deleted", "success"); }
        } catch { showToast("Failed to delete", "error"); }
        finally { setConfirmLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
      },
    });
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
  if (!mounted || loading) return <DetailPageSkeleton />;

  /* Error */
  if (error) return (
    <div className="p-8 text-center py-24">
      <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--red-light)", borderRadius: "var(--radius-pill)" }}>
        <svg className="w-7 h-7" style={{ color: "var(--red)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
      </div>
      <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>{error}</p>
      <div className="flex justify-center gap-3 mt-4">
        <button onClick={fetchPatient} className="px-4 py-2 text-[15px] font-semibold text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>Try Again</button>
        <Link href="/patients" className="px-4 py-2 text-[15px] font-semibold" style={{ color: "#2d6a4f" }}>Back</Link>
      </div>
    </div>
  );

  if (!patient) return null;

  const sectionCounts: Record<string, number> = {
    appointments: patient.appointments.length, communications: patient.communications.length,
    clinical: clinicalNotes.length, documents: documents.length, packages: patientPackages.length,
    "treatment-plans": treatmentPlans.length, "completed-procedures": completedProcedures.length,
    invoices: patientInvoices.length, payments: patientPayments.length, prescriptions: prescriptions.length,
  };

  return (
    <div className="yoda-fade-in flex flex-col" style={{ minHeight: "100vh" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        loading={confirmLoading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => { setConfirmDialog(prev => ({ ...prev, open: false })); setConfirmLoading(false); }}
      />

      {/* ══════════ PATIENT HERO HEADER ══════════ */}
      <div className="flex-shrink-0 px-4 md:px-6 pt-4 pb-3" style={{ background: "var(--white)", borderBottom: "1px solid var(--grey-200)" }}>
        {/* Back + Actions row */}
        <div className="flex items-center justify-between mb-3">
          <Link href="/patients" className="inline-flex items-center gap-1 text-[14px] font-semibold hover:underline" style={{ color: "var(--grey-500)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Patients
          </Link>
          <div className="flex items-center gap-2 print:hidden">
            {!editing ? (
              <button onClick={startEdit} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>Edit
              </button>
            ) : (
              <>
                <button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: "var(--green)", borderRadius: "var(--radius-sm)" }}>{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-[13px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>Cancel</button>
              </>
            )}
            <div className="relative" ref={moreMenuRef}>
              <button onClick={() => setMoreMenuOpen(!moreMenuOpen)} className="inline-flex items-center px-2 py-1.5" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-600)" }} title="More actions">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
              {moreMenuOpen && (
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[180px] z-50" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)" }}>
                  {patient.email && (
                    <a href={`mailto:${patient.email}`} onClick={() => setMoreMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium hover:bg-gray-50 transition-colors" style={{ color: "var(--grey-700)" }}>
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      Send Email
                    </a>
                  )}
                  <button onClick={() => { handleShareWhatsApp(); setMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium hover:bg-gray-50 transition-colors text-left" style={{ color: "var(--grey-700)" }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                    Share via WhatsApp
                  </button>
                  <div style={{ height: 1, background: "var(--grey-200)", margin: "4px 0" }} />
                  <p className="px-3 pt-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-400)" }}>Export PDF</p>
                  <button onClick={() => { handlePrintSummary(); setMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium hover:bg-gray-50 transition-colors text-left" style={{ color: "var(--grey-700)" }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Patient Summary
                  </button>
                  <button onClick={() => { handlePrintVisitHistory(); setMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium hover:bg-gray-50 transition-colors text-left" style={{ color: "var(--grey-700)" }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Visit History
                  </button>
                  <button onClick={() => { handlePrintBillingStatement(); setMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium hover:bg-gray-50 transition-colors text-left" style={{ color: "var(--grey-700)" }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Billing Statement
                  </button>
                  <div style={{ height: 1, background: "var(--grey-200)", margin: "4px 0" }} />
                  <button onClick={() => { window.print(); setMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium hover:bg-gray-50 transition-colors text-left" style={{ color: "var(--grey-700)" }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Print Page
                  </button>
                  <div style={{ height: 1, background: "var(--grey-200)", margin: "4px 0" }} />
                  <button onClick={() => { handleDelete(); setMoreMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium hover:bg-red-50 transition-colors text-left" style={{ color: "var(--red)" }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete Patient
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Patient Identity Row */}
        <div className="flex items-center gap-4">
          {/* Photo */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center overflow-hidden relative group cursor-pointer"
            style={{ background: patient.photoUrl ? "transparent" : "linear-gradient(135deg, #f0faf4, #d1f2e0)", borderRadius: "var(--radius-pill)", border: patient.photoUrl ? "2px solid var(--grey-200)" : "2px solid #a7e3bd" }}
            onClick={() => { setPhotoFile(null); setPhotoPreview(null); setShowPhotoModal(true); }}>
            {patient.photoUrl ? (
              <img src={patient.photoUrl} alt={`${patient.firstName} ${patient.lastName}`} className="w-full h-full object-cover" style={{ borderRadius: "var(--radius-pill)" }} />
            ) : (
              <span className="text-[22px] sm:text-[26px] font-bold" style={{ color: "#2d6a4f" }}>{patient.firstName[0]}{patient.lastName[0]}</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.35)", borderRadius: "var(--radius-pill)" }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
          </div>

          {/* Name + Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] sm:text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>{patient.firstName} {patient.lastName}</h1>
              <button onClick={toggleStatus} disabled={togglingStatus}
                className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50 flex-shrink-0"
                style={{ borderRadius: "var(--radius-pill)", background: patient.status === "active" ? "var(--green-light)" : "var(--grey-200)", color: patient.status === "active" ? "var(--green)" : "var(--grey-600)", border: "none" }}>
                {togglingStatus ? "..." : patient.status}
              </button>
            </div>
            <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>
              {patient.patientIdNumber} &nbsp;&middot;&nbsp; {patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1)}{patient.dateOfBirth ? <> &middot; {calcAge(patient.dateOfBirth)}</> : ""}
              {patient.bloodGroup ? <> &middot; {patient.bloodGroup}</> : ""}
            </p>
            {/* Quick contact actions */}
            <div className="flex items-center gap-2 mt-2">
              <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold transition-colors hover:opacity-80" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius-pill)", color: "var(--grey-700)" }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                {patient.phone}
              </a>
              <a href={`https://wa.me/${(patient.whatsapp || patient.phone).replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold transition-colors hover:opacity-80" style={{ background: "#f0faf4", border: "1px solid #a7e3bd", borderRadius: "var(--radius-pill)", color: "#25d366" }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                WhatsApp
              </a>
              {patient.email && (
                <a href={`mailto:${patient.email}`} className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold transition-colors hover:opacity-80" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius-pill)", color: "var(--grey-600)" }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {patient.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ 3-COLUMN BODY ══════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── LEFT SIDEBAR ─── */}
        <aside className="hidden lg:flex lg:flex-col flex-shrink-0 overflow-y-auto" style={{ width: 210, background: "var(--white)", borderRight: "1px solid var(--grey-200)" }}>
          <nav className="py-3 flex-1">
            {["Patient", "EMR", "Billing"].map((group) => (
              <div key={group} className="mb-3">
                <p className="px-4 pt-2 pb-1.5 text-[12px] font-bold uppercase tracking-wider select-none" style={{ color: group === "Patient" ? "#b22222" : group === "EMR" ? "#2d6a4f" : "#8b6914", letterSpacing: "0.08em" }}>{group}</p>
                {sidebarNav.filter((n) => n.group === group).map((item) => {
                  const active = activeSection === item.key;
                  const count = sectionCounts[item.key] || 0;
                  return (
                    <button key={item.key} onClick={() => { setActiveSection(item.key); if (item.key !== "profile" && editing) setEditing(false); }}
                      className="w-full flex items-center gap-2 px-4 py-[8px] text-[12.5px] font-medium transition-all cursor-pointer"
                      style={{ background: active ? "#f0faf4" : "transparent", color: active ? "#2d6a4f" : "var(--grey-700)", borderLeft: active ? "3px solid #2d6a4f" : "3px solid transparent" }}>
                      <svg className="w-[15px] h-[15px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} /></svg>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {count > 0 && <span className="text-[12px] font-bold px-1.5 py-px" style={{ color: "var(--grey-500)", background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }}>{count}</span>}
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
              className="px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap flex-shrink-0"
              style={{ borderRadius: "var(--radius-pill)", background: activeSection === item.key ? "#2d6a4f" : "var(--white)", color: activeSection === item.key ? "#fff" : "var(--grey-600)", border: activeSection === item.key ? "none" : "1px solid var(--grey-300)" }}>
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
                <div className="mb-4 p-4" style={{ background: "#faf3e6", border: "1px solid #d4a84b", borderRadius: "var(--radius)" }}>
                  {pendingBalance.total > 0 && (
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" style={{ color: "#b68d40" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div>
                          <p className="text-[16px] font-bold" style={{ color: "#8b6914" }}>Pending Balance: {formatCurrency(pendingBalance.total)}</p>
                          <p className="text-[13px]" style={{ color: "#b68d40" }}>{pendingBalance.invoices.length} unpaid invoice{pendingBalance.invoices.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => sendPaymentReminder("whatsapp")}
                          disabled={sendingReminder}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[13px] font-semibold disabled:opacity-50"
                          style={{ background: "#25d366", color: "#fff", borderRadius: "var(--radius-sm)" }}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                          Send Reminder
                        </button>
                        {patient?.email && (
                          <button
                            onClick={() => sendPaymentReminder("email")}
                            disabled={sendingReminder}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[13px] font-semibold disabled:opacity-50"
                            style={{ background: "#2d6a4f", color: "#fff", borderRadius: "var(--radius-sm)" }}
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
                        <Link key={inv.id} href={`/billing/${inv.id}`} className="flex items-center justify-between px-3 py-1.5 text-[13px] rounded hover:bg-white/60 transition-colors" style={{ background: "rgba(255,255,255,0.3)" }}>
                          <span className="font-semibold" style={{ color: "#8b6914" }}>{inv.invoiceNumber}</span>
                          <span style={{ color: "#b68d40" }}>Total: {formatCurrency(inv.totalAmount)} &middot; Paid: {formatCurrency(inv.paidAmount)} &middot; <strong>Due: {formatCurrency(inv.balanceAmount)}</strong></span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {familyBalances.length > 0 && (
                    <div className={pendingBalance.total > 0 ? "mt-3 pt-3" : ""} style={pendingBalance.total > 0 ? { borderTop: "1px solid #ffcc80" } : {}}>
                      <p className="text-[13px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#b68d40" }}>Family Members with Pending Balance</p>
                      {familyBalances.map((fb) => (
                        <div key={fb.patientId} className="flex items-center justify-between px-3 py-1.5 text-[14px] rounded mb-1" style={{ background: "rgba(255,255,255,0.3)" }}>
                          <div>
                            <span className="font-semibold" style={{ color: "#8b6914" }}>{genderRelationLabel(fb.relation, null)}</span>
                            <span style={{ color: "#b68d40" }}> : </span>
                            <Link href={`/patients/${fb.patientId}`} className="font-medium hover:underline" style={{ color: "#8b6914" }}>{fb.name}</Link>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold" style={{ color: "#8b6914" }}>{formatCurrency(fb.balance)}</span>
                            <button
                              onClick={() => sendPaymentReminder("whatsapp", fb.patientId)}
                              disabled={sendingReminder}
                              className="px-1.5 py-0.5 text-[12px] font-semibold disabled:opacity-50"
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
                <div className="space-y-4">

                  {/* ── Quick Stats Row ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[22px] font-bold" style={{ color: "#2d6a4f" }}>{patient.appointments.length}</p>
                      <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>Visits</p>
                    </div>
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[22px] font-bold" style={{ color: "#2d6a4f" }}>{clinicalNotes.length}</p>
                      <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>Notes</p>
                    </div>
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[22px] font-bold" style={{ color: pendingBalance.total > 0 ? "#b68d40" : "#2d6a4f" }}>{pendingBalance.total > 0 ? formatCurrency(pendingBalance.total) : "S$0"}</p>
                      <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>Balance</p>
                    </div>
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[22px] font-bold" style={{ color: "#2d6a4f" }}>{patient.createdAt ? formatDate(patient.createdAt).split(" ").slice(0, 2).join(" ") : "—"}</p>
                      <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>Since</p>
                    </div>
                  </div>

                  {/* ── Personal Information Card ── */}
                  <div className="p-5" style={{ ...cardStyle }}>
                    <h4 className="text-[14px] font-bold uppercase tracking-wide mb-4 pb-2" style={{ color: "var(--grey-500)", borderBottom: "1px solid var(--grey-100)" }}>
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Personal Information
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      <div>
                        <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Full Name</p>
                        <p className="text-[15px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>{patient.firstName} {patient.lastName}</p>
                      </div>
                      <div>
                        <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Patient ID</p>
                        <p className="text-[15px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>{patient.patientIdNumber}</p>
                      </div>
                      {patient.nricId && (
                        <div>
                          <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>NRIC ID</p>
                          <p className="text-[15px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>{patient.nricId}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Gender</p>
                        <p className="text-[15px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>{patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1)}</p>
                      </div>
                      {patient.dateOfBirth && (
                        <div>
                          <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Date of Birth</p>
                          <p className="text-[15px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>{formatDate(patient.dateOfBirth)} ({calcAge(patient.dateOfBirth)})</p>
                        </div>
                      )}
                      {patient.bloodGroup && (
                        <div>
                          <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Blood Group</p>
                          <p className="text-[15px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5" style={{ background: "#fef2f2", color: "#dc2626", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: 700 }}>{patient.bloodGroup}</span>
                          </p>
                        </div>
                      )}
                      {patient.referredBy && (
                        <div>
                          <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Referred By</p>
                          <p className="text-[15px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>{patient.referredBy}</p>
                        </div>
                      )}
                      {patient.ethnicity && (
                        <div>
                          <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Ethnicity</p>
                          <p className="text-[15px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>{patient.ethnicity}</p>
                        </div>
                      )}
                      {patient.nationality && (
                        <div>
                          <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Nationality</p>
                          <p className="text-[15px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>{patient.nationality}</p>
                        </div>
                      )}
                      {patient.occupation && (
                        <div>
                          <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Occupation</p>
                          <p className="text-[15px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>{patient.occupation}</p>
                        </div>
                      )}
                    </div>

                    {/* Family Members */}
                    {(familyMembers.length > 0 || (patient.familyRelation && patient.familyMemberName)) && (
                      <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--grey-100)" }}>
                        <p className="text-[12px] font-medium uppercase tracking-wide mb-2" style={{ color: "var(--grey-400)" }}>Family</p>
                        <div className="flex flex-wrap gap-2">
                          {familyMembers.length > 0 ? familyMembers.map((fm) => (
                            <div key={fm.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px]" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius-pill)" }}>
                              <span className="font-medium" style={{ color: "var(--grey-500)" }}>{genderRelationLabel(fm.relation, fm.memberGender)}:</span>
                              {fm.linkedPatientId ? (
                                <Link href={`/patients/${fm.linkedPatientId}`} className="font-semibold hover:underline" style={{ color: "#2d6a4f" }}>{fm.memberName}</Link>
                              ) : (
                                <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{fm.memberName}</span>
                              )}
                            </div>
                          )) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px]" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius-pill)" }}>
                              <span className="font-medium" style={{ color: "var(--grey-500)" }}>{patient.familyRelation}:</span>
                              <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{patient.familyMemberName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Groups / Tags */}
                    {groups.length > 0 && (
                      <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--grey-100)" }}>
                        <p className="text-[12px] font-medium uppercase tracking-wide mb-2" style={{ color: "var(--grey-400)" }}>Groups</p>
                        <div className="flex flex-wrap gap-1.5">
                          {groups.map((g, i) => (
                            <span key={i} className="px-2.5 py-0.5 text-[12px] font-semibold" style={{ background: "#f0faf4", color: "#2d6a4f", borderRadius: "var(--radius-pill)" }}>{g}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Contact Details Card ── */}
                  <div className="p-5" style={{ ...cardStyle }}>
                    <h4 className="text-[14px] font-bold uppercase tracking-wide mb-4 pb-2" style={{ color: "var(--grey-500)", borderBottom: "1px solid var(--grey-100)" }}>
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        Contact Details
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      <div>
                        <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Mobile</p>
                        <a href={`tel:${patient.phone}`} className="text-[15px] font-semibold mt-0.5 hover:underline block" style={{ color: "#2d6a4f" }}>{patient.phone}</a>
                      </div>
                      {patient.secondaryMobile && (
                        <div>
                          <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Secondary Mobile</p>
                          <a href={`tel:${patient.secondaryMobile}`} className="text-[15px] font-semibold mt-0.5 hover:underline block" style={{ color: "#2d6a4f" }}>{patient.secondaryMobile}</a>
                        </div>
                      )}
                      {patient.landline && (
                        <div>
                          <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Landline</p>
                          <p className="text-[15px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>{patient.landline}</p>
                        </div>
                      )}
                      {patient.email && (
                        <div>
                          <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--grey-400)" }}>Email</p>
                          <a href={`mailto:${patient.email}`} className="text-[15px] font-semibold mt-0.5 hover:underline block" style={{ color: "#2d6a4f" }}>{patient.email}</a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Address Card ── */}
                  {(patient.address || patient.locality || patient.city || patient.state || patient.zipCode) && (
                    <div className="p-5" style={{ ...cardStyle }}>
                      <h4 className="text-[14px] font-bold uppercase tracking-wide mb-4 pb-2" style={{ color: "var(--grey-500)", borderBottom: "1px solid var(--grey-100)" }}>
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Address
                        </span>
                      </h4>
                      <p className="text-[15px] font-medium leading-relaxed" style={{ color: "var(--grey-800)" }}>
                        {[patient.address, patient.locality, patient.city, patient.state, patient.zipCode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Edit Mode */
                <div className="px-6 py-5" style={{ background: "var(--white)", borderRadius: "var(--radius)" }}>
                  <div className="mb-4 px-3 py-2 flex items-center gap-2 text-[14px] font-medium" style={{ background: "#f0faf4", color: "#2d6a4f", borderRadius: "var(--radius-sm)", border: "1px solid #a7e3bd" }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Editing — click Save Changes when done
                  </div>

                  <table className="w-full" style={{ borderCollapse: "collapse" }}><tbody>
                    <EditRow label="First Name *" name="firstName" value={editData.firstName} onChange={ec} />
                    <EditRow label="Last Name *" name="lastName" value={editData.lastName} onChange={ec} />
                    <EditRow label="NRIC ID" name="nricId" value={editData.nricId} onChange={ec} />
                    <tr>
                      <td className="py-[8px] pr-4 text-[15px] font-normal text-right align-middle" style={{ color: "var(--grey-600)", width: 180 }}>Gender :</td>
                      <td className="py-[8px] pl-2"><div className="flex gap-5">{["male", "female", "other"].map((g) => (
                        <label key={g} className="flex items-center gap-1.5 text-[15px] cursor-pointer" style={{ color: "var(--grey-800)" }}>
                          <input type="radio" checked={editData.gender === g} onChange={() => ec("gender", g)} /> {g.charAt(0).toUpperCase() + g.slice(1)}
                        </label>
                      ))}</div></td>
                    </tr>
                    <EditRow label="Date of Birth" name="dateOfBirth" value={editData.dateOfBirth} type="date" onChange={ec} />
                    <EditRow label="Blood Group" name="bloodGroup" value={editData.bloodGroup} onChange={ec} />
                    <EditRow label="Referred by" name="referredBy" value={editData.referredBy} onChange={ec} />
                    <tr>
                      <td className="py-[8px] pr-4 text-[15px] font-normal text-right whitespace-nowrap align-top" style={{ color: "var(--grey-600)", width: 180 }}>Family :</td>
                      <td className="py-[8px] pl-2">
                        {familyMembers.length > 0 && (
                          <div className="space-y-1.5 mb-3">
                            {familyMembers.map((fm) => (
                              <div key={fm.id} className="flex items-center gap-2 px-3 py-1.5 rounded text-[15px]" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)" }}>
                                {editingFamId === fm.id ? (
                                  <select value={editFamRelation} onChange={(e) => setEditFamRelation(e.target.value)} className="px-1.5 py-0.5 text-[14px]" style={inputStyle}>
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
                                  <Link href={`/patients/${fm.linkedPatientId}`} className="font-medium flex-1 hover:underline" style={{ color: "#2d6a4f" }}>{fm.memberName}</Link>
                                ) : (
                                  <span className="font-medium flex-1" style={{ color: "#2d6a4f" }}>{fm.memberName}</span>
                                )}
                                {fm.memberPhone && <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>{fm.memberPhone}</span>}
                                {editingFamId === fm.id ? (
                                  <div className="flex gap-1">
                                    <button type="button" onClick={() => updateFamilyRelation(fm.id, editFamRelation)} className="px-1.5 py-0.5 text-[13px] font-semibold text-white" style={{ background: "var(--green)", borderRadius: "var(--radius-sm)" }}>Save</button>
                                    <button type="button" onClick={() => setEditingFamId(null)} className="px-1.5 py-0.5 text-[13px] font-semibold" style={{ color: "var(--grey-500)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}>Cancel</button>
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
                          <select value={famRelation} onChange={(e) => { setFamRelation(e.target.value); setFamSearch(""); setFamResults([]); }} className="w-1/3 px-2 py-1.5 text-[15px]" style={inputStyle}>
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
                              className="w-full px-2.5 py-1.5 text-[15px]"
                              style={inputStyle}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFamilyManual(); } }}
                            />
                            {showFamDropdown && famRelation && famSearch.length >= 2 && (
                              <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                                {famSearchLoading ? (
                                  <div className="px-3 py-2 text-[14px]" style={{ color: "var(--grey-500)" }}>Searching...</div>
                                ) : famResults.length > 0 ? (
                                  famResults.map((p) => (
                                    <button key={p.id} type="button" onClick={() => addFamilyFromSearch(p)} className="w-full text-left px-3 py-2 hover:bg-green-50 transition-colors" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                                      <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{p.firstName} {p.lastName}</span>
                                      <span className="text-[13px] ml-2" style={{ color: "var(--grey-500)" }}>{p.patientIdNumber} · {p.phone}{p.gender ? ` · ${p.gender.charAt(0).toUpperCase() + p.gender.slice(1)}` : ""}</span>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-3 py-2">
                                    <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No patients found</p>
                                    <button type="button" onClick={addFamilyManual} className="text-[14px] font-semibold mt-1" style={{ color: "#2d6a4f" }}>+ Add &quot;{famSearch}&quot; manually</button>
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

                  <h4 className="text-[17px] font-semibold mt-6 mb-3 pt-4" style={{ color: "var(--grey-800)", borderTop: "1px solid var(--grey-200)" }}>Contact Details</h4>
                  <table className="w-full" style={{ borderCollapse: "collapse" }}><tbody>
                    <EditRow label="Mobile *" name="phone" value={editData.phone} type="tel" onChange={ec} />
                    <EditRow label="Secondary Mobile" name="secondaryMobile" value={editData.secondaryMobile} type="tel" onChange={ec} />
                    <EditRow label="Landline" name="landline" value={editData.landline} type="tel" onChange={ec} />
                    <EditRow label="Email Address" name="email" value={editData.email} type="email" onChange={ec} />
                  </tbody></table>

                  <h4 className="text-[17px] font-semibold mt-6 mb-3 pt-4" style={{ color: "var(--grey-800)", borderTop: "1px solid var(--grey-200)" }}>Address</h4>
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
                  <h3 className="text-[15px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--grey-600)" }}>Treatment Progress</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {treatmentPackages.map((pkg) => {
                      const pct = pkg.sessionsTotal > 0 ? Math.round((pkg.sessionsCompleted / pkg.sessionsTotal) * 100) : 0;
                      const onTrack = pct >= ((pkg.sessionsCompleted / Math.max(pkg.sessionsTotal, 1)) * 100) - 10;
                      const barColor = onTrack ? "var(--green)" : "#b68d40";
                      return (
                        <div key={pkg.packageId} className="p-4" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{pkg.treatmentName}</p>
                            <span className="text-[13px] font-bold" style={{ color: barColor }}>{pct}%</span>
                          </div>
                          <p className="text-[13px] mb-2" style={{ color: "var(--grey-500)" }}>{pkg.packageName} &middot; {pkg.sessionsCompleted} / {pkg.sessionsTotal} sessions</p>
                          <div style={{ height: 6, background: "var(--grey-100)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.3s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Header with Book button */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Appointments</h2>
                <button onClick={openBookingForm} className="px-3 py-1.5 text-[14px] font-semibold text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>+ Book Appointment</button>
              </div>

              {/* Booking Form */}
              {showBookingForm && (
                <div className="p-5 mb-4 yoda-slide-in" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <h3 className="text-[16px] font-semibold mb-4" style={{ color: "var(--grey-800)" }}>Book New Appointment</h3>
                  <div className="space-y-4">
                    {/* Doctor Picker */}
                    <div>
                      <label className="text-[14px] font-medium mb-1.5 block" style={{ color: "var(--grey-600)" }}>Doctor *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {doctors.length === 0 ? (
                          <p className="text-[14px] col-span-2" style={{ color: "var(--grey-400)" }}>Loading doctors...</p>
                        ) : doctors.map((doc) => (
                          <button key={doc.id} onClick={() => { setBookingDoctorId(doc.id); setBookingDoctor(doc.name); setBookingDept(doc.department || ""); if (bookingDate) fetchSlots(doc.id, bookingDate); }}
                            className="flex items-center gap-3 p-3 text-left transition-all"
                            style={{
                              borderRadius: "var(--radius-sm)",
                              border: bookingDoctorId === doc.id ? "2px solid #2d6a4f" : "1px solid var(--grey-200)",
                              background: bookingDoctorId === doc.id ? "#f0faf4" : "var(--white)",
                            }}>
                            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ background: bookingDoctorId === doc.id ? "#2d6a4f" : "var(--grey-100)", color: bookingDoctorId === doc.id ? "#fff" : "var(--grey-500)", borderRadius: "var(--radius-pill)", fontSize: "13px", fontWeight: 700 }}>
                              {doc.name.replace(/^Dr\.?\s*/i, "").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[15px] font-semibold truncate" style={{ color: bookingDoctorId === doc.id ? "#2d6a4f" : "var(--grey-900)" }}>{drName(doc.name)}</p>
                              {doc.specialization && <p className="text-[13px] truncate" style={{ color: "var(--grey-500)" }}>{doc.specialization}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Picker */}
                    <div>
                      <label className="text-[14px] font-medium mb-1.5 block" style={{ color: "var(--grey-600)" }}>Date *</label>
                      <input type="date" value={bookingDate} min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => { setBookingDate(e.target.value); if (bookingDoctorId) fetchSlots(bookingDoctorId, e.target.value); }}
                        className="w-full max-w-xs px-3 py-2 text-[15px]" style={inputStyle} />
                    </div>

                    {/* Time Slots */}
                    {bookingDoctorId && bookingDate && (
                      <div>
                        <label className="text-[14px] font-medium mb-1.5 block" style={{ color: "var(--grey-600)" }}>Time Slot *</label>
                        {slotsLoading ? (
                          <div className="flex items-center gap-2 py-3"><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#2d6a4f", borderTopColor: "transparent" }} /><span className="text-[14px]" style={{ color: "var(--grey-500)" }}>Loading slots...</span></div>
                        ) : bookingSlots.length === 0 ? (
                          <p className="text-[14px] py-2" style={{ color: "var(--grey-400)" }}>No slots available for this date. The doctor may not have a schedule set for this day.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto py-1">
                            {bookingSlots.map((slot) => (
                              <button key={slot.time} disabled={!slot.available} onClick={() => setBookingTime(slot.time)}
                                className="px-3 py-1.5 text-[14px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{
                                  borderRadius: "var(--radius-sm)",
                                  border: bookingTime === slot.time ? "2px solid #2d6a4f" : "1px solid var(--grey-200)",
                                  background: bookingTime === slot.time ? "#2d6a4f" : slot.available ? "var(--white)" : "var(--grey-50)",
                                  color: bookingTime === slot.time ? "#fff" : slot.available ? "var(--grey-800)" : "var(--grey-400)",
                                }}>
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        )}
                        {bookingSlots.length > 0 && (
                          <p className="text-[12px] mt-1" style={{ color: "var(--grey-400)" }}>
                            {bookingSlots.filter(s => s.available).length} of {bookingSlots.length} slots available
                          </p>
                        )}
                      </div>
                    )}

                    {/* Type & Reason */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[14px] font-medium mb-1.5 block" style={{ color: "var(--grey-600)" }}>Type</label>
                        <div className="flex flex-wrap gap-1.5">
                          {[{ v: "consultation", l: "Consultation" }, { v: "follow-up", l: "Follow-up" }, { v: "procedure", l: "Procedure" }, { v: "emergency", l: "Emergency" }].map((t) => (
                            <button key={t.v} onClick={() => setBookingType(t.v)} className="px-2.5 py-1 text-[13px] font-semibold transition-all"
                              style={{ borderRadius: "var(--radius-sm)", border: bookingType === t.v ? "2px solid #2d6a4f" : "1px solid var(--grey-200)", background: bookingType === t.v ? "#f0faf4" : "var(--white)", color: bookingType === t.v ? "#2d6a4f" : "var(--grey-600)" }}>{t.l}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[14px] font-medium mb-1.5 block" style={{ color: "var(--grey-600)" }}>Reason (optional)</label>
                        <input type="text" value={bookingReason} onChange={(e) => setBookingReason(e.target.value)} placeholder="e.g. Back pain, therapy session..." className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
                      </div>
                    </div>

                    {/* Summary & Submit */}
                    {bookingDoctorId && bookingDate && bookingTime && (
                      <div className="px-4 py-3 flex items-center gap-3" style={{ background: "#f0faf4", borderRadius: "var(--radius-sm)", border: "1px solid #a7e3bd" }}>
                        <svg className="w-5 h-5 flex-shrink-0" style={{ color: "#2d6a4f" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div className="text-[14px]" style={{ color: "#2d6a4f" }}>
                          <strong>{drName(bookingDoctor)}</strong> &middot; {new Date(bookingDate + "T00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} at <strong>{bookingTime}</strong>
                          {bookingReason && <span> &middot; {bookingReason}</span>}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button onClick={submitBooking} disabled={bookingSaving || !bookingDoctorId || !bookingDate || !bookingTime}
                        className="px-5 py-2 text-[14px] font-semibold text-white disabled:opacity-50" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>
                        {bookingSaving ? "Booking..." : "Confirm Booking"}
                      </button>
                      <button onClick={() => setShowBookingForm(false)} className="px-4 py-2 text-[14px] font-semibold" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Appointments List */}
              {patient.appointments.length === 0 && !showBookingForm ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>No appointments scheduled</p>
                  <p className="text-[13px] mt-1 mb-3" style={{ color: "var(--grey-400)" }}>Get started by booking this patient&apos;s first appointment</p>
                  <button onClick={openBookingForm} className="px-4 py-2 text-[14px] font-semibold text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>+ Book Appointment</button>
                </div>
              ) : patient.appointments.length > 0 && (
                <div className="space-y-2">{patient.appointments.map((a) => {
                  const apptDate = new Date(a.date);
                  const isUpcoming = apptDate >= new Date() && a.status === "scheduled";
                  return (
                    <div key={a.id} className="p-4 hover:shadow-sm transition-shadow" style={{ background: "var(--white)", border: isUpcoming ? "1px solid #a7e3bd" : "1px solid var(--grey-200)", borderRadius: "var(--radius)", borderLeft: isUpcoming ? "3px solid #2d6a4f" : undefined }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ background: isUpcoming ? "#f0faf4" : "var(--grey-50)", borderRadius: "var(--radius-pill)" }}>
                            <svg className="w-4 h-4" style={{ color: isUpcoming ? "#2d6a4f" : "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                          <div>
                            <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{drName(a.doctor)}</p>
                            {a.department && <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{a.department}</p>}
                          </div>
                        </div>
                        <span className="text-[12px] font-bold uppercase px-2 py-0.5" style={{
                          borderRadius: "var(--radius-sm)",
                          background: a.status === "scheduled" ? "#f0faf4" : a.status === "completed" ? "var(--green-light)" : a.status === "cancelled" ? "var(--red-light, #fef2f2)" : "var(--grey-100)",
                          color: a.status === "scheduled" ? "#2d6a4f" : a.status === "completed" ? "var(--green)" : a.status === "cancelled" ? "var(--red)" : "var(--grey-600)",
                        }}>{a.status}</span>
                      </div>
                      <div className="ml-12 mt-1">
                        <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>
                          {formatDate(a.date)} at <strong>{a.time}</strong>
                          {a.reason && <span className="ml-1" style={{ color: "var(--grey-400)" }}>&middot; {a.reason}</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}</div>
              )}
            </div>
          )}

          {/* ═══ PACKAGES ═══ */}
          {activeSection === "packages" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Treatment Packages</h2>
                <Link href={`/packages/new?patientId=${patient.id}&patientName=${encodeURIComponent(patient.firstName + " " + patient.lastName)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Buy Package
                </Link>
              </div>

              {packagesLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
              ) : patientPackages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
                    <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                  <p className="text-[15px] font-semibold" style={{ color: "var(--grey-600)" }}>No packages purchased yet</p>
                  <Link href={`/packages/new?patientId=${patient.id}`} className="text-[14px] font-semibold mt-1 inline-block hover:underline" style={{ color: "#2d6a4f" }}>Buy a package</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {patientPackages.map(pkg => {
                    const progressPercent = pkg.totalSessions > 0 ? Math.round((pkg.usedSessions / pkg.totalSessions) * 100) : 0;
                    const statusColors: Record<string, { bg: string; color: string }> = {
                      active: { bg: "#e8f5e9", color: "var(--green)" },
                      completed: { bg: "var(--grey-200)", color: "var(--grey-600)" },
                      expired: { bg: "#ffebee", color: "var(--red)" },
                      refunded: { bg: "#f3e5f5", color: "#7b1fa2" },
                      cancelled: { bg: "#ffebee", color: "var(--red)" },
                    };
                    const sColor = statusColors[pkg.status] || statusColors.active;
                    const isExpired = pkg.daysUntilExpiry <= 0;
                    const isExpiringSoon = pkg.daysUntilExpiry > 0 && pkg.daysUntilExpiry <= 30;

                    return (
                      <div key={pkg.id} style={cardStyle}>
                        {/* Package Header */}
                        <div className="px-4 py-3 flex items-start justify-between" style={{ borderBottom: "1px solid var(--grey-200)" }}>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link href={`/packages/${pkg.id}`} className="text-[16px] font-bold hover:underline" style={{ color: "#2d6a4f" }}>
                                {pkg.treatmentName}
                              </Link>
                              <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: sColor.bg, color: sColor.color }}>
                                {pkg.status}
                              </span>
                            </div>
                            <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>
                              {pkg.packageNumber} &middot; {pkg.packageName}
                            </p>
                          </div>
                          <Link href={`/packages/${pkg.id}`} className="text-[13px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>View Details</Link>
                        </div>

                        {/* Session Progress */}
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Sessions Used</span>
                            <span className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>{pkg.usedSessions} / {pkg.totalSessions}</span>
                          </div>
                          <div className="w-full h-2.5 overflow-hidden" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-pill)" }}>
                            <div style={{ width: `${progressPercent}%`, height: "100%", background: pkg.status === "completed" ? "var(--grey-500)" : "#2d6a4f", borderRadius: "var(--radius-pill)", transition: "width 0.3s ease" }} />
                          </div>
                          <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>
                            {pkg.remainingSessions} session{pkg.remainingSessions !== 1 ? "s" : ""} remaining
                          </p>
                        </div>

                        {/* Pricing & Expiry */}
                        <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ borderTop: "1px solid var(--grey-100)", background: "var(--grey-50)" }}>
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Package Price</p>
                            <p className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>S${pkg.totalPrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Paid</p>
                            <p className="text-[15px] font-bold" style={{ color: "var(--green)" }}>S${pkg.paidAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Balance</p>
                            <p className="text-[15px] font-bold" style={{ color: pkg.balanceAmount > 0 ? "#f57c00" : "var(--grey-600)" }}>
                              S${pkg.balanceAmount.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Expiry</p>
                            <p className="text-[14px] font-semibold" style={{ color: isExpired ? "var(--red)" : isExpiringSoon ? "#f57c00" : "var(--grey-700)" }}>
                              {new Date(pkg.expiryDate).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}
                              {isExpired && <span className="ml-1 text-[12px]">(Expired)</span>}
                              {isExpiringSoon && <span className="ml-1 text-[12px]">({pkg.daysUntilExpiry}d left)</span>}
                            </p>
                          </div>
                        </div>

                        {/* Recent Sessions */}
                        {pkg.sessions.length > 0 && (
                          <div className="px-4 py-2" style={{ borderTop: "1px solid var(--grey-100)" }}>
                            <p className="text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--grey-500)" }}>Recent Sessions</p>
                            <div className="space-y-1">
                              {pkg.sessions.slice(-3).map(s => (
                                <div key={s.id} className="flex items-center justify-between text-[13px]">
                                  <span style={{ color: "var(--grey-700)" }}>
                                    #{s.sessionNumber} &middot; {new Date(s.date).toLocaleDateString("en-SG", { day: "2-digit", month: "short" })}
                                    {s.doctorName && <span style={{ color: "var(--grey-500)" }}> &middot; {s.doctorName}</span>}
                                    {s.usedByName && <span style={{ color: "var(--blue-500)" }}> &middot; {s.usedByName}</span>}
                                  </span>
                                  <span className="px-1.5 py-px text-[9px] font-bold uppercase" style={{ borderRadius: "var(--radius-sm)", background: s.status === "completed" ? "#e8f5e9" : "#ffebee", color: s.status === "completed" ? "var(--green)" : "var(--red)" }}>
                                    {s.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sharing info */}
                        {pkg.shares.length > 0 && (
                          <div className="px-4 py-2" style={{ borderTop: "1px solid var(--grey-100)" }}>
                            <p className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--grey-500)" }}>Shared With</p>
                            <div className="flex flex-wrap gap-1.5">
                              {pkg.shares.filter(s => s.isActive).map(s => (
                                <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[12px] font-semibold" style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}>
                                  {s.sharedWithName} <span style={{ color: "var(--grey-500)" }}>({s.relation})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ COMMUNICATIONS ═══ */}
          {activeSection === "communications" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Communications</h2>
                <button onClick={() => setShowMsgForm(!showMsgForm)} className="px-3 py-1.5 text-[13px] font-semibold text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>+ New Message</button>
              </div>
              {showMsgForm && (
                <div className="p-4 mb-4 yoda-slide-in" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <div className="space-y-3">
                    <div className="flex gap-2">{(["whatsapp", "email"] as const).map((t) => (
                      <button key={t} onClick={() => setMsgType(t)} className="flex-1 px-3 py-2 text-[14px] font-semibold transition-all" style={{ borderRadius: "var(--radius-sm)", border: msgType === t ? `2px solid ${t === "whatsapp" ? "var(--green)" : "#2d6a4f"}` : "1px solid var(--grey-300)", background: msgType === t ? (t === "whatsapp" ? "var(--green-light)" : "#f0faf4") : "var(--white)", color: msgType === t ? (t === "whatsapp" ? "var(--green)" : "#2d6a4f") : "var(--grey-600)" }}>{t === "whatsapp" ? "WhatsApp" : "Email"}</button>
                    ))}</div>
                    {msgType === "email" && <input type="text" placeholder="Subject" value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} className="w-full px-3 py-2" style={inputStyle} />}
                    <textarea placeholder="Type your message..." value={msgBody} onChange={(e) => setMsgBody(e.target.value)} rows={3} className="w-full px-3 py-2" style={inputStyle} />
                    <div className="flex gap-2">
                      <button onClick={sendMessage} disabled={sending || !msgBody.trim()} className="text-white px-4 py-1.5 text-[14px] font-semibold disabled:opacity-50" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>{sending ? "Sending..." : "Send"}</button>
                      <button onClick={() => setShowMsgForm(false)} className="px-4 py-1.5 text-[14px] font-semibold" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
              {patient.communications.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>No messages sent yet</p>
                  <p className="text-[13px] mt-1" style={{ color: "var(--grey-400)" }}>Send a WhatsApp or email using &quot;+ New Message&quot; above</p>
                </div>
              ) : (
                <div className="space-y-2">{patient.communications.map((c) => (
                  <div key={c.id} className="p-4 hover:shadow-sm transition-shadow" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase" style={{ borderRadius: "var(--radius-sm)", background: c.type === "whatsapp" ? "var(--green-light)" : "#f0faf4", color: c.type === "whatsapp" ? "var(--green)" : "#2d6a4f" }}>{c.type}</span>
                        {c.subject && <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{c.subject}</span>}
                      </div>
                      <span className="text-[9px] font-bold uppercase" style={{ color: c.status === "sent" ? "var(--green)" : "var(--red)" }}>{c.status}</span>
                    </div>
                    <p className="text-[14px] line-clamp-2" style={{ color: "var(--grey-700)" }}>{c.message}</p>
                    <p className="text-[12px] mt-1" style={{ color: "var(--grey-400)" }}>{formatDate(c.sentAt)}</p>
                  </div>
                ))}</div>
              )}
            </div>
          )}

          {/* ═══ PRESCRIPTIONS ═══ */}
          {activeSection === "prescriptions" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[17px] font-semibold" style={{ color: "var(--grey-800)" }}>Prescriptions</h2>
                <button onClick={openRxForm} className="px-3 py-1.5 text-[14px] font-semibold text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>+ New Prescription</button>
              </div>

              {/* Prescription Form */}
              {showRxForm && (
                <div className="mb-6 p-5" style={cardStyle}>
                  <h3 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>New Prescription</h3>

                  {/* Doctor picker */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Prescribing Doctor *</label>
                      <div className="flex flex-wrap gap-1.5">
                        {doctors.map(doc => (
                          <button key={doc.id} onClick={() => { setRxDoctor(doc.name); setRxDoctorId(doc.id); }}
                            className="px-2.5 py-1 text-[13px] font-medium transition-all"
                            style={{
                              borderRadius: "var(--radius-sm)",
                              border: rxDoctorId === doc.id ? "2px solid #2d6a4f" : "1px solid var(--grey-200)",
                              background: rxDoctorId === doc.id ? "#f0faf4" : "var(--white)",
                              color: rxDoctorId === doc.id ? "#2d6a4f" : "var(--grey-700)",
                            }}>
                            {drName(doc.name)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Diagnosis</label>
                      <input value={rxDiagnosis} onChange={e => setRxDiagnosis(e.target.value)} placeholder="e.g. Lower back pain, Vata imbalance" className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
                    </div>
                  </div>

                  {/* Medicine items */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium" style={{ color: "var(--grey-600)" }}>Medicines *</label>
                    <div className="flex gap-1 flex-wrap">
                      {[
                        { value: "all", label: "All" },
                        { value: "Kashayam", label: "Kashayam" },
                        { value: "Thailam", label: "Thailam" },
                        { value: "Choornam", label: "Churnam" },
                        { value: "Classical Tablet", label: "Tablet" },
                        { value: "Arishtam", label: "Arishtam" },
                        { value: "Lehyam", label: "Lehyam" },
                        { value: "Ghritam", label: "Ghritam" },
                        { value: "Gulika", label: "Gulika" },
                        { value: "Oil & Tailam", label: "Oil" },
                      ].map(cat => (
                        <button key={cat.value} type="button" onClick={() => setRxMedCategory(cat.value)}
                          className="px-2 py-0.5 text-[11px] font-semibold transition-all"
                          style={{
                            borderRadius: "var(--radius-pill)",
                            border: rxMedCategory === cat.value ? "1.5px solid #2d6a4f" : "1px solid var(--grey-200)",
                            background: rxMedCategory === cat.value ? "#f0faf4" : "var(--white)",
                            color: rxMedCategory === cat.value ? "#2d6a4f" : "var(--grey-500)",
                          }}>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    {rxItems.map((item, idx) => (
                      <div key={idx} className="p-3 relative" style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-5 h-5 flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: "#2d6a4f", color: "#fff", borderRadius: "var(--radius-pill)" }}>{idx + 1}</span>
                          <div className="flex-1 relative">
                            <input value={item.medicineName} placeholder={rxMedCategory !== "all" ? `Search ${rxMedCategory}...` : "Medicine name..."}
                              onChange={e => { updateRxItem(idx, "medicineName", e.target.value); setActiveMedIdx(idx); searchMedicines(e.target.value, rxMedCategory); }}
                              onFocus={() => { setActiveMedIdx(idx); if (item.medicineName.length >= 1) searchMedicines(item.medicineName, rxMedCategory); }}
                              className="w-full px-3 py-1.5 text-[15px] font-semibold" style={inputStyle} />
                            {activeMedIdx === idx && medicineSuggestions.length > 0 && (
                              <div className="absolute left-0 top-full mt-1 w-full z-50 py-1 max-h-48 overflow-y-auto" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg)" }}>
                                {medicineSuggestions.map(s => (
                                  <button key={s.id} onClick={() => { updateRxItem(idx, "medicineName", s.name); updateRxItem(idx, "inventoryItemId" as keyof PrescriptionItem, s.id); setMedicineSuggestions([]); setActiveMedIdx(null); }}
                                    className="w-full text-left px-3 py-1.5 text-[14px] hover:bg-gray-50 transition-colors" style={{ color: "var(--grey-700)" }}>
                                    <span className="font-semibold">{s.name}</span>
                                    {s.packing && <span className="text-[12px] ml-1" style={{ color: "var(--grey-400)" }}>{s.packing}</span>}
                                    {s.subcategory && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: "#f0faf4", color: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>{s.subcategory}</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {rxItems.length > 1 && (
                            <button onClick={() => removeRxItem(idx)} className="p-1 hover:bg-red-50 rounded" style={{ color: "var(--red, #dc2626)" }} title="Remove">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          <div>
                            <label className="text-[9px] font-medium uppercase" style={{ color: "var(--grey-500)" }}>Dosage *</label>
                            <input value={item.dosage} onChange={e => updateRxItem(idx, "dosage", e.target.value)} placeholder="e.g. 10ml, 2 tabs" className="w-full px-2 py-1 text-[14px]" style={inputStyle} />
                          </div>
                          <div>
                            <label className="text-[9px] font-medium uppercase" style={{ color: "var(--grey-500)" }}>Frequency</label>
                            <select value={item.frequency} onChange={e => updateRxItem(idx, "frequency", e.target.value)} className="w-full px-2 py-1 text-[14px]" style={inputStyle}>
                              {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.short} — {f.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-medium uppercase" style={{ color: "var(--grey-500)" }}>Timing</label>
                            <select value={item.timing} onChange={e => updateRxItem(idx, "timing", e.target.value)} className="w-full px-2 py-1 text-[14px]" style={inputStyle}>
                              {TIMING_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-medium uppercase" style={{ color: "var(--grey-500)" }}>Duration *</label>
                            <input value={item.duration} onChange={e => updateRxItem(idx, "duration", e.target.value)} placeholder="e.g. 7 days" className="w-full px-2 py-1 text-[14px]" style={inputStyle} />
                          </div>
                          <div>
                            <label className="text-[9px] font-medium uppercase" style={{ color: "var(--grey-500)" }}>Qty</label>
                            <input type="number" value={item.quantity ?? ""} onChange={e => updateRxItem(idx, "quantity", e.target.value ? parseInt(e.target.value) : null)} placeholder="—" className="w-full px-2 py-1 text-[14px]" style={inputStyle} />
                          </div>
                        </div>
                        <div className="mt-2">
                          <input value={item.instructions} onChange={e => updateRxItem(idx, "instructions", e.target.value)} placeholder="Special instructions (optional)" className="w-full px-2 py-1 text-[13px]" style={{ ...inputStyle, border: "1px dashed var(--grey-300)" }} />
                        </div>
                      </div>
                    ))}
                    <button onClick={addRxItem} className="w-full py-2 text-[14px] font-medium border-2 border-dashed hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--grey-300)", color: "var(--grey-500)", borderRadius: "var(--radius-sm)" }}>+ Add Medicine</button>
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Additional Notes</label>
                    <textarea value={rxNotes} onChange={e => setRxNotes(e.target.value)} rows={2} placeholder="Dietary advice, lifestyle recommendations..." className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button onClick={saveRx} disabled={rxSaving} className="px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>
                      {rxSaving ? "Saving..." : "Save Prescription"}
                    </button>
                    <button onClick={() => setShowRxForm(false)} className="px-4 py-2 text-[14px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Prescription List */}
              {prescriptionsLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#2d6a4f", borderTopColor: "transparent" }} /><span className="text-[14px]" style={{ color: "var(--grey-500)" }}>Loading prescriptions...</span></div>
              ) : prescriptions.length === 0 && !showRxForm ? (
                <div className="py-12 text-center" style={cardStyle}>
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  <p className="text-[15px] font-medium mb-1" style={{ color: "var(--grey-500)" }}>No prescriptions yet</p>
                  <p className="text-[13px] mb-4" style={{ color: "var(--grey-400)" }}>Create a prescription with medicines, dosage, and frequency for this patient.</p>
                  <button onClick={openRxForm} className="px-3 py-1.5 text-[14px] font-semibold text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>+ New Prescription</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map(rx => (
                    <div key={rx.id} className="overflow-hidden" style={cardStyle}>
                      {/* Prescription header */}
                      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--grey-200)", background: rx.status === "active" ? "#f8fdf9" : "var(--grey-50)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 flex items-center justify-center" style={{ background: rx.status === "active" ? "#ecfdf5" : "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
                            <svg className="w-4 h-4" style={{ color: rx.status === "active" ? "#059669" : "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                          </div>
                          <div>
                            <p className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>{rx.prescriptionNo}</p>
                            <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{drName(rx.doctorName)} &middot; {formatDate(rx.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5" style={{
                            borderRadius: "var(--radius-sm)",
                            background: rx.status === "active" ? "#ecfdf5" : rx.status === "completed" ? "#f0faf4" : "#fef2f2",
                            color: rx.status === "active" ? "#059669" : rx.status === "completed" ? "#2d6a4f" : "#dc2626",
                          }}>{rx.status}</span>
                          <button onClick={() => shareRxWhatsApp(rx)} className="p-1.5 hover:bg-green-50 rounded transition-colors" style={{ color: "#25D366" }} title="Share via WhatsApp">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </button>
                          <button onClick={() => printPrescription(rx)} className="p-1.5 hover:bg-gray-100 rounded transition-colors" style={{ color: "var(--grey-500)" }} title="Print">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          </button>
                          {rx.status === "active" && (
                            <button onClick={() => convertRxToInvoice(rx)} disabled={convertingRx === rx.id}
                              className="p-1.5 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50" style={{ color: "var(--blue-500)" }} title="Convert to Invoice">
                              {convertingRx === rx.id ? (
                                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--blue-500)", borderTopColor: "transparent" }} />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                              )}
                            </button>
                          )}
                          <button onClick={() => deleteRx(rx.id, rx.prescriptionNo)} className="p-1.5 hover:bg-red-50 rounded transition-colors" style={{ color: "var(--grey-400)" }} title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                      {/* Diagnosis */}
                      {rx.diagnosis && (
                        <div className="px-4 py-2" style={{ background: "#faf3e6", borderBottom: "1px solid #f0e6cc" }}>
                          <span className="text-[9px] font-bold uppercase" style={{ color: "#8b6914" }}>Diagnosis: </span>
                          <span className="text-[14px] font-semibold" style={{ color: "#5c4813" }}>{rx.diagnosis}</span>
                        </div>
                      )}
                      {/* Medicine table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-[14px]">
                          <thead>
                            <tr style={{ background: "var(--grey-50)" }}>
                              <th className="text-left px-4 py-2 text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>#</th>
                              <th className="text-left px-4 py-2 text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Medicine</th>
                              <th className="text-left px-4 py-2 text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Dosage</th>
                              <th className="text-left px-4 py-2 text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Frequency</th>
                              <th className="text-left px-4 py-2 text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Timing</th>
                              <th className="text-left px-4 py-2 text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rx.items.map((item, i) => (
                              <tr key={item.id} style={{ borderBottom: "1px solid var(--grey-100)" }}>
                                <td className="px-4 py-2 font-medium" style={{ color: "var(--grey-400)" }}>{i + 1}</td>
                                <td className="px-4 py-2">
                                  <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{item.medicineName}</span>
                                  {item.instructions && <p className="text-[12px] mt-0.5" style={{ color: "var(--grey-400)" }}>{item.instructions}</p>}
                                </td>
                                <td className="px-4 py-2 font-medium" style={{ color: "var(--grey-700)" }}>{item.dosage}</td>
                                <td className="px-4 py-2">
                                  <span className="px-1.5 py-0.5 text-[12px] font-bold" style={{ background: "#f0faf4", color: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>{freqShort(item.frequency)}</span>
                                  <span className="ml-1 text-[12px]" style={{ color: "var(--grey-400)" }}>{freqLabel(item.frequency)}</span>
                                </td>
                                <td className="px-4 py-2 text-[13px]" style={{ color: "var(--grey-600)" }}>{timingLabel(item.timing)}</td>
                                <td className="px-4 py-2 font-medium" style={{ color: "var(--grey-700)" }}>{item.duration}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Notes */}
                      {rx.notes && (
                        <div className="px-4 py-2.5" style={{ background: "var(--grey-50)", borderTop: "1px solid var(--grey-200)" }}>
                          <p className="text-[13px]" style={{ color: "var(--grey-500)" }}><strong>Notes:</strong> {rx.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ CLINICAL NOTES ═══ */}
          {activeSection === "clinical" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[17px] font-semibold" style={{ color: "var(--grey-800)" }}>Clinical Notes</h2>
                <button onClick={() => { setShowNoteForm(true); setEditingNoteId(null); setNoteTitle(""); setNoteContent(""); setNoteDoctor(""); setNoteType("present_illness"); }}
                  className="px-3 py-1.5 text-[14px] font-semibold text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>+ Add Note</button>
              </div>

              {/* Filter tabs */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                <button onClick={() => setNoteFilter("all")} className="px-3 py-1 text-[13px] font-semibold"
                  style={{ borderRadius: "var(--radius-pill)", background: noteFilter === "all" ? "#2d6a4f" : "var(--white)", color: noteFilter === "all" ? "#fff" : "var(--grey-600)", border: noteFilter === "all" ? "none" : "1px solid var(--grey-300)" }}>All</button>
                {NOTE_TYPES.map(t => (
                  <button key={t.value} onClick={() => setNoteFilter(t.value)} className="px-3 py-1 text-[13px] font-semibold"
                    style={{ borderRadius: "var(--radius-pill)", background: noteFilter === t.value ? "#2d6a4f" : "var(--white)", color: noteFilter === t.value ? "#fff" : "var(--grey-600)", border: noteFilter === t.value ? "none" : "1px solid var(--grey-300)" }}>{t.label}</button>
                ))}
              </div>

              {/* Note Form */}
              {showNoteForm && (
                <div className="p-5 mb-4 yoda-slide-in" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <h3 className="text-[16px] font-semibold mb-4" style={{ color: "var(--grey-800)" }}>{editingNoteId ? "Edit Clinical Note" : "New Clinical Note"}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[14px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Note Type</label>
                      <div className="flex flex-wrap gap-1.5">
                        {NOTE_TYPES.map(t => (
                          <button key={t.value} onClick={() => setNoteType(t.value)} className="px-3 py-1.5 text-[13px] font-semibold transition-all"
                            style={{ borderRadius: "var(--radius-sm)", border: noteType === t.value ? "2px solid #2d6a4f" : "1px solid var(--grey-300)", background: noteType === t.value ? "#f0faf4" : "var(--white)", color: noteType === t.value ? "#2d6a4f" : "var(--grey-600)" }}>{t.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[14px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Title *</label>
                      <input type="text" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="e.g. Chief complaint, Follow-up assessment..." className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[14px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Content *</label>
                      <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Enter clinical details..." rows={5} className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[14px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Doctor / Clinician</label>
                      <input type="text" value={noteDoctor} onChange={e => setNoteDoctor(e.target.value)} placeholder="Dr. Name" className="w-full max-w-xs px-3 py-2 text-[15px]" style={inputStyle} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveClinicalNote} disabled={savingNote} className="px-4 py-1.5 text-[14px] font-semibold text-white disabled:opacity-50" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>{savingNote ? "Saving..." : editingNoteId ? "Update Note" : "Save Note"}</button>
                      <button onClick={() => { setShowNoteForm(false); setEditingNoteId(null); }} className="px-4 py-1.5 text-[14px] font-semibold" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes List */}
              {clinicalNotes.filter(n => noteFilter === "all" || n.type === noteFilter).length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>No clinical notes yet</p>
                  <p className="text-[13px] mt-1" style={{ color: "var(--grey-400)" }}>Click &quot;+ Add Note&quot; to record present illness, past history, and more</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clinicalNotes.filter(n => noteFilter === "all" || n.type === noteFilter).map(note => {
                    const typeLabel = NOTE_TYPES.find(t => t.value === note.type)?.label || note.type;
                    const typeColors: Record<string, { bg: string; color: string }> = {
                      present_illness: { bg: "var(--red-light)", color: "var(--red)" },
                      past_history: { bg: "var(--orange-light)", color: "var(--orange)" },
                      personal_history: { bg: "#faf3e6", color: "#b68d40" },
                      examination: { bg: "#f0faf4", color: "#2d6a4f" },
                      diagnosis: { bg: "var(--green-light)", color: "var(--green)" },
                      treatment: { bg: "#f0faf4", color: "#14532d" },
                      general: { bg: "var(--grey-100)", color: "var(--grey-700)" },
                    };
                    const tc = typeColors[note.type] || typeColors.general;
                    return (
                      <div key={note.id} className="p-4" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 text-[12px] font-bold uppercase" style={{ borderRadius: "var(--radius-sm)", background: tc.bg, color: tc.color }}>{typeLabel}</span>
                            <h4 className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{note.title}</h4>
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
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--grey-700)" }}>{note.content}</p>
                        <div className="flex items-center gap-3 mt-3 pt-2" style={{ borderTop: "1px solid var(--grey-100)" }}>
                          {note.doctor && <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>By: <strong>{note.doctor}</strong></span>}
                          <span className="text-[13px]" style={{ color: "var(--grey-400)" }}>{formatDate(note.createdAt)}</span>
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
                <h2 className="text-[17px] font-semibold" style={{ color: "var(--grey-800)" }}>Documents & Reports</h2>
                <button onClick={() => { setShowUploadForm(true); setSelectedFile(null); setUploadDesc(""); setUploadCategory("report"); }}
                  className="px-3 py-1.5 text-[14px] font-semibold text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>+ Upload Document</button>
              </div>

              {/* Upload Form with Drag & Drop */}
              {showUploadForm && (
                <div className="p-5 mb-4 yoda-slide-in" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <h3 className="text-[16px] font-semibold mb-4" style={{ color: "var(--grey-800)" }}>Upload Document</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[14px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Category</label>
                      <div className="flex flex-wrap gap-1.5">
                        {DOC_CATEGORIES.map(c => (
                          <button key={c.value} onClick={() => setUploadCategory(c.value)} className="px-3 py-1.5 text-[13px] font-semibold transition-all"
                            style={{ borderRadius: "var(--radius-sm)", border: uploadCategory === c.value ? "2px solid #2d6a4f" : "1px solid var(--grey-300)", background: uploadCategory === c.value ? "#f0faf4" : "var(--white)", color: uploadCategory === c.value ? "#2d6a4f" : "var(--grey-600)" }}>{c.label}</button>
                        ))}
                      </div>
                    </div>
                    {/* Drag & Drop Zone */}
                    <div>
                      <label className="text-[14px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>File * (max 10MB)</label>
                      <div
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                        onDrop={(e) => {
                          e.preventDefault(); e.stopPropagation(); setDragActive(false);
                          const f = e.dataTransfer.files?.[0];
                          if (f) setSelectedFile(f);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className="relative cursor-pointer transition-all"
                        style={{
                          border: dragActive ? "2px dashed #2d6a4f" : selectedFile ? "2px solid #2d6a4f" : "2px dashed var(--grey-300)",
                          borderRadius: "var(--radius)",
                          background: dragActive ? "#f0faf4" : selectedFile ? "#f8fdf9" : "var(--grey-50)",
                          padding: selectedFile ? "12px 16px" : "24px 16px",
                          textAlign: "center",
                        }}
                      >
                        <input ref={fileInputRef} type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.xls,.xlsx,.csv,.txt,.rtf,.dicom,.dcm" />
                        {selectedFile ? (
                          <div className="flex items-center gap-3">
                            {/* File preview thumbnail */}
                            {selectedFile.type.startsWith("image/") ? (
                              <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden" style={{ border: "1px solid var(--grey-200)" }}>
                                <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{ background: "#f0faf4", borderRadius: "var(--radius-sm)" }}>
                                <span className="text-[12px] font-bold uppercase" style={{ color: "#2d6a4f" }}>
                                  {selectedFile.name.split(".").pop()?.toUpperCase() || "FILE"}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-[15px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>{selectedFile.name}</p>
                              <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{formatFileSize(selectedFile.size)}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="p-1 hover:bg-gray-100 rounded flex-shrink-0" style={{ color: "var(--grey-400)" }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <svg className="w-8 h-8 mx-auto mb-2" style={{ color: dragActive ? "#2d6a4f" : "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-[15px] font-medium" style={{ color: dragActive ? "#2d6a4f" : "var(--grey-600)" }}>
                              {dragActive ? "Drop file here" : "Drag & drop a file here"}
                            </p>
                            <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-400)" }}>or click to browse</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-[14px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Description (optional)</label>
                      <input type="text" value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} placeholder="e.g. Blood test results, CT scan report..." className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={uploadDocument} disabled={uploading || !selectedFile} className="px-4 py-1.5 text-[14px] font-semibold text-white disabled:opacity-50" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>{uploading ? "Uploading..." : "Upload"}</button>
                      <button onClick={() => setShowUploadForm(false)} className="px-4 py-1.5 text-[14px] font-semibold" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Grid */}
              {documents.length === 0 ? (
                <div className="py-16 text-center"
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); if (!showUploadForm) setShowUploadForm(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDrop={(e) => {
                    e.preventDefault(); setDragActive(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) { setSelectedFile(f); setShowUploadForm(true); }
                  }}
                >
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>No documents uploaded</p>
                  <p className="text-[13px] mt-1" style={{ color: "var(--grey-400)" }}>Drag & drop files here, or click &quot;+ Upload Document&quot;</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {documents.map(doc => {
                    const catLabel = DOC_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category;
                    const catColors: Record<string, { bg: string; color: string }> = {
                      report: { bg: "#f0faf4", color: "#2d6a4f" },
                      lab: { bg: "var(--green-light)", color: "var(--green)" },
                      imaging: { bg: "#faf3e6", color: "#b68d40" },
                      prescription: { bg: "var(--orange-light)", color: "var(--orange)" },
                      other: { bg: "var(--grey-100)", color: "var(--grey-700)" },
                    };
                    const cc = catColors[doc.category] || catColors.other;
                    const isImage = doc.fileType.startsWith("image/");
                    const isPdf = doc.fileType === "application/pdf";
                    return (
                      <div key={doc.id} className="group overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                        style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}
                        onClick={() => setViewingDoc(doc)}>
                        {/* Thumbnail / Preview */}
                        {isImage ? (
                          <div className="w-full h-36 overflow-hidden" style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
                            <img src={doc.filePath} alt={doc.fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                          </div>
                        ) : (
                          <div className="w-full h-36 flex flex-col items-center justify-center" style={{ background: cc.bg, borderBottom: "1px solid var(--grey-200)" }}>
                            {isPdf ? (
                              <>
                                <svg className="w-10 h-10 mb-1" style={{ color: cc.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                <span className="text-[13px] font-bold uppercase" style={{ color: cc.color }}>PDF</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-10 h-10 mb-1" style={{ color: cc.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <span className="text-[13px] font-bold uppercase" style={{ color: cc.color }}>{doc.fileName.split(".").pop()}</span>
                              </>
                            )}
                          </div>
                        )}
                        {/* Info row */}
                        <div className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-1.5 py-px text-[8px] font-bold uppercase flex-shrink-0" style={{ borderRadius: "var(--radius-sm)", background: cc.bg, color: cc.color }}>{catLabel}</span>
                            <p className="text-[14px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>{doc.fileName}</p>
                          </div>
                          {doc.description && <p className="text-[13px] truncate mb-0.5" style={{ color: "var(--grey-500)" }}>{doc.description}</p>}
                          <div className="flex items-center justify-between">
                            <p className="text-[12px]" style={{ color: "var(--grey-400)" }}>{formatFileSize(doc.fileSize)} · {formatDate(doc.uploadedAt)}</p>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a href={doc.filePath} download onClick={(e) => e.stopPropagation()} className="p-1 hover:bg-gray-100 rounded" style={{ color: "#2d6a4f" }} title="Download">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              </a>
                              <button onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }} className="p-1 hover:bg-gray-100 rounded" style={{ color: "var(--red)" }} title="Delete">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Document Viewer Modal */}
              {viewingDoc && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}
                  onClick={() => setViewingDoc(null)}>
                  <div className="relative w-full max-w-3xl mx-4" style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
                    {/* Modal header */}
                    <div className="flex items-center justify-between px-5 py-3" style={{ background: "var(--white)", borderRadius: "var(--radius) var(--radius) 0 0", borderBottom: "1px solid var(--grey-200)" }}>
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-[16px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>{viewingDoc.fileName}</p>
                        <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                          {DOC_CATEGORIES.find(c => c.value === viewingDoc.category)?.label || viewingDoc.category} · {formatFileSize(viewingDoc.fileSize)} · {formatDate(viewingDoc.uploadedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={viewingDoc.filePath} download className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold" style={{ background: "#2d6a4f", color: "#fff", borderRadius: "var(--radius-sm)" }}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download
                        </a>
                        <button onClick={() => setViewingDoc(null)} className="p-1.5 hover:bg-gray-100 rounded" style={{ color: "var(--grey-500)" }}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                    {/* Modal content */}
                    <div style={{ background: "var(--grey-100)", borderRadius: "0 0 var(--radius) var(--radius)", overflow: "hidden", maxHeight: "calc(90vh - 60px)" }}>
                      {viewingDoc.fileType.startsWith("image/") ? (
                        <div className="flex items-center justify-center p-4" style={{ maxHeight: "calc(90vh - 60px)", overflow: "auto" }}>
                          <img src={viewingDoc.filePath} alt={viewingDoc.fileName} className="max-w-full max-h-[75vh] object-contain" style={{ borderRadius: "var(--radius-sm)" }} />
                        </div>
                      ) : viewingDoc.fileType === "application/pdf" ? (
                        <iframe src={viewingDoc.filePath} className="w-full" style={{ height: "calc(90vh - 60px)", border: "none" }} title={viewingDoc.fileName} />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-8">
                          <svg className="w-16 h-16 mb-4" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <p className="text-[16px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Preview not available</p>
                          <p className="text-[14px] mb-4" style={{ color: "var(--grey-500)" }}>This file type can&apos;t be previewed in the browser</p>
                          <a href={viewingDoc.filePath} download className="inline-flex items-center gap-2 px-5 py-2.5 text-[15px] font-semibold" style={{ background: "#2d6a4f", color: "#fff", borderRadius: "var(--radius-sm)" }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download File
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ EMERGENCY ═══ */}
          {activeSection === "emergency" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Emergency Contact</h2>
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
                  <p className="text-[15px] text-center py-8" style={{ color: "var(--grey-400)" }}>No emergency contact added</p>
                )}
              </div>
            </div>
          )}

          {/* ═══ ALLERGIES & NOTES ═══ */}
          {activeSection === "allergies" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Allergies & Medical Notes</h2>
              </div>
              <div className="space-y-4">
                <div className="p-5" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <h3 className="text-[15px] font-bold mb-2" style={{ color: "var(--grey-800)" }}>Allergies</h3>
                  {editing ? <textarea value={editData.allergies} onChange={(e) => ec("allergies", e.target.value)} rows={3} className="w-full px-3 py-2" style={inputStyle} />
                    : <p className="text-[15px]" style={{ color: patient.allergies ? "var(--red)" : "var(--grey-400)" }}>{patient.allergies || "None reported"}</p>}
                </div>
                <div className="p-5" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <h3 className="text-[15px] font-bold mb-2" style={{ color: "var(--grey-800)" }}>Other History</h3>
                  {editing ? <textarea value={editData.otherHistory} onChange={(e) => ec("otherHistory", e.target.value)} rows={3} className="w-full px-3 py-2" style={inputStyle} />
                    : <p className="text-[15px]" style={{ color: patient.otherHistory ? "var(--grey-700)" : "var(--grey-400)" }}>{patient.otherHistory || "None"}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ═══ TIMELINE ═══ */}
          {activeSection === "timeline" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Medical History Timeline</h2>
              </div>

              {/* Filter checkboxes */}
              <div className="flex flex-wrap gap-3 mb-5 p-3" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                <span className="text-[13px] font-bold uppercase tracking-wide self-center" style={{ color: "var(--grey-500)" }}>Filter:</span>
                {([
                  { key: "appointment", label: "Appointments", color: "#b68d40" },
                  { key: "note", label: "Notes", color: "#2d6a4f" },
                  { key: "document", label: "Documents", color: "#37845e" },
                  { key: "communication", label: "Communications", color: "#059669" },
                  { key: "vital", label: "Vitals", color: "#059669" },
                  { key: "invoice", label: "Invoices", color: "#37845e" },
                ] as const).map((f) => (
                  <label key={f.key} className="flex items-center gap-1.5 text-[14px] cursor-pointer" style={{ color: "var(--grey-700)" }}>
                    <input type="checkbox" checked={timelineFilters[f.key]} onChange={() => setTimelineFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))} className="w-3.5 h-3.5" />
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
                    {f.label}
                  </label>
                ))}
              </div>

              {timelineLoading ? (
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#2d6a4f", borderTopColor: "transparent" }} /></div>
              ) : timelineEvents.filter(e => timelineFilters[e.type] !== false).length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>No timeline events yet</p>
                  <p className="text-[13px] mt-1" style={{ color: "var(--grey-400)" }}>Activity will appear here as appointments, notes, and documents are added</p>
                </div>
              ) : (
                <div className="relative" style={{ paddingLeft: 140 }}>
                  {/* Vertical line */}
                  <div className="absolute" style={{ left: 136, top: 8, bottom: 8, width: 2, background: "var(--grey-300)" }} />

                  {timelineEvents.filter(e => timelineFilters[e.type] !== false).map((event, idx) => {
                    const typeColors: Record<string, string> = { appointment: "#b68d40", note: "#2d6a4f", document: "#37845e", communication: "#059669", vital: "#059669", invoice: "#37845e" };
                    const typeBgColors: Record<string, string> = { appointment: "#faf3e6", note: "#f0faf4", document: "#e8f5e9", communication: "#ecfdf5", vital: "#ecfdf5", invoice: "#f0faf4" };
                    const dotColor = typeColors[event.type] || "var(--grey-400)";
                    const eventDate = new Date(event.date);
                    const dateStr = `${eventDate.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][eventDate.getMonth()]} ${eventDate.getFullYear()}`;
                    const timeStr = event.time || eventDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

                    return (
                      <div key={event.id || idx} className="relative mb-4 flex items-start">
                        {/* Date on left */}
                        <div className="absolute text-right" style={{ left: -140, width: 128 }}>
                          <p className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>{dateStr}</p>
                          <p className="text-[12px]" style={{ color: "var(--grey-400)" }}>{timeStr}</p>
                        </div>

                        {/* Dot */}
                        <div className="absolute flex-shrink-0" style={{ left: -7, top: 6, width: 12, height: 12, borderRadius: "50%", background: dotColor, border: "2px solid var(--white)", boxShadow: `0 0 0 2px ${dotColor}40` }} />

                        {/* Event card */}
                        <div className="ml-5 flex-1 p-3" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)", borderLeft: `3px solid ${dotColor}` }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-px text-[9px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: typeBgColors[event.type] || "var(--grey-100)", color: dotColor }}>{event.type}</span>
                            <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{event.title}</p>
                          </div>
                          {event.description && <p className="text-[14px] leading-relaxed" style={{ color: "var(--grey-600)" }}>{event.description}</p>}
                        </div>
                      </div>
                    );
                  })}

                  {/* Load more */}
                  {timelineHasMore && (
                    <div className="text-center pt-4">
                      <button onClick={() => setTimelineLimit(prev => prev + 20)} className="px-4 py-1.5 text-[14px] font-semibold" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "#2d6a4f" }}>
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
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Vitals Tracking</h2>
                <button onClick={() => setShowVitalsForm(!showVitalsForm)} className="px-3 py-1.5 text-[14px] font-semibold text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>
                  {showVitalsForm ? "Hide Form" : "+ Record Vitals"}
                </button>
              </div>

              {/* Record Vitals Form */}
              {showVitalsForm && (
                <div className="p-5 mb-5 yoda-slide-in" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)" }}>
                  <h3 className="text-[16px] font-semibold mb-4" style={{ color: "var(--grey-800)" }}>Record Vitals</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>BP Systolic (mmHg)</label>
                      <input type="number" value={vitalForm.bloodPressureSys} onChange={e => setVitalForm(p => ({ ...p, bloodPressureSys: e.target.value }))} placeholder="120" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>BP Diastolic (mmHg)</label>
                      <input type="number" value={vitalForm.bloodPressureDia} onChange={e => setVitalForm(p => ({ ...p, bloodPressureDia: e.target.value }))} placeholder="80" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Pulse (bpm)</label>
                      <input type="number" value={vitalForm.pulse} onChange={e => setVitalForm(p => ({ ...p, pulse: e.target.value }))} placeholder="72" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Temperature (°C)</label>
                      <input type="number" step="0.1" value={vitalForm.temperature} onChange={e => setVitalForm(p => ({ ...p, temperature: e.target.value }))} placeholder="36.6" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Weight (kg)</label>
                      <input type="number" step="0.1" value={vitalForm.weight} onChange={e => setVitalForm(p => ({ ...p, weight: e.target.value }))} placeholder="70" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Height (cm)</label>
                      <input type="number" step="0.1" value={vitalForm.height} onChange={e => setVitalForm(p => ({ ...p, height: e.target.value }))} placeholder="170" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>SpO2 (%)</label>
                      <input type="number" value={vitalForm.oxygenSaturation} onChange={e => setVitalForm(p => ({ ...p, oxygenSaturation: e.target.value }))} placeholder="98" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Respiratory Rate (/min)</label>
                      <input type="number" value={vitalForm.respiratoryRate} onChange={e => setVitalForm(p => ({ ...p, respiratoryRate: e.target.value }))} placeholder="16" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                    </div>
                  </div>
                  {/* BMI auto-display */}
                  {getCalculatedBMI() && (
                    <div className="mb-4 px-3 py-2 flex items-center gap-2" style={{ background: "#f0faf4", borderRadius: "var(--radius-sm)", border: "1px solid #a7e3bd" }}>
                      <span className="text-[14px] font-medium" style={{ color: "#2d6a4f" }}>Calculated BMI:</span>
                      <span className="text-[16px] font-bold" style={{ color: "#2d6a4f" }}>{getCalculatedBMI()}</span>
                      <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                        ({parseFloat(getCalculatedBMI()) < 18.5 ? "Underweight" : parseFloat(getCalculatedBMI()) < 25 ? "Normal" : parseFloat(getCalculatedBMI()) < 30 ? "Overweight" : "Obese"})
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Notes</label>
                      <textarea value={vitalForm.notes} onChange={e => setVitalForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional observations..." className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[13px] font-medium mb-1 block" style={{ color: "var(--grey-600)" }}>Recorded By</label>
                      <input type="text" value={vitalForm.recordedBy} onChange={e => setVitalForm(p => ({ ...p, recordedBy: e.target.value }))} placeholder="Dr. Name / Nurse" className="w-full px-2.5 py-1.5 text-[15px]" style={inputStyle} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveVital} disabled={savingVital} className="px-4 py-1.5 text-[14px] font-semibold text-white disabled:opacity-50" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>{savingVital ? "Saving..." : "Save Vitals"}</button>
                    <button onClick={() => setShowVitalsForm(false)} className="px-4 py-1.5 text-[14px] font-semibold" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Trend Charts - pure CSS sparklines */}
              {vitals.length >= 2 && (
                <div className="mb-5">
                  <h3 className="text-[15px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--grey-600)" }}>Trends (Last 10 Readings)</h3>
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
                          <p className="text-[13px] font-bold mb-2" style={{ color: "var(--grey-600)" }}>Weight (kg)</p>
                          <svg width="100%" height="50" viewBox={`0 0 ${(data.length - 1) * 30} 50`} style={{ overflow: "visible" }}>
                            <polyline fill="none" stroke="#2d6a4f" strokeWidth="2" strokeLinejoin="round" points={vals.map((v, i) => `${i * 30},${45 - ((v - min) / range) * 40}`).join(" ")} />
                            {vals.map((v, i) => (
                              <g key={i}>
                                <circle cx={i * 30} cy={45 - ((v - min) / range) * 40} r="3" fill="#2d6a4f" />
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
                          <p className="text-[13px] font-bold mb-2" style={{ color: "var(--grey-600)" }}>Blood Pressure</p>
                          <svg width="100%" height="50" viewBox={`0 0 ${(data.length - 1) * 30} 50`} style={{ overflow: "visible" }}>
                            <polyline fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" points={sysVals.map((v, i) => `${i * 30},${45 - ((v - min) / range) * 40}`).join(" ")} />
                            <polyline fill="none" stroke="#37845e" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4,2" points={diaVals.map((v, i) => `${i * 30},${45 - ((v - min) / range) * 40}`).join(" ")} />
                            {sysVals.map((v, i) => <circle key={`s${i}`} cx={i * 30} cy={45 - ((v - min) / range) * 40} r="3" fill="#ef4444" />)}
                            {diaVals.map((v, i) => <circle key={`d${i}`} cx={i * 30} cy={45 - ((v - min) / range) * 40} r="2.5" fill="#37845e" />)}
                          </svg>
                          <div className="flex gap-3 mt-1">
                            <span className="text-[9px] flex items-center gap-1" style={{ color: "var(--grey-500)" }}><span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />Systolic</span>
                            <span className="text-[9px] flex items-center gap-1" style={{ color: "var(--grey-500)" }}><span className="w-2 h-2 rounded-full" style={{ background: "#37845e" }} />Diastolic</span>
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
                          <p className="text-[13px] font-bold mb-2" style={{ color: "var(--grey-600)" }}>Pulse (bpm)</p>
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
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#2d6a4f", borderTopColor: "transparent" }} /></div>
              ) : vitals.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>No vitals recorded yet</p>
                  <p className="text-[13px] mt-1" style={{ color: "var(--grey-400)" }}>Click &quot;+ Record Vitals&quot; to add the first reading</p>
                </div>
              ) : (
                <div style={{ background: "var(--white)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[14px]" style={{ borderCollapse: "collapse" }}>
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
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px]">
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
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Visit Summary</h2>
                <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>All patient activity grouped by date</p>
              </div>

              {visitSummaryLoading ? (
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#2d6a4f", borderTopColor: "transparent" }} /></div>
              ) : visitSummaries.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>No visits recorded yet</p>
                  <p className="text-[13px] mt-1" style={{ color: "var(--grey-400)" }}>Visits are grouped by date once appointments or notes are created</p>
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
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: "#f0faf4", borderRadius: "var(--radius-sm)" }}>
                              <svg className="w-5 h-5" style={{ color: "#2d6a4f" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                              <p className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{formatDate(visit.date)}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {visit.appointment && <span className="text-[12px] font-bold px-1.5 py-px" style={{ background: "#fff7ed", color: "#b68d40", borderRadius: "var(--radius-sm)" }}>Appointment</span>}
                                {visit.notes.length > 0 && <span className="text-[12px] font-bold px-1.5 py-px" style={{ background: "#f0faf4", color: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>{visit.notes.length} Note{visit.notes.length > 1 ? "s" : ""}</span>}
                                {visit.vitals.length > 0 && <span className="text-[12px] font-bold px-1.5 py-px" style={{ background: "#ecfdf5", color: "#059669", borderRadius: "var(--radius-sm)" }}>Vitals</span>}
                                {visit.documents.length > 0 && <span className="text-[12px] font-bold px-1.5 py-px" style={{ background: "#e8f5e9", color: "#37845e", borderRadius: "var(--radius-sm)" }}>{visit.documents.length} Doc{visit.documents.length > 1 ? "s" : ""}</span>}
                                {visit.invoices.length > 0 && <span className="text-[12px] font-bold px-1.5 py-px" style={{ background: "#f0faf4", color: "#37845e", borderRadius: "var(--radius-sm)" }}>Invoice</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium" style={{ color: "var(--grey-400)" }}>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </button>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--grey-100)" }}>
                            {/* Appointment */}
                            {visit.appointment && (
                              <div className="mt-3 p-3" style={{ background: "#fff7ed", borderRadius: "var(--radius-sm)", borderLeft: "3px solid #b68d40" }}>
                                <p className="text-[13px] font-bold uppercase tracking-wide mb-1" style={{ color: "#b68d40" }}>Appointment</p>
                                <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{drName(visit.appointment.doctor)}</p>
                                <p className="text-[13px]" style={{ color: "var(--grey-600)" }}>
                                  {visit.appointment.time}{visit.appointment.department ? ` · ${visit.appointment.department}` : ""}{visit.appointment.reason ? ` · ${visit.appointment.reason}` : ""}
                                </p>
                                <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold uppercase" style={{ borderRadius: "var(--radius-sm)", background: visit.appointment.status === "completed" ? "var(--green-light)" : "#f0faf4", color: visit.appointment.status === "completed" ? "var(--green)" : "#2d6a4f" }}>{visit.appointment.status}</span>
                              </div>
                            )}

                            {/* Clinical Notes */}
                            {visit.notes.length > 0 && (
                              <div>
                                <p className="text-[13px] font-bold uppercase tracking-wide mb-1.5 mt-2" style={{ color: "#2d6a4f" }}>Clinical Notes</p>
                                {visit.notes.map(n => (
                                  <div key={n.id} className="p-2.5 mb-1.5" style={{ background: "#f0faf4", borderRadius: "var(--radius-sm)", borderLeft: "3px solid #2d6a4f" }}>
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="px-1.5 py-px text-[9px] font-bold uppercase" style={{ background: "#d1f2e0", color: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>{NOTE_TYPES.find(t => t.value === n.type)?.label || n.type}</span>
                                      <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{n.title}</p>
                                    </div>
                                    <p className="text-[13px] leading-relaxed line-clamp-2" style={{ color: "var(--grey-700)" }}>{n.content}</p>
                                    {n.doctor && <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>By: {n.doctor}</p>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Vitals */}
                            {visit.vitals.length > 0 && (
                              <div>
                                <p className="text-[13px] font-bold uppercase tracking-wide mb-1.5 mt-2" style={{ color: "#059669" }}>Vitals</p>
                                {visit.vitals.map(v => (
                                  <div key={v.id} className="p-2.5 mb-1.5" style={{ background: "#ecfdf5", borderRadius: "var(--radius-sm)", borderLeft: "3px solid #059669" }}>
                                    <div className="flex flex-wrap gap-3 text-[13px]">
                                      {v.bloodPressureSys && <span style={{ color: "var(--grey-700)" }}>BP: <strong>{v.bloodPressureSys}/{v.bloodPressureDia}</strong></span>}
                                      {v.pulse && <span style={{ color: "var(--grey-700)" }}>Pulse: <strong>{v.pulse}</strong></span>}
                                      {v.temperature && <span style={{ color: "var(--grey-700)" }}>Temp: <strong>{v.temperature}°C</strong></span>}
                                      {v.weight && <span style={{ color: "var(--grey-700)" }}>Weight: <strong>{v.weight} kg</strong></span>}
                                      {v.oxygenSaturation && <span style={{ color: "var(--grey-700)" }}>SpO2: <strong>{v.oxygenSaturation}%</strong></span>}
                                      {v.bmi && <span style={{ color: "var(--grey-700)" }}>BMI: <strong>{v.bmi}</strong></span>}
                                    </div>
                                    {v.recordedBy && <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>By: {v.recordedBy}</p>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Documents */}
                            {visit.documents.length > 0 && (
                              <div>
                                <p className="text-[13px] font-bold uppercase tracking-wide mb-1.5 mt-2" style={{ color: "#37845e" }}>Documents</p>
                                {visit.documents.map(d => (
                                  <div key={d.id} className="flex items-center gap-2 p-2.5 mb-1.5" style={{ background: "#e8f5e9", borderRadius: "var(--radius-sm)", borderLeft: "3px solid #37845e" }}>
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#37845e" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[14px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>{d.fileName}</p>
                                      <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>{DOC_CATEGORIES.find(c => c.value === d.category)?.label || d.category} · {formatFileSize(d.fileSize)}</p>
                                    </div>
                                    <a href={d.filePath} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold" style={{ color: "#37845e" }}>View</a>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Invoices */}
                            {visit.invoices.length > 0 && (
                              <div>
                                <p className="text-[13px] font-bold uppercase tracking-wide mb-1.5 mt-2" style={{ color: "#37845e" }}>Invoices</p>
                                {visit.invoices.map(inv => (
                                  <Link key={inv.id} href={`/billing/${inv.id}`} className="flex items-center justify-between p-2.5 mb-1.5 hover:opacity-80 transition-opacity" style={{ background: "#f0faf4", borderRadius: "var(--radius-sm)", borderLeft: "3px solid #37845e" }}>
                                    <div>
                                      <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{inv.invoiceNumber}</p>
                                      <span className="text-[12px] font-bold uppercase px-1.5 py-px" style={{ borderRadius: "var(--radius-sm)", background: inv.status === "paid" ? "var(--green-light)" : "#d1f2e0", color: inv.status === "paid" ? "var(--green)" : "#37845e" }}>{inv.status}</span>
                                    </div>
                                    <p className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(inv.totalAmount)}</p>
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

          {/* ═══ TREATMENT PLANS ═══ */}
          {activeSection === "treatment-plans" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Treatment Plans</h2>
                  <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>Doctor-prescribed treatment plans and progress</p>
                </div>
                <Link href={`/treatment-plans?patientId=${id}`} className="px-3 py-1.5 text-[13px] font-semibold" style={{ background: "#2d6a4f", color: "#fff", borderRadius: "var(--radius-sm)" }}>+ New Plan</Link>
              </div>
              {treatmentPlansLoading ? (
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#2d6a4f", borderTopColor: "transparent" }} /></div>
              ) : treatmentPlans.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>No treatment plans yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {treatmentPlans.map((tp) => {
                    const progress = tp.totalSessions > 0 ? Math.round((tp.completedSessions / tp.totalSessions) * 100) : 0;
                    const statusColors: Record<string, { bg: string; text: string }> = {
                      active: { bg: "#e8f5e9", text: "#2e7d32" }, completed: { bg: "var(--blue-50)", text: "var(--blue-700)" },
                      paused: { bg: "#fff3e0", text: "#e65100" }, cancelled: { bg: "#ffebee", text: "#c62828" },
                    };
                    const sc = statusColors[tp.status] || statusColors.active;
                    return (
                      <div key={tp.id} style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                        <div className="px-4 py-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-[15px] font-bold truncate" style={{ color: "var(--grey-900)" }}>{tp.name}</h3>
                                <span className="px-2 py-0.5 text-[9px] font-bold uppercase flex-shrink-0" style={{ background: sc.bg, color: sc.text, borderRadius: "var(--radius-pill)" }}>{tp.status}</span>
                              </div>
                              <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{tp.planNumber} &middot; Dr. {tp.doctorName.replace(/^Dr\.?\s*/i, "")}</p>
                            </div>
                          </div>
                          {tp.diagnosis && <p className="text-[13px] mb-2" style={{ color: "var(--grey-600)" }}><strong>Diagnosis:</strong> {tp.diagnosis}</p>}
                          <div className="grid grid-cols-3 gap-3 mb-2">
                            <div><p className="text-[9px] uppercase font-bold" style={{ color: "var(--grey-400)" }}>Start</p><p className="text-[14px] font-semibold" style={{ color: "var(--grey-800)" }}>{new Date(tp.startDate).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}</p></div>
                            <div><p className="text-[9px] uppercase font-bold" style={{ color: "var(--grey-400)" }}>Sessions</p><p className="text-[14px] font-semibold" style={{ color: "var(--grey-800)" }}>{tp.completedSessions}/{tp.totalSessions}</p></div>
                            <div><p className="text-[9px] uppercase font-bold" style={{ color: "var(--grey-400)" }}>Cost</p><p className="text-[14px] font-semibold" style={{ color: "var(--grey-800)" }}>S${tp.totalCost.toFixed(2)}</p></div>
                          </div>
                          {tp.totalSessions > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[12px] font-semibold" style={{ color: "var(--grey-500)" }}>Progress</span>
                                <span className="text-[12px] font-bold" style={{ color: "#2d6a4f" }}>{progress}%</span>
                              </div>
                              <div style={{ height: 6, background: "var(--grey-100)", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? "#2d6a4f" : "#4caf50", borderRadius: 3, transition: "width 0.3s ease" }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ COMPLETED PROCEDURES ═══ */}
          {activeSection === "completed-procedures" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Completed Procedures</h2>
                <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>All completed appointments and treatments</p>
              </div>
              {completedProceduresLoading ? (
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#2d6a4f", borderTopColor: "transparent" }} /></div>
              ) : completedProcedures.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>No completed procedures yet</p>
                </div>
              ) : (
                <div>
                  {/* Summary bar */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[18px] font-bold" style={{ color: "#2d6a4f" }}>{completedProcedures.length}</p>
                      <p className="text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Total Done</p>
                    </div>
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[18px] font-bold" style={{ color: "var(--grey-800)" }}>{new Set(completedProcedures.map(p => p.treatmentName).filter(Boolean)).size}</p>
                      <p className="text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Treatments</p>
                    </div>
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[18px] font-bold" style={{ color: "var(--grey-800)" }}>{new Set(completedProcedures.map(p => p.doctor)).size}</p>
                      <p className="text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Doctors</p>
                    </div>
                  </div>
                  {/* Procedures table */}
                  <div style={{ ...cardStyle, overflow: "hidden" }}>
                    <table className="w-full text-left">
                      <thead>
                        <tr style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase" style={{ color: "var(--grey-500)" }}>Date</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase" style={{ color: "var(--grey-500)" }}>Treatment</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase" style={{ color: "var(--grey-500)" }}>Doctor</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase text-right" style={{ color: "var(--grey-500)" }}>Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedProcedures.map((proc, idx) => (
                          <tr key={proc.id} style={{ borderBottom: idx < completedProcedures.length - 1 ? "1px solid var(--grey-100)" : "none" }}>
                            <td className="px-4 py-2.5">
                              <p className="text-[14px] font-semibold" style={{ color: "var(--grey-800)" }}>{new Date(proc.date).toLocaleDateString("en-SG", { day: "2-digit", month: "short" })}</p>
                              <p className="text-[12px]" style={{ color: "var(--grey-400)" }}>{proc.time}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              <p className="text-[14px] font-medium" style={{ color: "var(--grey-800)" }}>{proc.treatmentName || proc.reason || "General"}</p>
                              {proc.packageName && <p className="text-[12px]" style={{ color: "#2d6a4f" }}>{proc.packageName}</p>}
                            </td>
                            <td className="px-4 py-2.5 text-[14px]" style={{ color: "var(--grey-600)" }}>{proc.doctor}</td>
                            <td className="px-4 py-2.5 text-[14px] font-semibold text-right" style={{ color: "var(--grey-800)" }}>{proc.sessionPrice ? `S$${proc.sessionPrice.toFixed(2)}` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ INVOICES ═══ */}
          {activeSection === "invoices" && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Invoices</h2>
                  <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>All invoices for this patient</p>
                </div>
                <Link href={`/billing/new?patientId=${id}&patientName=${encodeURIComponent(patient.firstName + " " + patient.lastName)}`} className="px-3 py-1.5 text-[13px] font-semibold" style={{ background: "#2d6a4f", color: "#fff", borderRadius: "var(--radius-sm)" }}>+ New Invoice</Link>
              </div>
              {invoicesLoading ? (
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#2d6a4f", borderTopColor: "transparent" }} /></div>
              ) : patientInvoices.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                  <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>No invoices yet</p>
                </div>
              ) : (
                <div>
                  {/* Invoice summary */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[16px] font-bold" style={{ color: "var(--grey-800)" }}>{patientInvoices.length}</p>
                      <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Total</p>
                    </div>
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[16px] font-bold" style={{ color: "#2d6a4f" }}>S${patientInvoices.reduce((s, i) => s + i.totalAmount, 0).toFixed(0)}</p>
                      <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Billed</p>
                    </div>
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[16px] font-bold" style={{ color: "var(--blue-700)" }}>S${patientInvoices.reduce((s, i) => s + i.paidAmount, 0).toFixed(0)}</p>
                      <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Paid</p>
                    </div>
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[16px] font-bold" style={{ color: patientInvoices.reduce((s, i) => s + i.balanceAmount, 0) > 0 ? "#c62828" : "#2d6a4f" }}>S${patientInvoices.reduce((s, i) => s + i.balanceAmount, 0).toFixed(0)}</p>
                      <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Balance</p>
                    </div>
                  </div>
                  {/* Invoice table */}
                  <div style={{ ...cardStyle, overflow: "hidden" }}>
                    <table className="w-full text-left">
                      <thead>
                        <tr style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase" style={{ color: "var(--grey-500)" }}>Invoice #</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase" style={{ color: "var(--grey-500)" }}>Date</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase text-right" style={{ color: "var(--grey-500)" }}>Amount</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase text-right" style={{ color: "var(--grey-500)" }}>Paid</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase text-right" style={{ color: "var(--grey-500)" }}>Balance</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase text-center" style={{ color: "var(--grey-500)" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientInvoices.map((inv, idx) => {
                          const statusColors: Record<string, { bg: string; text: string }> = {
                            paid: { bg: "#e8f5e9", text: "#2e7d32" }, pending: { bg: "#fff3e0", text: "#e65100" },
                            partially_paid: { bg: "var(--blue-50)", text: "var(--blue-700)" }, draft: { bg: "var(--grey-100)", text: "var(--grey-600)" },
                            cancelled: { bg: "#ffebee", text: "#c62828" }, refunded: { bg: "#f3e5f5", text: "#7b1fa2" },
                          };
                          const sc = statusColors[inv.status] || statusColors.pending;
                          return (
                            <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" style={{ borderBottom: idx < patientInvoices.length - 1 ? "1px solid var(--grey-100)" : "none" }}
                              onClick={() => router.push(`/billing/${inv.id}`)}>
                              <td className="px-4 py-2.5">
                                <span className="text-[14px] font-semibold" style={{ color: "#2d6a4f" }}>{inv.invoiceNumber}</span>
                                {inv.isPackageSale && <span className="ml-1.5 px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ background: "#e8f5e9", color: "#2e7d32", borderRadius: "var(--radius-pill)" }}>Package</span>}
                              </td>
                              <td className="px-4 py-2.5 text-[14px]" style={{ color: "var(--grey-600)" }}>{new Date(inv.date).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}</td>
                              <td className="px-4 py-2.5 text-[14px] font-semibold text-right" style={{ color: "var(--grey-800)" }}>S${inv.totalAmount.toFixed(2)}</td>
                              <td className="px-4 py-2.5 text-[14px] text-right" style={{ color: "#2d6a4f" }}>S${inv.paidAmount.toFixed(2)}</td>
                              <td className="px-4 py-2.5 text-[14px] font-semibold text-right" style={{ color: inv.balanceAmount > 0 ? "#c62828" : "var(--grey-400)" }}>{inv.balanceAmount > 0 ? `S$${inv.balanceAmount.toFixed(2)}` : "—"}</td>
                              <td className="px-4 py-2.5 text-center"><span className="px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: sc.bg, color: sc.text, borderRadius: "var(--radius-pill)" }}>{inv.status.replace("_", " ")}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ PAYMENTS ═══ */}
          {activeSection === "payments" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Payments</h2>
                <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>All payment receipts for this patient</p>
              </div>
              {paymentsLoading ? (
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#2d6a4f", borderTopColor: "transparent" }} /></div>
              ) : patientPayments.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>No payments recorded yet</p>
                </div>
              ) : (
                <div>
                  {/* Payment summary */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[18px] font-bold" style={{ color: "#2d6a4f" }}>S${patientPayments.reduce((s, p) => s + p.amount, 0).toFixed(0)}</p>
                      <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Total Paid</p>
                    </div>
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[18px] font-bold" style={{ color: "var(--grey-800)" }}>{patientPayments.length}</p>
                      <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Receipts</p>
                    </div>
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[18px] font-bold" style={{ color: "var(--grey-800)" }}>{patientPayments.filter(p => p.method === "cash").length} / {patientPayments.filter(p => p.method === "card").length}</p>
                      <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Cash / Card</p>
                    </div>
                  </div>
                  {/* Payments list */}
                  <div className="space-y-2">
                    {patientPayments.map((pay) => {
                      const methodIcons: Record<string, string> = { cash: "💵", card: "💳", upi: "📱", bank_transfer: "🏦", insurance: "🏥" };
                      return (
                        <div key={pay.id} className="flex items-center gap-3 px-4 py-3" style={{ ...cardStyle }}>
                          <div className="w-9 h-9 flex items-center justify-center text-[16px] flex-shrink-0" style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)" }}>
                            {methodIcons[pay.method] || "💰"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>S${pay.amount.toFixed(2)}</p>
                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: "var(--grey-100)", color: "var(--grey-600)", borderRadius: "var(--radius-pill)" }}>{pay.method}</span>
                            </div>
                            <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>
                              {pay.receiptNumber || "—"} &middot; for {pay.invoice.invoiceNumber}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[13px] font-medium" style={{ color: "var(--grey-700)" }}>{new Date(pay.date).toLocaleDateString("en-SG", { day: "2-digit", month: "short" })}</p>
                            <p className="text-[12px]" style={{ color: "var(--grey-400)" }}>{new Date(pay.date).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ LEDGER ═══ */}
          {activeSection === "ledger" && (
            <div>
              <div className="mb-5">
                <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Patient Ledger</h2>
                <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>Complete financial transaction history</p>
              </div>
              {ledgerLoading ? (
                <div className="py-16 text-center"><div className="w-6 h-6 mx-auto border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#2d6a4f", borderTopColor: "transparent" }} /></div>
              ) : ledgerEntries.length === 0 ? (
                <div className="py-16 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--grey-300)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  <p className="text-[15px] font-medium" style={{ color: "var(--grey-500)" }}>No transactions yet</p>
                </div>
              ) : (
                <div>
                  {/* Ledger summary */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[16px] font-bold" style={{ color: "#c62828" }}>S${ledgerEntries.reduce((s, e) => s + e.debit, 0).toFixed(0)}</p>
                      <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Total Charges</p>
                    </div>
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[16px] font-bold" style={{ color: "#2d6a4f" }}>S${ledgerEntries.reduce((s, e) => s + e.credit, 0).toFixed(0)}</p>
                      <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Total Payments</p>
                    </div>
                    <div className="p-3 text-center" style={{ ...cardStyle }}>
                      <p className="text-[16px] font-bold" style={{ color: (ledgerEntries[ledgerEntries.length - 1]?.balance || 0) > 0 ? "#c62828" : "#2d6a4f" }}>
                        S${Math.abs(ledgerEntries[ledgerEntries.length - 1]?.balance || 0).toFixed(0)}
                      </p>
                      <p className="text-[9px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>{(ledgerEntries[ledgerEntries.length - 1]?.balance || 0) > 0 ? "Outstanding" : "Settled"}</p>
                    </div>
                  </div>
                  {/* Ledger table */}
                  <div style={{ ...cardStyle, overflow: "hidden" }}>
                    <table className="w-full text-left">
                      <thead>
                        <tr style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase" style={{ color: "var(--grey-500)" }}>Date</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase" style={{ color: "var(--grey-500)" }}>Description</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase" style={{ color: "var(--grey-500)" }}>Reference</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase text-right" style={{ color: "var(--grey-500)" }}>Debit</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase text-right" style={{ color: "var(--grey-500)" }}>Credit</th>
                          <th className="px-4 py-2.5 text-[12px] font-bold uppercase text-right" style={{ color: "var(--grey-500)" }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerEntries.map((entry, idx) => (
                          <tr key={entry.id + "-" + idx} style={{ borderBottom: idx < ledgerEntries.length - 1 ? "1px solid var(--grey-100)" : "none" }}>
                            <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-600)" }}>{new Date(entry.date).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.type === "invoice" ? "#e65100" : "#2e7d32" }} />
                                <span className="text-[13px] font-medium" style={{ color: "var(--grey-800)" }}>{entry.description}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-[13px] font-mono" style={{ color: "var(--grey-500)" }}>{entry.reference}</td>
                            <td className="px-4 py-2.5 text-[13px] font-semibold text-right" style={{ color: entry.debit > 0 ? "#c62828" : "var(--grey-300)" }}>{entry.debit > 0 ? `S$${entry.debit.toFixed(2)}` : "—"}</td>
                            <td className="px-4 py-2.5 text-[13px] font-semibold text-right" style={{ color: entry.credit > 0 ? "#2e7d32" : "var(--grey-300)" }}>{entry.credit > 0 ? `S$${entry.credit.toFixed(2)}` : "—"}</td>
                            <td className="px-4 py-2.5 text-[13px] font-bold text-right" style={{ color: entry.balance > 0 ? "#c62828" : "#2d6a4f" }}>S${entry.balance.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                <button onClick={() => { setActiveSection("profile"); startEdit(); }} className="text-[15px] font-semibold hover:underline" style={{ color: "#2d6a4f" }}>+ Add New</button>
              </div>
              {medicalHistory.length > 0 ? (
                <div className="space-y-2">{medicalHistory.map((c) => (
                  <label key={c} className="flex items-center gap-2.5 text-[15px]" style={{ color: "var(--grey-800)" }}>
                    <input type="checkbox" checked readOnly className="w-4 h-4" />
                    {c}
                  </label>
                ))}</div>
              ) : <p className="text-[14px]" style={{ color: "var(--grey-400)" }}>No medical history recorded. Click &quot;+ Add New&quot; to add conditions.</p>}
            </div>

            <div style={{ height: 1, background: "var(--grey-200)" }} />

            {/* Other History — Practo style */}
            <div>
              <h3 className="text-[16px] font-bold mb-3" style={{ color: "var(--grey-900)" }}>Other History</h3>
              {patient.otherHistory ? (
                <p className="text-[15px] leading-relaxed" style={{ color: "var(--grey-700)" }}>{patient.otherHistory}</p>
              ) : (
                <div className="px-3 py-4 text-[14px]" style={{ border: "1px solid var(--grey-200)", borderRadius: "var(--radius-sm)", color: "var(--grey-400)" }}>No other history on file. Edit profile to add.</div>
              )}
            </div>

            <div style={{ height: 1, background: "var(--grey-200)" }} />

            {/* Allergies */}
            <div>
              <h3 className="text-[16px] font-bold mb-3" style={{ color: "var(--grey-900)" }}>Allergies</h3>
              {patient.allergies ? (
                <p className="text-[15px] leading-relaxed" style={{ color: "var(--red)" }}>{patient.allergies}</p>
              ) : (
                <div className="px-3 py-4 text-[14px]" style={{ border: "1px solid var(--grey-200)", borderRadius: "var(--radius-sm)", color: "var(--grey-400)" }}>No known allergies on file. Edit profile to add.</div>
              )}
            </div>

            <div style={{ height: 1, background: "var(--grey-200)" }} />

            {/* Groups — Practo style */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Groups</h3>
                <button onClick={() => { setActiveSection("profile"); startEdit(); }} className="text-[15px] font-semibold hover:underline" style={{ color: "#2d6a4f" }}>Add New</button>
              </div>
              {groups.length > 0 ? (
                <div className="space-y-2">{groups.map((g) => (
                  <label key={g} className="flex items-center gap-2.5 text-[15px]" style={{ color: "var(--grey-800)" }}>
                    <input type="checkbox" checked readOnly className="w-4 h-4" />
                    {g}
                  </label>
                ))}</div>
              ) : <p className="text-[14px]" style={{ color: "var(--grey-400)" }}>No groups assigned. Use groups to categorise patients.</p>}
            </div>

            <div style={{ height: 1, background: "var(--grey-200)" }} />

            {/* Patient Notes */}
            <div>
              <h3 className="text-[16px] font-bold mb-3" style={{ color: "var(--grey-900)" }}>Patient Notes</h3>
              <div className="flex gap-1.5 mb-2">
                <input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Type note here" className="flex-1 px-2.5 py-1.5 text-[14px]" style={inputStyle}
                  onKeyDown={(e) => { if (e.key === "Enter") saveNote(); }} />
                <button onClick={saveNote} disabled={!noteInput.trim()} className="px-2.5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>Add</button>
              </div>
              {patient.medicalNotes ? (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {patient.medicalNotes.split("\n").filter(Boolean).map((note, i) => (
                    <p key={i} className="text-[13px] px-2 py-1.5 leading-snug" style={{ color: "var(--grey-700)", background: "var(--grey-50)", borderRadius: "var(--radius-sm)", borderLeft: "2px solid #2d6a4f" }}>{note}</p>
                  ))}
                </div>
              ) : <p className="text-[14px]" style={{ color: "var(--grey-400)" }}>No notes yet. Add quick notes about this patient above.</p>}
            </div>
          </div>
        </aside>
      </div>

      {/* ══════════ PHOTO UPLOAD MODAL ══════════ */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => { if (!uploadingPhoto) { setShowPhotoModal(false); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(null); setPhotoFile(null); } }}>
          <div className="w-full max-w-md yoda-slide-in" style={{ background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--grey-200)" }}>
              <h3 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>{patient.photoUrl && !photoPreview ? "Patient Photo" : photoPreview ? "Adjust & Save" : "Upload Photo"}</h3>
              <button onClick={() => { if (!uploadingPhoto) { setShowPhotoModal(false); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(null); setPhotoFile(null); } }} className="p-1 hover:bg-gray-100 rounded" style={{ color: "var(--grey-400)" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-5">
              {photoPreview ? (
                /* Crop / Preview */
                <div>
                  <div className="w-[280px] h-[340px] mx-auto overflow-hidden relative" style={{ borderRadius: "var(--radius)", border: "2px solid var(--grey-300)", background: "var(--grey-100)" }}>
                    <img
                      ref={cropImgRef}
                      src={photoPreview}
                      alt="Preview"
                      draggable={false}
                      className="absolute select-none"
                      style={{
                        left: "50%", top: "50%",
                        transform: `translate(calc(-50% + ${photoCropOffset.x}px), calc(-50% + ${photoCropOffset.y}px)) scale(${photoCropScale})`,
                        minWidth: "100%", minHeight: "100%",
                        objectFit: "cover",
                        cursor: "grab",
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const startX = e.clientX - photoCropOffset.x;
                        const startY = e.clientY - photoCropOffset.y;
                        const onMove = (ev: MouseEvent) => setPhotoCropOffset({ x: ev.clientX - startX, y: ev.clientY - startY });
                        const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                        window.addEventListener("mousemove", onMove);
                        window.addEventListener("mouseup", onUp);
                      }}
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        const startX = touch.clientX - photoCropOffset.x;
                        const startY = touch.clientY - photoCropOffset.y;
                        const onMove = (ev: TouchEvent) => { const t = ev.touches[0]; setPhotoCropOffset({ x: t.clientX - startX, y: t.clientY - startY }); };
                        const onUp = () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp); };
                        window.addEventListener("touchmove", onMove);
                        window.addEventListener("touchend", onUp);
                      }}
                    />
                  </div>
                  {/* Zoom slider */}
                  <div className="flex items-center gap-3 mt-4 px-2">
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                    <input type="range" min="1" max="3" step="0.05" value={photoCropScale} onChange={(e) => setPhotoCropScale(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer"
                      style={{ background: `linear-gradient(to right, #2d6a4f ${((photoCropScale - 1) / 2) * 100}%, var(--grey-200) ${((photoCropScale - 1) / 2) * 100}%)` }} />
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                  </div>
                  <p className="text-[13px] text-center mt-2" style={{ color: "var(--grey-400)" }}>Drag to reposition, slide to zoom</p>
                </div>
              ) : patient.photoUrl ? (
                /* Current photo view */
                <div>
                  <div className="w-[280px] h-[340px] mx-auto overflow-hidden" style={{ borderRadius: "var(--radius)", border: "1px solid var(--grey-200)" }}>
                    <img src={patient.photoUrl} alt={`${patient.firstName} ${patient.lastName}`} className="w-full h-full object-cover" />
                  </div>
                </div>
              ) : (
                /* Upload prompt */
                <div
                  className="cursor-pointer transition-all"
                  onClick={() => photoInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); handlePhotoSelect(e.dataTransfer.files?.[0] || null); }}
                  style={{
                    border: dragActive ? "2px dashed #2d6a4f" : "2px dashed var(--grey-300)",
                    borderRadius: "var(--radius)",
                    background: dragActive ? "#f0faf4" : "var(--grey-50)",
                    padding: "40px 20px",
                    textAlign: "center",
                  }}
                >
                  <svg className="w-12 h-12 mx-auto mb-3" style={{ color: dragActive ? "#2d6a4f" : "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-[15px] font-medium" style={{ color: dragActive ? "#2d6a4f" : "var(--grey-600)" }}>
                    {dragActive ? "Drop photo here" : "Drag & drop a photo"}
                  </p>
                  <p className="text-[13px] mt-1" style={{ color: "var(--grey-400)" }}>or click to browse &middot; JPG, PNG up to 5MB</p>
                </div>
              )}
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)} />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-5 py-4" style={{ background: "var(--grey-50)", borderTop: "1px solid var(--grey-200)" }}>
              {photoPreview ? (
                <>
                  <button onClick={() => { if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(null); setPhotoFile(null); }} disabled={uploadingPhoto}
                    className="flex-1 px-4 py-2.5 text-[15px] font-semibold disabled:opacity-50" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}>
                    Back
                  </button>
                  <button onClick={cropAndUploadPhoto} disabled={uploadingPhoto}
                    className="flex-1 px-4 py-2.5 text-[15px] font-semibold text-white disabled:opacity-50" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>
                    {uploadingPhoto ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span> : "Save Photo"}
                  </button>
                </>
              ) : (
                <>
                  {patient.photoUrl && (
                    <button onClick={() => { setShowPhotoModal(false); removePhoto(); }}
                      className="px-4 py-2.5 text-[15px] font-semibold" style={{ color: "var(--red)", background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}>
                      Remove
                    </button>
                  )}
                  <button onClick={() => photoInputRef.current?.click()}
                    className="flex-1 px-4 py-2.5 text-[15px] font-semibold text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>
                    {patient.photoUrl ? "Upload New Photo" : "Choose Photo"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ QUICK ACTIONS FAB ══════════ */}
      <div className="fixed bottom-6 right-6 z-50 print:hidden" style={{ display: "flex", flexDirection: "column-reverse", alignItems: "flex-end", gap: 8 }}>
        {/* FAB menu items */}
        {fabOpen && (
          <div className="flex flex-col gap-2 mb-2 yoda-fade-in">
            <Link href={`/appointments?patientId=${id}&patientName=${encodeURIComponent(patient.firstName + " " + patient.lastName)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold shadow-lg"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-pill)", color: "var(--grey-800)", boxShadow: "var(--shadow-md)", whiteSpace: "nowrap" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#2d6a4f" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Book Appointment
            </Link>
            <button onClick={() => { setActiveSection("vitals"); setFabOpen(false); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold shadow-lg cursor-pointer"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-pill)", color: "var(--grey-800)", boxShadow: "var(--shadow-md)", whiteSpace: "nowrap" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--green)" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              Record Vitals
            </button>
            <button onClick={() => { setActiveSection("communications"); setShowMsgForm(true); setFabOpen(false); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold shadow-lg cursor-pointer"
              style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-pill)", color: "var(--grey-800)", boxShadow: "var(--shadow-md)", whiteSpace: "nowrap" }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--orange)" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Send Reminder
            </button>
          </div>
        )}
        {/* FAB toggle button */}
        <button onClick={() => setFabOpen(!fabOpen)}
          className="w-12 h-12 flex items-center justify-center shadow-lg transition-transform duration-200"
          style={{ background: "#2d6a4f", borderRadius: "var(--radius-pill)", border: "none", boxShadow: "var(--shadow-lg)", color: "#fff", cursor: "pointer", transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>
    </div>
  );
}
