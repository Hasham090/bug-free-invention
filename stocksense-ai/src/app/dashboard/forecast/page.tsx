import { ForecastView } from "@/components/dashboard/forecast-view";
import { getForecastForAllProducts, getVelocityTimeseries } from "@/lib/forecast";

export default function ForecastPage() {
  const forecasts = getForecastForAllProducts();
  const velocitySeries: Record<string, { date: string; units: number }[]> = {};
  forecasts.slice(0, 20).forEach((f) => {
    velocitySeries[f.productId] = getVelocityTimeseries(f.productId);
  });

  return (
    <main className="flex-1 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Forecast</h1>
        <p className="text-sm text-muted-foreground mt-1">
          30/60/90-day velocity, predicted stockouts, and dead-stock risk across your catalog.
        </p>
      </div>
      <ForecastView forecasts={forecasts} velocitySeries={velocitySeries} />
    </main>
  );
}
