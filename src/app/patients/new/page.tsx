"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const ETHNICITIES = ["Chinese", "Indian", "Malay", "Others"];
const NATIONALITIES = [
  "Singaporean", "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Argentine", "Armenian", "Australian", "Austrian", "Azerbaijani",
  "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese", "Bolivian", "Bosnian", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkinabe", "Burmese", "Burundian",
  "Cambodian", "Cameroonian", "Canadian", "Chilean", "Chinese", "Colombian", "Congolese", "Costa Rican", "Croatian", "Cuban", "Cypriot", "Czech",
  "Danish", "Dominican", "Dutch",
  "Ecuadorian", "Egyptian", "Emirati", "Eritrean", "Estonian", "Ethiopian",
  "Fijian", "Filipino", "Finnish", "French",
  "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", "Grenadian", "Guatemalan", "Guinean", "Guyanese",
  "Haitian", "Honduran", "Hungarian",
  "Icelandic", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish", "Israeli", "Italian",
  "Jamaican", "Japanese", "Jordanian",
  "Kazakh", "Kenyan", "Korean", "Kuwaiti", "Kyrgyz",
  "Lao", "Latvian", "Lebanese", "Liberian", "Libyan", "Lithuanian", "Luxembourgish",
  "Macedonian", "Malagasy", "Malawian", "Malaysian", "Maldivian", "Malian", "Maltese", "Mauritanian", "Mauritian", "Mexican", "Moldovan", "Mongolian", "Montenegrin", "Moroccan", "Mozambican", "Myanmar",
  "Namibian", "Nepalese", "New Zealander", "Nicaraguan", "Nigerian", "Norwegian",
  "Omani",
  "Pakistani", "Palestinian", "Panamanian", "Paraguayan", "Peruvian", "Polish", "Portuguese",
  "Qatari",
  "Romanian", "Russian", "Rwandan",
  "Saudi", "Senegalese", "Serbian", "Sierra Leonean", "Slovak", "Slovenian", "Somali", "South African", "Spanish", "Sri Lankan", "Sudanese", "Surinamese", "Swedish", "Swiss", "Syrian",
  "Taiwanese", "Tajik", "Tanzanian", "Thai", "Togolese", "Trinidadian", "Tunisian", "Turkish", "Turkmen",
  "Ugandan", "Ukrainian", "Uruguayan", "Uzbek",
  "Venezuelan", "Vietnamese",
  "Yemeni",
  "Zambian", "Zimbabwean",
];
const OCCUPATIONS = [
  "Accountant", "Actor", "Administrative Assistant", "Architect", "Artist",
  "Baker", "Banker", "Barber", "Business Owner",
  "Carpenter", "Cashier", "Chef", "Civil Servant", "Cleaner", "Clerk", "Coach", "Construction Worker", "Consultant", "Counsellor",
  "Delivery Driver", "Dentist", "Designer", "Director", "Doctor", "Driver",
  "Economist", "Editor", "Electrician", "Engineer", "Entrepreneur",
  "Factory Worker", "Farmer", "Financial Analyst", "Firefighter", "Fisherman", "Flight Attendant",
  "Government Officer", "Graphic Designer",
  "Hairdresser", "Homemaker", "Hotel Staff",
  "Insurance Agent", "Interior Designer", "IT Professional",
  "Journalist",
  "Kindergarten Teacher",
  "Laborer", "Lawyer", "Lecturer", "Librarian", "Logistics Officer",
  "Manager", "Marine Engineer", "Mechanic", "Medical Professional", "Military Personnel", "Musician",
  "Nurse", "Nutritionist",
  "Optician",
  "Paramedic", "Pharmacist", "Photographer", "Physiotherapist", "Pilot", "Plumber", "Police Officer", "Postman", "Professor", "Programmer",
  "Real Estate Agent", "Receptionist", "Researcher", "Retired",
  "Sales Executive", "Scientist", "Security Guard", "Self-Employed", "Social Worker", "Software Developer", "Student", "Surgeon", "Surveyor",
  "Tailor", "Teacher", "Technician", "Therapist", "Tour Guide", "Trader", "Translator",
  "Unemployed",
  "Veterinarian",
  "Waiter", "Writer",
  "Other",
];
const REFERRAL_SOURCES = ["Walk-in", "Doctor Referral", "Friend/Family", "Online/Website", "Social Media", "Insurance", "Other"];

