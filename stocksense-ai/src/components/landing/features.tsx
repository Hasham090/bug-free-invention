import { Bot, TrendingDown, Sparkles, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Bot,
    title: "AI that decides, not just reports",
    body: "Every dead SKU gets one specific action — discount to $X, bundle with SKU-047, or liquidate for $Y recovery. No more dashboards full of charts with no conclusion.",
  },
  {
    icon: TrendingDown,
    title: "Catch dead stock before it's dead",
    body: "Velocity forecasting flags slowing SKUs at 15 days — not 90. You recover 3x more margin acting early than liquidating at the end.",
  },
  {
    icon: Sparkles,
    title: "Bundles & promos, generated for you",
    body: "StockSense suggests the exact bundle pairings, the exact discount, the exact platform (Instagram, email, Meta ads) — with expected sell-through.",
  },
  {
    icon: ShieldCheck,
    title: "Works with your existing stack",
    body: "Shopify and Amazon connectors pull your real data in 30 seconds. CSV uploads for everything else. Your data is encrypted at rest and never shared.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <Badge variant="outline" className="mb-3">Why StockSense</Badge>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Dashboards don't move product. Decisions do.
          </h2>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            StockSense looks at every SKU and tells you the single best thing to do with it — then tracks whether it worked.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="card-hover">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
