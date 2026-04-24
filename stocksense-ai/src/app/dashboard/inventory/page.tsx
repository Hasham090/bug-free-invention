import { getAllProducts, getCategories } from "@/lib/data";
import { InventoryTable } from "@/components/dashboard/inventory-table";

export default function InventoryPage() {
  const products = getAllProducts();
  const categories = getCategories();

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every SKU across your store, with status, margin, and the next AI action for each.
        </p>
      </div>
      <InventoryTable rows={products} categories={categories} />
    </main>
  );
}
