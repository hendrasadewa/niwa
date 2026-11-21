"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSsoPortalRedirect } from "@niwa/auth/react";
import { pustakaSsoClient } from "@/lib/sso";

function LoginRedirectContent() {
  const searchParams = useSearchParams();
  useSsoPortalRedirect(pustakaSsoClient, "login", searchParams.get("redirect"));

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Redirecting to Niwa Sign In...
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Redirecting to Niwa Sign In...
          </p>
        </div>
      }
    >
      <LoginRedirectContent />
    </React.Suspense>
  );
}
