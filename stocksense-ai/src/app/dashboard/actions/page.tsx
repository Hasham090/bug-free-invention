import { getAllProducts, getAllRecommendations } from "@/lib/data";
import { ActionCenter } from "@/components/dashboard/action-center";

export default function ActionCenterPage() {
  const products = getAllProducts();
  const recommendations = getAllRecommendations();

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Action Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          One specific decision per product — approve, dismiss, or ask the AI to look again.
        </p>
      </div>
      <ActionCenter products={products} recommendations={recommendations} />
    </main>
  );
}
