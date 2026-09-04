import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("-auth-token"));
}

const PUBLIC_GET_PREFIXES = [
  "/chess",
  "/debate",
  "/stem",
  "/arts",
  "/writing",
  "/pathways",
  "/event/",
  "/api/competitions",
  "/api/pathways",
  "/privacy",
  "/terms",
  "/districts",
  "/clubs",
  "/billing",
  "/portals",
  "/login",
  "/signup",
  "/join",
  "/claim",
];

function isAnonymousPublicGet(request: NextRequest): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (hasSupabaseAuthCookie(request)) return false;
  const path = request.nextUrl.pathname;
  if (path === "/") return true;
  return PUBLIC_GET_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix)
  );
}

export async function proxy(request: NextRequest) {
  if (isAnonymousPublicGet(request)) {
    return NextResponse.next({ request });
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
