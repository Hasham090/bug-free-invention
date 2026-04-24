import { getAllProducts, getSalesByProduct } from "./data";
import { daysAgo } from "./utils";

export interface VelocityPoint {
  window: "30d" | "60d" | "90d";
  units: number;
  unitsPerDay: number;
}

export interface ProductForecast {
  productId: string;
  name: string;
  sku: string;
  imageUrl: string;
  category: string;
  unitsInStock: number;
  velocity30d: number;
  velocity60d: number;
  velocity90d: number;
  predictedStockoutDays: number | null;
  deadStockRisk: number; // 0-100
  seasonalityWarning: string | null;
}

const SEASONAL: Record<string, string> = {
  Apparel: "Demand typically drops 45% in January and July — plan promos before those dips.",
  Electronics: "Strong Q4 — expect +60% in November. Avoid heavy discounting until mid-December.",
  Beauty: "Holiday-driven. Expect +30% Nov–Dec, -20% in January.",
  "Home Goods": "Gradual seasonality — Q1 sees 20% dip, Q4 recovery begins mid-October.",
  Sports: "New Year resolution spike in Jan (+55%). Dips through summer.",
};

export function getForecastForAllProducts(): ProductForecast[] {
  const products = getAllProducts();
  return products.map((p): ProductForecast => {
    const sales = getSalesByProduct(p.id);
    const last30 = sales.filter((s) => daysAgo(s.saleDate) <= 30);
    const last60 = sales.filter((s) => daysAgo(s.saleDate) <= 60);
    const last90 = sales.filter((s) => daysAgo(s.saleDate) <= 90);
    const v30 = last30.reduce((s, x) => s + x.quantity, 0);
    const v60 = last60.reduce((s, x) => s + x.quantity, 0);
    const v90 = last90.reduce((s, x) => s + x.quantity, 0);

    const perDay = v30 / 30;
    const predictedStockoutDays = perDay > 0 ? Math.round(p.unitsInStock / perDay) : null;

    // Dead-stock risk: higher = more likely to go dead
    const daysIdleScore = Math.min(p.daysSinceLastSale / 45, 1) * 60;
    const stockHeaviness = Math.min((p.unitsInStock / 80) * (perDay < 0.3 ? 1 : 0.3), 1) * 40;
    const deadStockRisk = Math.round(Math.min(100, daysIdleScore + stockHeaviness));

    return {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      imageUrl: p.imageUrl,
      category: p.category,
      unitsInStock: p.unitsInStock,
      velocity30d: v30,
      velocity60d: v60,
      velocity90d: v90,
      predictedStockoutDays,
      deadStockRisk,
      seasonalityWarning: SEASONAL[p.category] ?? null,
    };
  });
}

export function getVelocityTimeseries(productId: string) {
  const sales = getSalesByProduct(productId);
  const series: { date: string; units: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayUnits = sales
      .filter((s) => s.saleDate.toISOString().slice(0, 10) === key)
      .reduce((sum, s) => sum + s.quantity, 0);
    series.push({ date: key, units: dayUnits });
  }
  return series;
}
