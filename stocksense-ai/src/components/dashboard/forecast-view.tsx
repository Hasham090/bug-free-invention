"use client";
import * as React from "react";
import Image from "next/image";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import type { ProductForecast } from "@/lib/forecast";
import { cn } from "@/lib/utils";

export function ForecastView({
  forecasts,
  velocitySeries,
}: {
  forecasts: ProductForecast[];
  velocitySeries: Record<string, { date: string; units: number }[]>;
}) {
  const [selected, setSelected] = React.useState(forecasts[0]?.productId ?? "");
  const f = forecasts.find((x) => x.productId === selected) ?? forecasts[0];
  const series = velocitySeries[selected] ?? [];

  const atRisk = [...forecasts].sort((a, b) => b.deadStockRisk - a.deadStockRisk).slice(0, 6);
  const stockoutSoon = forecasts
    .filter((x) => x.predictedStockoutDays !== null && x.predictedStockoutDays <= 45 && x.predictedStockoutDays > 0)
    .sort((a, b) => (a.predictedStockoutDays ?? 999) - (b.predictedStockoutDays ?? 999))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Sales velocity</CardTitle>
              <CardDescription>Daily units moved over the last 90 days</CardDescription>
            </div>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {forecasts.map((p) => (
                  <SelectItem key={p.productId} value={p.productId}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <VelocityStat label="30-day units" value={f.velocity30d} />
            <VelocityStat label="60-day units" value={f.velocity60d} />
            <VelocityStat label="90-day units" value={f.velocity90d} />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d, i) => (i % 10 === 0 ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "")}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(d) => new Date(d as string).toLocaleDateString("en-US", { dateStyle: "medium" })}
              />
              <Bar dataKey="units" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {f.seasonalityWarning && (
            <div className="mt-4 flex items-start gap-2 text-sm bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-lg p-3">
              <Calendar className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Seasonality alert: </span>
                {f.seasonalityWarning}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Dead stock risk
            </CardTitle>
            <CardDescription>Products most likely to go dead in the next 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {atRisk.map((p) => (
              <div key={p.productId} className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                  <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <span className={cn("text-xs font-semibold", p.deadStockRisk >= 70 ? "text-red-600" : p.deadStockRisk >= 40 ? "text-amber-600" : "text-muted-foreground")}>
                      {p.deadStockRisk}% risk
                    </span>
                  </div>
                  <Progress value={p.deadStockRisk} className="h-1.5 mt-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Predicted stockouts
            </CardTitle>
            <CardDescription>Healthy sellers running low — reorder before they're gone</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stockoutSoon.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No stockouts predicted in the next 45 days.</p>}
            {stockoutSoon.map((p) => (
              <div key={p.productId} className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                  <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.unitsInStock} units · {p.velocity30d} sold / 30d
                  </p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {p.predictedStockoutDays}d
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VelocityStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
    </div>
  );
}
