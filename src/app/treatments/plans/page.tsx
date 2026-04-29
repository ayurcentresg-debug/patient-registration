"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function TreatmentPlansRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const qs = searchParams?.toString();
    router.replace(`/admin/treatments/plans${qs ? `?${qs}` : ""}`);
  }, [router, searchParams]);
  return null;
}

export default function TreatmentPlansRedirect() {
  return (
    <Suspense fallback={null}>
      <TreatmentPlansRedirectInner />
    </Suspense>
  );
}
