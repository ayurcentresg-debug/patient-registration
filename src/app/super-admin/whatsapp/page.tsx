"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SuperAdminSidebar from "@/components/SuperAdminSidebar";

/* ── Types matching API response ─────────────────────────── */
interface Overview {
  totalMessages: number;
  inbound: number;
  outbound: number;
  delivered: number;
  failed: number;
  todayMessages: number;
  thisMonthMessages: number;
}

interface ClinicRow {
  clinicId: string | null;
  clinicName: string;
  inbound: number;
  outbound: number;
  totalMessages: number;
  lastMessageAt: string | null;
  uniquePatients: number;
}

interface RecentMsg {
  id: string;
  clinicName: string;
  patient: { id: string; name: string } | null;
  direction: string;
  from: string;
  to: string;
  body: string;
  status: string;
  createdAt: string;
}

interface DayTrend {
  date: string;
  count: number;
}

interface ApiData {
  overview: Overview;
  perClinicBreakdown: ClinicRow[];
  recentMessages: RecentMsg[];
  dailyTrend: DayTrend[];
}

type SortKey = "totalMessages" | "inbound" | "outbound" | "uniquePatients" | "clinicName";

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  sent: { bg: "#f3f4f6", color: "#6b7280" },
  delivered: { bg: "#eff6ff", color: "#2563eb" },
  read: { bg: "#ecfdf5", color: "#059669" },
  failed: { bg: "#fef2f2", color: "#dc2626" },
  received: { bg: "#ecfdf5", color: "#059669" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SuperAdminWhatsAppPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <SuperAdminSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Loading WhatsApp data...</div>
        </div>
      </div>
    }>
      <SuperAdminWhatsAppInner />
    </Suspense>
  );
}

