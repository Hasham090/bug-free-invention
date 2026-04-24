"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!clerkConfigured) {
    // Demo mode: no auth wrapper, pages show a Demo banner
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}
