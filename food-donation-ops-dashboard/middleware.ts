import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { canAccessPath, getRoleHome, normalizeRole } from "./lib/roleAccess";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPath = pathname.startsWith("/login");
  if (!user && !isAuthPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!user) return response;

  const role = normalizeRole(
    (user.app_metadata?.role as string | undefined) || (user.user_metadata?.role as string | undefined),
  );
  const roleHome = getRoleHome(role);

  if (isAuthPath) {
    return NextResponse.redirect(new URL(roleHome, request.url));
  }

  if (!canAccessPath(role, pathname)) {
    return NextResponse.redirect(new URL(roleHome, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
