"use client";
import { Bell, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function Topbar() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get("/dashboard/notifications").then((r) => {
      setUnread(r.data.notifications.filter((n: { readAt: string | null }) => !n.readAt).length);
    }).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-navy-700/50 bg-navy-950/80 px-6 py-3 backdrop-blur">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input className="input pl-9" placeholder="Search products, orders, campaigns…" />
      </div>
      <div className="flex items-center gap-3">
        <button className="relative rounded-xl border border-navy-700 bg-navy-900 p-2 text-ink-soft hover:text-ink">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-teal-400 text-[10px] font-semibold text-navy-950">
              {unread}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
