"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/actions", label: "AI Actions", icon: Sparkles, badge: true },
  { href: "/dashboard/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card/50 backdrop-blur">
      <div className="h-16 flex items-center gap-2 px-6 border-b font-semibold">
        <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
          <Activity className="h-4 w-4" />
        </div>
        StockSense <span className="text-muted-foreground font-normal">AI</span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => {
          const active = l.href === "/dashboard" ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <l.icon className="h-4 w-4" />
              <span className="flex-1">{l.label}</span>
              {l.badge && pendingCount > 0 && (
                <span className={cn("text-xs px-2 py-0.5 rounded-full", active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary")}>
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Link href="/dashboard/settings" className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">DS</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Demo Seller</p>
            <p className="text-xs text-muted-foreground truncate">Growth plan</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}

export function MobileNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur z-50">
      <div className="grid grid-cols-6 gap-1 p-1">
        {links.map((l) => {
          const active = l.href === "/dashboard" ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-1 rounded text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <l.icon className="h-4 w-4" />
                {l.badge && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="h-16 border-b bg-background/70 backdrop-blur flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3 lg:hidden">
        <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
          <Activity className="h-4 w-4" />
        </div>
        <span className="font-semibold">StockSense AI</span>
      </div>
      <div className="hidden lg:block">
        <h1 className="text-lg font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{action}</div>
    </header>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap lg:hidden mb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export { links as dashboardLinks };
