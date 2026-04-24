import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(n: number, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    ...opts,
  }).format(n);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatPct(n: number, digits = 0) {
  return `${n.toFixed(digits)}%`;
}

export function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysAgo(date: Date | null | undefined) {
  if (!date) return Infinity;
  return daysBetween(new Date(date), new Date());
}

export function statusFromDaysSinceSale(days: number): "HEALTHY" | "SLOW" | "DEAD" {
  if (days >= 30) return "DEAD";
  if (days >= 15) return "SLOW";
  return "HEALTHY";
}

export function statusColor(status: "HEALTHY" | "SLOW" | "DEAD") {
  switch (status) {
    case "DEAD":
      return "text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
    case "SLOW":
      return "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    default:
      return "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  }
}

export function marginPct(selling: number, cost: number) {
  if (selling <= 0) return 0;
  return ((selling - cost) / selling) * 100;
}
