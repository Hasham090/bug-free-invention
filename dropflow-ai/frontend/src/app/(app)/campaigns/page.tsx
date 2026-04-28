"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtCents } from "@/lib/cn";
import { toast } from "sonner";
import { Megaphone, PlayCircle, PauseCircle, Plus } from "lucide-react";

interface Account { id: string; platform: "FACEBOOK" | "GOOGLE" | "TIKTOK"; externalId: string }
interface Metric { date: string; spendCents: number; revenueCents: number; impressions: number; clicks: number; conversions: number }
interface Campaign {
  id: string; name: string; status: string; platform: "FACEBOOK" | "GOOGLE" | "TIKTOK";
  monthlyBudgetCents: number; dailyBudgetCents: number; productIds: string[]; metrics: Metric[];
}

export default function CampaignsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; title: string }[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ storeId: "", adAccountId: "", monthlyBudget: "500", productId: "" });

  async function refresh() {
    const [a, c] = await Promise.all([api.get("/ads/accounts"), api.get("/ads/campaigns")]);
    setAccounts(a.data.accounts);
    setCampaigns(c.data.campaigns);
  }

  useEffect(() => {
    refresh();
    api.get("/shopify/stores").then((r) => {
      setStores(r.data.stores);
      if (r.data.stores[0]) setDraft((d) => ({ ...d, storeId: r.data.stores[0].id }));
    });
    api.get("/products").then((r) => {
      setProducts(r.data.products);
      if (r.data.products[0]) setDraft((d) => ({ ...d, productId: r.data.products[0].id }));
    });
  }, []);

  async function connect(platform: "FACEBOOK" | "GOOGLE" | "TIKTOK") {
    try {
      const { data } = await api.get<{ url: string }>(`/ads/oauth/${platform.toLowerCase()}/start`);
      window.location.href = data.url;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? "Could not start OAuth");
    }
  }

  async function create() {
    if (!draft.adAccountId) return toast.error("Connect an ad account first");
    try {
      await api.post("/ads/campaigns", {
        storeId: draft.storeId,
        adAccountId: draft.adAccountId,
        productIds: [draft.productId],
        monthlyBudgetCents: Math.round(parseFloat(draft.monthlyBudget) * 100),
      });
      toast.success("Campaign created (paused) — review & launch in your ad platform.");
      setShowCreate(false);
      refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? "Create failed");
    }
  }

  async function pause(id: string) {
    try {
      await api.post(`/ads/campaigns/${id}/pause`);
      toast.success("Paused");
      refresh();
    } catch {
      toast.error("Pause failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ad campaigns</h1>
          <p className="text-sm text-ink-muted">Budget-controlled, AI-written, auto-paused on bad ROAS.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="size-4" /> New campaign</button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(["FACEBOOK", "GOOGLE", "TIKTOK"] as const).map((p) => {
          const a = accounts.find((x) => x.platform === p);
          return (
            <div key={p} className="card flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Megaphone className="size-5 text-teal-400" />
                <div>
                  <div className="font-medium">{p}</div>
                  <div className="text-xs text-ink-muted">{a ? `connected — ${a.externalId.slice(0, 12)}…` : "not connected"}</div>
                </div>
              </div>
              <button className={a ? "btn-secondary" : "btn-primary"} onClick={() => connect(p)}>{a ? "Reconnect" : "Connect"}</button>
            </div>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-navy-900/60 text-left text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">Daily / Monthly</th>
              <th className="px-4 py-3">Spend (mo)</th>
              <th className="px-4 py-3">Revenue (mo)</th>
              <th className="px-4 py-3">ROAS</th>
              <th className="px-4 py-3">Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700/60">
            {campaigns.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-muted">No campaigns yet.</td></tr>}
            {campaigns.map((c) => {
              const spend = c.metrics.reduce((s, m) => s + m.spendCents, 0);
              const rev = c.metrics.reduce((s, m) => s + m.revenueCents, 0);
              const roas = spend ? rev / spend : 0;
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.platform}</td>
                  <td className="px-4 py-3">{fmtCents(c.dailyBudgetCents)} / {fmtCents(c.monthlyBudgetCents)}</td>
                  <td className="px-4 py-3 tabular-nums">{fmtCents(spend)}</td>
                  <td className="px-4 py-3 tabular-nums">{fmtCents(rev)}</td>
                  <td className={`px-4 py-3 ${roas >= 2 ? "text-teal-300" : roas >= 1.5 ? "text-amber-300" : "text-rose-300"}`}>{roas.toFixed(2)}x</td>
                  <td className="px-4 py-3">{c.status}</td>
                  <td className="px-4 py-3 text-right">
                    {c.status === "ACTIVE" ? (
                      <button className="btn-secondary" onClick={() => pause(c.id)}><PauseCircle className="size-4" /> Pause</button>
                    ) : (
                      <span className="text-ink-muted"><PlayCircle className="size-4 inline" /> {c.status}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="font-medium">New campaign</h2>
            <div className="mt-4 space-y-3">
              <Field label="Store"><select className="input" value={draft.storeId} onChange={(e) => setDraft({ ...draft, storeId: e.target.value })}>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
              <Field label="Ad account"><select className="input" value={draft.adAccountId} onChange={(e) => setDraft({ ...draft, adAccountId: e.target.value })}><option value="">—</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.platform} • {a.externalId}</option>)}</select></Field>
              <Field label="Product"><select className="input" value={draft.productId} onChange={(e) => setDraft({ ...draft, productId: e.target.value })}>{products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
              <Field label="Monthly budget ($)"><input className="input" type="number" min={1} value={draft.monthlyBudget} onChange={(e) => setDraft({ ...draft, monthlyBudget: e.target.value })} /></Field>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary" onClick={create}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="stat-label">{label}</span><div className="mt-1">{children}</div></label>;
}
