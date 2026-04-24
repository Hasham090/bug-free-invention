import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  DollarSign,
  PackageX,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HealthGauge } from "@/components/dashboard/health-gauge";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { getAllProducts, getDashboardSummary, getPendingRecommendations, getSalesTimeseries, actionTypeLabel } from "@/lib/data";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const summary = getDashboardSummary();
  const products = getAllProducts();
  const urgent = products
    .filter((p) => p.status === "DEAD")
    .sort((a, b) => b.inventoryValue - a.inventoryValue)
    .slice(0, 5);
  const recentActions = getPendingRecommendations().slice(0, 4);
  const salesSeries = getSalesTimeseries(30);

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            What's happening across your store right now, and what to act on next.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/actions">
            <Sparkles className="h-4 w-4" />
            Review {summary.pendingActions} AI actions
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Inventory value at risk"
          value={formatCurrency(summary.atRisk)}
          sublabel={`${summary.deadCount} dead SKUs`}
          icon={AlertTriangle}
          accent="danger"
        />
        <MetricCard
          label="Recovery potential"
          value={formatCurrency(summary.recoveryPotential)}
          sublabel="If all AI actions taken"
          icon={DollarSign}
          accent="success"
          trend={{ value: "act 14d", positive: true }}
        />
        <MetricCard
          label="Dead stock SKUs"
          value={formatNumber(summary.deadCount)}
          sublabel={`+${summary.slowCount} slowing`}
          icon={PackageX}
          accent="warning"
        />
        <MetricCard
          label="AI actions pending"
          value={formatNumber(summary.pendingActions)}
          sublabel="Awaiting your review"
          icon={Sparkles}
          accent="default"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Last 30 days revenue</CardTitle>
                <CardDescription>Across every connected store</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={salesSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Health Score</CardTitle>
            <CardDescription>Weighted by units across all SKUs</CardDescription>
          </CardHeader>
          <CardContent>
            <HealthGauge score={summary.healthScore} />
            <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
              <div>
                <div className="font-semibold text-emerald-600">{summary.healthyCount}</div>
                <div className="text-muted-foreground">Healthy</div>
              </div>
              <div>
                <div className="font-semibold text-amber-600">{summary.slowCount}</div>
                <div className="text-muted-foreground">Slow</div>
              </div>
              <div>
                <div className="font-semibold text-red-600">{summary.deadCount}</div>
                <div className="text-muted-foreground">Dead</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top 5 urgent products</CardTitle>
                <CardDescription>Most capital tied up in dead stock</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/inventory">View all <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Days idle</TableHead>
                  <TableHead>Tied up</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urgent.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      No dead stock — nice work.
                    </TableCell>
                  </TableRow>
                )}
                {urgent.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                          <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate max-w-[200px]">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.sku}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.unitsInStock}</TableCell>
                    <TableCell className="text-sm text-red-600 font-medium">{p.daysSinceLastSale}d</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(p.inventoryValue)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/dashboard/actions">Act</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent AI recommendations</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/actions"><ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActions.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No pending actions.</p>}
            {recentActions.map((rec) => {
              const p = products.find((x) => x.id === rec.productId);
              if (!p) return null;
              return (
                <Link
                  key={rec.id}
                  href="/dashboard/actions"
                  className="flex items-start gap-3 p-3 -mx-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="relative h-9 w-9 rounded overflow-hidden bg-muted shrink-0">
                    <Image src={p.imageUrl} alt="" fill sizes="36px" className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{actionTypeLabel(rec.actionType)}</Badge>
                      <StatusPill status={p.status} className="text-[10px]" />
                    </div>
                    <p className="text-sm font-medium truncate mt-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{rec.explanation}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