function SuperAdminWhatsAppInner() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("totalMessages");
  const [sortAsc, setSortAsc] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const clinicId = searchParams.get("clinicId");

  const fetchData = useCallback(() => {
    setLoading(true);
    const url = clinicId
      ? `/api/super-admin/whatsapp?clinicId=${clinicId}`
      : "/api/super-admin/whatsapp";
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (d.overview) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleClinicClick = (id: string | null) => {
    if (!id || clinicId === id) router.push("/super-admin/whatsapp");
    else router.push(`/super-admin/whatsapp?clinicId=${id}`);
  };

  const sortedClinics = data?.perClinicBreakdown
    ? [...data.perClinicBreakdown].sort((a, b) => {
        let cmp: number;
        if (sortKey === "clinicName") cmp = a.clinicName.localeCompare(b.clinicName);
        else cmp = (a[sortKey] as number) - (b[sortKey] as number);
        return sortAsc ? cmp : -cmp;
      })
    : [];

  /* ── Loading ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <SuperAdminSidebar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
          <div style={{ fontSize: 16, color: "#6b7280" }}>Loading WhatsApp data...</div>
        </div>
      </div>
    );
  }

  /* ── Empty ───────────────────────────────────────────── */
  if (!data) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <SuperAdminSidebar />
        <div style={{ flex: 1, background: "#f9fafb", overflow: "auto" }}>
          <div style={{ padding: "24px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>WhatsApp Monitoring</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>Monitor WhatsApp messaging across all clinics</p>
          </div>
          <div style={{ padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 8 }}>No WhatsApp messages yet</div>
              <div style={{ fontSize: 14, color: "#6b7280" }}>Configure Twilio to start messaging.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Derived values ──────────────────────────────────── */
  const { overview, dailyTrend, recentMessages } = data;
  const maxTrend = Math.max(...dailyTrend.map((t) => t.count), 1);
  const activeClinics = data.perClinicBreakdown.length;
  const deliveryRate =
    overview.outbound > 0
      ? Math.round(((overview.delivered) / overview.outbound) * 100)
      : 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar />

      <div style={{ flex: 1, background: "#f9fafb", overflow: "auto" }}>
        {/* Header */}
        <div style={{ padding: "24px 32px", borderBottom: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>WhatsApp Monitoring</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
              Monitor WhatsApp messaging across all clinics
              {clinicId && (
                <span style={{ marginLeft: 8, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#ecfdf5", color: "#059669" }}>
                  Filtered by clinic
                  <button
                    onClick={() => router.push("/super-admin/whatsapp")}
                    style={{ marginLeft: 6, background: "none", border: "none", color: "#059669", cursor: "pointer", fontWeight: 700, fontSize: 11 }}
                  >
                    &times;
                  </button>
                </span>
              )}
            </p>
          </div>
          <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#f3f4f6", color: "#374151" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>

        <div style={{ padding: "24px 32px" }}>
          {/* ── Top Stats Row — 5 cards ───────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total Messages", value: overview.totalMessages, color: "#14532d", icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" },
              { label: "Inbound", value: overview.inbound, color: "#059669", icon: "M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" },
              { label: "Outbound", value: overview.outbound, color: "#2563eb", icon: "M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" },
              { label: "Delivered", value: overview.delivered, color: "#0891b2", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              { label: "Failed", value: overview.failed, color: "#dc2626", icon: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color + "10", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                    </svg>
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{s.value.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Row 2: 7-Day Trend + Quick Stats ──────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 24 }}>
            {/* Bar Chart */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>7-Day Message Trend</h3>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Last 7 days</span>
              </div>
              <div style={{ padding: "20px", display: "flex", alignItems: "flex-end", gap: 8, height: 200 }}>
                {dailyTrend.map((t, i) => {
                  const barH = Math.max((t.count / maxTrend) * 140, 4);
                  const isLatest = i === dailyTrend.length - 1;
                  const dayLabel = new Date(t.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
                  return (
                    <div key={t.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{t.count}</span>
                      <div style={{
                        width: "100%", maxWidth: 48, height: barH, borderRadius: "6px 6px 2px 2px",
                        background: isLatest ? "linear-gradient(180deg, #14532d, #2d6a4f)" : "#e5e7eb",
                        transition: "height 0.5s",
                      }} />
                      <span style={{ fontSize: 11, color: isLatest ? "#14532d" : "#9ca3af", fontWeight: isLatest ? 600 : 400 }}>{dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Quick Stats</h3>
              </div>
              <div style={{ padding: "20px" }}>
                {[
                  { label: "Today's Messages", value: overview.todayMessages, color: "#14532d" },
                  { label: "This Month", value: overview.thisMonthMessages, color: "#2563eb" },
                  { label: "Active Clinics", value: activeClinics, color: "#7c3aed" },
                ].map((q) => (
                  <div key={q.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{q.label}</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: q.color }}>{q.value.toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>Delivery Rate</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: deliveryRate >= 90 ? "#059669" : deliveryRate >= 70 ? "#ea580c" : "#dc2626" }}>
                    {deliveryRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Clinic Usage Table ────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Clinic Usage</h3>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{sortedClinics.length} clinic{sortedClinics.length !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {([
                      { key: "clinicName" as SortKey, label: "Clinic Name" },
                      { key: "totalMessages" as SortKey, label: "Total" },
                      { key: "inbound" as SortKey, label: "Inbound" },
                      { key: "outbound" as SortKey, label: "Outbound" },
                      { key: "uniquePatients" as SortKey, label: "Patients" },
                      { key: null, label: "Last Message" },
                    ] as const).map((col) => (
                      <th
                        key={col.label}
                        onClick={() => col.key ? handleSort(col.key) : undefined}
                        style={{
                          padding: "10px 16px", textAlign: "left", fontWeight: 600,
                          color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px",
                          whiteSpace: "nowrap", borderBottom: "1px solid #e5e7eb",
                          cursor: col.key ? "pointer" : "default", userSelect: "none",
                        }}
                      >
                        {col.label}
                        {col.key && sortKey === col.key && (
                          <span style={{ marginLeft: 4 }}>{sortAsc ? "\u25B2" : "\u25BC"}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedClinics.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "24px 16px", textAlign: "center", color: "#6b7280" }}>No clinic usage data</td>
                    </tr>
                  ) : (
                    sortedClinics.map((c, i) => {
                      const isSelected = clinicId === c.clinicId;
                      return (
                        <tr
                          key={c.clinicId || i}
                          onClick={() => handleClinicClick(c.clinicId)}
                          style={{
                            borderBottom: i < sortedClinics.length - 1 ? "1px solid #f3f4f6" : "none",
                            cursor: "pointer",
                            background: isSelected ? "#ecfdf5" : "transparent",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#f9fafb"; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                        >
                          <td style={{ padding: "11px 16px", fontWeight: 600, color: "#111827" }}>{c.clinicName}</td>
                          <td style={{ padding: "11px 16px", fontWeight: 600, color: "#111827" }}>{c.totalMessages.toLocaleString()}</td>
                          <td style={{ padding: "11px 16px", color: "#059669" }}>{c.inbound.toLocaleString()}</td>
                          <td style={{ padding: "11px 16px", color: "#2563eb" }}>{c.outbound.toLocaleString()}</td>
                          <td style={{ padding: "11px 16px", color: "#6b7280" }}>{c.uniquePatients.toLocaleString()}</td>
                          <td style={{ padding: "11px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>
                            {c.lastMessageAt
                              ? new Date(c.lastMessageAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                              : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Recent Messages ───────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Recent Messages</h3>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Last 20 messages</span>
            </div>
            <div style={{ maxHeight: 480, overflow: "auto" }}>
              {recentMessages.length === 0 ? (
                <div style={{ padding: "24px 20px", textAlign: "center", color: "#6b7280", fontSize: 13 }}>No messages to display</div>
              ) : (
                recentMessages.map((m, i) => {
                  const badge = STATUS_BADGE[m.status] || STATUS_BADGE.sent;
                  const isInbound = m.direction === "inbound";
                  const phone = isInbound ? m.from : m.to;
                  return (
                    <div
                      key={m.id}
                      style={{
                        padding: "12px 20px",
                        borderBottom: i < recentMessages.length - 1 ? "1px solid #f3f4f6" : "none",
                        display: "flex", alignItems: "flex-start", gap: 12,
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                        background: isInbound ? "#ecfdf5" : "#eff6ff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700,
                        color: isInbound ? "#059669" : "#2563eb",
                      }}>
                        {isInbound ? "\u2193" : "\u2191"}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{m.clinicName}</span>
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>
                            {m.patient ? m.patient.name : phone}
                          </span>
                          <span style={{
                            padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                            background: badge.bg, color: badge.color,
                          }}>
                            {m.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 600 }}>
                          {m.body || "(no text)"}
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", flexShrink: 0, marginTop: 2 }}>
                        {timeAgo(m.createdAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
