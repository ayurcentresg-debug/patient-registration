"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TreatmentPlansRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/treatments/plans"); }, [router]);
  return null;
}
