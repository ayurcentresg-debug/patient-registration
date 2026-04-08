"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CmeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/cme/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#fefbf6]" suppressHydrationWarning>
      {/* Public CME Header */}
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50" suppressHydrationWarning>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/cme" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#14532d] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">AG</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-semibold text-lg leading-none">AyurGate</span>
                <span className="text-gray-300 text-lg leading-none">|</span>
                <span className="text-[#14532d] text-sm font-medium leading-none">CME &amp; Events</span>
              </div>
            </Link>

            <nav className="flex items-center gap-4 sm:gap-6">
              {/* Text nav links — hidden on mobile */}
              <Link
                href="/cme"
                className={`hidden sm:inline text-sm font-medium transition-colors ${
                  pathname === "/cme"
                    ? "text-[#14532d] font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All Events
              </Link>
              <Link
                href="/"
                className="hidden sm:inline text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                AyurGate Home
              </Link>

              {/* Sign In — always visible */}
              <Link
                href="/login"
                className="px-4 py-2 bg-[#14532d] hover:bg-[#1a6b3a] text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm text-center sm:text-left">
              &copy; {new Date().getFullYear()} AyurGate. Empowering Ayurveda through technology.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/contact" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">Contact</Link>
              <Link href="/privacy" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">Privacy</Link>
              <Link href="/terms" className="text-gray-500 hover:text-gray-700 text-sm transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
