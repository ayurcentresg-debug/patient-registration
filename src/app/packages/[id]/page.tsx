"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useFlash } from "@/components/FlashCardProvider";
import { cardStyle, btnPrimary, inputStyle, chipBase } from "@/lib/styles";
import { formatCurrencyExact as formatCurrency, formatDate, formatDateLong } from "@/lib/formatters";

// ─── Types ──────────────────────────────────────────────────────────────────
interface PackageDetail {
  id: string;
  packageNumber: string;
  status: string;
  patientId: string;
  patientName: string;
  patientIdNumber: string;
  treatmentId: string;
  treatmentName: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  totalPrice: number;
  paidAmount: number;
  balanceAmount: number;
  expiryDate: string;
  purchaseDate: string;
  branchName: string;
  soldBy: string;
  consultationFeePolicy: string;
  perVisitFee: number | null;
  allowSharing: boolean;
  maxSharedUsers: number;
  notes: string;
  createdAt: string;
}

interface Session {
  id: string;
  sessionNumber: number;
  date: string;
  doctorName: string;
  branchName: string;
  status: string;
  usedBy: string;
  usedByRelation: string | null;
  notes: string | null;
}

interface ShareEntry {
  id: string;
  patientId: string;
  patientName: string;
  relation: string;
  active: boolean;
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  type: string;
  reference: string;
  notes: string | null;
}

interface Doctor {
  id: string;
  name: string;
}

type TabId = "sessions" | "sharing" | "payment" | "details";

