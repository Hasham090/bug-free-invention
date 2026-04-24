"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Check, ShoppingBag, Store, Upload, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type Platform = "SHOPIFY" | "AMAZON" | "MANUAL";
const CATEGORIES = ["Electronics", "Apparel", "Home Goods", "Beauty", "Sports", "Kids", "Pets", "Grocery"];

const STEPS = ["Platform", "Connect", "Preferences", "Done"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = React.useState(0);
  const [platform, setPlatform] = React.useState<Platform | null>(null);
  const [storeDomain, setStoreDomain] = React.useState("");
  const [amazonSellerId, setAmazonSellerId] = React.useState("");
  const [amazonToken, setAmazonToken] = React.useState("");
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [targetMargin, setTargetMargin] = React.useState(35);
  const [maxDays, setMaxDays] = React.useState(60);
  const [categories, setCategories] = React.useState<string[]>(["Electronics", "Apparel"]);
  const [submitting, setSubmitting] = React.useState(false);

  const canNext = () => {
    if (step === 0) return platform !== null;
    if (step === 1) {
      if (platform === "SHOPIFY") return storeDomain.includes(".myshopify.com") || storeDomain.length > 3;
      if (platform === "AMAZON") return amazonSellerId.length > 3 && amazonToken.length > 3;
      if (platform === "MANUAL") return csvFile !== null;
    }
    if (step === 2) return categories.length > 0;
    return true;
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, storeDomain, targetMargin, maxDays, categories }),
      });
      toast({ title: "Store connected", description: "Pulling inventory now…", variant: "success" });
      setStep(3);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
            StockSense AI
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Skip for now</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold transition-colors",
                    i < step && "bg-primary border-primary text-primary-foreground",
                    i === step && "border-primary text-primary",
                    i > step && "border-border text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn("text-sm font-medium hidden sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                {i < STEPS.length - 1 && <div className={cn("flex-1 h-[2px] mx-2", i < step ? "bg-primary" : "bg-border")} />}
              </div>
            ))}
          </div>
        </div>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Where do you sell?</CardTitle>
              <CardDescription>Pick the platform where most of your inventory lives.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-3">
              {[
                { id: "SHOPIFY" as Platform, name: "Shopify", Icon: ShoppingBag, desc: "OAuth in 30 seconds" },
                { id: "AMAZON" as Platform, name: "Amazon", Icon: Store, desc: "SP-API credentials" },
                { id: "MANUAL" as Platform, name: "CSV Upload", Icon: Upload, desc: "Works with any store" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={cn(
                    "p-5 rounded-lg border-2 text-left transition-all hover:border-primary/50",
                    platform === p.id ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <p.Icon className="h-7 w-7 text-primary mb-3" />
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.desc}</div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 1 && platform === "SHOPIFY" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Connect Shopify</CardTitle>
              <CardDescription>Enter your store domain. We'll open Shopify OAuth to authorize read-only access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Shopify domain</Label>
                <Input id="domain" placeholder="demo-commerce.myshopify.com" value={storeDomain} onChange={(e) => setStoreDomain(e.target.value)} />
                <p className="text-xs text-muted-foreground">We only request <code>read_products</code>, <code>read_orders</code>, and <code>read_inventory</code> scopes.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && platform === "AMAZON" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Connect Amazon Seller Central</CardTitle>
              <CardDescription>Enter your SP-API credentials. Find them in Seller Central → Manage your apps.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seller">Seller ID</Label>
                <Input id="seller" placeholder="A1B2C3D4E5F6G7" value={amazonSellerId} onChange={(e) => setAmazonSellerId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token">Refresh token</Label>
                <Input id="token" type="password" placeholder="Atzr|…" value={amazonToken} onChange={(e) => setAmazonToken(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && platform === "MANUAL" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Upload inventory CSV</CardTitle>
              <CardDescription>Required columns: SKU, name, units_in_stock, cost_price, selling_price, last_sale_date</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="block border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">{csvFile ? csvFile.name : "Drop your CSV here or click to browse"}</p>
                <p className="text-xs text-muted-foreground mt-1">Max 10MB · UTF-8 encoded</p>
                <input type="file" accept=".csv" className="hidden" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
              </label>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Set your business preferences</CardTitle>
              <CardDescription>These tune how StockSense flags dead stock and scores recommendations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="margin">Target margin</Label>
                <div className="flex items-center gap-3">
                  <Input id="margin" type="number" min={0} max={90} value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} className="max-w-[120px]" />
                  <span className="text-muted-foreground text-sm">% — we'll never suggest discounts below this without flagging you</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="days">Max days of inventory</Label>
                <div className="flex items-center gap-3">
                  <Input id="days" type="number" min={7} max={365} value={maxDays} onChange={(e) => setMaxDays(Number(e.target.value))} className="max-w-[120px]" />
                  <span className="text-muted-foreground text-sm">days — SKUs exceeding this are flagged as dead</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Product categories you sell</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map((c) => (
                    <label key={c} className={cn("flex items-center gap-2 p-2 rounded border cursor-pointer hover:border-primary/50", categories.includes(c) && "border-primary bg-primary/5")}>
                      <Checkbox
                        checked={categories.includes(c)}
                        onCheckedChange={(v) => {
                          if (v) setCategories([...categories, c]);
                          else setCategories(categories.filter((x) => x !== c));
                        }}
                      />
                      <span className="text-sm">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold">You're all set</h2>
              <p className="text-muted-foreground mt-2">
                Pulling inventory and running the first AI analysis. Redirecting to your dashboard…
              </p>
            </CardContent>
          </Card>
        )}

        {step < 3 && (
          <div className="mt-6 flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step < 2 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={!canNext() || submitting}>
                {submitting ? "Finishing…" : "Finish setup"} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
