import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  accent?: "default" | "danger" | "warning" | "success";
  trend?: { value: string; positive: boolean };
}

export function MetricCard({ label, value, sublabel, icon: Icon, accent = "default", trend }: MetricCardProps) {
  const accentStyles = {
    default: "from-primary/10 to-transparent text-primary",
    danger: "from-red-500/10 to-transparent text-red-600 dark:text-red-400",
    warning: "from-amber-500/10 to-transparent text-amber-600 dark:text-amber-400",
    success: "from-emerald-500/10 to-transparent text-emerald-600 dark:text-emerald-400",
  }[accent];

  return (
    <Card className="card-hover overflow-hidden relative">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", accentStyles)} />
      <CardContent className="pt-6 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className={cn("h-4 w-4", accentStyles.split(" ").find((c) => c.startsWith("text-")))} />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {trend && (
            <span className={cn("text-xs font-medium", trend.positive ? "text-emerald-600" : "text-red-600")}>
              {trend.positive ? "+" : ""}{trend.value}
            </span>
          )}
        </div>
        {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}
