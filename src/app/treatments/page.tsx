"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TreatmentsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/treatments"); }, [router]);
  return null;
}
