"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Doctor {
  id: string;
  name: string;
  role: string;
  specialization: string | null;
  department: string | null;
  consultationFee: number | null;
  slotDuration: number | null;
  avatar: string | null;
}

interface Treatment {
  id: string;
  name: string;
  category: string;
  duration: number;
  basePrice: number;
  description: string | null;
}

interface Slot {
  time: string;
  available: boolean;
}

interface ClinicData {
  clinic: {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string;
    logoUrl: string | null;
    settings?: {
      clinicName: string;
      address: string;
      city: string;
      phone: string;
      currency: string;
    };
  };
  doctors: Doctor[];
  treatments: Treatment[];
}

export default function PublicBookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ClinicData | null>(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState("");

  // Patient info
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [reason, setReason] = useState("");

  // Booking result
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<{ id: string; date: string; time: string; doctor: string } | null>(null);
  const [payingOnline, setPayingOnline] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"" | "success" | "cancelled">("");

  // Check for payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") setPaymentStatus("success");
    if (payment === "cancelled") setPaymentStatus("cancelled");
  }, []);

  // Load clinic data
  useEffect(() => {
    fetch(`/api/public/clinic/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load clinic"))
      .finally(() => setLoading(false));
  }, [slug]);

  // Load slots when doctor + date change
  useEffect(() => {
    if (!selectedDoctor || !selectedDate || !data) return;
    setSlotsLoading(true);
    setSlotsMessage("");
    setSelectedTime("");
    fetch(`/api/public/slots?clinicId=${data.clinic.id}&doctorId=${selectedDoctor.id}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots || []);
        setSlotsMessage(d.message || "");
      })
      .catch(() => setSlotsMessage("Failed to load slots"))
      .finally(() => setSlotsLoading(false));
  }, [selectedDoctor, selectedDate, data]);

  // Get minimum date (today)
  const today = new Date().toISOString().split("T")[0];
  // Max date (30 days from now)
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  async function handleBook() {
    if (!data || !selectedDoctor || !selectedDate || !selectedTime || !patientName || !patientPhone) return;
    setBooking(true);
    setError("");

    try {
      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: data.clinic.id,
          doctorId: selectedDoctor.id,
          date: selectedDate,
          time: selectedTime,
          patientName,
          patientPhone,
          patientEmail: patientEmail || undefined,
          treatmentId: selectedTreatment?.id,
          treatmentName: selectedTreatment?.name,
          reason,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Booking failed");
      } else {
        setBooked(result.appointment);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  function formatTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fefbf6" }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: "#14532d" }}>
            <span className="text-[12px] font-extrabold text-white">AG</span>
          </div>
          <p className="text-[14px]" style={{ color: "#6b7280" }}>Loading booking page...</p>
        </div>
      </div>
    );
  }

  // Error / not found
  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fefbf6" }}>
        <div className="text-center max-w-md px-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#fef2f2" }}>
            <svg className="w-6 h-6" fill="none" stroke="#dc2626" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-[20px] font-bold mb-2" style={{ color: "#111827" }}>Clinic Not Found</h1>
          <p className="text-[14px] mb-6" style={{ color: "#6b7280" }}>This booking link doesn&apos;t appear to be valid.</p>
          <Link href="/" className="text-[14px] font-semibold hover:underline" style={{ color: "#14532d" }}>Go to AyurGate</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const clinic = data.clinic;
  const clinicName = clinic.settings?.clinicName || clinic.name;

  // Success state
  if (booked) {
    const dateFormatted = new Date(booked.date + "T00:00:00").toLocaleDateString("en-SG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return (
      <div className="min-h-screen" style={{ background: "#fefbf6" }}>
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#d1fae5" }}>
            <svg className="w-8 h-8" fill="none" stroke="#16a34a" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-[28px] font-bold mb-2" style={{ color: "#111827" }}>Booking Confirmed!</h1>
          <p className="text-[15px] mb-8" style={{ color: "#6b7280" }}>
            Your appointment at <strong>{clinicName}</strong> has been confirmed.
          </p>

          <div className="p-6 rounded-xl text-left mb-8" style={{ background: "white", border: "1px solid #e5e7eb" }}>
            <div className="space-y-3">
              <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                <span className="text-[14px]" style={{ color: "#6b7280" }}>Date</span>
                <span className="text-[14px] font-semibold" style={{ color: "#111827" }}>{dateFormatted}</span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                <span className="text-[14px]" style={{ color: "#6b7280" }}>Time</span>
                <span className="text-[14px] font-semibold" style={{ color: "#111827" }}>{formatTime(booked.time)}</span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                <span className="text-[14px]" style={{ color: "#6b7280" }}>Doctor</span>
                <span className="text-[14px] font-semibold" style={{ color: "#111827" }}>{booked.doctor}</span>
              </div>
              {selectedTreatment && (
                <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <span className="text-[14px]" style={{ color: "#6b7280" }}>Treatment</span>
                  <span className="text-[14px] font-semibold" style={{ color: "#111827" }}>{selectedTreatment.name}</span>
                </div>
              )}
              {clinic.settings?.address && (
                <div className="flex justify-between py-2">
                  <span className="text-[14px]" style={{ color: "#6b7280" }}>Location</span>
                  <span className="text-[14px] font-semibold text-right" style={{ color: "#111827" }}>{clinic.settings.address}</span>
                </div>
              )}
            </div>
          </div>

          {patientEmail && (
            <p className="text-[13px] mb-6" style={{ color: "#6b7280" }}>
              A confirmation email has been sent to <strong>{patientEmail}</strong>
            </p>
          )}

          {/* Payment Status */}
          {paymentStatus === "success" && (
            <div className="p-4 rounded-xl mb-6" style={{ background: "#f0fdf4", border: "1.5px solid #86efac" }}>
              <div className="flex items-center gap-2 justify-center">
                <svg className="w-5 h-5" fill="none" stroke="#16a34a" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[14px] font-bold" style={{ color: "#16a34a" }}>Payment Successful!</span>
              </div>
              <p className="text-[12px] mt-1" style={{ color: "#059669" }}>Your consultation fee has been paid. No payment needed at the clinic.</p>
            </div>
          )}

          {paymentStatus === "cancelled" && (
            <div className="p-4 rounded-xl mb-6" style={{ background: "#fef3c7", border: "1.5px solid #fbbf24" }}>
              <p className="text-[13px] font-semibold" style={{ color: "#92400e" }}>Payment was cancelled. You can pay at the clinic instead.</p>
            </div>
          )}

          {/* Pay Online Button */}
          {selectedDoctor?.consultationFee && selectedDoctor.consultationFee > 0 && paymentStatus !== "success" && (
            <button
              disabled={payingOnline}
              onClick={async () => {
                if (!data || !booked) return;
                setPayingOnline(true);
                try {
                  const res = await fetch("/api/public/payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ appointmentId: booked.id, clinicId: data.clinic.id }),
                  });
                  const result = await res.json();
                  if (result.url) {
                    window.location.href = result.url;
                  } else {
                    setError(result.error || "Payment not available");
                    setPayingOnline(false);
                  }
                } catch {
                  setError("Failed to start payment");
                  setPayingOnline(false);
                }
              }}
              className="w-full py-3 rounded-xl text-[15px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 mb-4"
              style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
            >
              {payingOnline ? "Redirecting to payment..." : `Pay Online — S$${selectedDoctor.consultationFee.toFixed(2)}`}
            </button>
          )}

          {paymentStatus !== "success" && selectedDoctor?.consultationFee && selectedDoctor.consultationFee > 0 && (
            <p className="text-[12px] mb-4" style={{ color: "#9ca3af" }}>Or pay at the clinic during your visit</p>
          )}

          <button
            onClick={() => {
              setBooked(null);
              setStep(1);
              setSelectedDoctor(null);
              setSelectedDate("");
              setSelectedTime("");
              setSelectedTreatment(null);
              setPatientName("");
              setPatientPhone("");
              setPatientEmail("");
              setReason("");
              setPaymentStatus("");
            }}
            className="px-6 py-2.5 rounded-lg text-[14px] font-semibold transition-all hover:opacity-90"
            style={{ color: "#14532d", border: "1.5px solid #14532d" }}
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#fefbf6" }}>
      {/* Header */}
      <header className="px-6 py-4" style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {clinic.logoUrl ? (
              <img src={clinic.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#14532d" }}>
                <span className="text-[11px] font-extrabold text-white">{clinicName.substring(0, 2).toUpperCase()}</span>
              </div>
            )}
            <div>
              <div className="text-[16px] font-bold" style={{ color: "#111827" }}>{clinicName}</div>
              <div className="text-[12px]" style={{ color: "#6b7280" }}>
                {clinic.settings?.address ? `${clinic.settings.address}` : `${clinic.city || ""}, ${clinic.country}`}
              </div>
            </div>
          </div>
          {clinic.settings?.phone && (
            <a href={`tel:${clinic.settings.phone}`} className="text-[13px] font-medium" style={{ color: "#14532d" }}>
              {clinic.settings.phone}
            </a>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-[22px] sm:text-[24px] font-bold mb-1" style={{ color: "#111827" }}>Book an Appointment</h1>
        <p className="text-[14px] mb-8" style={{ color: "#6b7280" }}>Select your doctor, date, and time to schedule your visit.</p>

        {/* Progress */}
        <div className="flex items-center gap-1 sm:gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-1 sm:gap-2 flex-1">
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[12px] sm:text-[13px] font-bold flex-shrink-0"
                style={{
                  background: step >= s ? "#14532d" : "#e5e7eb",
                  color: step >= s ? "white" : "#9ca3af",
                }}
              >
                {step > s ? (
                  <svg className="w-4 h-4" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 4 && <div className="flex-1 h-[2px]" style={{ background: step > s ? "#14532d" : "#e5e7eb" }} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-[13px] font-medium" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
            {error}
            <button onClick={() => setError("")} className="float-right font-bold">&times;</button>
          </div>
        )}

        {/* Step 1: Choose Doctor */}
        {step === 1 && (
          <div>
            <h2 className="text-[18px] font-bold mb-4" style={{ color: "#111827" }}>Choose a Doctor</h2>
            {data.treatments.length > 0 && (
              <div className="mb-4">
                <label className="block text-[13px] font-medium mb-2" style={{ color: "#6b7280" }}>Looking for a specific treatment? (optional)</label>
                <select
                  value={selectedTreatment?.id || ""}
                  onChange={(e) => {
                    const t = data.treatments.find((t) => t.id === e.target.value);
                    setSelectedTreatment(t || null);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
                  style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                >
                  <option value="">All services</option>
                  {data.treatments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.duration} min{t.basePrice ? ` — $${t.basePrice}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-3">
              {data.doctors.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoctor(doc);
                    setStep(2);
                  }}
                  className="w-full text-left p-4 rounded-xl transition-all hover:shadow-md"
                  style={{
                    background: "white",
                    border: selectedDoctor?.id === doc.id ? "2px solid #14532d" : "1px solid #e5e7eb",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#d1f2e0" }}>
                      <span className="text-[14px] font-bold" style={{ color: "#14532d" }}>
                        {doc.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-[15px] font-bold" style={{ color: "#111827" }}>{doc.name}</div>
                      <div className="text-[13px]" style={{ color: "#6b7280" }}>
                        {doc.specialization || doc.department || doc.role}
                      </div>
                    </div>
                    {doc.consultationFee && (
                      <div className="text-[14px] font-semibold" style={{ color: "#14532d" }}>
                        ${doc.consultationFee}
                      </div>
                    )}
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
              {data.doctors.length === 0 && (
                <p className="text-center py-8 text-[14px]" style={{ color: "#6b7280" }}>No doctors available at this clinic.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Choose Date & Time */}
        {step === 2 && selectedDoctor && (
          <div>
            <h2 className="text-[18px] font-bold mb-1" style={{ color: "#111827" }}>
              Select Date & Time
            </h2>
            <p className="text-[13px] mb-4" style={{ color: "#6b7280" }}>
              with {selectedDoctor.name}
              {selectedDoctor.specialization ? ` — ${selectedDoctor.specialization}` : ""}
            </p>

            <div className="mb-4">
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: "#374151" }}>Date</label>
              <input
                type="date"
                value={selectedDate}
                min={today}
                max={maxDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
                style={{ border: "1.5px solid #e5e7eb", background: "white" }}
              />
            </div>

            {selectedDate && (
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: "#374151" }}>Available Times</label>
                {slotsLoading ? (
                  <p className="text-[14px] py-4" style={{ color: "#6b7280" }}>Loading available times...</p>
                ) : slotsMessage ? (
                  <div className="p-4 rounded-lg text-[14px]" style={{ background: "#fef2f2", color: "#b91c1c" }}>
                    {slotsMessage}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-[14px] py-4" style={{ color: "#6b7280" }}>No slots available for this date.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className="py-2.5 rounded-lg text-[13px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: selectedTime === slot.time ? "#14532d" : slot.available ? "white" : "#f9fafb",
                          color: selectedTime === slot.time ? "white" : slot.available ? "#374151" : "#d1d5db",
                          border: selectedTime === slot.time ? "1.5px solid #14532d" : "1.5px solid #e5e7eb",
                        }}
                      >
                        {formatTime(slot.time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-lg text-[14px] font-medium"
                style={{ color: "#374151", border: "1.5px solid #e5e7eb" }}
              >
                Back
              </button>
              <button
                disabled={!selectedDate || !selectedTime}
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "#14532d" }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Your Details */}
        {step === 3 && (
          <div>
            <h2 className="text-[18px] font-bold mb-4" style={{ color: "#111827" }}>Your Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Full Name *</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
                  style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Phone *</label>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+65 XXXX XXXX"
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Email (optional)</label>
                  <input
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Reason for visit (optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe your symptoms or reason for the appointment"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none resize-none"
                  style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-lg text-[14px] font-medium"
                style={{ color: "#374151", border: "1.5px solid #e5e7eb" }}
              >
                Back
              </button>
              <button
                disabled={!patientName || !patientPhone}
                onClick={() => setStep(4)}
                className="flex-1 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "#14532d" }}
              >
                Review Booking
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && selectedDoctor && (
          <div>
            <h2 className="text-[18px] font-bold mb-4" style={{ color: "#111827" }}>Review & Confirm</h2>

            <div className="p-5 rounded-xl mb-6" style={{ background: "white", border: "1px solid #e5e7eb" }}>
              <div className="space-y-3">
                <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <span className="text-[14px]" style={{ color: "#6b7280" }}>Clinic</span>
                  <span className="text-[14px] font-semibold" style={{ color: "#111827" }}>{clinicName}</span>
                </div>
                <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <span className="text-[14px]" style={{ color: "#6b7280" }}>Doctor</span>
                  <span className="text-[14px] font-semibold" style={{ color: "#111827" }}>{selectedDoctor.name}</span>
                </div>
                <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <span className="text-[14px]" style={{ color: "#6b7280" }}>Date</span>
                  <span className="text-[14px] font-semibold" style={{ color: "#111827" }}>
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-SG", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <span className="text-[14px]" style={{ color: "#6b7280" }}>Time</span>
                  <span className="text-[14px] font-semibold" style={{ color: "#111827" }}>{formatTime(selectedTime)}</span>
                </div>
                {selectedTreatment && (
                  <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <span className="text-[14px]" style={{ color: "#6b7280" }}>Treatment</span>
                    <span className="text-[14px] font-semibold" style={{ color: "#111827" }}>{selectedTreatment.name}</span>
                  </div>
                )}
                <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <span className="text-[14px]" style={{ color: "#6b7280" }}>Patient</span>
                  <span className="text-[14px] font-semibold" style={{ color: "#111827" }}>{patientName}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[14px]" style={{ color: "#6b7280" }}>Phone</span>
                  <span className="text-[14px] font-semibold" style={{ color: "#111827" }}>{patientPhone}</span>
                </div>
                {selectedDoctor.consultationFee && (
                  <div className="flex justify-between py-3 mt-2 rounded-lg px-3" style={{ background: "#f0fdf4" }}>
                    <span className="text-[14px] font-semibold" style={{ color: "#14532d" }}>Consultation Fee</span>
                    <span className="text-[16px] font-bold" style={{ color: "#14532d" }}>
                      ${selectedDoctor.consultationFee}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-lg text-[14px] font-medium"
                style={{ color: "#374151", border: "1.5px solid #e5e7eb" }}
              >
                Back
              </button>
              <button
                disabled={booking}
                onClick={handleBook}
                className="flex-1 py-3 rounded-lg text-[15px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
              >
                {booking ? "Confirming..." : "Confirm Booking"}
              </button>
            </div>

            <p className="text-[12px] text-center mt-4" style={{ color: "#9ca3af" }}>
              By booking, you agree to the clinic&apos;s terms. Payment is collected at the clinic.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="px-6 py-6 mt-8" style={{ borderTop: "1px solid #e5e7eb" }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <p className="text-[11px]" style={{ color: "#9ca3af" }}>Powered by AyurGate</p>
          <Link href="/" className="text-[11px] hover:underline" style={{ color: "#9ca3af" }}>ayurgate.com</Link>
        </div>
      </footer>
    </div>
  );
}
