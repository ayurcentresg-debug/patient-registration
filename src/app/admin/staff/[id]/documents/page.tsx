"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────
interface StaffDocument {
  id: string;
  userId: string;
  name: string;
  category: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  expiryDate: string | null;
  isVerified: boolean;
  notes: string | null;
  uploadedAt: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  staffIdNumber: string | null;
}

interface DocForm {
  name: string;
  category: string;
  expiryDate: string;
  notes: string;
  file: File | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "license", label: "License", color: "#2d6a4f", bg: "#f0faf4" },
  { value: "certificate", label: "Certificate", color: "#7c3aed", bg: "#faf5ff" },
  { value: "identification", label: "Identification", color: "#0369a1", bg: "#f0f9ff" },
  { value: "contract", label: "Contract", color: "#d97706", bg: "#fffbeb" },
  { value: "other", label: "Other", color: "#78716c", bg: "#fafaf9" },
];

const CATEGORY_TABS = [
  { value: "all", label: "All" },
  { value: "license", label: "Licenses" },
  { value: "certificate", label: "Certificates" },
  { value: "identification", label: "Identification" },
  { value: "contract", label: "Contracts" },
  { value: "other", label: "Other" },
];

const EMPTY_FORM: DocForm = {
  name: "",
  category: "certificate",
  expiryDate: "",
  notes: "",
  file: null,
};

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ─── Design Tokens (YODA) ───────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--grey-400)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-900)",
  background: "var(--white)",
  fontSize: "15px",
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getCategoryMeta(category: string) {
  return CATEGORIES.find((c) => c.value === category) || CATEGORIES[4];
}

function getExpiryStatus(expiryDate: string | null): "ok" | "warning" | "expired" | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  if (expiry < now) return "expired";
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) return "warning";
  return "ok";
}

