"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getAddressConfig, getCountryDefaults, CURRENCY_MAP } from "@/lib/country-data";

/* ─── Constants ────────────────────────────────────────────────────────── */

const DAYS = [
  { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
  { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }, { value: 0, label: "Sun" },
];

const CURRENCIES = [
  { code: "SGD", label: "SGD — Singapore Dollar" }, { code: "INR", label: "INR — Indian Rupee" },
  { code: "MYR", label: "MYR — Malaysian Ringgit" }, { code: "LKR", label: "LKR — Sri Lankan Rupee" },
  { code: "AED", label: "AED — UAE Dirham" }, { code: "USD", label: "USD — US Dollar" },
];

const DURATIONS = [15, 20, 30, 45, 60];

const TREATMENT_CATEGORIES = [
  { value: "consultation", label: "Consultation" },
  { value: "therapy", label: "Therapy" },
  { value: "panchakarma", label: "Panchakarma" },
  { value: "massage", label: "Massage" },
  { value: "detox", label: "Detox" },
  { value: "specialty", label: "Specialty" },
];

const MEDICINE_CATEGORIES = [
  { value: "medicine", label: "Medicine" },
  { value: "herb", label: "Herb" },
  { value: "oil", label: "Oil / Thailam" },
  { value: "consumable", label: "Consumable" },
];

const CLINIC_TYPES = [
  { value: "ayurveda", label: "Ayurveda Clinic", desc: "Traditional Ayurvedic practice" },
  { value: "panchakarma", label: "Panchakarma Centre", desc: "Detox & Panchakarma focused" },
  { value: "wellness", label: "Wellness Centre", desc: "Holistic wellness & spa" },
  { value: "multi", label: "Multi-Specialty", desc: "Multiple therapy types" },
  { value: "yoga", label: "Yoga & Naturopathy", desc: "Yoga therapy practice" },
  { value: "general", label: "General Clinic", desc: "General medical practice" },
];

/* Major sidebar sections */
const SECTIONS = [
  { key: "welcome", label: "Welcome" },
  { key: "clinic", label: "Clinic Information" },
  { key: "hours", label: "Working Hours" },
  { key: "practitioners", label: "Practitioners" },
  { key: "services", label: "Services" },
  { key: "medicines", label: "Medicines" },
];

/* Helpful tips shown per screen */
const TIPS: Record<string, { emoji: string; text: string }> = {
  welcome: { emoji: "🌿", text: "Welcome aboard! This setup takes about 5 minutes. Your data is saved automatically as you go." },
  "clinic-type": { emoji: "🏥", text: "Select the type that best describes your primary practice. This helps us pre-configure treatments, terminology, and billing defaults for you." },
  "clinic-address": { emoji: "📍", text: "Enter your clinic's physical address. This appears on invoices, prescriptions, and patient communications. For India-based clinics, select your state and pincode for auto-formatting." },
  "clinic-contact": { emoji: "📱", text: "This contact info is shown to patients on booking pages and appointment reminders. Use your clinic's main number, not personal." },
  "hours-schedule": { emoji: "🕐", text: "Set your regular working days and hours. Patients can only book during these times. You can adjust per-doctor later." },
  "hours-prefs": { emoji: "⚙️", text: "Set your default appointment slot duration and billing currency. These can be changed anytime from Admin Settings." },
  practitioners: { emoji: "👨‍⚕️", text: "Add your doctors and therapists. They'll receive an email invitation to join your clinic on AyurGate. You can add more later." },
  services: { emoji: "📋", text: "Add your main treatments and therapies. Include the consultation fee and session duration. Patients see these on the booking page." },
  medicines: { emoji: "🧪", text: "Optional: Add your commonly dispensed medicines and herbs. This helps with prescription and inventory tracking." },
};

interface StaffEntry { name: string; email: string; role: string; specialization: string; fee: string; }
interface TreatmentEntry { name: string; category: string; duration: string; basePrice: string; }
interface MedicineEntry { name: string; category: string; unit: string; unitPrice: string; currentStock: string; }

/* Screen IDs — defines every individual screen in order */
type ScreenId =
  | "welcome" | "clinic-type"
  | "clinic-address" | "clinic-contact"
  | "hours-schedule" | "hours-prefs"
  | "practitioners" | "services" | "medicines";

const BASE_SCREENS: ScreenId[] = [
  "welcome", "clinic-type",
  "clinic-address", "clinic-contact",
  "hours-schedule", "hours-prefs",
  "practitioners", "services", "medicines",
];

/* Map screen → section */
function sectionOf(screen: ScreenId): string {
  if (screen === "welcome" || screen === "clinic-type") return "welcome";
  if (screen === "clinic-address" || screen === "clinic-contact") return "clinic";
  if (screen === "hours-schedule" || screen === "hours-prefs") return "hours";
  if (screen === "practitioners") return "practitioners";
  if (screen === "services") return "services";
  return "medicines";
}

/* Sub-step dots: screens within the same section */
function subScreens(screen: ScreenId, allScreens: ScreenId[]): ScreenId[] {
  const section = sectionOf(screen);
  return allScreens.filter((s) => sectionOf(s) === section);
}

/* ─── Floating Label Input ──────────────────────────────────────────── */

function FloatingInput({
  label, value, onChange, type = "text", placeholder, disabled, icon,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean; icon?: string;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;
  return (
    <div className="relative">
      <label
        className="absolute left-3 transition-all pointer-events-none text-[13px]"
        style={{
          top: focused || filled ? "6px" : "14px",
          fontSize: focused || filled ? "11px" : "13px",
          color: focused ? "#2d6a4f" : "#9ca3af",
          paddingLeft: icon ? "24px" : "0",
        }}
      >
        {label}
      </label>
      {icon && (
        <span className="absolute left-3 text-[14px]" style={{ top: "14px", color: "#9ca3af" }}>{icon}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={focused ? placeholder : ""}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full px-3 pt-6 pb-2 rounded-lg text-[14px] outline-none transition-all"
        style={{
          border: `1.5px solid ${focused ? "#2d6a4f" : "#e5e7eb"}`,
          background: disabled ? "#f9fafb" : "white",
          paddingLeft: icon ? "36px" : "12px",
          opacity: disabled ? 0.6 : 1,
        }}
      />
    </div>
  );
}

function FloatingSelect({
  label, value, onChange, options, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <label
        className="absolute left-3 transition-all pointer-events-none"
        style={{ top: "6px", fontSize: "11px", color: focused ? "#2d6a4f" : "#9ca3af", zIndex: 1 }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full px-3 pt-6 pb-2 rounded-lg text-[14px] outline-none transition-all appearance-none"
        style={{
          border: `1.5px solid ${focused ? "#2d6a4f" : "#e5e7eb"}`,
          background: disabled ? "#f9fafb" : "white",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

/* ─── Tip Callout ──────────────────────────────────────────────────── */

function TipBox({ screen }: { screen: ScreenId }) {
  const tip = TIPS[screen];
  if (!tip) return null;
  return (
    <div className="rounded-xl p-4 flex items-start gap-3 mt-6" style={{ background: "#f0fdf4", border: "1px solid #d1fae5" }}>
      <span className="text-2xl flex-shrink-0 mt-0.5">{tip.emoji}</span>
      <p className="text-[13px] leading-relaxed" style={{ color: "#065f46" }}>{tip.text}</p>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────── */

export default function OnboardingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<ScreenId>("welcome");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [clinicName, setClinicName] = useState("");

  // Registration data for pre-population
  const [registrationData, setRegistrationData] = useState<{
    country?: string; clinicType?: string; practitionerCount?: string;
  }>({});

  // Dynamic screen list — skip clinic-type if already set at registration
  const ALL_SCREENS = useMemo(() => {
    if (registrationData.clinicType) {
      return BASE_SCREENS.filter((s) => s !== "clinic-type");
    }
    return BASE_SCREENS;
  }, [registrationData.clinicType]);

  // Welcome
  const [clinicType, setClinicType] = useState("");

  // Clinic Info
  const [clinicProfile, setClinicProfile] = useState({
    address: "", city: "", state: "", zipCode: "",
    clinicEmail: "", clinicPhone: "", website: "", registrationNo: "",
  });

  // Working Hours
  const [preferences, setPreferences] = useState({
    workingDays: [1, 2, 3, 4, 5, 6],
    workingHoursStart: "09:00", workingHoursEnd: "18:00",
    appointmentDuration: 30, currency: "SGD", taxRate: "",
  });

  // Staff
  const [staffList, setStaffList] = useState<StaffEntry[]>([
    { name: "", email: "", role: "doctor", specialization: "", fee: "" },
  ]);
  const [savedStaff, setSavedStaff] = useState<string[]>([]);

  // Treatments
  const [treatmentList, setTreatmentList] = useState<TreatmentEntry[]>([
    { name: "", category: "consultation", duration: "30", basePrice: "" },
  ]);
  const [savedTreatments, setSavedTreatments] = useState<string[]>([]);

  // Medicines
  const [medicineList, setMedicineList] = useState<MedicineEntry[]>([
    { name: "", category: "medicine", unit: "nos", unitPrice: "", currentStock: "" },
  ]);
  const [savedMedicines, setSavedMedicines] = useState<string[]>([]);

  // Completed sections tracker
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  // Load existing data
  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        if (data.onboardingComplete) { router.push("/dashboard"); return; }
        if (data.clinic) {
          setClinicName(data.clinic.name || "");
          // Track registration data for pre-population and screen skipping
          setRegistrationData({
            country: data.clinic.country || undefined,
            clinicType: data.clinic.clinicType || undefined,
            practitionerCount: data.clinic.practitionerCount || undefined,
          });
          // Pre-fill clinic type if set during registration
          if (data.clinic.clinicType) {
            setClinicType(data.clinic.clinicType);
          }
          setClinicProfile((prev) => ({
            ...prev, address: data.clinic.address || "", city: data.clinic.city || "",
            state: data.clinic.state || "", zipCode: data.clinic.zipCode || "",
            clinicEmail: data.clinic.email || "", clinicPhone: data.clinic.phone || "",
            website: data.clinic.website || "",
          }));
          // Pre-fill currency and working days from country
          const country = data.clinic.country;
          if (country) {
            const countryCurrency = CURRENCY_MAP[country];
            const countryDefaults = getCountryDefaults(country);
            setPreferences((prev) => ({
              ...prev,
              ...(countryCurrency ? { currency: countryCurrency } : {}),
              workingDays: countryDefaults.workingDays,
            }));
          }
        }
        if (data.settings) {
          setPreferences((prev) => ({
            ...prev, taxRate: data.settings.gstRegistrationNo || "",
            appointmentDuration: data.settings.appointmentDuration || 30,
            workingHoursStart: data.settings.workingHoursStart || "09:00",
            workingHoursEnd: data.settings.workingHoursEnd || "18:00",
            workingDays: data.settings.workingDays ? JSON.parse(data.settings.workingDays) : [1, 2, 3, 4, 5, 6],
          }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  /* ─── Save Functions ─────────────────────────────────────────────── */

  const saveClinicType = async () => {
    try {
      await fetch("/api/onboarding/progress", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicType }),
      });
    } catch {}
  };

  const saveClinicStep = async (stepNum: number) => {
    setSaving(true); setError("");
    try {
      const bodyMap: Record<number, object> = {
        1: { step: 1, ...clinicProfile },
        2: { step: 2, ...preferences },
      };
      const res = await fetch("/api/onboarding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyMap[stepNum]),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed to save"); return false; }
      return true;
    } catch { setError("Network error"); return false; }
    finally { setSaving(false); }
  };

  const saveStaffMember = async (entry: StaffEntry) => {
    if (!entry.name || !entry.email) return;
    if (savedStaff.includes(entry.email)) return;
    try {
      const res = await fetch("/api/staff", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: entry.name, email: entry.email, role: entry.role,
          specialization: entry.specialization || undefined,
          consultationFee: entry.fee ? parseFloat(entry.fee) : undefined,
          sendInvite: true,
        }),
      });
      if (res.ok) {
        setSavedStaff((prev) => [...prev, entry.email]);
      } else {
        const d = await res.json();
        setError(d.error || `Failed to add ${entry.name}`);
      }
    } catch { setError(`Network error adding ${entry.name}`); }
  };

  const saveTreatment = async (entry: TreatmentEntry) => {
    if (!entry.name) return;
    if (savedTreatments.includes(entry.name)) return;
    try {
      const res = await fetch("/api/treatments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: entry.name, category: entry.category,
          duration: parseInt(entry.duration) || 30,
          basePrice: parseFloat(entry.basePrice) || 0,
        }),
      });
      if (res.ok) {
        setSavedTreatments((prev) => [...prev, entry.name]);
      } else {
        const d = await res.json();
        setError(d.error || `Failed to add ${entry.name}`);
      }
    } catch { setError(`Network error adding ${entry.name}`); }
  };

  const saveMedicine = async (entry: MedicineEntry) => {
    if (!entry.name) return;
    if (savedMedicines.includes(entry.name)) return;
    try {
      const res = await fetch("/api/inventory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: entry.name, category: entry.category, unit: entry.unit,
          unitPrice: parseFloat(entry.unitPrice) || 0,
          currentStock: parseInt(entry.currentStock) || 0,
        }),
      });
      if (res.ok) {
        setSavedMedicines((prev) => [...prev, entry.name]);
      } else {
        const d = await res.json();
        setError(d.error || `Failed to add ${entry.name}`);
      }
    } catch { setError(`Network error adding ${entry.name}`); }
  };

  /* ─── Navigation ─────────────────────────────────────────────────── */

  const screenIdx = ALL_SCREENS.indexOf(screen);

  const goTo = (s: ScreenId) => {
    setScreen(s);
    setError("");
    window.scrollTo(0, 0);
  };

  const handleNext = async () => {
    setError("");

    // Save current screen data
    if (screen === "welcome" && registrationData.clinicType) {
      // Clinic type was already set during registration, mark welcome section complete
      setCompletedSections((s) => new Set(s).add("welcome"));
    }
    if (screen === "clinic-type") {
      await saveClinicType();
      setCompletedSections((s) => new Set(s).add("welcome"));
    }
    if (screen === "clinic-contact") {
      const ok = await saveClinicStep(1);
      if (!ok) return;
      setCompletedSections((s) => new Set(s).add("clinic"));
    }
    if (screen === "hours-prefs") {
      const ok = await saveClinicStep(2);
      if (!ok) return;
      setCompletedSections((s) => new Set(s).add("hours"));
    }
    if (screen === "practitioners") {
      setSaving(true);
      for (const s of staffList) {
        if (s.name && s.email && !savedStaff.includes(s.email)) await saveStaffMember(s);
      }
      setSaving(false);
      setCompletedSections((s) => new Set(s).add("practitioners"));
    }
    if (screen === "services") {
      setSaving(true);
      for (const t of treatmentList) {
        if (t.name && !savedTreatments.includes(t.name)) await saveTreatment(t);
      }
      setSaving(false);
      setCompletedSections((s) => new Set(s).add("services"));
    }

    // Advance
    if (screenIdx < ALL_SCREENS.length - 1) {
      goTo(ALL_SCREENS[screenIdx + 1]);
    }
  };

  const handleBack = () => {
    if (screenIdx > 0) goTo(ALL_SCREENS[screenIdx - 1]);
  };

  const handleSkip = () => {
    // Mark section complete and advance to next section
    const curSection = sectionOf(screen);
    setCompletedSections((s) => new Set(s).add(curSection));
    // Find next section's first screen
    const nextSectionScreens = ALL_SCREENS.filter((s) => sectionOf(s) !== curSection && ALL_SCREENS.indexOf(s) > screenIdx);
    if (nextSectionScreens.length > 0) {
      goTo(nextSectionScreens[0]);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    // Save unsaved medicines
    for (const m of medicineList) {
      if (m.name && !savedMedicines.includes(m.name)) await saveMedicine(m);
    }
    // Mark onboarding complete
    const res = await fetch("/api/onboarding", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "complete" }),
    });
    setSaving(false);
    if (res.ok) window.location.href = "/onboarding/dashboard";
  };

  /* ─── Helpers ────────────────────────────────────────────────────── */

  const addStaffRow = () => setStaffList([...staffList, { name: "", email: "", role: "doctor", specialization: "", fee: "" }]);
  const addTreatmentRow = () => setTreatmentList([...treatmentList, { name: "", category: "therapy", duration: "30", basePrice: "" }]);
  const addMedicineRow = () => setMedicineList([...medicineList, { name: "", category: "medicine", unit: "nos", unitPrice: "", currentStock: "" }]);

  const updateStaff = (i: number, field: string, value: string) => {
    const list = [...staffList]; (list[i] as unknown as Record<string, string>)[field] = value; setStaffList(list);
  };
  const updateTreatment = (i: number, field: string, value: string) => {
    const list = [...treatmentList]; (list[i] as unknown as Record<string, string>)[field] = value; setTreatmentList(list);
  };
  const updateMedicine = (i: number, field: string, value: string) => {
    const list = [...medicineList]; (list[i] as unknown as Record<string, string>)[field] = value; setMedicineList(list);
  };

  const currentSection = sectionOf(screen);
  const isSkippable = ["practitioners", "services", "medicines"].includes(currentSection);
  const isLastScreen = screen === "medicines";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fefbf6" }}>
        <div className="animate-spin w-8 h-8 border-3 rounded-full" style={{ borderColor: "#e5e7eb", borderTopColor: "#2d6a4f" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#fefbf6" }}>

      {/* ═══ Left Sidebar — Vertical Step Navigation ═══ */}
      <div className="hidden lg:flex lg:w-[340px] flex-col border-r" style={{ background: "white", borderColor: "#f3f4f6" }}>
        {/* Logo */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#f0fdf4" }}>
              <span className="text-xl">🌿</span>
            </div>
            <span className="text-xl font-bold tracking-wider" style={{ color: "#14532d" }}>AYUR GATE</span>
          </div>
        </div>

        {/* Step List */}
        <div className="flex-1 px-8 py-4">
          <nav className="space-y-0">
            {SECTIONS.map((sec, i) => {
              const isCurrent = currentSection === sec.key;
              const isDone = completedSections.has(sec.key);
              const sectionScreens = ALL_SCREENS.filter((s) => sectionOf(s) === sec.key);
              const sectionStartIdx = ALL_SCREENS.indexOf(sectionScreens[0]);
              const isPast = screenIdx > sectionStartIdx + sectionScreens.length - 1;
              const isComplete = isDone || isPast;
              const isLast = i === SECTIONS.length - 1;

              return (
                <div key={sec.key} className="flex items-start gap-4">
                  {/* Dot + Line */}
                  <div className="flex flex-col items-center" style={{ minHeight: isLast ? "auto" : "64px" }}>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: isComplete ? "#2d6a4f" : isCurrent ? "#2d6a4f" : "white",
                        border: `2px solid ${isComplete || isCurrent ? "#2d6a4f" : "#d1d5db"}`,
                      }}
                    >
                      {isComplete ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 7L5.5 9.5L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : isCurrent ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      ) : null}
                    </div>
                    {/* Connecting line */}
                    {!isLast && (
                      <div
                        className="w-0.5 flex-1 mt-1"
                        style={{ background: isComplete ? "#2d6a4f" : "#e5e7eb", minHeight: "36px" }}
                      />
                    )}
                  </div>
                  {/* Label */}
                  <div className="pt-0.5 pb-6">
                    <p
                      className="text-[14px] font-semibold transition-colors"
                      style={{ color: isCurrent ? "#2d6a4f" : isComplete ? "#2d6a4f" : "#9ca3af" }}
                    >
                      {sec.label}
                      {sec.key === "clinic" && <span className="text-[11px] font-normal ml-1" style={{ color: "#d97706" }}>*</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer note */}
        <div className="px-8 py-6" style={{ borderTop: "1px solid #f3f4f6" }}>
          <p className="text-[12px] leading-relaxed" style={{ color: "#9ca3af" }}>
            * Only clinic information is required. You can always update the rest later.
          </p>
        </div>
      </div>

      {/* ═══ Main Content Area ═══ */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #f3f4f6", background: "white" }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">🌿</span>
            <span className="text-base font-bold tracking-wider" style={{ color: "#14532d" }}>AYUR GATE</span>
          </div>
          <div className="flex items-center gap-1.5">
            {SECTIONS.map((sec) => (
              <div
                key={sec.key}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: completedSections.has(sec.key) || sectionOf(screen) === sec.key
                    ? "#2d6a4f" : "#e5e7eb",
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center px-5 lg:px-10 py-8 overflow-y-auto">
          <div className="w-full max-w-lg">

            {/* Sub-step dots (within section) */}
            {subScreens(screen, ALL_SCREENS).length > 1 && (
              <div className="flex items-center justify-center gap-3 mb-8">
                {subScreens(screen, ALL_SCREENS).map((sub) => {
                  const subIdx = ALL_SCREENS.indexOf(sub);
                  const isDone = subIdx < screenIdx;
                  const isCur = sub === screen;
                  return (
                    <div key={sub} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: isDone ? "#2d6a4f" : isCur ? "#2d6a4f" : "white",
                          border: `2px solid ${isDone || isCur ? "#2d6a4f" : "#d1d5db"}`,
                        }}
                      >
                        {isDone && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L4.5 8L9.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      {sub !== subScreens(screen, ALL_SCREENS)[subScreens(screen, ALL_SCREENS).length - 1] && (
                        <div className="w-12 h-0.5 rounded" style={{ background: isDone ? "#2d6a4f" : "#e5e7eb" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-5 p-3 rounded-lg text-[13px] font-medium flex items-center gap-2" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            {/* ═══ Screen: Welcome ═══ */}
            {screen === "welcome" && (
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-3" style={{ color: "#111827" }}>
                  Hi{clinicName ? `, ${clinicName}` : ""}! Welcome aboard!
                </h1>
                <p className="text-[15px] mb-8" style={{ color: "#6b7280" }}>
                  Your Ayurveda practice management awaits. Let&apos;s get you set up.
                </p>

                {/* Hero visual */}
                <div className="rounded-2xl p-8 mb-8" style={{ background: "linear-gradient(135deg, #14532d 0%, #2d6a4f 50%, #40916c 100%)" }}>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                      <span className="text-5xl">🌿</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-wider mb-1">AYUR GATE</h2>
                      <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>Ayurveda SaaS Platform</p>
                    </div>
                  </div>
                </div>

                <p className="text-[14px]" style={{ color: "#6b7280" }}>
                  This quick setup takes about 5 minutes. Ready to dive in?
                </p>

                <TipBox screen="welcome" />
              </div>
            )}

            {/* ═══ Screen: Clinic Type ═══ */}
            {screen === "clinic-type" && (
              <div>
                <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: "#111827" }}>
                  What type of clinic do you run?
                </h1>
                <p className="text-[14px] mb-8 text-center" style={{ color: "#6b7280" }}>
                  This helps us pre-configure the right templates for you. You can change this later.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {CLINIC_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => setClinicType(ct.value)}
                      className="p-4 rounded-xl text-left transition-all hover:shadow-md"
                      style={{
                        border: `2px solid ${clinicType === ct.value ? "#2d6a4f" : "#e5e7eb"}`,
                        background: clinicType === ct.value ? "#f0fdf4" : "white",
                      }}
                    >
                      <p className="text-[14px] font-semibold" style={{ color: clinicType === ct.value ? "#14532d" : "#374151" }}>{ct.label}</p>
                      <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>{ct.desc}</p>
                    </button>
                  ))}
                </div>

                <TipBox screen="clinic-type" />
              </div>
            )}

            {/* ═══ Screen: Clinic Address ═══ */}
            {screen === "clinic-address" && (
              <div>
                <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: "#111827" }}>
                  Add your clinic address
                </h1>
                <p className="text-[14px] mb-8 text-center" style={{ color: "#6b7280" }}>
                  This appears on invoices and helps patients find you.
                </p>

                {(() => {
                  const addrConfig = getAddressConfig(registrationData.country || "Other");
                  return (
                    <div className="space-y-4">
                      <FloatingInput label="Street Address" icon="🏢" value={clinicProfile.address} onChange={(v) => setClinicProfile({ ...clinicProfile, address: v })} placeholder="123 Clinic Street" />
                      <FloatingInput label="City / Suburb" icon="🏙️" value={clinicProfile.city} onChange={(v) => setClinicProfile({ ...clinicProfile, city: v })} placeholder="e.g. Chennai" />
                      <div className="grid grid-cols-2 gap-4">
                        {addrConfig.showState && (
                          addrConfig.stateOptions ? (
                            <FloatingSelect
                              label={addrConfig.stateLabel}
                              value={clinicProfile.state}
                              onChange={(v) => setClinicProfile({ ...clinicProfile, state: v })}
                              options={[{ value: "", label: `Select ${addrConfig.stateLabel}` }, ...addrConfig.stateOptions]}
                            />
                          ) : (
                            <FloatingInput label={addrConfig.stateLabel} icon="📋" value={clinicProfile.state} onChange={(v) => setClinicProfile({ ...clinicProfile, state: v })} placeholder={`e.g. ${addrConfig.stateLabel}`} />
                          )
                        )}
                        {addrConfig.showZip && (
                          <FloatingInput label={addrConfig.zipLabel} icon="📮" value={clinicProfile.zipCode} onChange={(v) => setClinicProfile({ ...clinicProfile, zipCode: v.slice(0, addrConfig.zipLength || 10) })} placeholder={addrConfig.zipPlaceholder} />
                        )}
                      </div>
                    </div>
                  );
                })()}

                <TipBox screen="clinic-address" />
              </div>
            )}

            {/* ═══ Screen: Clinic Contact ═══ */}
            {screen === "clinic-contact" && (
              <div>
                <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: "#111827" }}>
                  Contact details
                </h1>
                <p className="text-[14px] mb-8 text-center" style={{ color: "#6b7280" }}>
                  How do patients reach your clinic?
                </p>

                <div className="space-y-4">
                  <FloatingInput label="Clinic Phone" icon="📞" type="tel" value={clinicProfile.clinicPhone} onChange={(v) => setClinicProfile({ ...clinicProfile, clinicPhone: v })} placeholder="+91 XXXX XXXXXX" />
                  <FloatingInput label="Clinic Email" icon="✉️" type="email" value={clinicProfile.clinicEmail} onChange={(v) => setClinicProfile({ ...clinicProfile, clinicEmail: v })} placeholder="clinic@example.com" />
                  <FloatingInput label="Website" icon="🌐" type="url" value={clinicProfile.website} onChange={(v) => setClinicProfile({ ...clinicProfile, website: v })} placeholder="www.yourclinic.com" />
                  <FloatingInput label="License / Registration No." value={clinicProfile.registrationNo} onChange={(v) => setClinicProfile({ ...clinicProfile, registrationNo: v })} placeholder="Optional" />
                </div>

                <TipBox screen="clinic-contact" />
              </div>
            )}

            {/* ═══ Screen: Working Hours — Schedule ═══ */}
            {screen === "hours-schedule" && (
              <div>
                <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: "#111827" }}>
                  Set your working schedule
                </h1>
                <p className="text-[14px] mb-8 text-center" style={{ color: "#6b7280" }}>
                  Which days and hours does your clinic operate?
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[13px] font-semibold mb-3" style={{ color: "#374151" }}>Working Days</label>
                    <div className="flex gap-2 flex-wrap">
                      {DAYS.map((day) => {
                        const active = preferences.workingDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => setPreferences((p) => ({ ...p, workingDays: active ? p.workingDays.filter((d) => d !== day.value) : [...p.workingDays, day.value] }))}
                            className="w-14 h-14 rounded-xl text-[13px] font-semibold transition-all"
                            style={{
                              background: active ? "#2d6a4f" : "white",
                              color: active ? "white" : "#6b7280",
                              border: `2px solid ${active ? "#2d6a4f" : "#e5e7eb"}`,
                            }}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-semibold mb-2" style={{ color: "#374151" }}>Opening Time</label>
                      <input type="time" value={preferences.workingHoursStart} onChange={(e) => setPreferences({ ...preferences, workingHoursStart: e.target.value })} className="w-full px-4 py-3 rounded-lg text-[14px] outline-none" style={{ border: "1.5px solid #e5e7eb" }} />
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold mb-2" style={{ color: "#374151" }}>Closing Time</label>
                      <input type="time" value={preferences.workingHoursEnd} onChange={(e) => setPreferences({ ...preferences, workingHoursEnd: e.target.value })} className="w-full px-4 py-3 rounded-lg text-[14px] outline-none" style={{ border: "1.5px solid #e5e7eb" }} />
                    </div>
                  </div>
                </div>

                <TipBox screen="hours-schedule" />
              </div>
            )}

            {/* ═══ Screen: Working Hours — Preferences ═══ */}
            {screen === "hours-prefs" && (
              <div>
                <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: "#111827" }}>
                  Appointment & billing defaults
                </h1>
                <p className="text-[14px] mb-8 text-center" style={{ color: "#6b7280" }}>
                  Set defaults for appointments and invoices.
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[13px] font-semibold mb-3" style={{ color: "#374151" }}>Default Appointment Duration</label>
                    <div className="flex gap-2 flex-wrap">
                      {DURATIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setPreferences({ ...preferences, appointmentDuration: d })}
                          className="px-5 py-3 rounded-xl text-[14px] font-medium transition-all"
                          style={{
                            background: preferences.appointmentDuration === d ? "#2d6a4f" : "white",
                            color: preferences.appointmentDuration === d ? "white" : "#6b7280",
                            border: `2px solid ${preferences.appointmentDuration === d ? "#2d6a4f" : "#e5e7eb"}`,
                          }}
                        >
                          {d} min
                        </button>
                      ))}
                    </div>
                  </div>

                  <FloatingSelect
                    label="Currency"
                    value={preferences.currency}
                    onChange={(v) => setPreferences({ ...preferences, currency: v })}
                    options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
                  />

                  <FloatingInput
                    label="GST / Tax Registration"
                    value={preferences.taxRate}
                    onChange={(v) => setPreferences({ ...preferences, taxRate: v })}
                    placeholder="e.g. 9% or GST Registration No."
                  />
                </div>

                <TipBox screen="hours-prefs" />
              </div>
            )}

            {/* ═══ Screen: Practitioners ═══ */}
            {screen === "practitioners" && (
              <div>
                <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: "#111827" }}>
                  Add your team
                </h1>
                <p className="text-[14px] mb-8 text-center" style={{ color: "#6b7280" }}>
                  Add doctors, therapists, or staff. They&apos;ll receive a login invite via email.
                </p>

                <div className="space-y-4">
                  {staffList.map((s, i) => {
                    const isSaved = savedStaff.includes(s.email);
                    return (
                      <div key={i} className="rounded-xl p-4 space-y-3 transition-all" style={{ border: `1.5px solid ${isSaved ? "#bbf7d0" : "#e5e7eb"}`, background: isSaved ? "#f0fdf4" : "white" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-bold" style={{ color: isSaved ? "#059669" : "#9ca3af" }}>
                            {isSaved ? "✓ Saved & invited" : `Person ${i + 1}`}
                          </span>
                          {staffList.length > 1 && !isSaved && (
                            <button onClick={() => setStaffList(staffList.filter((_, j) => j !== i))} className="text-[11px] font-medium" style={{ color: "#ef4444" }}>Remove</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <FloatingInput label="Full Name" value={s.name} onChange={(v) => updateStaff(i, "name", v)} disabled={isSaved} />
                          <FloatingInput label="Email" type="email" value={s.email} onChange={(v) => updateStaff(i, "email", v)} disabled={isSaved} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <FloatingSelect label="Role" value={s.role} onChange={(v) => updateStaff(i, "role", v)} disabled={isSaved} options={[
                            { value: "doctor", label: "Doctor" },
                            { value: "therapist", label: "Therapist" },
                            { value: "receptionist", label: "Receptionist" },
                            { value: "pharmacist", label: "Pharmacist" },
                            { value: "admin", label: "Admin" },
                          ]} />
                          <FloatingInput label="Specialization" value={s.specialization} onChange={(v) => updateStaff(i, "specialization", v)} disabled={isSaved} />
                          <FloatingInput label="Consult Fee" type="number" value={s.fee} onChange={(v) => updateStaff(i, "fee", v)} disabled={isSaved} />
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={addStaffRow} className="w-full py-3 rounded-xl text-[13px] font-semibold transition-all hover:bg-gray-50" style={{ border: "1.5px dashed #d1d5db", color: "#6b7280" }}>
                    + Add another person
                  </button>
                </div>

                <TipBox screen="practitioners" />
              </div>
            )}

            {/* ═══ Screen: Services ═══ */}
            {screen === "services" && (
              <div>
                <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: "#111827" }}>
                  Add your services
                </h1>
                <p className="text-[14px] mb-8 text-center" style={{ color: "#6b7280" }}>
                  Add consultations and therapies your clinic offers.
                </p>

                <div className="space-y-4">
                  {treatmentList.map((t, i) => {
                    const isSaved = savedTreatments.includes(t.name);
                    return (
                      <div key={i} className="rounded-xl p-4 transition-all" style={{ border: `1.5px solid ${isSaved ? "#bbf7d0" : "#e5e7eb"}`, background: isSaved ? "#f0fdf4" : "white" }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[12px] font-bold" style={{ color: isSaved ? "#059669" : "#9ca3af" }}>{isSaved ? "✓ Saved" : `Service ${i + 1}`}</span>
                          {treatmentList.length > 1 && !isSaved && (
                            <button onClick={() => setTreatmentList(treatmentList.filter((_, j) => j !== i))} className="text-[11px] font-medium" style={{ color: "#ef4444" }}>Remove</button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <FloatingInput label="Service Name" value={t.name} onChange={(v) => updateTreatment(i, "name", v)} placeholder="e.g. General Consultation" disabled={isSaved} />
                          <div className="grid grid-cols-3 gap-3">
                            <FloatingSelect label="Category" value={t.category} onChange={(v) => updateTreatment(i, "category", v)} disabled={isSaved} options={TREATMENT_CATEGORIES} />
                            <FloatingSelect label="Duration" value={t.duration} onChange={(v) => updateTreatment(i, "duration", v)} disabled={isSaved} options={DURATIONS.map((d) => ({ value: String(d), label: `${d} min` }))} />
                            <FloatingInput label="Price" type="number" value={t.basePrice} onChange={(v) => updateTreatment(i, "basePrice", v)} disabled={isSaved} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={addTreatmentRow} className="w-full py-3 rounded-xl text-[13px] font-semibold transition-all hover:bg-gray-50" style={{ border: "1.5px dashed #d1d5db", color: "#6b7280" }}>
                    + Add another service
                  </button>
                </div>

                <TipBox screen="services" />
              </div>
            )}

            {/* ═══ Screen: Medicines ═══ */}
            {screen === "medicines" && (
              <div>
                <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: "#111827" }}>
                  Add medicines & inventory
                </h1>
                <p className="text-[14px] mb-8 text-center" style={{ color: "#6b7280" }}>
                  <span className="font-medium">This is optional</span> — add common medicines to speed up prescriptions.
                </p>

                <div className="space-y-4">
                  {medicineList.map((m, i) => {
                    const isSaved = savedMedicines.includes(m.name);
                    return (
                      <div key={i} className="rounded-xl p-4 transition-all" style={{ border: `1.5px solid ${isSaved ? "#bbf7d0" : "#e5e7eb"}`, background: isSaved ? "#f0fdf4" : "white" }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[12px] font-bold" style={{ color: isSaved ? "#059669" : "#9ca3af" }}>{isSaved ? "✓ Saved" : `Item ${i + 1}`}</span>
                          {medicineList.length > 1 && !isSaved && (
                            <button onClick={() => setMedicineList(medicineList.filter((_, j) => j !== i))} className="text-[11px] font-medium" style={{ color: "#ef4444" }}>Remove</button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <FloatingInput label="Medicine Name" value={m.name} onChange={(v) => updateMedicine(i, "name", v)} placeholder="e.g. Dhanwantharam Kashayam" disabled={isSaved} />
                          <div className="grid grid-cols-3 gap-3">
                            <FloatingSelect label="Category" value={m.category} onChange={(v) => updateMedicine(i, "category", v)} disabled={isSaved} options={MEDICINE_CATEGORIES} />
                            <FloatingInput label="Price" type="number" value={m.unitPrice} onChange={(v) => updateMedicine(i, "unitPrice", v)} disabled={isSaved} />
                            <FloatingInput label="Stock Qty" type="number" value={m.currentStock} onChange={(v) => updateMedicine(i, "currentStock", v)} disabled={isSaved} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={addMedicineRow} className="w-full py-3 rounded-xl text-[13px] font-semibold transition-all hover:bg-gray-50" style={{ border: "1.5px dashed #d1d5db", color: "#6b7280" }}>
                    + Add another item
                  </button>
                </div>

                {/* Setup Summary */}
                <div className="rounded-xl p-5 mt-6" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <h3 className="text-[14px] font-bold mb-3" style={{ color: "#065f46" }}>Setup Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-[13px]">
                    {[
                      { label: "Clinic profile", done: true },
                      { label: "Working hours", done: true },
                      { label: `${savedStaff.length} staff member${savedStaff.length !== 1 ? "s" : ""}`, done: savedStaff.length > 0 },
                      { label: `${savedTreatments.length} service${savedTreatments.length !== 1 ? "s" : ""}`, done: savedTreatments.length > 0 },
                      { label: `${savedMedicines.length} medicine${savedMedicines.length !== 1 ? "s" : ""}`, done: savedMedicines.length > 0 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: item.done ? "#d1fae5" : "#f3f4f6" }}>
                          {item.done ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L4.5 8L9.5 3" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#d1d5db" }} />
                          )}
                        </div>
                        <span style={{ color: item.done ? "#065f46" : "#9ca3af" }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <TipBox screen="medicines" />
              </div>
            )}

            {/* ═══ Bottom Navigation ═══ */}
            <div className="flex items-center justify-between mt-10 pt-6" style={{ borderTop: "1px solid #f3f4f6" }}>
              {/* Back */}
              {screenIdx > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-medium transition-all hover:bg-gray-50"
                  style={{ color: "#374151" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  BACK
                </button>
              ) : <div />}

              {/* Right: Skip + Next/Launch */}
              <div className="flex items-center gap-4">
                {isSkippable && (
                  <button
                    onClick={handleSkip}
                    className="text-[13px] font-semibold tracking-wide hover:underline"
                    style={{ color: "#9ca3af" }}
                  >
                    SKIP FOR NOW
                  </button>
                )}
                {!isLastScreen ? (
                  <button
                    onClick={handleNext}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-[14px] font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: "#2d6a4f" }}
                  >
                    {saving ? "Saving..." : "NEXT"}
                    {!saving && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleComplete}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-[14px] font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
                  >
                    {saving ? "Finishing..." : "Launch My Clinic"}
                    {!saving && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
