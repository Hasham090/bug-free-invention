"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles, Wand2 } from "lucide-react";

interface Blueprint {
  storeNames: string[];
  brandPalette: { primary: string; secondary: string; accent: string; bg: string; text: string };
  typography: { headingFont: string; bodyFont: string };
  themeRecommendation: { name: string; reason: string };
  homepage: { heroHeadline: string; heroSubheadline: string; trustBadges: string[]; featuredCollections: string[] };
  pages: { aboutUs: { title: string; bodyHtml: string }; returnPolicy: { title: string; bodyHtml: string }; faq: { title: string; bodyHtml: string } };
  navigation: { main: string[]; footer: string[] };
}

export default function StoreBuilderPage() {
  const [niche, setNiche] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [storeId, setStoreId] = useState("");

  useEffect(() => {
    api.get("/shopify/stores").then((r) => {
      setStores(r.data.stores);
      if (r.data.stores[0]) setStoreId(r.data.stores[0].id);
    });
  }, []);

  async function generate() {
    setBusy(true);
    try {
      const { data } = await api.post<{ blueprint: Blueprint }>("/store-builder/blueprint", { niche, targetMarket: target, storeId: storeId || undefined });
      setBlueprint(data.blueprint);
      toast.success("Blueprint generated");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? "Generation failed");
    } finally { setBusy(false); }
  }

  async function apply() {
    if (!storeId || !blueprint) return;
    try {
      await api.post("/store-builder/apply", { storeId, blueprint, niche });
      toast.success("Applied to Shopify");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? "Apply failed");
    }
  }

  async function partnerCreate() {
    const name = prompt("New Shopify development store name?");
    if (!name) return;
    try {
      const { data } = await api.post<{ shopDomain: string }>("/shopify/partner-create-store", { storeName: name });
      toast.success(`Created ${data.shopDomain}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? "Could not create store (Partner API token required)");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Store builder</h1>
        <p className="text-sm text-ink-muted">Tell us your niche — Claude will design name, brand, copy, and pages.</p>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Niche / category"><input className="input" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="eco yoga gear" /></Field>
          <Field label="Target market"><input className="input" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="US, women 25-44" /></Field>
          <Field label="Existing store">
            <select className="input" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">— none —</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-3 flex justify-between gap-2">
          <button className="btn-secondary" onClick={partnerCreate}>+ Provision new Shopify store</button>
          <button className="btn-primary" onClick={generate} disabled={!niche || busy}><Sparkles className="size-4" /> {busy ? "Designing…" : "Generate blueprint"}</button>
        </div>
      </div>

      {blueprint && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="font-medium">Brand</h2>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {Object.entries(blueprint.brandPalette).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-navy-700 p-2 text-center">
                    <div className="aspect-square rounded-lg" style={{ background: v as string }} />
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-ink-muted">{k}</div>
                    <div className="text-xs">{v as string}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm">
                <div><span className="text-ink-muted">Heading font:</span> {blueprint.typography.headingFont}</div>
                <div><span className="text-ink-muted">Body font:</span> {blueprint.typography.bodyFont}</div>
                <div className="mt-2"><span className="text-ink-muted">Theme:</span> <span className="font-medium">{blueprint.themeRecommendation.name}</span> — {blueprint.themeRecommendation.reason}</div>
              </div>
              <h3 className="mt-5 font-medium">Suggested store names</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {blueprint.storeNames.map((n) => <li key={n} className="badge">{n}</li>)}
              </ul>
            </div>
            <div className="card p-5">
              <h2 className="font-medium">Homepage hero</h2>
              <h3 className="mt-3 text-2xl font-semibold leading-tight">{blueprint.homepage.heroHeadline}</h3>
              <p className="mt-2 text-ink-soft">{blueprint.homepage.heroSubheadline}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {blueprint.homepage.trustBadges.map((t) => <span key={t} className="badge">{t}</span>)}
              </div>
              <h3 className="mt-5 font-medium">Featured collections</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {blueprint.homepage.featuredCollections.map((c) => <li key={c} className="badge">{c}</li>)}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {(["aboutUs", "returnPolicy", "faq"] as const).map((k) => (
              <div key={k} className="card p-5">
                <h2 className="font-medium">{blueprint.pages[k].title}</h2>
                <div className="prose prose-invert mt-3 max-h-72 overflow-auto text-sm" dangerouslySetInnerHTML={{ __html: blueprint.pages[k].bodyHtml }} />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" onClick={apply} disabled={!storeId}><Wand2 className="size-4" /> Apply to Shopify</button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="stat-label">{label}</span><div className="mt-1">{children}</div></label>;
}
