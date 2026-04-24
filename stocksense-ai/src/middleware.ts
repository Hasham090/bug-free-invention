import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const clerkConfigured =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/onboarding(.*)"]);

const clerkWrapper = clerkMiddleware((auth, request) => {
  if (isProtectedRoute(request)) auth.protect();
});

export default function middleware(req: NextRequest, ev: any) {
  // Demo mode: skip Clerk entirely so the app is usable without keys.
  if (!clerkConfigured) return NextResponse.next();
  return (clerkWrapper as any)(req, ev);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
