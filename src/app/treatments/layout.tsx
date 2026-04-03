import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Treatments",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
