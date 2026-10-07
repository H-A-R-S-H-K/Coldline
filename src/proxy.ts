import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Refreshes the Supabase session and sends signed-out visitors to /login. */
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except static assets, icons and the PWA manifest.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|pwa-icon|manifest.webmanifest).*)"],
};
