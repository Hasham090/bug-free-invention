import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clerkConfigured } from "@/lib/auth";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white p-12 flex-col justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="h-9 w-9 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
          StockSense AI
        </Link>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            “We recovered $48k from dead stock in our first month.”
          </h1>
          <p className="mt-4 text-white/80">Layla R., Shopify seller · Beauty</p>
        </div>
        <div className="text-sm text-white/60">© {new Date().getFullYear()} StockSense AI</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {clerkConfigured ? (
            <SignIn signUpUrl="/sign-up" forceRedirectUrl="/dashboard" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Demo mode</CardTitle>
                <CardDescription>
                  Clerk isn't configured, so auth is bypassed. Jump straight to the dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/dashboard">Enter demo dashboard</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">Back home</Link>
                </Button>
                <p className="text-xs text-muted-foreground pt-4 border-t">
                  Set <code className="text-foreground">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
                  <code className="text-foreground">CLERK_SECRET_KEY</code> in <code>.env.local</code> to enable real auth.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
