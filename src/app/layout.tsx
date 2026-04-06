import type { Metadata, Viewport } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#14532d",
};

export const metadata: Metadata = {
  title: {
    default: "AYUR GATE — Ayurveda Clinic Management Software",
    template: "%s — AYUR GATE",
  },
  description: "AYUR GATE — Modern clinic management software for Ayurveda, wellness & healthcare practices. Appointments, billing, inventory, multi-branch & more.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.ayurgate.com"),
  openGraph: {
    title: "AYUR GATE — Ayurveda Clinic Management Software",
    description: "Modern clinic management for Ayurveda & wellness practices. Appointments, billing, inventory, prescriptions, multi-branch — all in one platform.",
    siteName: "AYUR GATE",
    type: "website",
    locale: "en_SG",
  },
  twitter: {
    card: "summary_large_image",
    title: "AYUR GATE — Ayurveda Clinic Management Software",
    description: "Modern clinic management for Ayurveda & wellness practices. Appointments, billing, inventory, prescriptions & more.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AYUR GATE",
  },
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
