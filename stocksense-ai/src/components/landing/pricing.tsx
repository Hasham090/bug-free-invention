import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export function Pricing() {
  const tiers = [PLANS.STARTER, PLANS.GROWTH, PLANS.ENTERPRISE];
  return (
    <section id="pricing" className="py-24 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <Badge variant="outline" className="mb-3">Pricing</Badge>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            One subscription. Every store pays for itself.
          </h2>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            The average StockSense customer recovers 8–14x their subscription in the first month by acting on dead inventory.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              className={cn(
                "relative flex flex-col card-hover",
                "popular" in tier && tier.popular && "border-primary shadow-lg ring-1 ring-primary/20"
              )}
            >
              {"popular" in tier && tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most popular</Badge>
              )}
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>
                  {tier.id === "STARTER" && "For solo sellers launching their first store"}
                  {tier.id === "GROWTH" && "For growing brands clearing dead stock fast"}
                  {tier.id === "ENTERPRISE" && "For multi-store operators and agencies"}
                </CardDescription>
                <div className="pt-4">
                  <span className="text-5xl font-bold tracking-tight">${tier.priceUsd}</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <ul className="space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="w-full mt-6"
                  variant={"popular" in tier && tier.popular ? "default" : "outline"}
                >
                  <Link href={`/sign-up?plan=${tier.id.toLowerCase()}`}>
                    Start {tier.name}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
