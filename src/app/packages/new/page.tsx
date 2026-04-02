"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Toast from "@/components/Toast";
import { cardStyle, btnPrimary, inputStyle } from "@/lib/styles";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Patient {
  id: string;
  patientIdNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

interface Treatment {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  duration: number;
}

interface PackageOption {
  id: string;
  name: string;
  sessions: number;
  price: number;
  originalPrice: number;
  savingsPercent: number;
}

type Step = 1 | 2 | 3 | 4;

// ─── Utility ────────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return `S$${(amount ?? 0).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getDefaultExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ─── Step Indicator ─────────────────────────────────────────────────────────
function StepIndicator({ current, labels }: { current: Step; labels: string[] }) {
  return (
    <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
      {labels.map((label, i) => {
        const step = (i + 1) as Step;
        const isActive = step === current;
        const isCompleted = step < current;
        return (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && (
              <div className="w-6 h-[2px] flex-shrink-0" style={{ background: isCompleted ? "var(--blue-500)" : "var(--grey-300)" }} />
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="w-7 h-7 flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                style={{
                  borderRadius: "var(--radius-pill)",
                  background: isActive ? "var(--blue-500)" : isCompleted ? "var(--blue-500)" : "var(--grey-200)",
                  color: isActive || isCompleted ? "var(--white)" : "var(--grey-600)",
                }}
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span className="text-[14px] font-semibold whitespace-nowrap" style={{ color: isActive ? "var(--blue-500)" : isCompleted ? "var(--grey-900)" : "var(--grey-500)" }}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function SellPackagePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Patient
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Step 2: Treatment & Package
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [treatmentsLoading, setTreatmentsLoading] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);

  // Step 3: Options
  const [expiryDate, setExpiryDate] = useState(getDefaultExpiry());
  const [allowSharing, setAllowSharing] = useState(false);
  const [maxSharedUsers, setMaxSharedUsers] = useState(1);
  const [consultationFeePolicy, setConsultationFeePolicy] = useState<"doctor_decides" | "included" | "per_visit">("doctor_decides");
  const [perVisitFee, setPerVisitFee] = useState(0);
  const [notes, setNotes] = useState("");

  // Step 4: Payment
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  // ─── Step 1: Search patients ──────────────────────────────────────────────
  const searchPatients = useCallback(() => {
    if (!patientSearch || patientSearch.length < 2) {
      setPatients([]);
      return;
    }
    setPatientsLoading(true);
    fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPatients(data); })
      .catch(() => setPatients([]))
      .finally(() => setPatientsLoading(false));
  }, [patientSearch]);

  useEffect(() => {
    const timeout = setTimeout(searchPatients, 300);
    return () => clearTimeout(timeout);
  }, [searchPatients]);

  // ─── Step 2: Fetch treatments ─────────────────────────────────────────────
  useEffect(() => {
    if (step === 2) {
      setTreatmentsLoading(true);
      fetch("/api/treatments")
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data.treatments || data.items || [];
          setTreatments(list);
        })
        .catch(() => setTreatments([]))
        .finally(() => setTreatmentsLoading(false));
    }
  }, [step]);

  // ─── Step 2: Fetch packages for selected treatment ────────────────────────
  useEffect(() => {
    if (selectedTreatment) {
      setPackagesLoading(true);
      fetch(`/api/treatments/${selectedTreatment.id}/packages`)
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data.packages || data.items || [];
          const options: PackageOption[] = list.map((p: Record<string, unknown>) => {
            const sessions = (p.sessions as number) ?? (p.totalSessions as number) ?? 1;
            const price = (p.price as number) ?? (p.packagePrice as number) ?? 0;
            const originalPrice = (selectedTreatment.basePrice * sessions);
            const savingsPercent = originalPrice > 0 ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
            return {
              id: p.id as string,
              name: (p.name as string) || `${sessions} Sessions`,
              sessions,
              price,
              originalPrice,
              savingsPercent,
            };
          });

          // Always add single session option
          if (!options.some((o) => o.sessions === 1)) {
            options.unshift({
              id: "single",
              name: "Single Session",
              sessions: 1,
              price: selectedTreatment.basePrice,
              originalPrice: selectedTreatment.basePrice,
              savingsPercent: 0,
            });
          }

          setPackageOptions(options);
        })
        .catch(() => {
          // If no packages API, create default options
          setPackageOptions([
            {
              id: "single",
              name: "Single Session",
              sessions: 1,
              price: selectedTreatment.basePrice,
              originalPrice: selectedTreatment.basePrice,
              savingsPercent: 0,
            },
            {
              id: "pkg-5",
              name: "5 Sessions",
              sessions: 5,
              price: Math.round(selectedTreatment.basePrice * 5 * 0.9),
              originalPrice: selectedTreatment.basePrice * 5,
              savingsPercent: 10,
            },
            {
              id: "pkg-10",
              name: "10 Sessions",
              sessions: 10,
              price: Math.round(selectedTreatment.basePrice * 10 * 0.8),
              originalPrice: selectedTreatment.basePrice * 10,
              savingsPercent: 20,
            },
          ]);
        })
        .finally(() => setPackagesLoading(false));
    }
  }, [selectedTreatment]);

  // ─── Update payment amount when package changes ───────────────────────────
  useEffect(() => {
    if (selectedPackage) {
      setPaymentAmount(selectedPackage.price);
    }
  }, [selectedPackage]);

  // ─── Navigation ──────────────────────────────────────────────────────────
  function canProceed(): boolean {
    switch (step) {
      case 1: return selectedPatient !== null;
      case 2: return selectedTreatment !== null && selectedPackage !== null;
      case 3: return expiryDate !== "";
      default: return true;
    }
  }

  function goNext() {
    if (canProceed() && step < 4) setStep((step + 1) as Step);
  }

  function goBack() {
    if (step > 1) setStep((step - 1) as Step);
  }

  // ─── Submit ──────────────────────────────────────────────────────────────
  async function handleSell() {
    if (!selectedPatient || !selectedTreatment || !selectedPackage) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/patient-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          treatmentId: selectedTreatment.id,
          packageOptionId: selectedPackage.id !== "single" && selectedPackage.id !== "pkg-5" && selectedPackage.id !== "pkg-10" ? selectedPackage.id : undefined,
          packageName: selectedPackage.name,
          treatmentName: selectedTreatment.name,
          totalSessions: selectedPackage.sessions,
          totalPrice: selectedPackage.price,
          paidAmount: paymentType === "full" ? selectedPackage.price : paymentAmount,
          paymentMethod,
          expiryDate,
          allowSharing,
          maxSharedUsers: allowSharing ? maxSharedUsers : 0,
          consultationFeePolicy,
          perVisitFee: consultationFeePolicy === "per_visit" ? perVisitFee : null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create package");
      }
      const created = await res.json();
      setToast({ message: "Package sold successfully!", type: "success" });
      setTimeout(() => router.push(`/packages/${created.id || ""}`), 1500);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to sell package", type: "error" });
      setSubmitting(false);
    }
  }

  // ─── Category badge colors ────────────────────────────────────────────────
  function getCategoryColor(category: string): { bg: string; color: string } {
    const map: Record<string, { bg: string; color: string }> = {
      Panchakarma: { bg: "#e8f5e9", color: "var(--green)" },
      Therapy: { bg: "var(--blue-50)", color: "var(--blue-500)" },
      Consultation: { bg: "#fff3e0", color: "#f57c00" },
      Wellness: { bg: "#f3e5f5", color: "#7b1fa2" },
    };
    return map[category] || { bg: "var(--grey-200)", color: "var(--grey-600)" };
  }

  const stepLabels = ["Patient", "Treatment", "Options", "Payment"];

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/packages"
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-600)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Sell Package</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Step {step} of 4</p>
        </div>
      </div>

      {/* ── Step Indicator ──────────────────────────────────────── */}
      <StepIndicator current={step} labels={stepLabels} />

      {/* ── Step Content ────────────────────────────────────────── */}
      <div className="max-w-2xl">

        {/* ═══ STEP 1: Select Patient ═══ */}
        {step === 1 && (
          <div className="yoda-fade-in">
            <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Select Patient</h2>

            {selectedPatient ? (
              <div className="p-4 flex items-center justify-between" style={{ ...cardStyle, borderColor: "var(--blue-500)", background: "var(--blue-50)" }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                    style={{ background: "var(--blue-500)", color: "var(--white)", borderRadius: "var(--radius-pill)" }}
                  >
                    {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold" style={{ color: "var(--grey-900)" }}>
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </p>
                    <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>
                      {selectedPatient.patientIdNumber} &middot; {selectedPatient.phone}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-[14px] font-semibold hover:underline"
                  style={{ color: "var(--red)" }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="relative mb-3">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, phone, or patient ID..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-[15px]"
                    style={inputStyle}
                    autoFocus
                  />
                </div>

                {patientsLoading && (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
                    ))}
                  </div>
                )}

                {!patientsLoading && patientSearch.length >= 2 && patients.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>
                      No patients found for &quot;{patientSearch}&quot;
                    </p>
                    <Link href="/patients/new" className="text-[14px] font-semibold mt-2 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>
                      Register new patient
                    </Link>
                  </div>
                )}

                {!patientsLoading && patients.length > 0 && (
                  <div className="space-y-2">
                    {patients.slice(0, 10).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPatient(p); setPatientSearch(""); setPatients([]); }}
                        className="w-full text-left p-3 flex items-center gap-3 transition-colors"
                        style={{ ...cardStyle, cursor: "pointer" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--white)"; }}
                      >
                        <div
                          className="w-9 h-9 flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                          style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}
                        >
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                            {p.patientIdNumber} &middot; {p.phone}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!patientsLoading && patientSearch.length < 2 && (
                  <div className="text-center py-8">
                    <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>
                      Type at least 2 characters to search patients
                    </p>
                    <Link href="/patients/new" className="text-[14px] font-semibold mt-2 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>
                      Or register a new patient
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ STEP 2: Select Treatment & Package ═══ */}
        {step === 2 && (
          <div className="yoda-fade-in">
            <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Select Treatment & Package</h2>

            {/* Treatment Selection */}
            {selectedTreatment ? (
              <div className="p-4 flex items-center justify-between mb-4" style={{ ...cardStyle, borderColor: "var(--blue-500)", background: "var(--blue-50)" }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[16px] font-semibold" style={{ color: "var(--grey-900)" }}>{selectedTreatment.name}</p>
                    <span
                      className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide"
                      style={{ borderRadius: "var(--radius-sm)", ...getCategoryColor(selectedTreatment.category) }}
                    >
                      {selectedTreatment.category}
                    </span>
                  </div>
                  <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>
                    Base price: {formatCurrency(selectedTreatment.basePrice)} &middot; {selectedTreatment.duration} mins
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedTreatment(null); setSelectedPackage(null); setPackageOptions([]); }}
                  className="text-[14px] font-semibold hover:underline"
                  style={{ color: "var(--red)" }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                {treatmentsLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
                    ))}
                  </div>
                ) : treatments.length === 0 ? (
                  <p className="text-[15px] text-center py-8" style={{ color: "var(--grey-500)" }}>No treatments available</p>
                ) : (
                  <div className="space-y-2">
                    {treatments.map((t) => {
                      const catColor = getCategoryColor(t.category);
                      return (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTreatment(t)}
                          className="w-full text-left p-4 transition-colors"
                          style={{ ...cardStyle, cursor: "pointer" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--white)"; }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-[16px] font-semibold" style={{ color: "var(--grey-900)" }}>{t.name}</p>
                                <span
                                  className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide"
                                  style={{ borderRadius: "var(--radius-sm)", background: catColor.bg, color: catColor.color }}
                                >
                                  {t.category}
                                </span>
                              </div>
                              <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>
                                {formatCurrency(t.basePrice)} per session &middot; {t.duration} mins
                              </p>
                            </div>
                            <svg className="w-4 h-4 flex-shrink-0" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Package Options - shown after treatment selected */}
            {selectedTreatment && (
              <div className="mt-4">
                <h3 className="text-[16px] font-bold mb-3" style={{ color: "var(--grey-900)" }}>Select Package</h3>

                {packagesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {packageOptions.map((pkg) => {
                      const isSelected = selectedPackage?.id === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg)}
                          className="w-full text-left p-4 transition-colors"
                          style={{
                            ...cardStyle,
                            cursor: "pointer",
                            borderColor: isSelected ? "var(--blue-500)" : "var(--grey-300)",
                            background: isSelected ? "var(--blue-50)" : "var(--white)",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-5 h-5 flex items-center justify-center flex-shrink-0"
                                style={{
                                  borderRadius: "var(--radius-pill)",
                                  border: isSelected ? "none" : "2px solid var(--grey-400)",
                                  background: isSelected ? "var(--blue-500)" : "transparent",
                                }}
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <p className="text-[16px] font-semibold" style={{ color: "var(--grey-900)" }}>
                                  {pkg.name} &mdash; {formatCurrency(pkg.price)}
                                </p>
                                {pkg.savingsPercent > 0 && (
                                  <p className="text-[14px]" style={{ color: "var(--green)" }}>
                                    Save {pkg.savingsPercent}% (was {formatCurrency(pkg.originalPrice)})
                                  </p>
                                )}
                                {pkg.sessions === 1 && (
                                  <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No package discount</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[15px] font-bold" style={{ color: "var(--grey-700)" }}>
                              {pkg.sessions} {pkg.sessions === 1 ? "session" : "sessions"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 3: Package Options ═══ */}
        {step === 3 && (
          <div className="yoda-fade-in">
            <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Package Options</h2>

            <div className="space-y-5">
              {/* Expiry Date */}
              <div className="p-4" style={cardStyle}>
                <label className="block text-[15px] font-semibold mb-2" style={{ color: "var(--grey-900)" }}>
                  Expiry Date
                </label>
                <p className="text-[14px] mb-2" style={{ color: "var(--grey-500)" }}>
                  Default: 12 months from today. You can customize below.
                </p>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  min={getTodayString()}
                  className="px-3 py-2 w-full text-[15px]"
                  style={inputStyle}
                />
              </div>

              {/* Sharing */}
              <div className="p-4" style={cardStyle}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>
                    Allow Sharing
                  </label>
                  <button
                    onClick={() => setAllowSharing(!allowSharing)}
                    className="w-10 h-6 flex items-center transition-colors duration-200"
                    style={{
                      borderRadius: "var(--radius-pill)",
                      background: allowSharing ? "var(--blue-500)" : "var(--grey-300)",
                      padding: 2,
                    }}
                  >
                    <div
                      className="w-5 h-5 transition-transform duration-200"
                      style={{
                        borderRadius: "var(--radius-pill)",
                        background: "var(--white)",
                        boxShadow: "var(--shadow-sm)",
                        transform: allowSharing ? "translateX(16px)" : "translateX(0)",
                      }}
                    />
                  </button>
                </div>
                <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>
                  Allow this package to be shared with family members or friends.
                </p>

                {allowSharing && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--grey-200)" }}>
                    <label className="block text-[14px] font-semibold mb-2" style={{ color: "var(--grey-700)" }}>
                      Max shared users: {maxSharedUsers}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={maxSharedUsers}
                      onChange={(e) => setMaxSharedUsers(Number(e.target.value))}
                      className="w-full"
                      style={{ accentColor: "var(--blue-500)" }}
                    />
                    <div className="flex justify-between text-[12px]" style={{ color: "var(--grey-500)" }}>
                      <span>1</span>
                      <span>10</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Consultation Fee Policy */}
              <div className="p-4" style={cardStyle}>
                <label className="block text-[15px] font-semibold mb-3" style={{ color: "var(--grey-900)" }}>
                  Consultation Fee
                </label>

                <div className="space-y-2">
                  {[
                    { value: "doctor_decides" as const, label: "Doctor decides per visit", desc: "Consultation fee will be set by the doctor at each visit" },
                    { value: "included" as const, label: "Included in package", desc: "No additional consultation fee per visit" },
                    { value: "per_visit" as const, label: "Per visit (fixed)", desc: "Fixed consultation fee per visit" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setConsultationFeePolicy(option.value)}
                      className="w-full text-left p-3 transition-colors"
                      style={{
                        border: consultationFeePolicy === option.value ? "2px solid var(--blue-500)" : "1px solid var(--grey-300)",
                        borderRadius: "var(--radius-sm)",
                        background: consultationFeePolicy === option.value ? "var(--blue-50)" : "var(--white)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderRadius: "var(--radius-pill)",
                            border: consultationFeePolicy === option.value ? "none" : "2px solid var(--grey-400)",
                            background: consultationFeePolicy === option.value ? "var(--blue-500)" : "transparent",
                          }}
                        >
                          {consultationFeePolicy === option.value && (
                            <div className="w-2 h-2" style={{ borderRadius: "var(--radius-pill)", background: "var(--white)" }} />
                          )}
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{option.label}</p>
                          <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{option.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {consultationFeePolicy === "per_visit" && (
                  <div className="mt-3">
                    <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Fee per visit (S$)</label>
                    <input
                      type="number"
                      value={perVisitFee}
                      onChange={(e) => setPerVisitFee(Number(e.target.value))}
                      min={0}
                      className="px-3 py-2 w-full text-[15px]"
                      style={inputStyle}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="p-4" style={cardStyle}>
                <label className="block text-[15px] font-semibold mb-2" style={{ color: "var(--grey-900)" }}>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                  placeholder="Any special notes about this package..."
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: Payment & Confirm ═══ */}
        {step === 4 && selectedPackage && selectedTreatment && selectedPatient && (
          <div className="yoda-fade-in">
            <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Invoice & Payment</h2>

            {/* ── Invoice-style Summary ── */}
            <div className="mb-5 overflow-hidden" style={{ ...cardStyle, border: "2px solid var(--grey-300)" }}>
              {/* Invoice Header */}
              <div className="px-5 py-4" style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-300)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Package Invoice</p>
                    <p className="text-[16px] font-bold mt-0.5" style={{ color: "var(--grey-900)" }}>Ayur Centre Pte. Ltd.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Date: {new Date().toLocaleDateString("en-SG")}</p>
                    <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Expiry: {formatDateDisplay(expiryDate)}</p>
                  </div>
                </div>
              </div>

              {/* Patient Info */}
              <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--grey-200)" }}>
                <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Bill To</p>
                <p className="text-[16px] font-semibold mt-0.5" style={{ color: "var(--grey-900)" }}>
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
                <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>{selectedPatient.phone}</p>
              </div>

              {/* Pricing Breakdown Table */}
              <div className="px-5 py-3">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--grey-300)" }}>
                      <th className="text-left py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Description</th>
                      <th className="text-center py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Sessions</th>
                      <th className="text-right py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Per Session</th>
                      <th className="text-right py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Treatment line */}
                    <tr style={{ borderBottom: "1px solid var(--grey-100)" }}>
                      <td className="py-3">
                        <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{selectedTreatment.name}</p>
                        <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{selectedPackage.name} &middot; {selectedTreatment.duration || 50} min per session</p>
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-[16px] font-bold" style={{ color: "var(--blue-500)" }}>{selectedPackage.sessions}</span>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-[15px]" style={{ color: "var(--grey-700)" }}>{formatCurrency(selectedTreatment.basePrice)}</span>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-[15px]" style={{ color: "var(--grey-700)" }}>{formatCurrency(selectedPackage.originalPrice)}</span>
                      </td>
                    </tr>

                    {/* Discount line (if applicable) */}
                    {selectedPackage.savingsPercent > 0 && (
                      <tr style={{ borderBottom: "1px solid var(--grey-100)" }}>
                        <td className="py-2.5" colSpan={3}>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex px-2 py-0.5 text-[12px] font-bold rounded-full" style={{ background: "#c8e6c9", color: "#2e7d32" }}>{selectedPackage.savingsPercent}% OFF</span>
                            <span className="text-[15px]" style={{ color: "var(--green)" }}>Package Discount</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="text-[15px] font-semibold" style={{ color: "var(--green)" }}>
                            -{formatCurrency(selectedPackage.originalPrice - selectedPackage.price)}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="mt-3 pt-3" style={{ borderTop: "2px solid var(--grey-300)" }}>
                  {selectedPackage.savingsPercent > 0 && (
                    <div className="flex justify-between text-[14px] mb-1">
                      <span style={{ color: "var(--grey-500)" }}>Subtotal ({selectedPackage.sessions} × {formatCurrency(selectedTreatment.basePrice)})</span>
                      <span style={{ color: "var(--grey-500)", textDecoration: "line-through" }}>{formatCurrency(selectedPackage.originalPrice)}</span>
                    </div>
                  )}
                  {selectedPackage.savingsPercent > 0 && (
                    <div className="flex justify-between text-[14px] mb-1">
                      <span style={{ color: "var(--green)" }}>Discount ({selectedPackage.savingsPercent}%)</span>
                      <span style={{ color: "var(--green)" }}>-{formatCurrency(selectedPackage.originalPrice - selectedPackage.price)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[16px] font-bold mt-2 pt-2" style={{ borderTop: "1px solid var(--grey-200)", color: "var(--grey-900)" }}>
                    <span>Total Package Price</span>
                    <span>{formatCurrency(selectedPackage.price)}</span>
                  </div>
                  <p className="text-[13px] text-right mt-1" style={{ color: "var(--grey-500)" }}>
                    Effective rate: {formatCurrency(selectedPackage.price / selectedPackage.sessions)} per session
                  </p>
                </div>
              </div>
            </div>

            {/* ── Payment Section ── */}
            <div className="p-4 mb-4" style={cardStyle}>
              <label className="block text-[15px] font-semibold mb-3" style={{ color: "var(--grey-900)" }}>Payment</label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => { setPaymentType("full"); setPaymentAmount(selectedPackage.price); }}
                  className="flex-1 px-4 py-2.5 text-[15px] font-semibold transition-colors"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: paymentType === "full" ? "var(--blue-500)" : "var(--white)",
                    color: paymentType === "full" ? "var(--white)" : "var(--grey-700)",
                    border: paymentType === "full" ? "1px solid var(--blue-500)" : "1px solid var(--grey-400)",
                  }}
                >
                  Full Payment — {formatCurrency(selectedPackage.price)}
                </button>
                <button
                  onClick={() => setPaymentType("partial")}
                  className="flex-1 px-4 py-2.5 text-[15px] font-semibold transition-colors"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: paymentType === "partial" ? "var(--blue-500)" : "var(--white)",
                    color: paymentType === "partial" ? "var(--white)" : "var(--grey-700)",
                    border: paymentType === "partial" ? "1px solid var(--blue-500)" : "1px solid var(--grey-400)",
                  }}
                >
                  Partial Payment
                </button>
              </div>

              {paymentType === "partial" && (
                <div className="mb-3">
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Amount Paying Now (S$)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    min={0}
                    max={selectedPackage.price}
                    className="px-3 py-2 w-full text-[15px]"
                    style={inputStyle}
                  />
                  {/* Balance breakdown */}
                  <div className="mt-3 p-3" style={{ background: "#fff3e0", borderRadius: "var(--radius-sm)", border: "1px solid #ffe0b2" }}>
                    <div className="flex justify-between text-[14px] mb-1">
                      <span style={{ color: "var(--grey-700)" }}>Package Price</span>
                      <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{formatCurrency(selectedPackage.price)}</span>
                    </div>
                    <div className="flex justify-between text-[14px] mb-1">
                      <span style={{ color: "var(--green)" }}>Paying Now</span>
                      <span className="font-semibold" style={{ color: "var(--green)" }}>-{formatCurrency(paymentAmount)}</span>
                    </div>
                    <div className="flex justify-between text-[16px] font-bold pt-1.5 mt-1.5" style={{ borderTop: "1px solid #ffe0b2", color: "#f57c00" }}>
                      <span>Balance Due</span>
                      <span>{formatCurrency(selectedPackage.price - paymentAmount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="p-4 mb-6" style={cardStyle}>
              <label className="block text-[15px] font-semibold mb-3" style={{ color: "var(--grey-900)" }}>Payment Method</label>
              <div className="flex gap-2 flex-wrap">
                {["Cash", "Card", "NETS"].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className="px-4 py-2 text-[15px] font-semibold transition-colors"
                    style={{
                      borderRadius: "var(--radius-sm)",
                      background: paymentMethod === method ? "var(--blue-500)" : "var(--white)",
                      color: paymentMethod === method ? "var(--white)" : "var(--grey-700)",
                      border: paymentMethod === method ? "1px solid var(--blue-500)" : "1px solid var(--grey-400)",
                    }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation Buttons ────────────────────────────────── */}
        <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: "1px solid var(--grey-200)" }}>
          {step > 1 ? (
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 px-4 py-2 text-[15px] font-semibold transition-colors"
              style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-400)", color: "var(--grey-700)", background: "var(--white)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="inline-flex items-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors"
              style={{
                ...btnPrimary,
                opacity: canProceed() ? 1 : 0.5,
                cursor: canProceed() ? "pointer" : "not-allowed",
              }}
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSell}
              disabled={submitting}
              className="inline-flex items-center gap-2 text-white px-6 py-2.5 text-[15px] font-semibold transition-colors"
              style={{
                ...btnPrimary,
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Sell Package
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
