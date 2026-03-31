"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

/* ─── Types ─── */
interface WeeklyRevenueData {
  date: string;
  revenue: number;
}

interface StatusData {
  status: string;
  count: number;
}

interface MonthlyTrendData {
  month: string;
  count: number;
}

interface PaymentMethodData {
  method: string;
  total: number;
}

interface TreatmentData {
  name: string;
  count: number;
}

/* ─── Shared constants ─── */
const STATUS_COLORS: Record<string, string> = {
  scheduled: "#ea580c",
  confirmed: "#2d6a4f",
  "in-progress": "#37845e",
  completed: "#059669",
  cancelled: "#dc2626",
  "no-show": "#7c3aed",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No Show",
};

const METHOD_COLORS: Record<string, string> = {
  cash: "#059669",
  card: "#2d6a4f",
  upi: "#7c3aed",
  insurance: "#ea580c",
  bank_transfer: "#0d9488",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  insurance: "Insurance",
  bank_transfer: "Bank Transfer",
};

const PIE_COLORS = ["#2d6a4f", "#059669", "#37845e", "#0d9488", "#7c3aed", "#ea580c"];

function formatCurrency(amount: number): string {
  return `S$${(amount ?? 0).toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getDayAbbr(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-SG", { weekday: "short" });
}

function getMonthAbbr(monthStr: string): string {
  if (monthStr.includes("-")) {
    const d = new Date(monthStr + "-01");
    return d.toLocaleDateString("en-SG", { month: "short" });
  }
  return monthStr.substring(0, 3);
}

/* ─── Custom Tooltip Components ─── */
function RevenueTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { label: string } }> }) {
  if (!active || !payload?.[0]) return null;
  return (
    <div style={{ background: "#1e2a24", color: "#fff", padding: "8px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>{payload[0].payload.label}</div>
      {formatCurrency(payload[0].value)}
    </div>
  );
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { label: string } }> }) {
  if (!active || !payload?.[0]) return null;
  return (
    <div style={{ background: "#1e2a24", color: "#fff", padding: "8px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>{payload[0].payload.label}</div>
      {payload[0].value} appointments
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { percent: number } }> }) {
  if (!active || !payload?.[0]) return null;
  return (
    <div style={{ background: "#1e2a24", color: "#fff", padding: "8px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>{payload[0].name}</div>
      {formatCurrency(payload[0].value)} ({(payload[0].payload.percent * 100).toFixed(0)}%)
    </div>
  );
}

/* ═══════════════════════════════════════════════
   1. WEEKLY REVENUE BAR CHART
   ═══════════════════════════════════════════════ */
export function WeeklyRevenueChart({ data }: { data: WeeklyRevenueData[] }) {
  const chartData = data.map((d) => ({
    label: getDayAbbr(d.date),
    revenue: d.revenue,
  }));
  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="p-5" style={cardStyle}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Revenue (Last 7 Days)</h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>Daily revenue overview</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(total)}</p>
          <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>7-day total</p>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No revenue data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grey-200)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--grey-600)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--grey-500)" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
            <Tooltip content={<RevenueTooltip />} cursor={{ fill: "rgba(45,106,79,0.06)" }} />
            <Bar dataKey="revenue" fill="var(--blue-500)" radius={[4, 4, 0, 0]} maxBarSize={48} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   2. APPOINTMENT STATUS PIE CHART
   ═══════════════════════════════════════════════ */
export function AppointmentStatusChart({ data, total }: { data: StatusData[]; total: number }) {
  const chartData = data.map((s) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || "#9baa9f",
    percent: total > 0 ? s.count / total : 0,
  }));

  return (
    <div className="p-5" style={cardStyle}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Appointment Status</h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>Today&apos;s breakdown</p>
        </div>
        <span className="text-[24px] font-bold" style={{ color: "var(--grey-900)" }}>{total > 1 ? total : 0}</span>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No appointment data</p>
        </div>
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                animationDuration={800}
                stroke="none"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
            {chartData.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-[13px] font-medium truncate" style={{ color: "var(--grey-700)" }}>{s.name}</span>
                </div>
                <span className="text-[13px] font-bold tabular-nums ml-2" style={{ color: "var(--grey-900)" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   3. MONTHLY APPOINTMENT TREND (Area Chart)
   ═══════════════════════════════════════════════ */
export function MonthlyTrendChart({ data }: { data: MonthlyTrendData[] }) {
  const chartData = data.map((m) => ({
    label: getMonthAbbr(m.month),
    count: m.count,
  }));
  const totalAppts = data.reduce((s, m) => s + m.count, 0);

  return (
    <div className="lg:col-span-2 p-5" style={cardStyle}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Monthly Appointment Trend</h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>Last 6 months</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-bold" style={{ color: "var(--grey-900)" }}>{totalAppts}</p>
          <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>Total appointments</p>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No trend data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--blue-500)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--blue-500)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grey-200)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--grey-600)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--grey-500)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--blue-500)", strokeWidth: 1, strokeDasharray: "4 4" }} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--blue-500)"
              strokeWidth={2.5}
              fill="url(#trendGradient)"
              dot={{ r: 4, fill: "var(--blue-500)", stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "var(--blue-500)", stroke: "#fff", strokeWidth: 2 }}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   4. REVENUE BY PAYMENT METHOD (Donut Chart)
   ═══════════════════════════════════════════════ */
export function RevenueByMethodChart({ data }: { data: PaymentMethodData[] }) {
  const totalRevenue = data.reduce((s, m) => s + m.total, 0);
  const chartData = data.map((m) => ({
    name: METHOD_LABELS[m.method] || m.method,
    value: m.total,
    color: METHOD_COLORS[m.method] || "#9baa9f",
    percent: totalRevenue > 0 ? m.total / totalRevenue : 0,
  }));

  return (
    <div className="p-5" style={cardStyle}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Revenue by Method</h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>Payment breakdown</p>
        </div>
        <p className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(totalRevenue)}</p>
      </div>
      {data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No payment data yet</p>
        </div>
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={68}
                paddingAngle={3}
                dataKey="value"
                animationDuration={800}
                stroke="none"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="space-y-2 mt-1">
            {chartData.map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                  <span className="text-[13px] font-medium" style={{ color: "var(--grey-700)" }}>{m.name}</span>
                </div>
                <span className="text-[13px] font-bold tabular-nums" style={{ color: "var(--grey-900)" }}>{formatCurrency(m.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   5. TOP TREATMENTS (Horizontal Bar Chart)
   ═══════════════════════════════════════════════ */
export function TopTreatmentsChart({ data }: { data: TreatmentData[] }) {
  const chartData = data.slice(0, 5).map((t) => ({
    name: t.name.length > 18 ? t.name.substring(0, 18) + "..." : t.name,
    fullName: t.name,
    count: t.count,
  }));

  return (
    <div className="p-5" style={cardStyle}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Top Treatments</h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>This month</p>
        </div>
        <div className="w-9 h-9 flex items-center justify-center" style={{ background: "#d1f2e0", borderRadius: "var(--radius-sm)", color: "#2d6a4f" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No treatment data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartData.length * 44 + 10}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grey-200)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--grey-500)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12, fill: "var(--grey-700)" }} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                return (
                  <div style={{ background: "#1e2a24", color: "#fff", padding: "8px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>{payload[0].payload.fullName}</div>
                    {payload[0].value} bookings
                  </div>
                );
              }}
              cursor={{ fill: "rgba(45,106,79,0.06)" }}
            />
            <Bar dataKey="count" fill="var(--blue-500)" radius={[0, 4, 4, 0]} maxBarSize={28} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ─── Shared card style ─── */
const cardStyle = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};
