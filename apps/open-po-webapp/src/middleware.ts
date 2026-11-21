import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth is now backed by the host-only `__Host-niwa_session` cookie on
 * `auth.api.hendrasadewa.com` + in-memory ES256 tokens hydrated by
 * `AuthProvider` (which enforces protected routes `/profile`, `/orders`, `/seller`).
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
