"use client";
import * as React from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Loader2,
  Percent,
  Layers,
  Trash2,
  PauseCircle,
  Flame,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, cn } from "@/lib/utils";
import type { ActionType, ProductWithIntel } from "@/lib/types";

const ICONS: Record<ActionType, LucideIcon> = {
  DISCOUNT: Percent,
  BUNDLE: Layers,
  LIQUIDATE: Trash2,
  REORDER_PAUSE: PauseCircle,
  PROMOTE: Flame,
};

const LABELS: Record<ActionType, string> = {
  DISCOUNT: "Drop Price",
  BUNDLE: "Create Bundle",
  LIQUIDATE: "Liquidate",
  REORDER_PAUSE: "Pause Reorders",
  PROMOTE: "Run Promo",
};

const ACTION_STYLE: Record<ActionType, string> = {
  DISCOUNT: "from-blue-500/10 to-transparent text-blue-600 dark:text-blue-400",
  BUNDLE: "from-purple-500/10 to-transparent text-purple-600 dark:text-purple-400",
  LIQUIDATE: "from-red-500/10 to-transparent text-red-600 dark:text-red-400",
  REORDER_PAUSE: "from-amber-500/10 to-transparent text-amber-600 dark:text-amber-400",
  PROMOTE: "from-pink-500/10 to-transparent text-pink-600 dark:text-pink-400",
};

interface Props {
  recommendationId: string;
  product: ProductWithIntel;
  actionType: ActionType;
  explanation: string;
  expectedOutcome: string;
  confidenceScore: number;
  dollarImpact: number;
}

export function ActionCard(props: Props) {
  const { toast } = useToast();
  const [state, setState] = React.useState<"PENDING" | "DONE" | "DISMISSED">("PENDING");
  const [reanalyzing, setReanalyzing] = React.useState(false);
  const [content, setContent] = React.useState({
    actionType: props.actionType,
    explanation: props.explanation,
    expectedOutcome: props.expectedOutcome,
    confidenceScore: props.confidenceScore,
  });

  const Icon = ICONS[content.actionType];

  const update = async (status: "DONE" | "DISMISSED") => {
    try {
      await fetch("/api/recommendations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: props.recommendationId, status }),
      });
    } catch {
      // Demo mode — state is local only
    }
    setState(status);
    toast({
      title: status === "DONE" ? "Action marked done" : "Recommendation dismissed",
      description: status === "DONE" ? `${formatCurrency(props.dollarImpact)} projected recovery logged.` : undefined,
      variant: status === "DONE" ? "success" : "default",
    });
  };

  const reanalyze = async () => {
    setReanalyzing(true);
    try {
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: props.product.id }),
      });
      const data = await res.json();
      if (data?.actionType) {
        setContent({
          actionType: data.actionType,
          explanation: data.explanation,
          expectedOutcome: data.expectedOutcome,
          confidenceScore: data.confidenceScore,
        });
        toast({ title: "AI re-analysis complete", variant: "success" });
      } else {
        toast({ title: "Re-analysis unavailable", description: "Using seeded recommendation." });
      }
    } catch {
      toast({ title: "AI service unavailable", variant: "destructive" });
    } finally {
      setReanalyzing(false);
    }
  };

  if (state === "DISMISSED") {
    return (
      <Card className="opacity-50">
        <CardContent className="pt-6 flex items-center gap-3 text-sm text-muted-foreground">
          <XCircle className="h-4 w-4" />
          Dismissed: {props.product.name}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setState("PENDING")}>Undo</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("card-hover relative overflow-hidden", state === "DONE" && "ring-2 ring-emerald-500/40")}>
      <div className={cn("absolute inset-x-0 top-0 h-24 bg-gradient-to-b pointer-events-none", ACTION_STYLE[content.actionType])} />
      <CardContent className="pt-6 relative">
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
            <Image src={props.product.imageUrl} alt="" fill sizes="64px" className="object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge className="gap-1" variant="secondary">
                <Icon className="h-3 w-3" />
                {LABELS[content.actionType]}
              </Badge>
              <StatusPill status={props.product.status} className="text-[10px]" />
              <div className="ml-auto flex items-center gap-1.5 text-xs">
                <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full",
                      content.confidenceScore >= 85 ? "bg-emerald-500" : content.confidenceScore >= 70 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${content.confidenceScore}%` }}
                  />
                </div>
                <span className="text-muted-foreground">{content.confidenceScore}%</span>
              </div>
            </div>

            <h3 className="font-semibold text-base leading-snug">{props.product.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {props.product.sku} · {props.product.unitsInStock} units · {props.product.daysSinceLastSale}d idle · {formatCurrency(props.product.inventoryValue)} tied up
            </p>

            <div className="mt-3 text-sm leading-relaxed text-foreground/90">
              {content.explanation}
            </div>

            <div className="mt-3 rounded-lg bg-muted/50 border border-dashed p-3 text-sm">
              <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Expected outcome</span>
              <p className="mt-1">{content.expectedOutcome}</p>
            </div>

            {props.dollarImpact > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Dollar impact:</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(props.dollarImpact)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {state === "DONE" ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Marked done
            </Badge>
          ) : (
            <>
              <Button size="sm" variant="success" className="gap-1.5" onClick={() => update("DONE")}>
                <CheckCircle2 className="h-4 w-4" />
                Mark as done
              </Button>
              <Button size="sm" variant="outline" onClick={() => update("DISMISSED")}>
                Dismiss
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5 ml-auto" onClick={reanalyze} disabled={reanalyzing}>
                {reanalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {reanalyzing ? "Re-analyzing…" : "Re-analyze"}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
