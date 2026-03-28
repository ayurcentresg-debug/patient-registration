import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "PatientReg — Registration & Communication",
  description: "Patient registration with WhatsApp and Email communication",
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
