import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "AYUR GATE — Ayurveda Clinic Management Software",
  description: "AYUR GATE — Modern clinic management software for Ayurveda, wellness & healthcare practices. Appointments, billing, inventory, multi-branch & more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full font-sans">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
