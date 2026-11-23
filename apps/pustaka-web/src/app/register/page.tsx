"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { FullPageLoader } from "@niwa/ui/components";
import { useSsoPortalRedirect } from "@niwa/auth/react";
import { pustakaSsoClient } from "@/lib/sso";

function RegisterRedirectContent() {
  const searchParams = useSearchParams();
  useSsoPortalRedirect(
    pustakaSsoClient,
    "register",
    searchParams.get("redirect")
  );

  return <FullPageLoader label="Redirecting to Niwa Registration..." />;
}

export default function RegisterPage() {
  return (
    <React.Suspense
      fallback={<FullPageLoader label="Redirecting to Niwa Registration..." />}
    >
      <RegisterRedirectContent />
    </React.Suspense>
  );
}
