import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { Activity, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clerkConfigured } from "@/lib/auth";

const PROOF = [
  "Free for 14 days — no card required",
  "Works with Shopify, Amazon, or CSV",
  "Cancel from dashboard in one click",
];

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-700 text-white p-12 flex-col justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="h-9 w-9 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
          StockSense AI
        </Link>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Stop Guessing. Start Recovering.</h1>
          <ul className="mt-6 space-y-2 text-white/90">
            {PROOF.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-sm text-white/60">© {new Date().getFullYear()} StockSense AI</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {clerkConfigured ? (
            <SignUp signInUrl="/sign-in" forceRedirectUrl="/onboarding" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Demo mode</CardTitle>
                <CardDescription>
                  Clerk isn't configured. Jump into the onboarding flow or the demo dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/onboarding">Start onboarding</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard">Skip to dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
