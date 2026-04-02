"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validateName } from "@/lib/validation";
import Toast from "@/components/Toast";

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
const fieldMaxWidth = "350px";
const inputStyle = {
  border: "1px solid var(--grey-400)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-900)",
  background: "var(--white)",
  fontSize: "15px",
  maxWidth: fieldMaxWidth,
};
const inputErrorStyle = {
  ...inputStyle,
  border: "1px solid var(--red)",
  background: "#fff5f5",
  maxWidth: fieldMaxWidth,
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

/* Duplicate warning banner */
function DuplicateWarning({ field, match, severity, onOverride, onGoToPatient }: {
  field: string;
  match: { id: string; firstName: string; lastName: string; patientIdNumber: string; phone?: string; lastVisit?: string | null };
  severity: "hard" | "soft";
  onOverride: () => void;
  onGoToPatient: (id: string) => void;
}) {
  const icoColor = severity === "hard" ? "var(--red)" : "var(--orange, #f59e0b)";
  const bgColor = severity === "hard" ? "#fef2f2" : "#fffbeb";
  const borderColor = severity === "hard" ? "#fecaca" : "#fde68a";
  const labelMap: Record<string, string> = { nricId: "NRIC/ID", phone: "phone number", email: "email" };
  return (
    <div className="mt-1.5 px-3 py-2 text-[13px] flex flex-col gap-1.5" style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: "var(--radius-sm)" }}>
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke={icoColor} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="flex-1">
          <p className="font-semibold" style={{ color: "var(--grey-900)" }}>
            This {labelMap[field] || field} is already registered to{" "}
            <span style={{ color: "var(--blue-500)" }}>{match.firstName} {match.lastName}</span>{" "}
            <span style={{ color: "var(--grey-500)" }}>({match.patientIdNumber})</span>
          </p>
          {match.lastVisit && (
            <p style={{ color: "var(--grey-600)" }}>Last visit: {match.lastVisit}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 ml-6">
        <button
          type="button"
          onClick={() => onGoToPatient(match.id)}
          className="text-[13px] font-semibold px-2.5 py-1 rounded transition-colors"
          style={{ background: "var(--blue-500)", color: "white", borderRadius: "var(--radius-sm)" }}
        >
          Open Existing Profile
        </button>
        {severity === "soft" && (
          <button
            type="button"
            onClick={onOverride}
            className="text-[13px] font-medium px-2.5 py-1 rounded transition-colors"
            style={{ background: "var(--white)", border: "1px solid var(--grey-300)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)" }}
          >
            Different person, continue
          </button>
        )}
        {severity === "hard" && (
          <button
            type="button"
            onClick={onOverride}
            className="text-[13px] font-medium px-2.5 py-1 rounded transition-colors"
            style={{ background: "var(--white)", border: "1px solid var(--grey-300)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)" }}
          >
            ID may be wrong, continue anyway
          </button>
        )}
      </div>
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

  // Duplicate detection state
  interface DuplicateMatch {
    id: string;
    firstName: string;
    lastName: string;
    patientIdNumber: string;
    phone?: string;
    lastVisit?: string | null;
  }
  const [duplicates, setDuplicates] = useState<Record<string, DuplicateMatch | null>>({
    nricId: null,
    phone: null,
    email: null,
  });
  const [duplicateOverrides, setDuplicateOverrides] = useState<Record<string, boolean>>({
    nricId: false,
    phone: false,
    email: false,
  });
  const duplicateCheckTimers = useRef<Record<string, NodeJS.Timeout>>({});
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

  // Duplicate check — debounced, called on blur or after typing stops
  const checkDuplicate = useCallback((field: string, value: string) => {
    // Clear previous timer for this field
    if (duplicateCheckTimers.current[field]) {
      clearTimeout(duplicateCheckTimers.current[field]);
    }
    const trimmed = value.trim();
    if (!trimmed || (field === "phone" && trimmed.replace(/\D/g, "").length < 7)) {
      setDuplicates(prev => ({ ...prev, [field]: null }));
      setDuplicateOverrides(prev => ({ ...prev, [field]: false }));
      return;
    }
    duplicateCheckTimers.current[field] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients/check-duplicate?field=${field}&value=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.duplicate && data.patient) {
            setDuplicates(prev => ({ ...prev, [field]: data.patient }));
            setDuplicateOverrides(prev => ({ ...prev, [field]: false }));
          } else {
            setDuplicates(prev => ({ ...prev, [field]: null }));
          }
        }
      } catch { /* ignore network errors */ }
    }, 400);
  }, []);

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

  /* Phone validation: Singapore (8 digits starting with 6/8/9), India (10 digits starting with 6-9), or international (+XX...) */
  function isValidPhone(phone: string): boolean {
    const cleaned = phone.trim().replace(/[\s\-().]/g, "");
    if (!cleaned) return false;
    // International format: +countryCode + number (min 8 digits total after +)
    if (/^\+\d{8,15}$/.test(cleaned)) return true;
    // Singapore local: 8 digits starting with 6, 8, or 9
    if (/^[689]\d{7}$/.test(cleaned)) return true;
    // Singapore with country code (no +): 65XXXXXXXX
    if (/^65[689]\d{7}$/.test(cleaned)) return true;
    // India local: 10 digits starting with 6-9
    if (/^[6-9]\d{9}$/.test(cleaned)) return true;
    // India with country code (no +): 91XXXXXXXXXX
    if (/^91[6-9]\d{9}$/.test(cleaned)) return true;
    // Landline: allow broader pattern (6-digit+ with optional area code)
    if (/^\d{6,12}$/.test(cleaned)) return true;
    return false;
  }

  /* Email validation */
  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  /**
   * Singapore NRIC/FIN validation
   * Format: 1 letter prefix + 7 digits + 1 letter checksum = 9 characters
   * Prefixes: S/T (citizens/PRs born before/after 2000), F/G/M (foreigners)
   * Checksum: Weighted sum algorithm determines the final check letter
   */
  function validateNRIC(nric: string): { valid: boolean; error?: string } {
    const trimmed = nric.trim().toUpperCase();
    if (!trimmed) return { valid: true }; // Empty is OK (optional field)

    // Basic format: 1 letter + 7 digits + 1 letter
    if (!/^[STFGM]\d{7}[A-Z]$/i.test(trimmed)) {
      if (trimmed.length !== 9) {
        return { valid: false, error: `NRIC must be exactly 9 characters (currently ${trimmed.length})` };
      }
      if (!/^[STFGM]/i.test(trimmed)) {
        return { valid: false, error: "NRIC must start with S, T, F, G, or M" };
      }
      if (!/\d{7}/.test(trimmed.slice(1, 8))) {
        return { valid: false, error: "NRIC must have 7 digits after the prefix letter" };
      }
      if (!/[A-Z]$/i.test(trimmed)) {
        return { valid: false, error: "NRIC must end with a letter" };
      }
      return { valid: false, error: "Invalid NRIC format. Expected: S1234567A" };
    }

    // Checksum validation
    const prefix = trimmed[0];
    const digits = trimmed.slice(1, 8).split("").map(Number);
    const weights = [2, 7, 6, 5, 4, 3, 2];
    let sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);

    // Offset for T/G prefixes (born 2000+)
    if (prefix === "T" || prefix === "G") sum += 4;
    if (prefix === "M") sum += 3;

    const remainder = sum % 11;

    let checkLetters: string[];
    if (prefix === "S" || prefix === "T") {
      checkLetters = ["J", "Z", "I", "H", "G", "F", "E", "D", "C", "B", "A"];
    } else {
      // F, G, M
      checkLetters = ["X", "W", "U", "T", "R", "Q", "P", "N", "M", "L", "K"];
    }

    const expectedCheck = checkLetters[remainder];
    const actualCheck = trimmed[8];

    if (actualCheck !== expectedCheck) {
      return { valid: false, error: "Invalid NRIC checksum — please verify the ID number" };
    }

    return { valid: true };
  }

  /* Client-side validation */
  function validateForm(data: Record<string, unknown>): Record<string, string> {
    const errors: Record<string, string> = {};

    const fnCheck = validateName((data.firstName as string) ?? "", "First name");
    if (!fnCheck.valid) errors.firstName = fnCheck.error!;
    const lnCheck = validateName((data.lastName as string) ?? "", "Last name");
    if (!lnCheck.valid) errors.lastName = lnCheck.error!;
    if (!data.gender) {
      errors.gender = "Please select a gender";
    }
    if (data.nricId && (data.nricId as string).trim()) {
      const nricResult = validateNRIC(data.nricId as string);
      if (!nricResult.valid) {
        errors.nricId = nricResult.error || "Invalid NRIC format";
      }
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

    // Cross-field phone validation
    const stripPhone = (p: string) => p.replace(/[\s\-().]/g, "");
    const primaryNorm = data.phone ? stripPhone((data.phone as string).trim()) : "";
    if (data.secondaryMobile && (data.secondaryMobile as string).trim()) {
      const secNorm = stripPhone((data.secondaryMobile as string).trim());
      if (secNorm && primaryNorm && (secNorm === primaryNorm || secNorm.endsWith(primaryNorm) || primaryNorm.endsWith(secNorm))) {
        errors.secondaryMobile = "Secondary mobile cannot be the same as primary mobile";
      }
    }
    if (data.emergencyPhone && (data.emergencyPhone as string).trim() && !errors.emergencyPhone) {
      const emNorm = stripPhone((data.emergencyPhone as string).trim());
      if (emNorm && primaryNorm && (emNorm === primaryNorm || emNorm.endsWith(primaryNorm) || primaryNorm.endsWith(emNorm))) {
        errors.emergencyPhone = "Emergency contact should be different from the patient's own number";
      }
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

    // Check for unresolved duplicate warnings
    if (duplicates.nricId && !duplicateOverrides.nricId) {
      const el = document.querySelector('[name="nricId"]');
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setToast({ message: "Please resolve the NRIC duplicate warning before saving.", type: "error" });
      return;
    }
    if (duplicates.phone && !duplicateOverrides.phone) {
      const el = document.querySelector('[name="phone"]');
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setToast({ message: "Please resolve the phone number duplicate warning before saving.", type: "error" });
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
        <div className="mb-4 px-4 py-3 text-[15px] font-medium flex items-center gap-2" style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-sm)", border: "1px solid var(--blue-200)" }}>
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

              <div className="space-y-4">
                  {/* Each field: label left, input right */}
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <label htmlFor="firstName" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>First Name <span style={{ color: "var(--red)" }}>*</span> :</label>
                    <div className="flex-1">
                      <input id="firstName" name="firstName" required defaultValue={prefill.firstName} className="w-full px-3 py-2" style={fieldErrors.firstName ? inputErrorStyle : inputStyle} aria-invalid={!!fieldErrors.firstName} />
                      {fieldErrors.firstName && <p className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{fieldErrors.firstName}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <label htmlFor="lastName" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Last Name <span style={{ color: "var(--red)" }}>*</span> :</label>
                    <div className="flex-1">
                      <input id="lastName" name="lastName" required defaultValue={prefill.lastName} className="w-full px-3 py-2" style={fieldErrors.lastName ? inputErrorStyle : inputStyle} aria-invalid={!!fieldErrors.lastName} />
                      {fieldErrors.lastName && <p className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{fieldErrors.lastName}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                    <label htmlFor="nricId" className="w-full md:w-40 md:text-right flex-shrink-0 md:pt-2" style={labelStyle}>NRIC ID :</label>
                    <div className="flex-1">
                      <input id="nricId" name="nricId" className="w-full px-3 py-2" style={fieldErrors.nricId ? inputErrorStyle : inputStyle}
                        placeholder="e.g. S1234567A" maxLength={9} aria-invalid={!!fieldErrors.nricId}
                        onBlur={(e) => {
                          // Validate on blur
                          const val = e.target.value.trim();
                          if (val) {
                            const result = validateNRIC(val);
                            if (!result.valid) {
                              setFieldErrors(prev => ({ ...prev, nricId: result.error || "Invalid NRIC" }));
                              setDuplicates(prev => ({ ...prev, nricId: null }));
                            } else {
                              setFieldErrors(prev => { const n = { ...prev }; delete n.nricId; return n; });
                              checkDuplicate("nricId", val);
                            }
                          } else {
                            setFieldErrors(prev => { const n = { ...prev }; delete n.nricId; return n; });
                            setDuplicates(prev => ({ ...prev, nricId: null }));
                          }
                        }}
                        onChange={(e) => {
                          // Auto-uppercase
                          e.target.value = e.target.value.toUpperCase();
                          markDirty();
                          // Clear error and duplicate while typing
                          if (fieldErrors.nricId) {
                            setFieldErrors(prev => { const n = { ...prev }; delete n.nricId; return n; });
                          }
                          setDuplicates(prev => ({ ...prev, nricId: null }));
                          // Only check duplicate if format is valid (9 chars)
                          const val = e.target.value.trim();
                          if (val.length === 9) {
                            const result = validateNRIC(val);
                            if (result.valid) {
                              checkDuplicate("nricId", val);
                            } else {
                              setFieldErrors(prev => ({ ...prev, nricId: result.error || "Invalid NRIC" }));
                            }
                          }
                        }}
                      />
                      {fieldErrors.nricId && <p className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{fieldErrors.nricId}</p>}
                      {!fieldErrors.nricId && duplicates.nricId && !duplicateOverrides.nricId && (
                        <DuplicateWarning
                          field="nricId"
                          match={duplicates.nricId}
                          severity="hard"
                          onOverride={() => setDuplicateOverrides(prev => ({ ...prev, nricId: true }))}
                          onGoToPatient={(id) => router.push(`/patients/${id}`)}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <label className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Gender <span style={{ color: "var(--red)" }}>*</span> :</label>
                    <div className="flex-1">
                      <div className="flex gap-5 py-1" role="radiogroup" aria-label="Gender">
                        {["male", "female", "other"].map((g) => (
                          <label key={g} className="flex items-center gap-1.5 text-[15px] cursor-pointer" style={{ color: "var(--grey-800)" }}>
                            <input type="radio" name="gender" value={g} required /> {g.charAt(0).toUpperCase() + g.slice(1)}
                          </label>
                        ))}
                      </div>
                      <FieldError error={fieldErrors.gender} />
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <label className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Date of Birth :</label>
                    <div className="flex-1">
                      {dobMode === "dob" ? (
                        <input name="dateOfBirth" type="date" className="w-full px-3 py-2" style={inputStyle} onChange={handleDobChange} />
                      ) : (
                        <input name="age" type="number" min="0" max="150" placeholder="Age" className="w-full px-3 py-2" style={inputStyle} />
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <button type="button" onClick={() => { setDobMode(dobMode === "dob" ? "age" : "dob"); setCalculatedAge(""); }} className="text-[12px] font-semibold" style={{ color: "var(--blue-500)" }}>
                          Or enter {dobMode === "dob" ? "age" : "DOB"}
                        </button>
                        {calculatedAge && <span className="text-[13px] font-semibold" style={{ color: "var(--blue-500)" }}>Age: {calculatedAge}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <label htmlFor="bloodGroup" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Blood Group :</label>
                    <select id="bloodGroup" name="bloodGroup" className="flex-1 px-3 py-2" style={inputStyle}>
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <label className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Referred by :</label>
                    <div className="flex-1 flex items-center gap-1">
                      {showNewReferral ? (
                        <input name="referredBy" placeholder="Enter referral" className="flex-1 px-3 py-2" style={inputStyle} />
                      ) : (
                        <select name="referredBy" className="flex-1 px-3 py-2" style={inputStyle}>
                          <option value="">Select</option>
                          {REFERRAL_SOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                      <button type="button" onClick={() => setShowNewReferral(!showNewReferral)} className="text-[12px] font-semibold whitespace-nowrap" style={{ color: "var(--blue-500)" }}>
                        {showNewReferral ? "List" : "+"}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                    <label className="w-full md:w-40 md:text-right flex-shrink-0 md:pt-2" style={labelStyle}>Family :</label>
                    <div className="flex-1">
                      {familyMembers.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {familyMembers.map((fm, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)" }}>
                              <span className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>{genderRelationLabel(fm.relation, fm.memberGender)}</span>
                              <span style={{ color: "var(--grey-400)" }}>:</span>
                              <span className="text-[14px] font-semibold flex-1" style={{ color: "var(--blue-500)" }}>{fm.memberName}</span>
                              {fm.memberPhone && <span className="text-[12px]" style={{ color: "var(--grey-500)" }}>{fm.memberPhone}</span>}
                              <button type="button" onClick={() => removeFamilyMember(idx)} className="text-[16px] font-bold leading-none hover:opacity-70" style={{ color: "var(--grey-400)" }} aria-label={`Remove ${fm.memberName}`}>&times;</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2" ref={familySearchRef}>
                        <select value={familyRelation} onChange={(e) => { setFamilyRelation(e.target.value); setFamilySearch(""); setFamilySearchResults([]); }} className="w-1/3 px-2 py-2" style={inputStyle} aria-label="Family relation">
                          <option value="">Relation</option>
                          {FAMILY_RELATIONS.map((r) => <option key={r} value={r}>{RELATION_LABELS[r]}</option>)}
                        </select>
                        <div className="flex-1 relative">
                          <input value={familySearch} onChange={(e) => { setFamilySearch(e.target.value); if (e.target.value.length >= 2) setShowFamilyDropdown(true); }} onFocus={() => { if (familySearchResults.length > 0) setShowFamilyDropdown(true); }} placeholder={familyRelation ? "Search patient by name, phone, or ID..." : "Select relation first"} disabled={!familyRelation} className="w-full px-3 py-2" style={inputStyle} aria-label="Search family member" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManualFamilyMember(); } }} />
                          {showFamilyDropdown && familyRelation && familySearch.length >= 2 && (
                            <div className="absolute z-20 left-0 right-0 mt-1 max-h-52 overflow-y-auto" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                              {familySearchLoading ? (
                                <div className="px-3 py-2 text-[14px]" style={{ color: "var(--grey-500)" }}>Searching...</div>
                              ) : familySearchResults.length > 0 ? (
                                familySearchResults.map((p) => (
                                  <button key={p.id} type="button" onClick={() => addFamilyMember(p)} className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors flex items-center gap-2" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                                    <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{p.firstName} {p.lastName}</span>
                                    <span className="text-[12px]" style={{ color: "var(--grey-500)" }}>{p.patientIdNumber} · {p.phone}</span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-2">
                                  <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No patients found</p>
                                  <button type="button" onClick={addManualFamilyMember} className="text-[13px] font-semibold mt-1" style={{ color: "var(--blue-500)" }}>+ Add &quot;{familySearch}&quot; as manual entry</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>Select relation, then search for an existing patient or type a name and press Enter</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <label htmlFor="ethnicity" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Ethnicity :</label>
                    <select id="ethnicity" name="ethnicity" className="flex-1 px-3 py-2" style={inputStyle}>
                      <option value="">Select ethnicity</option>
                      {ETHNICITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <label htmlFor="nationality" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Nationality :</label>
                    <select id="nationality" name="nationality" className="flex-1 px-3 py-2" style={inputStyle}>
                      <option value="">Select</option>
                      {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <label className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Occupation :</label>
                    <div className="flex-1 flex items-center gap-1" style={{ maxWidth: fieldMaxWidth }}>
                      {showNewOccupation ? (
                        <input name="occupation" placeholder="Enter occupation" className="flex-1 px-3 py-2" style={inputStyle} />
                      ) : (
                        <select name="occupation" className="flex-1 px-3 py-2" style={inputStyle}>
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

              {/* Family section moved inline above */}
            </div>

            {/* Contact Details */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Contact Details</h2>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                  <label htmlFor="phone" className="w-full md:w-40 md:text-right flex-shrink-0 md:pt-2" style={labelStyle}>Mobile <span style={{ color: "var(--red)" }}>*</span> :</label>
                  <div className="flex-1">
                    <input id="phone" name="phone" type="tel" required defaultValue={prefill.phone} placeholder="+65 9123 4567" className="w-full px-3 py-2" style={fieldErrors.phone ? inputErrorStyle : inputStyle}
                      onBlur={(e) => checkDuplicate("phone", e.target.value)}
                      onChange={(e) => { markDirty(); checkDuplicate("phone", e.target.value); }}
                    />
                    {fieldErrors.phone && <p className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{fieldErrors.phone}</p>}
                    {duplicates.phone && !duplicateOverrides.phone && (
                      <DuplicateWarning
                        field="phone"
                        match={duplicates.phone}
                        severity="soft"
                        onOverride={() => setDuplicateOverrides(prev => ({ ...prev, phone: true }))}
                        onGoToPatient={(id) => router.push(`/patients/${id}`)}
                      />
                    )}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <label htmlFor="secondaryMobile" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Secondary Mobile :</label>
                  <div className="flex-1">
                    <input id="secondaryMobile" name="secondaryMobile" type="tel" className="w-full px-3 py-2" style={fieldErrors.secondaryMobile ? inputErrorStyle : inputStyle} />
                    <FieldError error={fieldErrors.secondaryMobile} />
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <label htmlFor="landline" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Landline :</label>
                  <div className="flex-1">
                    <input id="landline" name="landline" type="tel" className="w-full px-3 py-2" style={fieldErrors.landline ? inputErrorStyle : inputStyle} />
                    <FieldError error={fieldErrors.landline} />
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                  <label htmlFor="email" className="w-full md:w-40 md:text-right flex-shrink-0 md:pt-2" style={labelStyle}>Email Address :</label>
                  <div className="flex-1">
                    <input id="email" name="email" type="email" placeholder="patient@example.com" className="w-full px-3 py-2" style={fieldErrors.email ? inputErrorStyle : inputStyle}
                      onBlur={(e) => checkDuplicate("email", e.target.value)}
                      onChange={(e) => { markDirty(); checkDuplicate("email", e.target.value); }}
                    />
                    {fieldErrors.email && <p className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{fieldErrors.email}</p>}
                    {duplicates.email && !duplicateOverrides.email && (
                      <DuplicateWarning
                        field="email"
                        match={duplicates.email}
                        severity="soft"
                        onOverride={() => setDuplicateOverrides(prev => ({ ...prev, email: true }))}
                        onGoToPatient={(id) => router.push(`/patients/${id}`)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Address</h2>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <label htmlFor="blockNumber" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Blk / House No. :</label>
                  <input id="blockNumber" name="blockNumber" placeholder="e.g., 84" className="flex-1 px-3 py-2" style={inputStyle} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <label htmlFor="streetName" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Street Name :</label>
                  <input id="streetName" name="streetName" placeholder="e.g., Bedok North Street 4" className="flex-1 px-3 py-2" style={inputStyle} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <label htmlFor="unitNumber" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Unit No. :</label>
                  <input id="unitNumber" name="unitNumber" placeholder="e.g., #01-17" className="flex-1 px-3 py-2" style={inputStyle} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <label htmlFor="buildingName" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Building Name :</label>
                  <input id="buildingName" name="buildingName" placeholder="Optional" className="flex-1 px-3 py-2" style={inputStyle} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <label htmlFor="postalCode" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Postal Code :</label>
                  <input id="postalCode" name="postalCode" placeholder="e.g., 460084" maxLength={6} pattern="[0-9]{6}" className="flex-1 px-3 py-2" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-4 pb-3" style={{ ...sectionTitle, borderBottom: "1px solid var(--grey-200)" }}>Emergency Contact</h2>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <label htmlFor="emergencyName" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Contact Name :</label>
                  <input id="emergencyName" name="emergencyName" className="flex-1 px-3 py-2" style={inputStyle} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <label htmlFor="emergencyPhone" className="w-full md:w-40 md:text-right flex-shrink-0" style={labelStyle}>Contact Phone :</label>
                  <div className="flex-1">
                    <input id="emergencyPhone" name="emergencyPhone" type="tel" className="w-full px-3 py-2" style={fieldErrors.emergencyPhone ? inputErrorStyle : inputStyle} />
                    <FieldError error={fieldErrors.emergencyPhone} />
                  </div>
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
