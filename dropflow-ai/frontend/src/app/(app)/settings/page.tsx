"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Store { id: string; name: string; domain: string; isActive: boolean; niche: string | null }

export default function SettingsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [shop, setShop] = useState("");

  useEffect(() => { api.get("/shopify/stores").then((r) => setStores(r.data.stores)); }, []);

  async function connectShopify() {
    if (!shop.endsWith(".myshopify.com")) return toast.error("Shop must end with .myshopify.com");
    try {
      const { data } = await api.get<{ url: string }>(`/shopify/install?shop=${encodeURIComponent(shop)}`);
      window.location.href = data.url;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? "OAuth failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-ink-muted">Connect Shopify, manage stores.</p>
      </div>

      <div className="card p-5">
        <h2 className="font-medium">Connect a Shopify store</h2>
        <div className="mt-3 flex gap-2">
          <input className="input" placeholder="my-store.myshopify.com" value={shop} onChange={(e) => setShop(e.target.value)} />
          <button className="btn-primary" onClick={connectShopify}>Install</button>
        </div>
        <p className="mt-2 text-xs text-ink-muted">Requires SHOPIFY_API_KEY/SECRET configured on the backend.</p>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-900/60 text-left text-xs uppercase text-ink-muted">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Domain</th><th className="px-4 py-3">Niche</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-navy-700/60">
            {stores.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-muted">No stores connected.</td></tr>}
            {stores.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-ink-soft">{s.domain}</td>
                <td className="px-4 py-3">{s.niche ?? "—"}</td>
                <td className="px-4 py-3">{s.isActive ? <span className="text-teal-300">active</span> : <span className="text-rose-300">inactive</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
