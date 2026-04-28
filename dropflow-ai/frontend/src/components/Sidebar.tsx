"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingBag, Truck, Megaphone, Wand2, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/campaigns", label: "Ad Campaigns", icon: Megaphone },
  { href: "/store-builder", label: "Store Builder", icon: Wand2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r border-navy-700/50 bg-navy-950/60 backdrop-blur">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="size-8 rounded-xl bg-gradient-to-br from-teal-300 to-teal-600 shadow-glow" />
        <div>
          <div className="font-semibold tracking-tight">DropFlow AI</div>
          <div className="text-xs text-ink-muted">Automate the boring stuff</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((it) => {
          const active = path?.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                active ? "bg-navy-800 text-ink ring-1 ring-teal-400/30" : "text-ink-soft hover:bg-navy-800/60 hover:text-ink",
              )}
            >
              <Icon className="size-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-5">
        <button
          onClick={() => {
            localStorage.removeItem("dropflow.token");
            location.href = "/login";
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-navy-800/60 hover:text-ink"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </div>
    </aside>
  );
}
