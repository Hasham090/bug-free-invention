"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCents } from "@/lib/cn";
import { toast } from "sonner";
import Image from "next/image";
import { ChevronRight, Sparkles } from "lucide-react";

interface Product {
  id: string;
  title: string;
  images: string[];
  priceCents: number;
  costCents: number;
  marginPercent: number | null;
  status: string;
  supplierProduct?: { supplier: { name: string; kind: string } } | null;
}
interface Researched {
  externalId: string;
  title: string;
  images: string[];
  costCents: number;
  recommendedPriceCents: number;
  marginPercent: number;
  estimatedMonthlyRevenueCents: number;
  shippingDays?: number;
  rating?: number;
  competition: { score: number; trend: string };
  supplierKind: "ALIEXPRESS" | "CJ_DROPSHIPPING" | "ZENDROP" | "GENERIC_SCRAPED" | "CSV_IMPORT";
  overallScore: number;
}

export default function ProductsPage() {
  const [tab, setTab] = useState<"library" | "discover">("library");
  const [products, setProducts] = useState<Product[]>([]);
  const [niche, setNiche] = useState("");
  const [budget, setBudget] = useState("");
  const [researched, setResearched] = useState<Researched[]>([]);
  const [busy, setBusy] = useState(false);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [storeId, setStoreId] = useState<string>("");

  useEffect(() => {
    api.get<{ products: Product[] }>("/products").then((r) => setProducts(r.data.products));
    api.get<{ stores: { id: string; name: string }[] }>("/shopify/stores").then((r) => {
      setStores(r.data.stores);
      if (r.data.stores[0]) setStoreId(r.data.stores[0].id);
    });
  }, []);

  async function research() {
    if (!niche) return;
    setBusy(true);
    try {
      const { data } = await api.post<{ products: Researched[] }>("/products/research", {
        niche,
        budgetCents: budget ? Math.round(parseFloat(budget) * 100) : undefined,
      });
      setResearched(data.products);
      toast.success(`Found ${data.products.length} candidates`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? "Research failed");
    } finally {
      setBusy(false);
    }
  }

  async function importToStore(p: Researched) {
    if (!storeId) return toast.error("Connect a Shopify store first");
    try {
      await api.post("/products/import", {
        storeId,
        supplierKind: p.supplierKind,
        externalProductId: p.externalId,
      });
      toast.success("Import started — you'll get a toast when it's live.");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? "Import failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-ink-muted">Discover, score, and import in one click.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input w-auto" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            {stores.length === 0 && <option value="">No stores connected</option>}
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="rounded-xl border border-navy-700 bg-navy-900 p-1 text-xs">
            <button onClick={() => setTab("library")} className={`rounded-lg px-3 py-1 ${tab === "library" ? "bg-navy-700 text-ink" : "text-ink-muted"}`}>Library</button>
            <button onClick={() => setTab("discover")} className={`rounded-lg px-3 py-1 ${tab === "discover" ? "bg-navy-700 text-ink" : "text-ink-muted"}`}>Discover</button>
          </div>
        </div>
      </div>

      {tab === "library" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.length === 0 && <div className="card col-span-full p-8 text-ink-muted">No products yet — head to <span className="text-teal-300">Discover</span> to import some.</div>}
          {products.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              {p.images[0] && (
                <div className="relative aspect-[4/3] bg-navy-800">
                  <Image src={p.images[0]} alt={p.title} fill className="object-cover" unoptimized />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span className="badge">{p.supplierProduct?.supplier.name ?? "manual"}</span>
                  <span>{p.status}</span>
                </div>
                <h3 className="mt-2 line-clamp-2 text-sm font-medium">{p.title}</h3>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold">{fmtCents(p.priceCents)}</span>
                  <span className="text-teal-300">+{p.marginPercent?.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "discover" && (
        <>
          <div className="card p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <label className="stat-label">Niche / category</label>
                <input className="input mt-1" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. minimalist desk accessories" />
              </div>
              <div>
                <label className="stat-label">Max retail $</label>
                <input className="input mt-1 w-32" type="number" min={1} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="100" />
              </div>
              <button className="btn-primary" onClick={research} disabled={busy}>
                <Sparkles className="size-4" />
                {busy ? "Searching…" : "Find winners"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {researched.map((p) => (
              <div key={`${p.supplierKind}-${p.externalId}`} className="card overflow-hidden">
                {p.images[0] && (
                  <div className="relative aspect-[4/3] bg-navy-800">
                    <Image src={p.images[0]} alt={p.title} fill className="object-cover" unoptimized />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="badge">{p.supplierKind}</span>
                    <span className={`text-xs ${p.competition.trend === "rising" ? "text-teal-300" : p.competition.trend === "falling" ? "text-rose-300" : "text-ink-muted"}`}>{p.competition.trend}</span>
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-sm font-medium">{p.title}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Pill label="cost" value={fmtCents(p.costCents)} />
                    <Pill label="sell" value={fmtCents(p.recommendedPriceCents)} accent />
                    <Pill label="margin" value={`${p.marginPercent}%`} />
                    <Pill label="ship" value={p.shippingDays ? `${p.shippingDays}d` : "—"} />
                    <Pill label="score" value={(p.overallScore * 100).toFixed(0)} />
                    <Pill label="est. mo. rev" value={fmtCents(p.estimatedMonthlyRevenueCents)} />
                  </div>
                  <button className="btn-primary mt-4 w-full" onClick={() => importToStore(p)}>
                    Import to store <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Pill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border border-navy-700 bg-navy-900/60 px-2 py-1 ${accent ? "ring-1 ring-teal-400/30" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="text-sm tabular-nums">{value}</div>
    </div>
  );
}
