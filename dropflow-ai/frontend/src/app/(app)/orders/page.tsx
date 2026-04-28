"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCents } from "@/lib/cn";
import { toast } from "sonner";
import { CheckCircle2, Truck, Package, Clock, XCircle } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  totalCents: number;
  stage: "RECEIVED" | "ORDERED_FROM_SUPPLIER" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
  trackingNumber: string | null;
  trackingUrl: string | null;
  receivedAt: string;
  items: { title: string; quantity: number; priceCents: number }[];
  supplierOrders: { id: string; status: string; supplier: { name: string }; trackingNumber: string | null }[];
}

const STAGES = ["RECEIVED", "ORDERED_FROM_SUPPLIER", "SHIPPED", "DELIVERED"] as const;
const STAGE_ICON = {
  RECEIVED: Clock, ORDERED_FROM_SUPPLIER: Package, SHIPPED: Truck, DELIVERED: CheckCircle2,
  CANCELLED: XCircle, REFUNDED: XCircle,
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stage, setStage] = useState<string>("");

  useEffect(() => {
    const path = stage ? `/orders?stage=${stage}` : "/orders";
    api.get<{ orders: Order[] }>(path).then((r) => setOrders(r.data.orders));
  }, [stage]);

  async function refulfill(id: string) {
    try {
      await api.post(`/orders/${id}/refulfill`);
      toast.success("Re-fulfillment queued");
    } catch {
      toast.error("Could not queue refulfillment");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-ink-muted">From customer to courier — fully automated.</p>
        </div>
        <select className="input w-auto" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-900/60 text-left text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Tracking</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700/60">
            {orders.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-muted">No orders yet — connect a Shopify store and the next sale will appear here.</td></tr>
            )}
            {orders.map((o) => {
              const Icon = STAGE_ICON[o.stage];
              const stageColor = o.stage === "DELIVERED" ? "text-teal-300" : o.stage === "CANCELLED" || o.stage === "REFUNDED" ? "text-rose-300" : "text-ink";
              return (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.customerName ?? "—"}<div className="text-xs text-ink-muted">{o.customerEmail}</div></td>
                  <td className="px-4 py-3">{o.items.reduce((s, i) => s + i.quantity, 0)} items</td>
                  <td className="px-4 py-3 tabular-nums">{fmtCents(o.totalCents)}</td>
                  <td className={`px-4 py-3 ${stageColor}`}><span className="inline-flex items-center gap-1.5"><Icon className="size-3.5" />{o.stage.replace(/_/g, " ").toLowerCase()}</span></td>
                  <td className="px-4 py-3">
                    {o.trackingUrl ? <a className="text-teal-300 hover:underline" href={o.trackingUrl} target="_blank" rel="noreferrer">{o.trackingNumber}</a> : <span className="text-ink-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(o.stage === "RECEIVED" || o.stage === "ORDERED_FROM_SUPPLIER") && (
                      <button className="btn-secondary" onClick={() => refulfill(o.id)}>Re-fulfill</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
