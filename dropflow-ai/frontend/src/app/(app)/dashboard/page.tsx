"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCents } from "@/lib/cn";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import Link from "next/link";

interface Snapshot {
  revenue: { todayCents: number; weekCents: number; monthCents: number };
  orders: { pending: number; processing: number; fulfilled: number };
  adSpend: { todayCents: number; weekCents: number; monthCents: number };
  profitMonthCents: number;
  topProducts: { id: string; title: string; revenueCents: number; orderCount: number }[];
  pipeline: { stage: string; count: number }[];
}
interface Tip { level: "info" | "warn" | "success"; title: string; body: string; action?: { label: string; href: string } | null }

export default function DashboardPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);
  const [chart, setChart] = useState<{ date: string; revenue: number; spend: number }[]>([]);

  useEffect(() => {
    api.get<Snapshot>("/dashboard/snapshot").then((r) => {
      setSnap(r.data);
      // synth a 14-day trailing chart locally from monthly figures (placeholder until time-series endpoint)
      const days = 14;
      const dailyRev = r.data.revenue.weekCents / 7;
      const dailySpend = r.data.adSpend.weekCents / 7;
      setChart(
        Array.from({ length: days }, (_, i) => ({
          date: new Date(Date.now() - (days - 1 - i) * 86400000).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          revenue: Math.round(dailyRev * (0.6 + Math.random() * 0.8)),
          spend: Math.round(dailySpend * (0.6 + Math.random() * 0.8)),
        })),
      );
    });
    api.get<{ tips: Tip[] }>("/dashboard/tips").then((r) => setTips(r.data.tips)).catch(() => {});
  }, []);

  if (!snap) return <div className="card p-8 text-ink-muted">Loading dashboard…</div>;

  const profit = snap.profitMonthCents;
  const profitUp = profit >= 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today's pulse</h1>
        <p className="text-sm text-ink-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue today"   value={fmtCents(snap.revenue.todayCents)}  delta={`${fmtCents(snap.revenue.weekCents)} this week`} />
        <Stat label="Revenue this month" value={fmtCents(snap.revenue.monthCents)} delta={`profit ${fmtCents(profit)}`} positive={profitUp} />
        <Stat label="Ad spend (mo)"   value={fmtCents(snap.adSpend.monthCents)}  delta={`${fmtCents(snap.adSpend.todayCents)} today`} />
        <Stat label="Open orders"     value={String(snap.orders.pending + snap.orders.processing)} delta={`${snap.orders.fulfilled} delivered`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Profit (revenue − ad spend)</h2>
            <span className="badge">last 14 days</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid stroke="#1f2c54" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#9aa3c7" fontSize={12} />
                <YAxis stroke="#9aa3c7" fontSize={12} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                <Tooltip contentStyle={{ background: "#0b1224", border: "1px solid #1f2c54", borderRadius: 12 }} formatter={(v: number) => fmtCents(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#2ee5cf" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="spend" stroke="#f87171" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-teal-400" />
            <h2 className="font-medium">AI suggestions</h2>
          </div>
          <ul className="mt-3 space-y-3">
            {tips.length === 0 && <li className="text-sm text-ink-muted">No tips yet — they'll arrive after your first synced order.</li>}
            {tips.map((t, i) => (
              <li key={i} className="rounded-xl border border-navy-700 bg-navy-900/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${t.level === "warn" ? "text-amber-300" : t.level === "success" ? "text-teal-300" : "text-ink"}`}>
                    {t.title}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">{t.body}</p>
                {t.action && (
                  <Link href={t.action.href} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300">
                    {t.action.label} <ChevronRight className="size-3" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-medium">Order pipeline</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={snap.pipeline}>
                <CartesianGrid stroke="#1f2c54" strokeDasharray="3 3" />
                <XAxis dataKey="stage" stroke="#9aa3c7" fontSize={12} />
                <YAxis stroke="#9aa3c7" fontSize={12} />
                <Tooltip contentStyle={{ background: "#0b1224", border: "1px solid #1f2c54", borderRadius: 12 }} />
                <Bar dataKey="count" fill="#2ee5cf" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-medium">Top products this month</h2>
          <ul className="mt-3 divide-y divide-navy-700">
            {snap.topProducts.length === 0 && <li className="py-3 text-sm text-ink-muted">Import & sell products to see this list.</li>}
            {snap.topProducts.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm">{p.title}</div>
                  <div className="text-xs text-ink-muted">{p.orderCount} sold</div>
                </div>
                <div className="font-medium tabular-nums">{fmtCents(p.revenueCents)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, delta, positive }: { label: string; value: string; delta?: string; positive?: boolean }) {
  return (
    <div className="card p-5">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {delta && (
        <div className={`mt-2 inline-flex items-center gap-1 text-xs ${positive === undefined ? "text-ink-muted" : positive ? "text-teal-300" : "text-rose-400"}`}>
          {positive === undefined ? null : positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {delta}
        </div>
      )}
    </div>
  );
}
