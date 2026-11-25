"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { FullPageLoader } from "@niwa/ui/components";
import { useSsoPortalRedirect } from "@niwa/auth/react";
import { blogSsoClient } from "@/lib/sso";

function LoginRedirectContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/studio";
  useSsoPortalRedirect(blogSsoClient, "login", redirect);

  return <FullPageLoader label="Redirecting to Niwa Sign In..." />;
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={<FullPageLoader label="Redirecting to Niwa Sign In..." />}
    >
      <LoginRedirectContent />
    </React.Suspense>
  );
}