function isImageType(mimeType: string) {
  return mimeType.startsWith("image/");
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function StaffDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<StaffDocument | null>(null);
  const [form, setForm] = useState<DocForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Fetch staff info ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/staff/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStaffMember(data);
      })
      .catch(() => {});
  }, [id]);

  // ─── Fetch documents ─────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/${id}/documents`);
      if (res.ok) setDocuments(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ─── Expiring documents ───────────────────────────────────────────────
  const expiringDocs = documents.filter((d) => {
    const status = getExpiryStatus(d.expiryDate);
    return status === "warning" || status === "expired";
  });

  // ─── Filtering ────────────────────────────────────────────────────────
  const filtered =
    categoryFilter === "all"
      ? documents
      : documents.filter((d) => d.category === categoryFilter);

  // ─── Form handlers ───────────────────────────────────────────────────
  const openUpload = () => {
    setForm(EMPTY_FORM);
    setEditingDoc(null);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (doc: StaffDocument) => {
    setForm({
      name: doc.name,
      category: doc.category,
      expiryDate: doc.expiryDate ? doc.expiryDate.split("T")[0] : "",
      notes: doc.notes || "",
      file: null,
    });
    setEditingDoc(doc);
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingDoc(null);
    setFormError("");
  };

  const handleFileSelect = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFormError("Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFormError("File size exceeds 5MB limit");
      return;
    }
    setFormError("");
    setForm({ ...form, file });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSave = async () => {
    if (editingDoc) {
      // Update metadata only
      if (!form.name.trim()) {
        setFormError("Document name is required");
        return;
      }
      setSaving(true);
      setFormError("");
      try {
        const res = await fetch(`/api/staff/${id}/documents/${editingDoc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            category: form.category,
            expiryDate: form.expiryDate || null,
            notes: form.notes.trim() || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || "Failed to update");
          setSaving(false);
          return;
        }
        showToast("Document updated");
        closeForm();
        fetchDocuments();
      } catch {
        setFormError("Network error");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Upload new document
    if (!form.name.trim()) {
      setFormError("Document name is required");
      return;
    }
    if (!form.file) {
      setFormError("Please select a file to upload");
      return;
    }

    setSaving(true);
    setFormError("");

    const formData = new FormData();
    formData.append("file", form.file);
    formData.append("name", form.name.trim());
    formData.append("category", form.category);
    if (form.expiryDate) formData.append("expiryDate", form.expiryDate);
    if (form.notes.trim()) formData.append("notes", form.notes.trim());

    try {
      const res = await fetch(`/api/staff/${id}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to upload");
        setSaving(false);
        return;
      }
      showToast("Document uploaded");
      closeForm();
      fetchDocuments();
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/staff/${id}/documents/${docId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Document deleted");
        fetchDocuments();
      } else {
        showToast("Failed to delete", "err");
      }
    } catch {
      showToast("Network error", "err");
    }
  };

  const handleToggleVerified = async (doc: StaffDocument) => {
    try {
      const res = await fetch(`/api/staff/${id}/documents/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !doc.isVerified }),
      });
      if (res.ok) {
        showToast(doc.isVerified ? "Verification removed" : "Document verified");
        fetchDocuments();
      } else {
        showToast("Failed to update", "err");
      }
    } catch {
      showToast("Network error", "err");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-[200] px-4 py-3 rounded shadow-lg yoda-slide-in"
          style={{
            background: toast.type === "ok" ? "#e8f5e9" : "#ffebee",
            color: toast.type === "ok" ? "#2e7d32" : "var(--red)",
            border: `1px solid ${toast.type === "ok" ? "#a5d6a7" : "#ef9a9a"}`,
          }}
        >
          <p className="text-[15px] font-semibold">{toast.msg}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => router.push("/admin/staff")}
            className="text-[13px] font-semibold mb-2 inline-flex items-center gap-1"
            style={{ color: "var(--blue-500)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Staff List
          </button>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
            Staff Documents
          </h1>
          {staffMember && (
            <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
              {staffMember.name}
              {staffMember.staffIdNumber && (
                <span className="ml-2 font-mono text-[13px]" style={{ color: "var(--grey-500)" }}>
                  {staffMember.staffIdNumber}
                </span>
              )}
              {" "} — {staffMember.role}
            </p>
          )}
        </div>
        <button
          onClick={openUpload}
          className="inline-flex items-center gap-2 text-white px-5 py-2 text-[15px] font-semibold"
          style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Document
        </button>
      </div>

      {/* Expiring Documents Alert */}
      {expiringDocs.length > 0 && (
        <div
          className="p-4 mb-5"
          style={{
            ...cardStyle,
            border: "1px solid #fecaca",
            background: "#fef2f2",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" style={{ color: "#dc2626" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-[15px] font-bold" style={{ color: "#dc2626" }}>
              Expiring / Expired Documents ({expiringDocs.length})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {expiringDocs.map((d) => {
              const status = getExpiryStatus(d.expiryDate);
              return (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-[13px] font-semibold"
                  style={{
                    borderRadius: "var(--radius-pill)",
                    background: status === "expired" ? "#fecaca" : "#fed7aa",
                    color: status === "expired" ? "#dc2626" : "#c2410c",
                  }}
                >
                  {d.name}
                  <span className="text-[11px] font-normal">
                    {status === "expired" ? "(Expired)" : `(Expires ${formatDate(d.expiryDate!)})`}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Category filter tabs */}
      <div className="p-4 mb-5" style={cardStyle}>
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? documents.length
                : documents.filter((d) => d.category === tab.value).length;
            return (
              <button
                key={tab.value}
                onClick={() => setCategoryFilter(tab.value)}
                className="px-3 py-1 text-[13px] font-semibold transition-all duration-150"
                style={{
                  borderRadius: "var(--radius-pill)",
                  border:
                    categoryFilter === tab.value
                      ? "1.5px solid var(--blue-500)"
                      : "1px solid var(--grey-300)",
                  background:
                    categoryFilter === tab.value ? "var(--blue-50)" : "var(--white)",
                  color:
                    categoryFilter === tab.value ? "var(--blue-500)" : "var(--grey-600)",
                }}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse"
              style={{ background: "var(--grey-200)", borderRadius: "var(--radius)" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center" style={cardStyle}>
          <svg
            className="w-12 h-12 mx-auto mb-3"
            style={{ color: "var(--grey-400)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>
            No documents uploaded yet
          </p>
          <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>
            Click &quot;Upload Document&quot; to add the first one
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => {
            const catMeta = getCategoryMeta(doc.category);
            const expiryStatus = getExpiryStatus(doc.expiryDate);
            return (
              <div key={doc.id} className="p-4 flex flex-col" style={cardStyle}>
                {/* File icon + name */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isImageType(doc.mimeType) ? "#dbeafe" : "#fef3c7",
                    }}
                  >
                    {isImageType(doc.mimeType) ? (
                      <svg className="w-5 h-5" style={{ color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" style={{ color: "#d97706" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>
                      {doc.name}
                    </p>
                    <p className="text-[12px] truncate" style={{ color: "var(--grey-500)" }}>
                      {doc.fileName}
                    </p>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span
                    className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                    style={{
                      background: catMeta.bg,
                      color: catMeta.color,
                      borderRadius: "var(--radius-pill)",
                    }}
                  >
                    {catMeta.label}
                  </span>
                  {doc.isVerified && (
                    <span
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                      style={{
                        background: "#f0faf4",
                        color: "#2d6a4f",
                        borderRadius: "var(--radius-pill)",
                      }}
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  )}
                  {expiryStatus === "expired" && (
                    <span
                      className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                      style={{ background: "#fecaca", color: "#dc2626", borderRadius: "var(--radius-pill)" }}
                    >
                      Expired
                    </span>
                  )}
                  {expiryStatus === "warning" && (
                    <span
                      className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                      style={{ background: "#fed7aa", color: "#c2410c", borderRadius: "var(--radius-pill)" }}
                    >
                      Expiring Soon
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1 mb-3 flex-1">
                  <p className="text-[13px]" style={{ color: "var(--grey-600)" }}>
                    Uploaded: {formatDate(doc.uploadedAt)}
                  </p>
                  {doc.expiryDate && (
                    <p
                      className="text-[13px]"
                      style={{
                        color:
                          expiryStatus === "expired"
                            ? "#dc2626"
                            : expiryStatus === "warning"
                            ? "#c2410c"
                            : "var(--grey-600)",
                      }}
                    >
                      Expires: {formatDate(doc.expiryDate)}
                    </p>
                  )}
                  <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>
                    {formatFileSize(doc.fileSize)}
                  </p>
                  {doc.notes && (
                    <p className="text-[12px] italic" style={{ color: "var(--grey-500)" }}>
                      {doc.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-3" style={{ borderTop: "1px solid var(--grey-200)" }}>
                  <a
                    href={doc.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-[12px] font-semibold transition-colors inline-block"
                    style={{
                      background: "var(--blue-50)",
                      color: "var(--blue-500)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--blue-200)",
                    }}
                  >
                    View
                  </a>
                  <button
                    onClick={() => openEdit(doc)}
                    className="px-2.5 py-1 text-[12px] font-semibold transition-colors"
                    style={{
                      background: "var(--grey-100)",
                      color: "var(--grey-700)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--grey-300)",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleVerified(doc)}
                    className="px-2.5 py-1 text-[12px] font-semibold transition-colors"
                    style={{
                      background: doc.isVerified ? "#f0faf4" : "var(--grey-100)",
                      color: doc.isVerified ? "#2d6a4f" : "var(--grey-600)",
                      borderRadius: "var(--radius-sm)",
                      border: doc.isVerified ? "1px solid #a5d6a7" : "1px solid var(--grey-300)",
                    }}
                  >
                    {doc.isVerified ? "Unverify" : "Verify"}
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="px-2.5 py-1 text-[12px] font-semibold transition-colors ml-auto"
                    style={{
                      background: "var(--red-light)",
                      color: "var(--red)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid transparent",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Upload / Edit Modal ──────────────────────────────────────────── */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={closeForm}
        >
          <div
            className="bg-white w-full max-w-lg mx-4 mt-12 mb-8 overflow-y-auto yoda-slide-in"
            style={{
              maxHeight: "calc(100vh - 80px)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--grey-300)" }}>
              <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>
                {editingDoc ? "Edit Document" : "Upload Document"}
              </h3>
              <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>
                {editingDoc ? "Update document details" : "Upload a new document for this staff member"}
              </p>
            </div>

            <div className="px-5 py-5 space-y-4">
              {formError && (
                <div
                  className="p-3 text-[14px] font-semibold"
                  style={{
                    background: "var(--red-light)",
                    color: "var(--red)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid #fecaca",
                  }}
                >
                  {formError}
                </div>
              )}

              {/* Document Name */}
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                  Document Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                  placeholder="e.g. Medical License, BAMS Certificate"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                  Expiry Date (optional)
                </label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                  Notes (optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-[15px]"
                  style={{ ...inputStyle, minHeight: 70, resize: "vertical" as const }}
                  placeholder="Any additional notes..."
                />
              </div>

              {/* File Upload (only for new uploads) */}
              {!editingDoc && (
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                    File * (PDF, JPG, PNG, DOC, DOCX — max 5MB)
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer p-6 text-center transition-colors"
                    style={{
                      border: `2px dashed ${dragOver ? "var(--blue-500)" : "var(--grey-300)"}`,
                      borderRadius: "var(--radius-sm)",
                      background: dragOver ? "var(--blue-50)" : "var(--grey-50)",
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                    />
                    {form.file ? (
                      <div>
                        <svg
                          className="w-8 h-8 mx-auto mb-2"
                          style={{ color: "var(--green)" }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-[14px] font-semibold" style={{ color: "var(--grey-800)" }}>
                          {form.file.name}
                        </p>
                        <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>
                          {formatFileSize(form.file.size)} — Click to change
                        </p>
                      </div>
                    ) : (
                      <div>
                        <svg
                          className="w-8 h-8 mx-auto mb-2"
                          style={{ color: "var(--grey-400)" }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        <p className="text-[14px] font-semibold" style={{ color: "var(--grey-600)" }}>
                          Drag and drop a file here, or click to browse
                        </p>
                        <p className="text-[12px] mt-1" style={{ color: "var(--grey-400)" }}>
                          PDF, JPG, PNG, DOC, DOCX up to 5MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: "1px solid var(--grey-300)" }}>
              <button
                onClick={closeForm}
                className="px-4 py-2 text-[15px] font-semibold"
                style={{
                  background: "var(--grey-100)",
                  color: "var(--grey-700)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--grey-300)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-[15px] font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
              >
                {saving ? "Saving..." : editingDoc ? "Update" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
