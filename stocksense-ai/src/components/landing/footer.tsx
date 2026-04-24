import Link from "next/link";
import { Activity } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Activity className="h-3.5 w-3.5" />
          </div>
          StockSense AI
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="#features">Features</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="/dashboard">Demo</Link>
          <Link href="/sign-in">Log in</Link>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} StockSense AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
