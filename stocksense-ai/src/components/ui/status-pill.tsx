import { cn, statusColor } from "@/lib/utils";
import type { ProductStatus } from "@/lib/types";

export function StatusPill({ status, className }: { status: ProductStatus; className?: string }) {
  const label = status === "DEAD" ? "Dead" : status === "SLOW" ? "Slow" : "Healthy";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", statusColor(status), className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "DEAD" ? "bg-red-500" : status === "SLOW" ? "bg-amber-500" : "bg-emerald-500")} />
      {label}
    </span>
  );
}
