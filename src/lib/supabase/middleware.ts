import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

const PUBLIC_PATHS = ["/login", "/setup"];

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured) {
    if (request.nextUrl.pathname === "/setup") return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && !PUBLIC_PATHS.includes(path)) {
    const url = new URL("/login", request.url);
    if (path !== "/") url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}
