"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useSsoPortalRedirect } from "@niwa/auth/react";
import { FullPageLoader } from "@niwa/ui/components";
import { openPoSsoClient } from "@/lib/sso";

function LoginRedirectContent() {
  const searchParams = useSearchParams();
  useSsoPortalRedirect(openPoSsoClient, "login", searchParams.get("redirect"));

  return <FullPageLoader label="Redirecting to Niwa Sign In…" />;
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={<FullPageLoader label="Redirecting to Niwa Sign In…" />}
    >
      <LoginRedirectContent />
    </React.Suspense>
  );
}
