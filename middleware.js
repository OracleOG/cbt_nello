// middleware.js
import { NextResponse } from "next/server";
import { getSession } from "./lib/auth";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const protectedRoutes = [
    "/dashboard",
    "/users",
    "/bulk-upload",
    "/settings",
  ];

  const adminOnlyRoutes = [
    "/upload-question",
    "/auth/bulk-upload",
  ];


  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const session = await getSession(request);

    if (!session?.user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  if (adminOnlyRoutes.some((route) => pathname.startsWith(route))) {
    const session = await getSession(request);

    if (!session?.user || session.user.role !== "admin") {
      const forbiddenUrl = request.nextUrl.clone();
      forbiddenUrl.pathname = "/403";
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  return NextResponse.next();
}

// Important: The matcher must match public-facing URLs
export const config = {
  matcher: [
    "/dashboard/:path*", // Protects routes like /dashboard/stats
    "/users/:path*",
    "/bulk-upload/:path*",
    "/settings/:path*",
  ],
};
