import Link from "next/link";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/70 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Activity className="h-4 w-4" />
          </div>
          StockSense <span className="text-muted-foreground font-normal">AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="#features" className="text-muted-foreground hover:text-foreground">Features</Link>
          <Link href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Demo</Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
