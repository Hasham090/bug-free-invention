import { seedProducts, type SeededProduct } from "./seed-data";
import type {
  ActionStatus,
  ActionType,
  AIRecommendation,
  Product,
  ProductStatus,
  ProductWithIntel,
  SaleRecord,
} from "./types";
import { daysAgo, marginPct, statusFromDaysSinceSale } from "./utils";

const STORE_ID = "store_demo_shopify";

interface DemoState {
  products: Product[];
  sales: SaleRecord[];
  recommendations: AIRecommendation[];
}

function initState(): DemoState {
  const seeded = seedProducts();
  const products: Product[] = seeded.map((p) => ({
    id: p.id,
    storeId: STORE_ID,
    name: p.name,
    sku: p.sku,
    imageUrl: p.imageUrl,
    category: p.category,
    unitsInStock: p.unitsInStock,
    costPrice: p.costPrice,
    sellingPrice: p.sellingPrice,
    lastSaleDate: p.lastSaleDate,
    createdAt: new Date(),
  }));

  const sales: SaleRecord[] = [];
  const recommendations: AIRecommendation[] = [];

  seeded.forEach((p) => {
    sales.push(...generateSalesFor(p));
    const rec = generateRecommendationFor(p);
    if (rec) recommendations.push(rec);
  });

  return { products, sales, recommendations };
}

function generateSalesFor(p: SeededProduct): SaleRecord[] {
  const out: SaleRecord[] = [];
  const density = p.daysSinceLastSale >= 30 ? 0.05 : p.daysSinceLastSale >= 15 ? 0.25 : 0.55;
  let seed = p.sku.length * 17;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let d = p.daysSinceLastSale; d < 90; d++) {
    if (rand() < density) {
      const qty = 1 + Math.floor(rand() * 4);
      out.push({
        id: `sale_${p.id}_${d}`,
        productId: p.id,
        quantity: qty,
        saleDate: new Date(Date.now() - d * 86400000),
        revenue: qty * p.sellingPrice,
      });
    }
  }
  return out;
}

function generateRecommendationFor(p: SeededProduct): AIRecommendation | null {
  if (!p.recommendationType) return null;
  return {
    id: `rec_${p.id}`,
    productId: p.id,
    actionType: p.recommendationType,
    explanation: p.recommendationExplanation!,
    expectedOutcome: p.recommendationOutcome!,
    confidenceScore: p.recommendationConfidence!,
    dollarImpact: p.recommendationImpact ?? 0,
    status: "PENDING",
    createdAt: new Date(),
  };
}

// Persist across HMR in dev
const g = globalThis as unknown as { __stocksenseState?: DemoState };
if (!g.__stocksenseState) g.__stocksenseState = initState();
const state = g.__stocksenseState;

function enrich(p: Product, salesByProduct: Map<string, SaleRecord[]>, rec?: AIRecommendation): ProductWithIntel {
  const days = daysAgo(p.lastSaleDate ?? undefined);
  const velocity30d = (salesByProduct.get(p.id) ?? [])
    .filter((s) => daysAgo(s.saleDate) <= 30)
    .reduce((sum, s) => sum + s.quantity, 0);

  return {
    ...p,
    daysSinceLastSale: days === Infinity ? 999 : days,
    status: statusFromDaysSinceSale(days === Infinity ? 999 : days),
    marginPct: marginPct(p.sellingPrice, p.costPrice),
    inventoryValue: p.unitsInStock * p.costPrice,
    velocity30d,
    recommendation: rec,
  };
}

export function getAllProducts(): ProductWithIntel[] {
  const salesByProduct = new Map<string, SaleRecord[]>();
  state.sales.forEach((s) => {
    const arr = salesByProduct.get(s.productId) ?? [];
    arr.push(s);
    salesByProduct.set(s.productId, arr);
  });
  const recByProduct = new Map<string, AIRecommendation>();
  state.recommendations.forEach((r) => {
    if (r.status !== "DISMISSED") recByProduct.set(r.productId, r);
  });
  return state.products.map((p) => enrich(p, salesByProduct, recByProduct.get(p.id)));
}

export function getProduct(id: string): ProductWithIntel | null {
  const p = state.products.find((x) => x.id === id);
  if (!p) return null;
  return getAllProducts().find((x) => x.id === id) ?? null;
}

export function getAllRecommendations(): AIRecommendation[] {
  return state.recommendations;
}

export function getPendingRecommendations(): AIRecommendation[] {
  return state.recommendations.filter((r) => r.status === "PENDING");
}

export function updateRecommendationStatus(id: string, status: ActionStatus) {
  const rec = state.recommendations.find((r) => r.id === id);
  if (rec) {
    rec.status = status;
    return rec;
  }
  return null;
}

export function getSalesByProduct(productId: string): SaleRecord[] {
  return state.sales.filter((s) => s.productId === productId);
}

export function getSalesTimeseries(days = 30) {
  const series: { date: string; revenue: number; units: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const daySales = state.sales.filter(
      (s) => s.saleDate.toISOString().slice(0, 10) === key
    );
    series.push({
      date: key,
      revenue: daySales.reduce((sum, s) => sum + s.revenue, 0),
      units: daySales.reduce((sum, s) => sum + s.quantity, 0),
    });
  }
  return series;
}

export function getDashboardSummary() {
  const products = getAllProducts();
  const dead = products.filter((p) => p.status === "DEAD");
  const slow = products.filter((p) => p.status === "SLOW");
  const healthy = products.filter((p) => p.status === "HEALTHY");
  const pending = getPendingRecommendations();

  const totalInventoryValue = products.reduce((s, p) => s + p.inventoryValue, 0);
  const atRisk = dead.reduce((s, p) => s + p.inventoryValue, 0);
  const recoveryPotential = pending.reduce((s, r) => s + r.dollarImpact, 0);

  // Health score: weighted by units, penalize dead/slow
  const totalUnits = products.reduce((s, p) => s + p.unitsInStock, 0) || 1;
  const healthyUnits = healthy.reduce((s, p) => s + p.unitsInStock, 0);
  const slowUnits = slow.reduce((s, p) => s + p.unitsInStock, 0);
  const score = Math.round((healthyUnits / totalUnits) * 100 + (slowUnits / totalUnits) * 40);

  return {
    totalInventoryValue,
    atRisk,
    recoveryPotential,
    pendingActions: pending.length,
    deadCount: dead.length,
    slowCount: slow.length,
    healthyCount: healthy.length,
    healthScore: Math.min(100, Math.max(0, score)),
  };
}

export function getCategories(): string[] {
  return Array.from(new Set(state.products.map((p) => p.category))).sort();
}

export function filterProducts(opts: {
  status?: ProductStatus | "ALL";
  category?: string | "ALL";
  search?: string;
}): ProductWithIntel[] {
  let rows = getAllProducts();
  if (opts.status && opts.status !== "ALL") {
    rows = rows.filter((p) => p.status === opts.status);
  }
  if (opts.category && opts.category !== "ALL") {
    rows = rows.filter((p) => p.category === opts.category);
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    rows = rows.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }
  return rows;
}

export function actionTypeLabel(t: ActionType): string {
  return {
    DISCOUNT: "Drop Price",
    BUNDLE: "Create Bundle",
    LIQUIDATE: "Liquidate",
    REORDER_PAUSE: "Pause Reorders",
    PROMOTE: "Run Promo",
  }[t];
}

export const STORE_NAME = "Demo Commerce Co.";
export { STORE_ID };
