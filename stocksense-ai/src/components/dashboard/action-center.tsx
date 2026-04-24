"use client";
import * as React from "react";
import { Sparkles } from "lucide-react";
import { ActionCard } from "./action-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MetricCard } from "@/components/ui/metric-card";
import { DollarSign, ListChecks, AlertTriangle } from "lucide-react";
import type { ActionType, ProductWithIntel, AIRecommendation } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface Props {
  products: ProductWithIntel[];
  recommendations: AIRecommendation[];
}

export function ActionCenter({ products, recommendations }: Props) {
  const [filter, setFilter] = React.useState<ActionType | "ALL">("ALL");
  const productById = React.useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const recs = recommendations.filter((r) => r.status === "PENDING");
  const byType = (t: ActionType) => recs.filter((r) => r.actionType === t);

  const filteredRecs = filter === "ALL" ? recs : byType(filter);
  const totalImpact = recs.reduce((s, r) => s + r.dollarImpact, 0);
  const critical = recs.filter((r) => {
    const p = productById.get(r.productId);
    return p?.status === "DEAD";
  }).length;

  const TYPES: { id: ActionType | "ALL"; label: string }[] = [
    { id: "ALL", label: `All (${recs.length})` },
    { id: "DISCOUNT", label: `Discount (${byType("DISCOUNT").length})` },
    { id: "BUNDLE", label: `Bundle (${byType("BUNDLE").length})` },
    { id: "LIQUIDATE", label: `Liquidate (${byType("LIQUIDATE").length})` },
    { id: "REORDER_PAUSE", label: `Pause (${byType("REORDER_PAUSE").length})` },
    { id: "PROMOTE", label: `Promote (${byType("PROMOTE").length})` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Actions pending"
          value={formatNumber(recs.length)}
          sublabel="AI-generated decisions awaiting you"
          icon={ListChecks}
          accent="default"
        />
        <MetricCard
          label="Total recovery potential"
          value={formatCurrency(totalImpact)}
          sublabel="Sum of all action dollar impacts"
          icon={DollarSign}
          accent="success"
        />
        <MetricCard
          label="Critical items"
          value={formatNumber(critical)}
          sublabel="Dead stock requiring urgent action"
          icon={AlertTriangle}
          accent="danger"
        />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as ActionType | "ALL")}>
        <TabsList className="w-full sm:w-auto overflow-x-auto flex">
          {TYPES.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="shrink-0">{t.label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={filter} className="mt-6">
          {filteredRecs.length === 0 ? (
            <div className="text-center py-20 rounded-lg border border-dashed">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-base font-medium">You're all caught up</p>
              <p className="text-sm text-muted-foreground mt-1">No pending AI actions for this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredRecs.map((rec) => {
                const p = productById.get(rec.productId);
                if (!p) return null;
                return (
                  <ActionCard
                    key={rec.id}
                    recommendationId={rec.id}
                    product={p}
                    actionType={rec.actionType}
                    explanation={rec.explanation}
                    expectedOutcome={rec.expectedOutcome}
                    confidenceScore={rec.confidenceScore}
                    dollarImpact={rec.dollarImpact}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
