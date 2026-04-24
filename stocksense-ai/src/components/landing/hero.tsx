import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] bg-gradient-to-tr from-blue-500 to-indigo-500 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72rem]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-28 sm:pt-32 sm:pb-40">
        <div className="text-center">
          <Badge variant="outline" className="mb-6 gap-1">
            <Sparkles className="h-3 w-3" />
            Dead Inventory Intelligence, powered by GPT-4o
          </Badge>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
            Stop Guessing.
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Start Recovering.
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Dead stock eats 20–40% of e-commerce margin. StockSense connects to your store, finds every rotting SKU, and tells you the exact action — discount, bundle, or liquidate — with expected dollar recovery.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2 text-base">
              <Link href="/sign-up">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <Link href="/dashboard">See live demo</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            14-day free trial · No credit card · Cancel anytime
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-5xl rounded-xl border bg-card/50 backdrop-blur shadow-2xl overflow-hidden">
          <div className="border-b bg-muted/50 px-4 py-2 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <div className="ml-3 text-xs text-muted-foreground">stocksense.ai/dashboard</div>
          </div>
          <div className="p-8 grid md:grid-cols-3 gap-4 text-left">
            <div className="rounded-lg border bg-background/80 p-4">
              <div className="text-xs text-muted-foreground">Revenue at risk</div>
              <div className="text-2xl font-bold mt-1">$24,830</div>
              <div className="text-xs text-red-500 mt-1">↑ 12 dead SKUs</div>
            </div>
            <div className="rounded-lg border bg-background/80 p-4">
              <div className="text-xs text-muted-foreground">Recovery potential</div>
              <div className="text-2xl font-bold mt-1">$18,420</div>
              <div className="text-xs text-emerald-500 mt-1">Act in next 14 days</div>
            </div>
            <div className="rounded-lg border bg-background/80 p-4">
              <div className="text-xs text-muted-foreground">Inventory Health</div>
              <div className="text-2xl font-bold mt-1">67/100</div>
              <div className="text-xs text-amber-500 mt-1">Needs attention</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
