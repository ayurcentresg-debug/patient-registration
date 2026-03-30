import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div
        className="max-w-md w-full p-6 text-center"
        style={{
          background: "var(--white)",
          border: "1px solid var(--grey-300)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h2 className="text-[48px] font-bold mb-1" style={{ color: "var(--grey-300)" }}>404</h2>
        <h3 className="text-[20px] font-bold mb-2" style={{ color: "var(--grey-900)" }}>Page Not Found</h3>
        <p className="text-[15px] mb-5" style={{ color: "var(--grey-600)" }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
