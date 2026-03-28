interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
}

const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
  blue: { bg: "var(--blue-50)", text: "var(--blue-500)", iconBg: "var(--blue-100)" },
  green: { bg: "var(--green-light)", text: "var(--green)", iconBg: "#c8e6c9" },
  purple: { bg: "var(--purple-light)", text: "var(--purple)", iconBg: "#e1bee7" },
  orange: { bg: "var(--orange-light)", text: "var(--orange)", iconBg: "#ffe0b2" },
};

export default function StatsCard({ title, value, icon, color }: StatsCardProps) {
  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      className="p-4 transition-shadow duration-150 hover:shadow-md"
      style={{
        background: "var(--white)",
        border: "1px solid var(--grey-300)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>{title}</p>
          <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{value}</p>
        </div>
        <div
          className="w-11 h-11 flex items-center justify-center"
          style={{ background: c.iconBg, borderRadius: "var(--radius-sm)", color: c.text }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}
