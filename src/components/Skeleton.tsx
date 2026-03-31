"use client";

/**
 * YODA Design System — Skeleton Loading Components
 *
 * Reusable skeleton placeholders that match the real content layout.
 * All use CSS variables for automatic dark mode support.
 */

/* ─── Base Skeleton Block ─── */
export function Skeleton({
  width,
  height = 16,
  rounded = "var(--radius-sm)",
  className = "",
  style = {},
}: {
  width?: number | string;
  height?: number | string;
  rounded?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse ${className}`}
      aria-hidden="true"
      style={{
        width: width ?? "100%",
        height,
        borderRadius: rounded,
        background: "var(--grey-200)",
        ...style,
      }}
    />
  );
}

/* ─── Text Line Skeleton ─── */
export function SkeletonText({
  lines = 1,
  widths,
  lineHeight = 14,
  gap = 10,
}: {
  lines?: number;
  widths?: (string | number)[];
  lineHeight?: number;
  gap?: number;
}) {
  const defaultWidths = ["100%", "85%", "70%", "90%", "60%"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={widths?.[i] ?? defaultWidths[i % defaultWidths.length]}
          height={lineHeight}
        />
      ))}
    </div>
  );
}

/* ─── Circle Skeleton (avatars, icons) ─── */
export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} rounded="50%" />;
}

/* ─── Stats Card Skeleton ─── */
export function SkeletonStatsCard() {
  return (
    <div
      className="p-4"
      style={{
        background: "var(--white)",
        border: "1px solid var(--grey-300)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <Skeleton width={100} height={12} style={{ marginBottom: 12 }} />
          <Skeleton width={80} height={28} />
        </div>
        <Skeleton width={44} height={44} rounded="var(--radius-sm)" />
      </div>
    </div>
  );
}

/* ─── Chart Card Skeleton ─── */
export function SkeletonChart({ height = 280 }: { height?: number }) {
  return (
    <div
      className="p-5"
      style={{
        background: "var(--white)",
        border: "1px solid var(--grey-300)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Title row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <Skeleton width={160} height={16} style={{ marginBottom: 8 }} />
          <Skeleton width={110} height={12} />
        </div>
        <Skeleton width={60} height={20} />
      </div>
      {/* Chart area with bar-like shapes */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: height - 100, paddingTop: 10 }}>
        {[65, 40, 85, 30, 70, 55, 45].map((h, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
            <Skeleton height={`${h}%`} rounded="4px 4px 0 0" />
          </div>
        ))}
      </div>
      {/* X-axis labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} width={28} height={10} />
        ))}
      </div>
    </div>
  );
}

/* ─── Table Row Skeleton ─── */
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  const colWidths = [120, 160, 100, 80, 70, 90, 100];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 16px",
        borderBottom: "1px solid var(--grey-200)",
      }}
      aria-hidden="true"
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width={colWidths[i % colWidths.length]} height={14} />
      ))}
    </div>
  );
}

/* ─── List Item Skeleton (patient row, appointment row) ─── */
export function SkeletonListItem({ hasAvatar = true }: { hasAvatar?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
      }}
      aria-hidden="true"
    >
      {hasAvatar && <SkeletonCircle size={36} />}
      <div style={{ flex: 1 }}>
        <Skeleton width={140} height={14} style={{ marginBottom: 6 }} />
        <Skeleton width={100} height={11} />
      </div>
      <Skeleton width={60} height={12} />
    </div>
  );
}

/* ─── Card with List Skeleton ─── */
export function SkeletonCardList({
  title = true,
  rows = 4,
  hasAvatar = true,
}: {
  title?: boolean;
  rows?: number;
  hasAvatar?: boolean;
}) {
  return (
    <div
      className="p-5"
      style={{
        background: "var(--white)",
        border: "1px solid var(--grey-300)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {title && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <Skeleton width={130} height={16} />
          <Skeleton width={50} height={14} />
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonListItem key={i} hasAvatar={hasAvatar} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   FULL PAGE SKELETONS — Drop-in replacements
   ═══════════════════════════════════════════════ */

/* ─── Dashboard Skeleton ─── */
export function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-8" aria-busy="true" aria-label="Loading dashboard">
      {/* Header */}
      <div className="mb-8">
        <Skeleton width={180} height={24} style={{ marginBottom: 8 }} />
        <Skeleton width={280} height={14} />
      </div>

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatsCard key={i} />
        ))}
      </div>

      {/* Inventory row */}
      <div className="mb-6">
        <Skeleton width={150} height={16} style={{ marginBottom: 12 }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatsCard key={i} />
          ))}
        </div>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <SkeletonChart />
        <SkeletonChart height={260} />
      </div>

      {/* Row 3: Three columns */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <SkeletonCardList rows={4} />
        <SkeletonChart height={220} />
        <SkeletonChart height={220} />
      </div>
    </div>
  );
}

/* ─── Patient List Skeleton ─── */
export function PatientListSkeleton() {
  return (
    <div className="p-6 md:p-8" aria-busy="true" aria-label="Loading patients">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Skeleton width={120} height={24} style={{ marginBottom: 6 }} />
          <Skeleton width={180} height={13} />
        </div>
        <Skeleton width={140} height={40} rounded="var(--radius)" />
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <Skeleton width={300} height={40} rounded="var(--radius)" />
        <Skeleton width={120} height={40} rounded="var(--radius)" />
        <Skeleton width={120} height={40} rounded="var(--radius)" />
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--white)",
          border: "1px solid var(--grey-300)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "flex",
            gap: 16,
            padding: "12px 16px",
            borderBottom: "2px solid var(--grey-200)",
            background: "var(--grey-50)",
          }}
        >
          {[80, 140, 120, 100, 80, 90].map((w, i) => (
            <Skeleton key={i} width={w} height={12} />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonTableRow key={i} columns={6} />
        ))}
      </div>
    </div>
  );
}

/* ─── Generic Table Page Skeleton ─── */
export function TablePageSkeleton({
  title = true,
  filters = 2,
  columns = 5,
  rows = 8,
}: {
  title?: boolean;
  filters?: number;
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="p-6 md:p-8" aria-busy="true">
      {title && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <Skeleton width={140} height={24} style={{ marginBottom: 6 }} />
            <Skeleton width={200} height={13} />
          </div>
          <Skeleton width={130} height={40} rounded="var(--radius)" />
        </div>
      )}

      {filters > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {Array.from({ length: filters }).map((_, i) => (
            <Skeleton key={i} width={i === 0 ? 280 : 120} height={40} rounded="var(--radius)" />
          ))}
        </div>
      )}

      <div
        style={{
          background: "var(--white)",
          border: "1px solid var(--grey-300)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            padding: "12px 16px",
            borderBottom: "2px solid var(--grey-200)",
            background: "var(--grey-50)",
          }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} width={[100, 140, 120, 80, 90][i % 5]} height={12} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns} />
        ))}
      </div>
    </div>
  );
}

/* ─── Detail Page Skeleton (patient detail, doctor detail) ─── */
export function DetailPageSkeleton() {
  return (
    <div className="p-6 md:p-8" aria-busy="true">
      {/* Back + Title */}
      <div style={{ marginBottom: 24 }}>
        <Skeleton width={80} height={14} style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <SkeletonCircle size={56} />
          <div>
            <Skeleton width={200} height={22} style={{ marginBottom: 6 }} />
            <Skeleton width={140} height={13} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 24, marginBottom: 24, borderBottom: "2px solid var(--grey-200)", paddingBottom: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={70} height={14} />
        ))}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="p-5"
            style={{
              background: "var(--white)",
              border: "1px solid var(--grey-300)",
              borderRadius: "var(--radius)",
            }}
          >
            <Skeleton width={120} height={16} style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between" }}>
                  <Skeleton width={90} height={13} />
                  <Skeleton width={130} height={13} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
