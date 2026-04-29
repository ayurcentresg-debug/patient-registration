"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function NewPlanRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const qs = searchParams?.toString();
    router.replace(`/admin/treatments/plans/new${qs ? `?${qs}` : ""}`);
  }, [router, searchParams]);
  return null;
}

export default function NewPlanRedirect() {
  return (
    <Suspense fallback={null}>
      <NewPlanRedirectInner />
    </Suspense>
  );
}