// ─── Status colors ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: "#e8f5e9", color: "var(--green)" },
  completed: { bg: "var(--grey-200)", color: "var(--grey-600)" },
  expired: { bg: "#ffebee", color: "var(--red)" },
  cancelled: { bg: "#ffebee", color: "var(--red)" },
  refunded: { bg: "#fff3e0", color: "#f57c00" },
};

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysRemaining(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PackageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const packageId = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showFlash } = useFlash();

  // Tab state
  const initialTab = (searchParams.get("tab") as TabId) || "sessions";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Sharing
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  // Payments
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Modals
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  // Record Session form
  const [sessionDate, setSessionDate] = useState(getTodayString());
  const [sessionDoctorId, setSessionDoctorId] = useState("");
  const [sessionBranch, setSessionBranch] = useState("");
  const [sessionUsedBy, setSessionUsedBy] = useState("owner");
  const [sessionSubmitting, setSessionSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Add Share form
  const [sharePatientSearch, setSharePatientSearch] = useState("");
  const [sharePatients, setSharePatients] = useState<{ id: string; firstName: string; lastName: string; phone: string }[]>([]);
  const [shareSelectedPatient, setShareSelectedPatient] = useState<{ id: string; name: string } | null>(null);
  const [shareRelation, setShareRelation] = useState("Family");
  const [shareSubmitting, setShareSubmitting] = useState(false);

  // Refund
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Open session modal from URL param
  useEffect(() => {
    if (searchParams.get("action") === "record-session" && pkg) {
      setShowSessionModal(true);
    }
  }, [searchParams, pkg]);

  // ─── Fetch Package Detail ─────────────────────────────────────────────────
  const fetchPackage = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/patient-packages/${packageId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Package not found (${r.status})`);
        return r.json();
      })
      .then((data) => {
        setPkg({
          id: data.id,
          packageNumber: data.packageNumber || `PKG-${String(data.id).slice(0, 8)}`,
          status: data.status || "active",
          patientId: data.patientId || "",
          patientName: data.patientName || "",
          patientIdNumber: data.patientIdNumber || "",
          treatmentId: data.treatmentId || "",
          treatmentName: data.treatmentName || "",
          packageName: data.packageName || "",
          totalSessions: data.totalSessions ?? 0,
          usedSessions: data.usedSessions ?? 0,
          totalPrice: data.totalPrice ?? 0,
          paidAmount: data.paidAmount ?? 0,
          balanceAmount: data.balanceAmount ?? (data.totalPrice ?? 0) - (data.paidAmount ?? 0),
          expiryDate: data.expiryDate || "",
          purchaseDate: data.purchaseDate || data.createdAt || "",
          branchName: data.branchName || "",
          soldBy: data.soldBy || "",
          consultationFeePolicy: data.consultationFeePolicy || "doctor_decides",
          perVisitFee: data.perVisitFee ?? null,
          allowSharing: data.allowSharing ?? false,
          maxSharedUsers: data.maxSharedUsers ?? 0,
          notes: data.notes || "",
          createdAt: data.createdAt || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [packageId]);

  useEffect(() => { fetchPackage(); }, [fetchPackage]);

  // ─── Fetch Sessions ───────────────────────────────────────────────────────
  const fetchSessions = useCallback(() => {
    setSessionsLoading(true);
    fetch(`/api/patient-packages/${packageId}/sessions`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.sessions || data.items || [];
        setSessions(list.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          sessionNumber: (s.sessionNumber as number) ?? 0,
          date: (s.date as string) || "",
          doctorName: (s.doctorName as string) || "",
          branchName: (s.branchName as string) || "",
          status: (s.status as string) || "completed",
          usedBy: (s.usedBy as string) || (s.usedByName as string) || "Owner",
          usedByRelation: (s.usedByRelation as string) || null,
          notes: (s.notes as string) || null,
        })));
      })
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, [packageId]);

  // ─── Fetch Shares ─────────────────────────────────────────────────────────
  const fetchShares = useCallback(() => {
    setSharesLoading(true);
    fetch(`/api/patient-packages/${packageId}/shares`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.shares || data.items || [];
        setShares(list.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          patientId: (s.patientId as string) || "",
          patientName: (s.patientName as string) || "",
          relation: (s.relation as string) || "",
          active: (s.active as boolean) ?? true,
          createdAt: (s.createdAt as string) || "",
        })));
      })
      .catch(() => setShares([]))
      .finally(() => setSharesLoading(false));
  }, [packageId]);

  // ─── Fetch Payments ───────────────────────────────────────────────────────
  const fetchPayments = useCallback(() => {
    setPaymentsLoading(true);
    fetch(`/api/patient-packages/${packageId}/payments`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.payments || data.items || [];
        setPayments(list.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          date: (p.date as string) || (p.createdAt as string) || "",
          amount: (p.amount as number) ?? 0,
          method: (p.method as string) || "",
          type: (p.type as string) || "payment",
          reference: (p.reference as string) || "",
          notes: (p.notes as string) || null,
        })));
      })
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false));
  }, [packageId]);

  // ─── Fetch Doctors ────────────────────────────────────────────────────────
  const fetchDoctors = useCallback(() => {
    fetch("/api/doctors?status=active")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.doctors || data.items || [];
        setDoctors(list.map((d: Record<string, unknown>) => ({ id: d.id as string, name: (d.name as string) || "" })));
      })
      .catch(() => setDoctors([]));
  }, []);

  // Fetch tab data
  useEffect(() => {
    if (!pkg) return;
    if (activeTab === "sessions") fetchSessions();
    if (activeTab === "sharing") fetchShares();
    if (activeTab === "payment") fetchPayments();
  }, [activeTab, pkg, fetchSessions, fetchShares, fetchPayments]);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  // ─── Record Session ───────────────────────────────────────────────────────
  async function handleRecordSession() {
    setSessionSubmitting(true);
    try {
      const res = await fetch(`/api/patient-packages/${packageId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: sessionDate,
          doctorId: sessionDoctorId || undefined,
          branchName: sessionBranch || undefined,
          usedBy: sessionUsedBy,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record session");
      }
      showFlash({ type: "success", title: "Success", message: "Session recorded successfully!" });
      setShowSessionModal(false);
      setSessionDate(getTodayString());
      setSessionDoctorId("");
      setSessionBranch("");
      setSessionUsedBy("owner");
      fetchSessions();
      fetchPackage();
    } catch (err) {
      showFlash({ type: "error", title: "Error", message: err instanceof Error ? err.message : "Failed to record session" });
    } finally {
      setSessionSubmitting(false);
    }
  }

  // ─── Search patients for share ────────────────────────────────────────────
  useEffect(() => {
    if (sharePatientSearch.length < 2) {
      setSharePatients([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/patients?search=${encodeURIComponent(sharePatientSearch)}`)
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setSharePatients(data); })
        .catch(() => setSharePatients([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [sharePatientSearch]);

  // ─── Add Share ────────────────────────────────────────────────────────────
  async function handleAddShare() {
    if (!shareSelectedPatient) return;
    setShareSubmitting(true);
    try {
      const res = await fetch(`/api/patient-packages/${packageId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: shareSelectedPatient.id,
          relation: shareRelation,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add share");
      }
      showFlash({ type: "success", title: "Success", message: "Share added successfully!" });
      setShowShareModal(false);
      setSharePatientSearch("");
      setShareSelectedPatient(null);
      setShareRelation("Family");
      fetchShares();
    } catch (err) {
      showFlash({ type: "error", title: "Error", message: err instanceof Error ? err.message : "Failed to add share" });
    } finally {
      setShareSubmitting(false);
    }
  }

  // ─── Remove Share ─────────────────────────────────────────────────────────
  async function handleRemoveShare(shareId: string) {
    try {
      const res = await fetch(`/api/patient-packages/${packageId}/shares/${shareId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove share");
      showFlash({ type: "success", title: "Success", message: "Share removed" });
      fetchShares();
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to remove share" });
    }
  }

  // ─── Request Refund ───────────────────────────────────────────────────────
  function calculateRefund(): { refundAmount: number; sessionsValue: number; adminFee: number } {
    if (!pkg) return { refundAmount: 0, sessionsValue: 0, adminFee: 0 };
    const pricePerSession = pkg.totalSessions > 0 ? pkg.totalPrice / pkg.totalSessions : 0;
    const sessionsValue = pkg.usedSessions * pricePerSession;
    const adminFee = Math.min(pkg.totalPrice * 0.1, 50); // 10% or max S$50
    const refundAmount = Math.max(0, pkg.paidAmount - sessionsValue - adminFee);
    return { refundAmount, sessionsValue, adminFee };
  }

  async function handleRefund() {
    setRefundSubmitting(true);
    const { refundAmount } = calculateRefund();
    try {
      const res = await fetch(`/api/patient-packages/${packageId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundAmount }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process refund");
      }
      showFlash({ type: "success", title: "Success", message: "Refund processed successfully!" });
      setShowRefundModal(false);
      fetchPackage();
      fetchPayments();
    } catch (err) {
      showFlash({ type: "error", title: "Error", message: err instanceof Error ? err.message : "Failed to process refund" });
    } finally {
      setRefundSubmitting(false);
    }
  }

  // ─── Loading / Error ──────────────────────────────────────────────────────
  if (!mounted || loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-48 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="h-40 animate-pulse mb-4" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
        <div className="h-64 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="p-6 md:p-8 yoda-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/packages" className="w-8 h-8 flex items-center justify-center transition-colors" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-600)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Package Not Found</h1>
        </div>
        <div className="text-center py-16">
          <p className="text-[16px]" style={{ color: "var(--grey-600)" }}>{error || "This package does not exist."}</p>
          <Link href="/packages" className="text-[15px] font-semibold mt-3 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>Back to Packages</Link>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[pkg.status] || STATUS_COLORS.active;
  const remaining = pkg.totalSessions - pkg.usedSessions;
  const progressPercent = pkg.totalSessions > 0 ? (pkg.usedSessions / pkg.totalSessions) * 100 : 0;
  const days = pkg.expiryDate ? daysRemaining(pkg.expiryDate) : null;
  const refundCalc = calculateRefund();

  const TABS: { id: TabId; label: string }[] = [
    { id: "sessions", label: "Sessions" },
    { id: "sharing", label: "Sharing" },
    { id: "payment", label: "Payment & Refund" },
    { id: "details", label: "Details" },
  ];

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>{pkg.packageNumber}</h1>
            <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}>
              {pkg.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Link href={`/patients/${pkg.patientId}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>
              {pkg.patientName}
            </Link>
            <span className="text-[14px]" style={{ color: "var(--grey-500)" }}>&middot; {pkg.treatmentName}{pkg.packageName ? ` — ${pkg.packageName}` : ""}</span>
          </div>
        </div>
      </div>

      {/* ── Session Progress Card ────────────────────────────────── */}
      <div className="p-5 mb-6" style={cardStyle}>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Progress Circle / Large Numbers */}
          <div className="flex items-center gap-4 flex-1">
            <div
              className="w-16 h-16 flex items-center justify-center flex-shrink-0"
              style={{
                borderRadius: "var(--radius-pill)",
                background: progressPercent >= 100 ? "var(--grey-200)" : "var(--blue-50)",
                border: `3px solid ${progressPercent >= 100 ? "var(--grey-400)" : "var(--blue-500)"}`,
              }}
            >
              <span className="text-[18px] font-bold" style={{ color: progressPercent >= 100 ? "var(--grey-600)" : "var(--blue-500)" }}>
                {pkg.usedSessions}/{pkg.totalSessions}
              </span>
            </div>
            <div>
              <p className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>
                {pkg.usedSessions} of {pkg.totalSessions} Sessions Used
              </p>
              <p className="text-[15px]" style={{ color: "var(--grey-600)" }}>
                {remaining} session{remaining !== 1 ? "s" : ""} remaining
              </p>
              <div className="w-48 h-2 mt-2" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-pill)" }}>
                <div
                  className="h-2 transition-all duration-300"
                  style={{
                    width: `${Math.min(progressPercent, 100)}%`,
                    background: progressPercent >= 100 ? "var(--grey-500)" : "var(--blue-500)",
                    borderRadius: "var(--radius-pill)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right: Price + Expiry */}
          <div className="flex flex-col items-end gap-1">
            <p className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>
              {formatCurrency(pkg.paidAmount)}
              {pkg.balanceAmount > 0 && (
                <span className="text-[14px] font-normal ml-1" style={{ color: "#f57c00" }}>({formatCurrency(pkg.balanceAmount)} due)</span>
              )}
            </p>
            {pkg.expiryDate && (
              <p className="text-[14px]" style={{ color: days !== null && days < 30 ? (days < 7 ? "var(--red)" : "#f57c00") : "var(--grey-600)" }}>
                Expires {formatDateLong(pkg.expiryDate)}
                {days !== null && ` (${days < 0 ? "expired" : `${days}d left`})`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-0 mb-6 overflow-x-auto" style={{ borderBottom: "2px solid var(--grey-200)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 text-[15px] font-semibold whitespace-nowrap transition-colors relative"
            style={{
              color: activeTab === tab.id ? "var(--blue-500)" : "var(--grey-600)",
              borderBottom: activeTab === tab.id ? "2px solid var(--blue-500)" : "2px solid transparent",
              marginBottom: "-2px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: Sessions ═══ */}
      {activeTab === "sessions" && (
        <div className="yoda-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Session History</h2>
            {pkg.status === "active" && remaining > 0 && (
              <button
                onClick={() => setShowSessionModal(true)}
                className="inline-flex items-center gap-2 text-white px-4 py-2 text-[15px] font-semibold transition-colors"
                style={btnPrimary}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Record Session
              </button>
            )}
          </div>

          {sessionsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
                <svg className="w-6 h-6" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No sessions recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session.id} className="p-4 flex items-center gap-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
                  <div
                    className="w-10 h-10 flex items-center justify-center text-[15px] font-bold flex-shrink-0"
                    style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}
                  >
                    #{session.sessionNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>
                      Session {session.sessionNumber}
                    </p>
                    <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>
                      {formatDate(session.date)} &middot; {session.doctorName || "—"} &middot; {session.branchName || "—"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={chipBase}
                      style={{ borderRadius: "var(--radius-sm)", background: "#e8f5e9", color: "var(--green)" }}
                    >
                      {session.status}
                    </span>
                    {session.usedBy && session.usedBy !== "Owner" && (
                      <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>
                        Used by: {session.usedBy}
                        {session.usedByRelation && ` (${session.usedByRelation})`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 2: Sharing ═══ */}
      {activeTab === "sharing" && (
        <div className="yoda-fade-in">
          {!pkg.allowSharing && pkg.maxSharedUsers === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
                <svg className="w-6 h-6" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-[16px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Sharing Not Enabled</p>
              <p className="text-[15px] mb-4" style={{ color: "var(--grey-500)" }}>This package does not allow sharing with other patients.</p>
              <button
                onClick={() => {
                  // Could enable sharing via API
                  showFlash({ type: "error", title: "Error", message: "Please edit package details to enable sharing" });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-[15px] font-semibold transition-colors"
                style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--blue-500)", color: "var(--blue-500)", background: "var(--white)" }}
              >
                Enable Sharing
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Shared Users</h2>
                  <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>
                    {shares.filter((s) => s.active).length} of {pkg.maxSharedUsers} share slot{pkg.maxSharedUsers !== 1 ? "s" : ""} used
                  </p>
                </div>
                {shares.filter((s) => s.active).length < pkg.maxSharedUsers && (
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="inline-flex items-center gap-2 text-white px-4 py-2 text-[15px] font-semibold transition-colors"
                    style={btnPrimary}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Share
                  </button>
                )}
              </div>

              {sharesLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
                  ))}
                </div>
              ) : shares.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No shares added yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {shares.map((share) => (
                    <div key={share.id} className="p-4 flex items-center justify-between" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                          style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}
                        >
                          {share.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{share.patientName}</p>
                          <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                            {share.relation} &middot; Added {formatDate(share.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={chipBase}
                          style={{
                            borderRadius: "var(--radius-sm)",
                            background: share.active ? "#e8f5e9" : "var(--grey-200)",
                            color: share.active ? "var(--green)" : "var(--grey-600)",
                          }}
                        >
                          {share.active ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => handleRemoveShare(share.id)}
                          className="text-[13px] font-semibold hover:underline"
                          style={{ color: "var(--red)" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ TAB 3: Payment & Refund ═══ */}
      {activeTab === "payment" && (
        <div className="yoda-fade-in">
          {/* Payment Summary */}
          <div className="p-5 mb-5" style={cardStyle}>
            <h3 className="text-[15px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--grey-600)" }}>Payment Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>Total</p>
                <p className="text-[18px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(pkg.totalPrice)}</p>
              </div>
              <div>
                <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>Paid</p>
                <p className="text-[18px] font-bold" style={{ color: "var(--green)" }}>{formatCurrency(pkg.paidAmount)}</p>
              </div>
              <div>
                <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>Balance</p>
                <p className="text-[18px] font-bold" style={{ color: pkg.balanceAmount > 0 ? "#f57c00" : "var(--grey-600)" }}>
                  {formatCurrency(pkg.balanceAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="mb-6">
            <h3 className="text-[16px] font-bold mb-3" style={{ color: "var(--grey-900)" }}>Payment History</h3>
            {paymentsLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <p className="text-[15px] py-6 text-center" style={{ color: "var(--grey-500)" }}>No payment records found</p>
            ) : (
              <div className="space-y-2">
                {payments.map((pay) => (
                  <div key={pay.id} className="p-3 flex items-center justify-between" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: pay.type === "refund" ? "#f57c00" : "var(--grey-900)" }}>
                        {pay.type === "refund" ? "Refund" : "Payment"} &middot; {pay.method}
                      </p>
                      <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{formatDate(pay.date)}{pay.reference ? ` — ${pay.reference}` : ""}</p>
                    </div>
                    <span className="text-[16px] font-bold" style={{ color: pay.type === "refund" ? "#f57c00" : "var(--green)" }}>
                      {pay.type === "refund" ? "-" : "+"}{formatCurrency(pay.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Refund Section */}
          {pkg.status === "active" && (
            <div className="p-5" style={{ ...cardStyle, borderColor: "#ffe0b2" }}>
              <h3 className="text-[16px] font-bold mb-2" style={{ color: "var(--grey-900)" }}>Request Refund</h3>
              <p className="text-[14px] mb-3" style={{ color: "var(--grey-600)" }}>
                Refund is calculated per CaseTrust guidelines: Package price minus value of completed sessions minus administrative fee.
              </p>
              <div className="p-3 mb-3" style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)" }}>
                <div className="flex justify-between text-[14px] mb-1">
                  <span style={{ color: "var(--grey-600)" }}>Paid amount</span>
                  <span style={{ color: "var(--grey-900)" }}>{formatCurrency(pkg.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-[14px] mb-1">
                  <span style={{ color: "var(--grey-600)" }}>Used sessions value ({pkg.usedSessions} sessions)</span>
                  <span style={{ color: "var(--red)" }}>-{formatCurrency(refundCalc.sessionsValue)}</span>
                </div>
                <div className="flex justify-between text-[14px] mb-1">
                  <span style={{ color: "var(--grey-600)" }}>Admin fee</span>
                  <span style={{ color: "var(--red)" }}>-{formatCurrency(refundCalc.adminFee)}</span>
                </div>
                <div className="flex justify-between text-[15px] font-bold pt-1 mt-1" style={{ borderTop: "1px solid var(--grey-300)" }}>
                  <span style={{ color: "var(--grey-900)" }}>Refund amount</span>
                  <span style={{ color: "var(--green)" }}>{formatCurrency(refundCalc.refundAmount)}</span>
                </div>
              </div>
              <button
                onClick={() => setShowRefundModal(true)}
                className="px-4 py-2 text-[15px] font-semibold transition-colors"
                style={{ borderRadius: "var(--radius-sm)", border: "1px solid #f57c00", color: "#f57c00", background: "var(--white)" }}
              >
                Request Refund
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 4: Details ═══ */}
      {activeTab === "details" && (
        <div className="yoda-fade-in">
          <div className="p-5" style={cardStyle}>
            <h3 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Package Details</h3>
            <div className="space-y-3">
              {[
                { label: "Package Number", value: pkg.packageNumber },
                { label: "Status", value: pkg.status.charAt(0).toUpperCase() + pkg.status.slice(1) },
                { label: "Purchase Date", value: formatDateLong(pkg.purchaseDate) },
                { label: "Expiry Date", value: formatDateLong(pkg.expiryDate) },
                { label: "Branch", value: pkg.branchName || "—" },
                { label: "Sold By", value: pkg.soldBy || "—" },
                { label: "Consultation Fee Policy", value: pkg.consultationFeePolicy === "doctor_decides" ? "Doctor decides per visit" : pkg.consultationFeePolicy === "included" ? "Included in package" : `Per visit: ${formatCurrency(pkg.perVisitFee ?? 0)}` },
                { label: "Sharing", value: pkg.allowSharing ? `Enabled (max ${pkg.maxSharedUsers} user${pkg.maxSharedUsers !== 1 ? "s" : ""})` : "Disabled" },
                { label: "Notes", value: pkg.notes || "—" },
              ].map((row, i) => (
                <div key={i} className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--grey-100)" }}>
                  <span className="text-[15px]" style={{ color: "var(--grey-600)" }}>{row.label}</span>
                  <span className="text-[15px] font-medium text-right" style={{ color: "var(--grey-900)", maxWidth: "60%" }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Record Session ═══ */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-md mx-4 p-6 yoda-slide-in" style={{ ...cardStyle, boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Record Session</h3>
              <button onClick={() => setShowSessionModal(false)} className="w-7 h-7 flex items-center justify-center" style={{ color: "var(--grey-500)" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Date</label>
                <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="w-full px-3 py-2" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Doctor</label>
                <select value={sessionDoctorId} onChange={(e) => setSessionDoctorId(e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                  <option value="">Select doctor</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Branch</label>
                <input type="text" value={sessionBranch} onChange={(e) => setSessionBranch(e.target.value)} className="w-full px-3 py-2" style={inputStyle} placeholder="Branch name" />
              </div>
              {pkg.allowSharing && shares.length > 0 && (
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Who is using this session?</label>
                  <select value={sessionUsedBy} onChange={(e) => setSessionUsedBy(e.target.value)} className="w-full px-3 py-2" style={inputStyle}>
                    <option value="owner">{pkg.patientName} (Owner)</option>
                    {shares.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.patientId}>{s.patientName} ({s.relation})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowSessionModal(false)}
                className="flex-1 px-4 py-2 text-[15px] font-semibold"
                style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-400)", color: "var(--grey-700)", background: "var(--white)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordSession}
                disabled={sessionSubmitting}
                className="flex-1 text-white px-4 py-2 text-[15px] font-semibold"
                style={{ ...btnPrimary, opacity: sessionSubmitting ? 0.6 : 1 }}
              >
                {sessionSubmitting ? "Recording..." : "Record Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Add Share ═══ */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-md mx-4 p-6 yoda-slide-in" style={{ ...cardStyle, boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Add Share</h3>
              <button onClick={() => setShowShareModal(false)} className="w-7 h-7 flex items-center justify-center" style={{ color: "var(--grey-500)" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="text-[14px] mb-3" style={{ color: "var(--grey-500)" }}>
              {shares.filter((s) => s.active).length} of {pkg.maxSharedUsers} share slots used
            </p>

            <div className="space-y-3">
              {shareSelectedPatient ? (
                <div className="p-3 flex items-center justify-between" style={{ ...cardStyle, borderColor: "var(--blue-500)", background: "var(--blue-50)" }}>
                  <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{shareSelectedPatient.name}</span>
                  <button onClick={() => { setShareSelectedPatient(null); setSharePatientSearch(""); }} className="text-[14px] font-semibold" style={{ color: "var(--red)" }}>Change</button>
                </div>
              ) : (
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Search Patient</label>
                  <input
                    type="text"
                    value={sharePatientSearch}
                    onChange={(e) => setSharePatientSearch(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    placeholder="Search by name or phone..."
                  />
                  {sharePatients.length > 0 && (
                    <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                      {sharePatients.slice(0, 5).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setShareSelectedPatient({ id: p.id, name: `${p.firstName} ${p.lastName}` }); setSharePatients([]); }}
                          className="w-full text-left p-2 text-[15px] transition-colors"
                          style={{ borderRadius: "var(--radius-sm)", color: "var(--grey-900)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          {p.firstName} {p.lastName} &middot; {p.phone}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Relation</label>
                <div className="flex gap-2">
                  {["Family", "Friend", "Transfer"].map((rel) => (
                    <button
                      key={rel}
                      onClick={() => setShareRelation(rel)}
                      className="px-3 py-1.5 text-[14px] font-semibold transition-colors"
                      style={{
                        borderRadius: "var(--radius-sm)",
                        background: shareRelation === rel ? "var(--blue-500)" : "var(--white)",
                        color: shareRelation === rel ? "var(--white)" : "var(--grey-700)",
                        border: shareRelation === rel ? "1px solid var(--blue-500)" : "1px solid var(--grey-400)",
                      }}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 px-4 py-2 text-[15px] font-semibold"
                style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-400)", color: "var(--grey-700)", background: "var(--white)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddShare}
                disabled={!shareSelectedPatient || shareSubmitting}
                className="flex-1 text-white px-4 py-2 text-[15px] font-semibold"
                style={{ ...btnPrimary, opacity: !shareSelectedPatient || shareSubmitting ? 0.5 : 1 }}
              >
                {shareSubmitting ? "Adding..." : "Add Share"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Refund ═══ */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-md mx-4 p-6 yoda-slide-in" style={{ ...cardStyle, boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Confirm Refund</h3>
              <button onClick={() => setShowRefundModal(false)} className="w-7 h-7 flex items-center justify-center" style={{ color: "var(--grey-500)" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-3 mb-4" style={{ background: "#fff3e0", borderRadius: "var(--radius-sm)" }}>
              <p className="text-[14px] font-semibold mb-1" style={{ color: "#f57c00" }}>CaseTrust Refund Policy</p>
              <p className="text-[13px]" style={{ color: "var(--grey-700)" }}>
                Refund is calculated as: Amount paid minus the pro-rated value of sessions used minus an administrative fee (10% of package or max S$50).
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-[15px]">
                <span style={{ color: "var(--grey-600)" }}>Paid amount</span>
                <span style={{ color: "var(--grey-900)" }}>{formatCurrency(pkg.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-[15px]">
                <span style={{ color: "var(--grey-600)" }}>Sessions used ({pkg.usedSessions}x)</span>
                <span style={{ color: "var(--red)" }}>-{formatCurrency(refundCalc.sessionsValue)}</span>
              </div>
              <div className="flex justify-between text-[15px]">
                <span style={{ color: "var(--grey-600)" }}>Admin fee</span>
                <span style={{ color: "var(--red)" }}>-{formatCurrency(refundCalc.adminFee)}</span>
              </div>
              <div className="flex justify-between text-[17px] font-bold pt-2 mt-2" style={{ borderTop: "1px solid var(--grey-300)" }}>
                <span style={{ color: "var(--grey-900)" }}>Refund Amount</span>
                <span style={{ color: "var(--green)" }}>{formatCurrency(refundCalc.refundAmount)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 px-4 py-2 text-[15px] font-semibold"
                style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-400)", color: "var(--grey-700)", background: "var(--white)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={refundSubmitting || refundCalc.refundAmount <= 0}
                className="flex-1 px-4 py-2 text-[15px] font-semibold text-white"
                style={{ ...btnPrimary, background: "#f57c00", opacity: refundSubmitting || refundCalc.refundAmount <= 0 ? 0.5 : 1 }}
              >
                {refundSubmitting ? "Processing..." : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
