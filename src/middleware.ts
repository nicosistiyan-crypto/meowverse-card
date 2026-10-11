import { NextResponse, type NextRequest } from "next/server";
// First gate only: real authentication + role checks happen on the server in each page / API route.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("pc_session")) return NextResponse.redirect(new URL("/login", req.url));
}
export const config = { matcher: ["/home/:path*", "/pack/:path*", "/collection/:path*", "/players/:path*", "/fusion/:path*", "/gift/:path*", "/notifikasi/:path*", "/claim/:path*", "/shop/:path*", "/sell/:path*", "/u/:path*", "/profile/:path*", "/admin/:path*"] };
