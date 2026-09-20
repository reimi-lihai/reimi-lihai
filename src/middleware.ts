import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge gate for the admin area: no session cookie → login page.
 * (Real session + permission checks happen server-side in requireAdmin /
 * requirePermission, since the edge runtime can't reach the database.)
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!req.cookies.get("reimi_admin")) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  const res = NextResponse.next();
  if (pathname.startsWith("/admin") || pathname.startsWith("/key")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Referrer-Policy", "no-referrer");
  }
  return res;
}

export const config = { matcher: ["/admin/:path*", "/key/:path*"] };
