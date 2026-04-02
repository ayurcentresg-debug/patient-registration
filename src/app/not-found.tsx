import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fefbf6" }}>
      <div className="text-center px-6 max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#14532d" }}>
            <span className="text-sm font-extrabold text-white">AG</span>
          </div>
          <span className="text-xl font-bold tracking-wider" style={{ color: "#14532d" }}>AYUR GATE</span>
        </div>

        {/* 404 */}
        <div className="text-[120px] font-extrabold leading-none mb-2" style={{ color: "#e5e7eb" }}>404</div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "#111827" }}>Page not found</h1>
        <p className="text-base mb-8" style={{ color: "#6b7280" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
            style={{ background: "#14532d" }}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-6 py-2.5 text-sm font-semibold rounded-lg transition-all hover:bg-gray-50"
            style={{ color: "#374151", border: "1.5px solid #e5e7eb" }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
