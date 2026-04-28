"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCents } from "@/lib/cn";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Search } from "lucide-react";

interface AdapterInfo { kind: "ALIEXPRESS" | "CJ_DROPSHIPPING" | "ZENDROP" | "GENERIC_SCRAPED"; name: string; configured: boolean }
interface SupplierProduct { externalId: string; title: string; images: string[]; costCents: number; rating?: number; shippingDays?: number; category?: string }

export default function SuppliersPage() {
  const [list, setList] = useState<AdapterInfo[]>([]);
  const [active, setActive] = useState<AdapterInfo["kind"]>("ALIEXPRESS");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SupplierProduct[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ adapters: AdapterInfo[] }>("/suppliers").then((r) => setList(r.data.adapters.filter((a) => a.kind !== "CSV_IMPORT" as never)));
  }, []);

  async function search() {
    setBusy(true);
    try {
      const { data } = await api.post<{ products: SupplierProduct[] }>("/suppliers/search", { kind: active, query });
      setResults(data.products);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadCsv(file: File) {
    const text = await file.text();
    try {
      const { data } = await api.post<{ count: number }>("/suppliers/csv-import", text, { headers: { "Content-Type": "text/csv" } });
      toast.success(`Imported ${data.count} CSV products`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? "CSV import failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
        <p className="text-sm text-ink-muted">Connect APIs, scrape any site, or upload a CSV.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {list.map((a) => (
          <button
            key={a.kind}
            onClick={() => setActive(a.kind)}
            className={`card p-4 text-left transition ${active === a.kind ? "ring-1 ring-teal-400/40" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{a.name}</span>
              {a.configured ? <CheckCircle2 className="size-4 text-teal-400" /> : <AlertCircle className="size-4 text-amber-400" />}
            </div>
            <div className="mt-2 text-xs text-ink-muted">{a.configured ? "API key configured" : "Set env to enable"}</div>
          </button>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <label className="stat-label">{active === "GENERIC_SCRAPED" ? "Listing URL" : "Search query"}</label>
            <input className="input mt-1" placeholder={active === "GENERIC_SCRAPED" ? "https://supplier.com/category" : "wireless earbuds"} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={search} disabled={busy || !query}>
            <Search className="size-4" /> {busy ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((p) => (
          <div key={p.externalId} className="card overflow-hidden">
            {p.images[0] && <img src={p.images[0]} alt="" className="aspect-[4/3] w-full object-cover" />}
            <div className="p-3">
              <h3 className="line-clamp-2 text-sm">{p.title}</h3>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-medium">{fmtCents(p.costCents)}</span>
                {p.shippingDays && <span className="text-ink-muted">{p.shippingDays}d ship</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-medium">Manual CSV import</h2>
        <p className="mt-1 text-xs text-ink-muted">Columns: <code>sku,title,description,images,cost,currency,shipping_days,moq,category</code></p>
        <input type="file" accept="text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCsv(f); }} className="mt-3 text-sm" />
      </div>
    </div>
  );
}