const FAMILY_RELATIONS = [
  "spouse", "parent", "child", "sibling",
  "grandparent", "grandchild", "uncle_aunt", "nephew_niece", "cousin", "other",
];

const RELATION_LABELS: Record<string, string> = {
  spouse: "Spouse", parent: "Parent", child: "Child", sibling: "Sibling",
  grandparent: "Grandparent", grandchild: "Grandchild",
  uncle_aunt: "Uncle/Aunt", nephew_niece: "Nephew/Niece", cousin: "Cousin", other: "Other",
};

// Gender-aware labels: relation + gender → display label
function genderRelationLabel(relation: string, gender?: string | null): string {
  if (!gender) return RELATION_LABELS[relation] || relation;
  const map: Record<string, Record<string, string>> = {
    spouse:      { male: "Husband",      female: "Wife" },
    parent:      { male: "Father",       female: "Mother" },
    child:       { male: "Son",          female: "Daughter" },
    sibling:     { male: "Brother",      female: "Sister" },
    grandparent: { male: "Grandfather",  female: "Grandmother" },
    grandchild:  { male: "Grandson",     female: "Granddaughter" },
    uncle_aunt:  { male: "Uncle",        female: "Aunt" },
    nephew_niece:{ male: "Nephew",       female: "Niece" },
  };
  return map[relation]?.[gender] || RELATION_LABELS[relation] || relation;
}

interface FamilyMemberEntry {
  id?: string;
  relation: string;
  linkedPatientId?: string | null;
  memberName: string;
  memberPhone?: string | null;
  memberGender?: string | null;
}

interface PatientSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  patientIdNumber: string;
  gender?: string;
}

const MEDICAL_CONDITIONS = [
  "Skin Problems", "Kidney Problem", "Pregnant/Breast Feeding", "Gastric Ulcers",
  "Allergies", "Heart Disease", "Epilepsy", "Diabetes", "Hypertension",
  "Asthma", "Thyroid Disorder", "Liver Disease", "Cancer", "HIV/AIDS", "Tuberculosis",
];

const PATIENT_GROUPS = ["Diabetes", "Hypertension", "Senior Citizen", "Pediatric", "Prenatal", "VIP", "Insurance"];

/* YODA shared styles */
const inputStyle = {
  border: "1px solid var(--grey-400)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-900)",
  background: "var(--white)",
  fontSize: "15px",
};
const inputErrorStyle = {
  ...inputStyle,
  border: "1px solid var(--red)",
  background: "#fff5f5",
};
const labelStyle = { color: "var(--grey-700)", fontSize: "14px", fontWeight: 600 as const };
const cardStyle = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)" as const,
  boxShadow: "var(--shadow-card)" as const,
};
const sectionTitle = { color: "var(--grey-900)", fontSize: "17px", fontWeight: 700 as const };

/* Field error helper */
function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{error}</p>;
}

/* Toast notification */
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 text-[15px] font-semibold yoda-slide-in"
      style={{
        background: type === "success" ? "var(--green)" : "var(--red)",
        color: "var(--white)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        minWidth: "260px",
      }}
      role="alert"
      aria-live="assertive"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {type === "success"
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />}
      </svg>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100" aria-label="Close notification">&times;</button>
    </div>
  );
}

