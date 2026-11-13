import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

const PAGES_FAMILLE = [
  "/accueil",
  "/chat",
  "/menu",
  "/courses",
  "/stock",
  "/profil",
  "/foyer",
  "/ou-acheter",
  "/delivery",
  "/dashboard",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  const surPageFamille = PAGES_FAMILLE.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (role === "admin" && surPageFamille) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  if (role === "driver" && surPageFamille) {
    return NextResponse.redirect(new URL("/chauffeur", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/accueil/:path*",
    "/chat/:path*",
    "/menu/:path*",
    "/courses/:path*",
    "/stock/:path*",
    "/profil/:path*",
    "/foyer/:path*",
    "/ou-acheter/:path*",
    "/delivery/:path*",
    "/dashboard/:path*",
  ],
};
