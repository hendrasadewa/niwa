"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { buildAuthPortalUrl, resolveSafeRedirectUri } from "@/lib/sso";

function RegisterRedirectContent() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  React.useEffect(() => {
    const redirectUri = resolveSafeRedirectUri(redirectParam || "/");
    window.location.replace(buildAuthPortalUrl("register", redirectUri));
  }, [redirectParam]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Redirecting to Niwa Registration...
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Redirecting to Niwa Registration...
          </p>
        </div>
      }
    >
      <RegisterRedirectContent />
    </React.Suspense>
  );
}