export default function NewPatientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill from walk-in appointment data
  const walkinName = searchParams.get("walkinName") || "";
  const walkinPhone = searchParams.get("walkinPhone") || "";
  const appointmentId = searchParams.get("appointmentId") || "";
  const prefill = useMemo(() => {
    const parts = walkinName.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    return { firstName, lastName, phone: walkinPhone, appointmentId };
  }, [walkinName, walkinPhone, appointmentId]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [calculatedAge, setCalculatedAge] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [dobMode, setDobMode] = useState<"dob" | "age">("dob");
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [conditionSearch, setConditionSearch] = useState("");
  const [customConditions, setCustomConditions] = useState<string[]>([]);
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [showNewReferral, setShowNewReferral] = useState(false);
  const [showNewOccupation, setShowNewOccupation] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Family members state
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberEntry[]>([]);
  const [familyRelation, setFamilyRelation] = useState("");
  const [familySearch, setFamilySearch] = useState("");
  const [familySearchResults, setFamilySearchResults] = useState<PatientSearchResult[]>([]);
  const [familySearchLoading, setFamilySearchLoading] = useState(false);
  const [showFamilyDropdown, setShowFamilyDropdown] = useState(false);
  const familySearchRef = useRef<HTMLDivElement>(null);

  const allConditions = [...MEDICAL_CONDITIONS, ...customConditions];
  const allGroups = [...PATIENT_GROUPS, ...customGroups];
  const filteredConditions = conditionSearch
    ? allConditions.filter((c) => c.toLowerCase().includes(conditionSearch.toLowerCase()))
    : allConditions;

  // Unsaved changes warning
  useEffect(() => {
    if (!isDirty || submitted) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, submitted]);

  // Mark form as dirty on any input change
  const markDirty = useCallback(() => {
    if (!isDirty) setIsDirty(true);
  }, [isDirty]);

  function handleDobChange(e: React.ChangeEvent<HTMLInputElement>) {
    const dob = e.target.value;
    if (!dob) { setCalculatedAge(""); return; }
    const birth = new Date(dob);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    if (now.getDate() < birth.getDate()) months--;
    if (months < 0) months += 12;
    setCalculatedAge(`${years} yr${years !== 1 ? "s" : ""} ${months} mo${months !== 1 ? "s" : ""}`);
    markDirty();
  }

  function toggleCondition(c: string) {
    setSelectedConditions((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]);
    markDirty();
  }
  function toggleGroup(g: string) {
    setSelectedGroups((p) => p.includes(g) ? p.filter((x) => x !== g) : [...p, g]);
    markDirty();
  }

  // Family search with debounce
  useEffect(() => {
    if (!familySearch.trim() || familySearch.length < 2) {
      setFamilySearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setFamilySearchLoading(true);
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(familySearch)}`);
        if (res.ok) {
          const data = await res.json();
          setFamilySearchResults(data.slice(0, 8));
          setShowFamilyDropdown(true);
        }
      } catch { /* ignore */ }
      setFamilySearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [familySearch]);

  // Close family dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (familySearchRef.current && !familySearchRef.current.contains(e.target as Node)) {
        setShowFamilyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function addFamilyMember(patient: PatientSearchResult) {
    setFamilyMembers(prev => [...prev, {
      relation: familyRelation,
      linkedPatientId: patient.id,
      memberName: `${patient.firstName} ${patient.lastName}`,
      memberPhone: patient.phone,
      memberGender: patient.gender || null,
    }]);
    setFamilyRelation("");
    setFamilySearch("");
    setFamilySearchResults([]);
    setShowFamilyDropdown(false);
    markDirty();
  }

  function addManualFamilyMember() {
    if (!familyRelation || !familySearch.trim()) return;
    setFamilyMembers(prev => [...prev, {
      relation: familyRelation,
      memberName: familySearch.trim(),
      memberGender: null,
    }]);
    setFamilyRelation("");
    setFamilySearch("");
    setFamilySearchResults([]);
    setShowFamilyDropdown(false);
    markDirty();
  }

  function removeFamilyMember(idx: number) {
    setFamilyMembers(prev => prev.filter((_, i) => i !== idx));
    markDirty();
  }

  /* Phone validation: allow digits, +, -, spaces, parens */
  function isValidPhone(phone: string): boolean {
    return /^[+]?[\d\s\-().]{7,20}$/.test(phone.trim());
  }

  /* Email validation */
  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  /* Client-side validation */
  function validateForm(data: Record<string, unknown>): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!data.firstName || !(data.firstName as string).trim()) {
      errors.firstName = "First name is required";
    }
    if (!data.lastName || !(data.lastName as string).trim()) {
      errors.lastName = "Last name is required";
    }
    if (!data.gender) {
      errors.gender = "Please select a gender";
    }
    if (!data.phone || !(data.phone as string).trim()) {
      errors.phone = "Phone number is required";
    } else if (!isValidPhone(data.phone as string)) {
      errors.phone = "Enter a valid phone number (e.g., +91 98765 43210)";
    }
    if (data.email && (data.email as string).trim() && !isValidEmail(data.email as string)) {
      errors.email = "Enter a valid email address";
    }
    if (data.secondaryMobile && (data.secondaryMobile as string).trim() && !isValidPhone(data.secondaryMobile as string)) {
      errors.secondaryMobile = "Enter a valid phone number";
    }
    if (data.landline && (data.landline as string).trim() && !isValidPhone(data.landline as string)) {
      errors.landline = "Enter a valid phone number";
    }
    if (data.whatsapp && (data.whatsapp as string).trim() && !isValidPhone(data.whatsapp as string)) {
      errors.whatsapp = "Enter a valid phone number";
    }
    if (data.emergencyPhone && (data.emergencyPhone as string).trim() && !isValidPhone(data.emergencyPhone as string)) {
      errors.emergencyPhone = "Enter a valid phone number";
    }

    return errors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(formData.entries());

    // Client-side validation
    const errors = validateForm(data);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      const el = document.querySelector(`[name="${firstErrorField}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);

    if (dobMode === "age" && data.age) {
      const age = parseInt(data.age as string, 10);
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - age);
      data.dateOfBirth = dob.toISOString().split("T")[0];
      delete data.age;
    }
    data.medicalHistory = JSON.stringify(selectedConditions);
    data.groups = JSON.stringify(selectedGroups);

    // Map Singapore address fields to API fields
    const blockNumber = (data.blockNumber as string) || "";
    const streetName = (data.streetName as string) || "";
    data.address = [blockNumber, streetName].filter(Boolean).join(", ");
    data.unitNumber = data.unitNumber || null;
    data.buildingName = data.buildingName || null;
    data.city = "Singapore";
    data.state = "Singapore";
    data.zipCode = data.postalCode || null;
    // Clean up temporary fields
    delete data.blockNumber;
    delete data.streetName;
    delete data.postalCode;

    try {
      const res = await fetch("/api/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to register patient");
      }
      const patient = await res.json();

      // Save family members
      for (const fm of familyMembers) {
        try {
          await fetch(`/api/patients/${patient.id}/family`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fm),
          });
        } catch { /* non-critical */ }
      }

      // If converting a walk-in, link the appointment to the new patient
      if (prefill.appointmentId) {
        try {
          await fetch(`/api/appointments/${prefill.appointmentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientId: patient.id }),
          });
        } catch {
          // Non-critical — appointment link failed but patient was created
        }
      }

      setSubmitted(true);
      setToast({ message: `Patient ${patient.firstName} ${patient.lastName} registered successfully! (ID: ${patient.patientIdNumber})`, type: "success" });
      // Short delay so user sees the success toast
      setTimeout(() => router.push(`/patients/${patient.id}`), 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register patient. Please try again.";
      setError(message);
      setToast({ message, type: "error" });
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-8 yoda-fade-in">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>New Patient Registration</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Fill in required details to register a new patient</p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-[14px] font-semibold print:hidden transition-colors"
          style={{ color: "var(--blue-500)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Form
        </button>
      </div>

      {prefill.appointmentId && (
        <div className="mb-4 px-4 py-3 text-[15px] font-medium flex items-center gap-2" style={{ background: "#eff6ff", color: "var(--blue-500)", borderRadius: "var(--radius-sm)", border: "1px solid var(--blue-200, #bfdbfe)" }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Converting walk-in patient — name and phone have been pre-filled. Please verify and complete the remaining details.
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 text-[15px] font-medium flex items-center gap-2" style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          {error}
        </div>
      )}

      {Object.keys(fieldErrors).length > 0 && (
        <div className="mb-4 px-4 py-3 text-[15px] font-medium" style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="font-bold mb-1">Please fix the following errors:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {Object.values(fieldErrors).map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} onChange={markDirty} noValidate>
        <div className="flex flex-col lg:flex-row gap-5">
          {/* LEFT COLUMN */}
          <div className="flex-1 space-y-5">
            {/* Patient Details */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Patient Details</h2>

              <div className="space-y-3">
                  {/* Row 1: Photo + First Name + Last Name */}
                  <div className="grid gap-3" style={{ gridTemplateColumns: "auto 1fr 1fr" }}>
                    <div className="row-span-2 flex-shrink-0">
                      <div className="w-20 h-24 flex flex-col items-center justify-center" style={{ background: "var(--grey-100)", border: "2px dashed var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-500)" }}>
                        <svg className="w-7 h-7 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        <span className="text-[11px] font-medium">Photo</span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="firstName" className="block mb-1" style={labelStyle}><span style={{ color: "var(--red)" }}>*</span> First Name</label>
                      <input id="firstName" name="firstName" required defaultValue={prefill.firstName} className="w-full px-3 py-1.5" style={fieldErrors.firstName ? inputErrorStyle : inputStyle} aria-invalid={!!fieldErrors.firstName} aria-describedby={fieldErrors.firstName ? "err-firstName" : undefined} />
                      {fieldErrors.firstName && <p id="err-firstName" className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{fieldErrors.firstName}</p>}
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block mb-1" style={labelStyle}><span style={{ color: "var(--red)" }}>*</span> Last Name</label>
                      <input id="lastName" name="lastName" required defaultValue={prefill.lastName} className="w-full px-3 py-1.5" style={fieldErrors.lastName ? inputErrorStyle : inputStyle} aria-invalid={!!fieldErrors.lastName} aria-describedby={fieldErrors.lastName ? "err-lastName" : undefined} />
                      {fieldErrors.lastName && <p id="err-lastName" className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{fieldErrors.lastName}</p>}
                    </div>
                  </div>
                  {/* Row 2: Patient ID | NRIC | Gender */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block mb-1" style={labelStyle}>Patient ID</label>
                      <input disabled placeholder="Auto-generated" className="w-full px-3 py-1.5" style={{ ...inputStyle, background: "var(--grey-100)", color: "var(--grey-500)" }} />
                    </div>
                    <div>
                      <label htmlFor="nricId" className="block mb-1" style={labelStyle}>NRIC ID</label>
                      <input id="nricId" name="nricId" className="w-full px-3 py-1.5" style={inputStyle} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block mb-1" style={labelStyle}><span style={{ color: "var(--red)" }}>*</span> Gender</label>
                      <div className="flex gap-4 py-1.5" role="radiogroup" aria-label="Gender">
                        {["male", "female", "other"].map((g) => (
                          <label key={g} className="flex items-center gap-1.5 text-[14px] cursor-pointer whitespace-nowrap" style={{ color: "var(--grey-800)" }}>
                            <input type="radio" name="gender" value={g} required /> {g.charAt(0).toUpperCase() + g.slice(1)}
                          </label>
                        ))}
                      </div>
                      <FieldError error={fieldErrors.gender} />
                    </div>
                  </div>
                  {/* Row 3: DOB | Age | Referred By | Blood Group */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block mb-1" style={labelStyle}>Date of Birth</label>
                      {dobMode === "dob" ? (
                        <input name="dateOfBirth" type="date" className="w-full px-3 py-1.5" style={inputStyle} onChange={handleDobChange} />
                      ) : (
                        <input name="age" type="number" min="0" max="150" placeholder="Age" className="w-full px-3 py-1.5" style={inputStyle} />
                      )}
                      <button type="button" onClick={() => { setDobMode(dobMode === "dob" ? "age" : "dob"); setCalculatedAge(""); }} className="text-[12px] font-semibold mt-0.5" style={{ color: "var(--blue-500)" }}>
                        Or enter {dobMode === "dob" ? "age" : "DOB"}
                      </button>
                    </div>
                    <div>
                      <label className="block mb-1" style={labelStyle}>Age</label>
                      <div className="py-1.5">
                        {calculatedAge ? (
                          <span className="text-[14px] font-semibold" style={{ color: "var(--blue-500)" }}>{calculatedAge}</span>
                        ) : (
                          <span className="text-[14px]" style={{ color: "var(--grey-400)" }}>--</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1" style={labelStyle}>Referred by</label>
                      <div className="flex items-center gap-1">
                        {showNewReferral ? (
                          <input name="referredBy" placeholder="Enter referral" className="flex-1 px-3 py-1.5" style={inputStyle} />
                        ) : (
                          <select name="referredBy" className="flex-1 px-3 py-1.5" style={inputStyle}>
                            <option value="">Select</option>
                            {REFERRAL_SOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        )}
                        <button type="button" onClick={() => setShowNewReferral(!showNewReferral)} className="text-[12px] font-semibold whitespace-nowrap" style={{ color: "var(--blue-500)" }}>
                          {showNewReferral ? "List" : "+"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="bloodGroup" className="block mb-1" style={labelStyle}>Blood Group</label>
                      <select id="bloodGroup" name="bloodGroup" className="w-full px-3 py-1.5" style={inputStyle}>
                        <option value="">Select</option>
                        {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Row 4: Ethnicity | Nationality | Occupation */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="ethnicity" className="block mb-1" style={labelStyle}>Ethnicity</label>
                      <select id="ethnicity" name="ethnicity" className="w-full px-3 py-1.5" style={inputStyle}>
                        <option value="">Select ethnicity</option>
                        {ETHNICITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="nationality" className="block mb-1" style={labelStyle}>Nationality</label>
                      <select id="nationality" name="nationality" className="w-full px-3 py-1.5" style={inputStyle}>
                        <option value="">Select</option>
                        {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1" style={labelStyle}>Occupation</label>
                      <div className="flex items-center gap-1">
                        {showNewOccupation ? (
                          <input name="occupation" placeholder="Enter occupation" className="flex-1 px-3 py-1.5" style={inputStyle} />
                        ) : (
                          <select name="occupation" className="flex-1 px-3 py-1.5" style={inputStyle}>
                            <option value="">Select occupation</option>
                            {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        )}
                        <button type="button" onClick={() => setShowNewOccupation(!showNewOccupation)} className="text-[12px] font-semibold whitespace-nowrap" style={{ color: "var(--blue-500)" }}>
                          {showNewOccupation ? "List" : "+"}
                        </button>
                      </div>
                    </div>
                  </div>
              </div>

              {/* Row 5: Family (full width) */}
              <div>
                <label className="block mb-1" style={labelStyle}>Family</label>

                {/* Added members list */}
                {familyMembers.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {familyMembers.map((fm, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)" }}>
                        <span className="text-[15px] font-semibold" style={{ color: "var(--grey-700)" }}>
                          {genderRelationLabel(fm.relation, fm.memberGender)}
                        </span>
                        <span className="text-[15px]" style={{ color: "var(--grey-500)" }}>:</span>
                        <span className="text-[15px] font-semibold flex-1" style={{ color: "var(--blue-500)" }}>
                          {fm.memberName}
                        </span>
                        {fm.memberPhone && (
                          <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>{fm.memberPhone}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFamilyMember(idx)}
                          className="text-[16px] font-bold leading-none hover:opacity-70"
                          style={{ color: "var(--grey-400)" }}
                          aria-label={`Remove ${fm.memberName}`}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new member row */}
                <div className="flex gap-2" ref={familySearchRef}>
                  <select
                    value={familyRelation}
                    onChange={(e) => { setFamilyRelation(e.target.value); setFamilySearch(""); setFamilySearchResults([]); }}
                    className="w-1/3 px-2 py-2"
                    style={inputStyle}
                    aria-label="Family relation"
                  >
                    <option value="">Relation</option>
                    {FAMILY_RELATIONS.map((r) => (
                      <option key={r} value={r}>{RELATION_LABELS[r]}</option>
                    ))}
                  </select>

                  <div className="flex-1 relative">
                    <input
                      value={familySearch}
                      onChange={(e) => { setFamilySearch(e.target.value); if (e.target.value.length >= 2) setShowFamilyDropdown(true); }}
                      onFocus={() => { if (familySearchResults.length > 0) setShowFamilyDropdown(true); }}
                      placeholder={familyRelation ? "Search patient by name, phone, or ID..." : "Select relation first"}
                      disabled={!familyRelation}
                      className="w-full px-3 py-2"
                      style={inputStyle}
                      aria-label="Search family member"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addManualFamilyMember(); }
                      }}
                    />

                    {/* Search results dropdown */}
                    {showFamilyDropdown && familyRelation && familySearch.length >= 2 && (
                      <div
                        className="absolute z-20 left-0 right-0 mt-1 max-h-52 overflow-y-auto"
                        style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
                      >
                        {familySearchLoading ? (
                          <div className="px-3 py-2 text-[14px]" style={{ color: "var(--grey-500)" }}>Searching...</div>
                        ) : familySearchResults.length > 0 ? (
                          familySearchResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => addFamilyMember(p)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2"
                              style={{ borderBottom: "1px solid var(--grey-100)" }}
                            >
                              <div className="flex-1 min-w-0">
                                <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>
                                  {p.firstName} {p.lastName}
                                </span>
                                <span className="text-[13px] ml-2" style={{ color: "var(--grey-500)" }}>
                                  {p.patientIdNumber} · {p.phone}
                                  {p.gender ? ` · ${p.gender.charAt(0).toUpperCase() + p.gender.slice(1)}` : ""}
                                </span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2">
                            <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No patients found</p>
                            <button
                              type="button"
                              onClick={addManualFamilyMember}
                              className="text-[14px] font-semibold mt-1"
                              style={{ color: "var(--blue-500)" }}
                            >
                              + Add &quot;{familySearch}&quot; as manual entry
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>
                  Select relation, then search for an existing patient or type a name and press Enter
                </p>
              </div>
            </div>

            {/* Contact Details */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Contact Details</h2>
              <div className="space-y-3">
                {/* Row 1: Primary Mobile | Secondary Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="phone" className="block mb-1" style={labelStyle}><span style={{ color: "var(--red)" }}>*</span> Primary Mobile No.</label>
                    <input id="phone" name="phone" type="tel" required defaultValue={prefill.phone} placeholder="+65 9123 4567" className="w-full px-3 py-2" style={fieldErrors.phone ? inputErrorStyle : inputStyle} aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? "err-phone" : undefined} />
                    {fieldErrors.phone && <p id="err-phone" className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{fieldErrors.phone}</p>}
                  </div>
                  <div>
                    <label htmlFor="secondaryMobile" className="block mb-1" style={labelStyle}>Secondary Mobile No.</label>
                    <input id="secondaryMobile" name="secondaryMobile" type="tel" className="w-full px-3 py-2" style={fieldErrors.secondaryMobile ? inputErrorStyle : inputStyle} />
                    <FieldError error={fieldErrors.secondaryMobile} />
                  </div>
                </div>
                {/* Row 2: Landline | WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="landline" className="block mb-1" style={labelStyle}>Land Line Nos.</label>
                    <input id="landline" name="landline" type="tel" className="w-full px-3 py-2" style={fieldErrors.landline ? inputErrorStyle : inputStyle} />
                    <FieldError error={fieldErrors.landline} />
                  </div>
                  <div>
                    <label htmlFor="whatsapp" className="block mb-1" style={labelStyle}>WhatsApp Number</label>
                    <input id="whatsapp" name="whatsapp" type="tel" placeholder="Same as primary if blank" className="w-full px-3 py-2" style={fieldErrors.whatsapp ? inputErrorStyle : inputStyle} />
                    <FieldError error={fieldErrors.whatsapp} />
                  </div>
                </div>
                {/* Row 3: Email (full width) */}
                <div>
                  <label htmlFor="email" className="block mb-1" style={labelStyle}>Email Address</label>
                  <input id="email" name="email" type="email" placeholder="patient@example.com" className="w-full px-3 py-2" style={fieldErrors.email ? inputErrorStyle : inputStyle} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "err-email" : undefined} />
                  {fieldErrors.email && <p id="err-email" className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{fieldErrors.email}</p>}
                </div>
                {/* Row 4: Block/House No. | Street Name */}
                <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 3fr" }}>
                  <div>
                    <label htmlFor="blockNumber" className="block mb-1" style={labelStyle}>Blk / House No.</label>
                    <input id="blockNumber" name="blockNumber" placeholder="e.g., 84" className="w-full px-3 py-1.5" style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="streetName" className="block mb-1" style={labelStyle}>Street Name</label>
                    <input id="streetName" name="streetName" placeholder="e.g., Bedok North Street 4" className="w-full px-3 py-1.5" style={inputStyle} />
                  </div>
                </div>
                {/* Row 5: Unit No. | Building Name | Postal Code */}
                <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 2fr 1fr" }}>
                  <div>
                    <label htmlFor="unitNumber" className="block mb-1" style={labelStyle}>Unit No.</label>
                    <input id="unitNumber" name="unitNumber" placeholder="e.g., #01-17" className="w-full px-3 py-1.5" style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="buildingName" className="block mb-1" style={labelStyle}>Building Name</label>
                    <input id="buildingName" name="buildingName" placeholder="Optional" className="w-full px-3 py-1.5" style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block mb-1" style={labelStyle}>Postal Code</label>
                    <input id="postalCode" name="postalCode" placeholder="e.g., 460084" maxLength={6} pattern="[0-9]{6}" className="w-full px-3 py-1.5" style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Emergency Contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="emergencyName" className="block mb-1" style={labelStyle}>Contact Name</label>
                  <input id="emergencyName" name="emergencyName" className="w-full px-3 py-1.5" style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="emergencyPhone" className="block mb-1" style={labelStyle}>Contact Phone</label>
                  <input id="emergencyPhone" name="emergencyPhone" type="tel" className="w-full px-3 py-2" style={fieldErrors.emergencyPhone ? inputErrorStyle : inputStyle} />
                  <FieldError error={fieldErrors.emergencyPhone} />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:w-[360px] space-y-5">
            {/* Medical History */}
            <div className="p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: "1px solid var(--grey-200)" }}>
                <h2 style={sectionTitle}>Medical History</h2>
                <button type="button" onClick={() => { const n = prompt("New condition:"); if (n?.trim()) { setCustomConditions((p) => [...p, n.trim()]); setSelectedConditions((p) => [...p, n.trim()]); markDirty(); } }} className="text-[14px] font-semibold" style={{ color: "var(--blue-500)" }}>+ Add New</button>
              </div>
              <input
                type="text" placeholder="Search conditions..." value={conditionSearch} onChange={(e) => setConditionSearch(e.target.value)}
                className="w-full px-3 py-2 mb-3" style={inputStyle} aria-label="Search medical conditions"
              />
              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {filteredConditions.map((c) => (
                  <label key={c} className="flex items-center gap-2.5 py-1.5 px-2 cursor-pointer transition-colors" style={{ borderRadius: "var(--radius-sm)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <input type="checkbox" checked={selectedConditions.includes(c)} onChange={() => toggleCondition(c)} />
                    <span className="text-[15px]" style={{ color: "var(--grey-800)" }}>{c}</span>
                  </label>
                ))}
                {filteredConditions.length === 0 && (
                  <div className="text-center py-3">
                    <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No match</p>
                    <button type="button" onClick={() => { if (conditionSearch.trim()) { setCustomConditions((p) => [...p, conditionSearch.trim()]); setSelectedConditions((p) => [...p, conditionSearch.trim()]); setConditionSearch(""); markDirty(); } }} className="text-[13px] font-semibold mt-1" style={{ color: "var(--blue-500)" }}>
                      + Add &quot;{conditionSearch}&quot;
                    </button>
                  </div>
                )}
              </div>
              {selectedConditions.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--grey-200)" }}>
                  <p className="text-[12px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--grey-600)" }}>Selected ({selectedConditions.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedConditions.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 text-[13px] font-semibold" style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-pill)" }}>
                        {c}
                        <button type="button" onClick={() => toggleCondition(c)} className="hover:opacity-70" aria-label={`Remove ${c}`}>&times;</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Other History */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-3 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Other History</h2>
              <textarea name="otherHistory" rows={3} placeholder="Enter any other medical history..." className="w-full px-3 py-1.5" style={inputStyle} aria-label="Other medical history" />
            </div>

            {/* Allergies */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-3 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Allergies</h2>
              <textarea name="allergies" rows={2} placeholder="List any known allergies..." className="w-full px-3 py-1.5" style={inputStyle} aria-label="Known allergies" />
            </div>

            {/* Groups */}
            <div className="p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: "1px solid var(--grey-200)" }}>
                <h2 style={sectionTitle}>Groups</h2>
                <button type="button" onClick={() => { const n = prompt("New group:"); if (n?.trim()) { setCustomGroups((p) => [...p, n.trim()]); setSelectedGroups((p) => [...p, n.trim()]); markDirty(); } }} className="text-[14px] font-semibold" style={{ color: "var(--blue-500)" }}>+ Add New</button>
              </div>
              <div className="space-y-0.5">
                {allGroups.map((g) => (
                  <label key={g} className="flex items-center gap-2.5 py-1.5 px-2 cursor-pointer transition-colors" style={{ borderRadius: "var(--radius-sm)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <input type="checkbox" checked={selectedGroups.includes(g)} onChange={() => toggleGroup(g)} />
                    <span className="text-[15px]" style={{ color: "var(--grey-800)" }}>{g}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Medical Notes */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-3 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Medical Notes</h2>
              <textarea name="medicalNotes" rows={3} placeholder="Any relevant medical notes..." className="w-full px-3 py-1.5" style={inputStyle} aria-label="Medical notes" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-3 sticky bottom-0 py-4 print:hidden" style={{ background: "var(--background)" }}>
          <button
            type="submit" disabled={saving}
            className="inline-flex items-center gap-2 text-white px-6 py-2.5 text-[15px] font-semibold transition-colors duration-150 disabled:opacity-50"
            style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "var(--blue-700)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--blue-500)"; }}
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            )}
            {saving ? "Saving..." : "Save Patient"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isDirty && !confirm("You have unsaved changes. Are you sure you want to leave?")) return;
              router.back();
            }}
            className="px-6 py-2.5 text-[15px] font-semibold transition-colors duration-150"
            style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-100)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--white)"; }}
          >
            Cancel
          </button>
          {isDirty && !submitted && (
            <span className="text-[13px] font-medium" style={{ color: "var(--grey-500)" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: "var(--orange, #f59e0b)" }} />
              Unsaved changes
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
