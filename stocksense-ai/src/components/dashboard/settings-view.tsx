"use client";
import * as React from "react";
import Link from "next/link";
import { CreditCard, Mail, ShoppingBag, Store, Trash2, Upload, Check, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { cn, formatCurrency } from "@/lib/utils";

interface Props {
  currentPlan: PlanKey;
  userEmail: string;
  userName: string;
  storeName: string;
  storePlatform: string;
}

export function SettingsView({ currentPlan, userEmail, userName, storeName, storePlatform }: Props) {
  const { toast } = useToast();
  const [emailAlerts, setEmailAlerts] = React.useState(true);
  const [weeklyReport, setWeeklyReport] = React.useState(true);
  const [criticalOnly, setCriticalOnly] = React.useState(false);
  const [name, setName] = React.useState(userName);
  const [email, setEmail] = React.useState(userEmail);
  const [plan, setPlan] = React.useState<PlanKey>(currentPlan);

  const save = () => toast({ title: "Settings saved", variant: "success" });

  const openBillingPortal = async () => {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast({ title: "Billing portal unavailable", description: "Stripe isn't configured yet." });
    } catch {
      toast({ title: "Could not open portal", variant: "destructive" });
    }
  };

  const changePlan = async (next: PlanKey) => {
    if (next === plan) return;
    setPlan(next);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: next }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast({ title: `Switched to ${PLANS[next].name}`, variant: "success" });
    } catch {
      toast({ title: `Switched to ${PLANS[next].name} (demo)`, variant: "success" });
    }
  };

  const disconnectStore = () => {
    toast({ title: "Store disconnected", description: "Reconnect any time from onboarding.", variant: "destructive" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your StockSense profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button onClick={save}>Save profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected stores</CardTitle>
          <CardDescription>Manage your platform integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 p-4 rounded-lg border">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{storeName}</p>
              <p className="text-xs text-muted-foreground">
                {storePlatform} · Connected · Last sync 2 min ago
              </p>
            </div>
            <Badge variant="success" className="gap-1">
              <Check className="h-3 w-3" /> Active
            </Badge>
            <Button variant="ghost" size="sm" onClick={disconnectStore}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild variant="outline" className="gap-2 w-full">
            <Link href="/onboarding">
              <Store className="h-4 w-4" />
              Connect another store
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
          <CardDescription>How StockSense keeps you in the loop.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 divide-y">
          <PrefRow
            label="Email alerts for new dead stock"
            description="Get notified the moment a SKU crosses the dead-stock threshold."
            checked={emailAlerts}
            onChange={setEmailAlerts}
          />
          <PrefRow
            label="Weekly summary report"
            description="A 2-minute digest of the past 7 days every Monday."
            checked={weeklyReport}
            onChange={setWeeklyReport}
          />
          <PrefRow
            label="Critical-only mode"
            description="Only ping me when an action has high confidence and $500+ impact."
            checked={criticalOnly}
            onChange={setCriticalOnly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing & subscription</CardTitle>
          <CardDescription>Current plan and payment method.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="font-semibold text-xl mt-1">{PLANS[plan].name}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(PLANS[plan].priceUsd)} / month · Renews in 23 days
              </p>
            </div>
            <Button variant="outline" onClick={openBillingPortal} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Manage billing
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-3">Change plan</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {(Object.keys(PLANS) as PlanKey[]).map((k) => {
                const p = PLANS[k];
                const active = plan === k;
                return (
                  <button
                    key={k}
                    onClick={() => changePlan(k)}
                    className={cn(
                      "text-left p-4 rounded-lg border-2 transition-all hover:border-primary/50",
                      active ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{p.name}</p>
                      {active && <Badge variant="success" className="text-[10px]">Current</Badge>}
                    </div>
                    <p className="text-2xl font-bold mt-1">${p.priceUsd}<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
                    <p className="text-xs text-muted-foreground mt-2">{p.features[0]}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-500/40">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">Danger zone</CardTitle>
          <CardDescription>Irreversible actions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Export all data
          </Button>
          <Button variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PrefRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex items-start gap-3 flex-1">
        <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
