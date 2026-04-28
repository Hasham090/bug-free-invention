import { badRequest } from "../../lib/errors.js";
import type { SupplierAdapter, SupplierProductDTO } from "./types.js";

/**
 * CSV adapter: products are loaded ahead of time from an uploaded CSV.
 * Search/get just operate on the in-memory list (caller hydrates it).
 */
export class CsvAdapter implements SupplierAdapter {
  kind = "CSV_IMPORT" as const;
  name = "CSV import";

  constructor(private products: SupplierProductDTO[]) {}

  static parse(csv: string): SupplierProductDTO[] {
    const [headerLine, ...rest] = csv.split(/\r?\n/).filter((l) => l.trim().length);
    const header = headerLine.split(",").map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);
    return rest.map((line) => {
      const cols = parseCsvLine(line);
      const cost = parseFloat(cols[idx("cost")] ?? "0");
      return {
        externalId: cols[idx("sku")] || cols[idx("id")] || cols[idx("title")] || "row",
        title: cols[idx("title")] ?? "Untitled",
        description: cols[idx("description")] ?? undefined,
        images: (cols[idx("images")] ?? "").split("|").filter(Boolean),
        costCents: Math.round(cost * 100),
        currency: cols[idx("currency")] || "USD",
        shippingDays: cols[idx("shipping_days")] ? parseInt(cols[idx("shipping_days")], 10) : undefined,
        moq: cols[idx("moq")] ? parseInt(cols[idx("moq")], 10) : 1,
        category: cols[idx("category")] ?? undefined,
      };
    });
  }

  isConfigured(): boolean {
    return this.products.length > 0;
  }

  async searchProducts({ query }: { query: string }): Promise<SupplierProductDTO[]> {
    const q = query.toLowerCase();
    return this.products.filter((p) => p.title.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
  }

  async getProduct(externalId: string): Promise<SupplierProductDTO> {
    const p = this.products.find((x) => x.externalId === externalId);
    if (!p) throw badRequest("CSV: product not found");
    return p;
  }

  async placeOrder() {
    throw badRequest("CSV supplier requires manual fulfillment");
  }

  async getTracking() {
    throw badRequest("CSV supplier has no tracking integration");
  }
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
