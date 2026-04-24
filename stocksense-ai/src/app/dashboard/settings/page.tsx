import { SettingsView } from "@/components/dashboard/settings-view";
import { demoUser } from "@/lib/auth";
import { STORE_NAME } from "@/lib/data";

export default function SettingsPage() {
  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your stores, alerts, and subscription.
        </p>
      </div>
      <SettingsView
        currentPlan="GROWTH"
        userEmail={demoUser.email}
        userName={demoUser.name}
        storeName={STORE_NAME}
        storePlatform="Shopify"
      />
    </main>
  );
}
