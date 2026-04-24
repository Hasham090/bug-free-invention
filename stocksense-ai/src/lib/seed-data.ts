import type { ActionType } from "./types";

interface SeedProduct {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
  category: string;
  unitsInStock: number;
  costPrice: number;
  sellingPrice: number;
  lastSaleDate: Date | null;
  daysSinceLastSale: number;
}

const IMG = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=600&q=70`;

const CATALOG: Omit<SeedProduct, "id" | "unitsInStock" | "lastSaleDate" | "daysSinceLastSale">[] = [
  // Electronics
  { name: "Wireless Noise-Cancelling Headphones", sku: "ELEC-001", imageUrl: IMG("photo-1505740420928-5e560c06d30e"), category: "Electronics", costPrice: 48, sellingPrice: 129 },
  { name: "4K Action Camera", sku: "ELEC-002", imageUrl: IMG("photo-1526178613552-2b45c6c302f0"), category: "Electronics", costPrice: 72, sellingPrice: 189 },
  { name: "Smart LED Desk Lamp", sku: "ELEC-003", imageUrl: IMG("photo-1513506003901-1e6a229e2d15"), category: "Electronics", costPrice: 14, sellingPrice: 39 },
  { name: "USB-C Fast Charger 65W", sku: "ELEC-004", imageUrl: IMG("photo-1583394838336-acd977736f90"), category: "Electronics", costPrice: 9, sellingPrice: 29 },
  { name: "Bluetooth Portable Speaker", sku: "ELEC-005", imageUrl: IMG("photo-1608043152269-423dbba4e7e1"), category: "Electronics", costPrice: 22, sellingPrice: 59 },
  { name: "Mechanical Keyboard RGB", sku: "ELEC-006", imageUrl: IMG("photo-1587829741301-dc798b83add3"), category: "Electronics", costPrice: 38, sellingPrice: 99 },
  { name: "Wireless Mouse Pro", sku: "ELEC-007", imageUrl: IMG("photo-1527864550417-7fd91fc51a46"), category: "Electronics", costPrice: 11, sellingPrice: 34 },
  { name: "Smart Fitness Tracker", sku: "ELEC-008", imageUrl: IMG("photo-1575311373937-040b8e1fd5b6"), category: "Electronics", costPrice: 28, sellingPrice: 79 },
  { name: "HDMI 2.1 Cable 6ft", sku: "ELEC-009", imageUrl: IMG("photo-1588702547923-7093a6c3ba33"), category: "Electronics", costPrice: 3, sellingPrice: 14 },
  { name: "Ring Light 10-inch", sku: "ELEC-010", imageUrl: IMG("photo-1519340241574-2cec6aef0c01"), category: "Electronics", costPrice: 12, sellingPrice: 32 },

  // Apparel
  { name: "Organic Cotton Crewneck Tee", sku: "APRL-001", imageUrl: IMG("photo-1521572163474-6864f9cf17ab"), category: "Apparel", costPrice: 8, sellingPrice: 28 },
  { name: "Slim-Fit Stretch Chinos", sku: "APRL-002", imageUrl: IMG("photo-1473966968600-fa801b869a1a"), category: "Apparel", costPrice: 18, sellingPrice: 58 },
  { name: "Classic Denim Jacket", sku: "APRL-003", imageUrl: IMG("photo-1551028719-00167b16eac5"), category: "Apparel", costPrice: 32, sellingPrice: 89 },
  { name: "Merino Wool Sweater", sku: "APRL-004", imageUrl: IMG("photo-1434389677669-e08b4cac3105"), category: "Apparel", costPrice: 38, sellingPrice: 109 },
  { name: "Athletic Joggers", sku: "APRL-005", imageUrl: IMG("photo-1552902865-b72c031ac5ea"), category: "Apparel", costPrice: 14, sellingPrice: 42 },
  { name: "Graphic Hoodie", sku: "APRL-006", imageUrl: IMG("photo-1556821840-3a63f95609a7"), category: "Apparel", costPrice: 16, sellingPrice: 48 },
  { name: "Summer Linen Shirt", sku: "APRL-007", imageUrl: IMG("photo-1564584217132-2271feaeb3c5"), category: "Apparel", costPrice: 19, sellingPrice: 54 },
  { name: "Waterproof Rain Shell", sku: "APRL-008", imageUrl: IMG("photo-1544966503-7cc5ac882d5f"), category: "Apparel", costPrice: 42, sellingPrice: 119 },
  { name: "Leather Belt Classic", sku: "APRL-009", imageUrl: IMG("photo-1624222247344-550fb60583dc"), category: "Apparel", costPrice: 9, sellingPrice: 29 },
  { name: "Wool Beanie", sku: "APRL-010", imageUrl: IMG("photo-1576871337622-98d48d1cf531"), category: "Apparel", costPrice: 5, sellingPrice: 19 },

  // Home Goods
  { name: "Ceramic Pour-Over Coffee Set", sku: "HOME-001", imageUrl: IMG("photo-1495474472287-4d71bcdd2085"), category: "Home Goods", costPrice: 18, sellingPrice: 54 },
  { name: "Bamboo Cutting Board Set", sku: "HOME-002", imageUrl: IMG("photo-1584990347449-a5d9f800a783"), category: "Home Goods", costPrice: 12, sellingPrice: 36 },
  { name: "Linen Throw Pillow Cover", sku: "HOME-003", imageUrl: IMG("photo-1540730930991-a9286a5f5020"), category: "Home Goods", costPrice: 6, sellingPrice: 22 },
  { name: "Minimalist Wall Clock", sku: "HOME-004", imageUrl: IMG("photo-1563861826100-9cb868fdbe1c"), category: "Home Goods", costPrice: 14, sellingPrice: 42 },
  { name: "Glass Storage Jar Set (6)", sku: "HOME-005", imageUrl: IMG("photo-1596040033229-a9821ebd058d"), category: "Home Goods", costPrice: 11, sellingPrice: 34 },
  { name: "Scented Soy Candle", sku: "HOME-006", imageUrl: IMG("photo-1602874801007-bd458bb1b8b6"), category: "Home Goods", costPrice: 5, sellingPrice: 19 },
  { name: "Cotton Waffle Throw Blanket", sku: "HOME-007", imageUrl: IMG("photo-1522444195799-478538b28823"), category: "Home Goods", costPrice: 22, sellingPrice: 69 },
  { name: "Cast Iron 10in Skillet", sku: "HOME-008", imageUrl: IMG("photo-1584269600464-37b1b58a9fe7"), category: "Home Goods", costPrice: 16, sellingPrice: 49 },
  { name: "Ceramic Planter (Medium)", sku: "HOME-009", imageUrl: IMG("photo-1485955900006-10f4d324d411"), category: "Home Goods", costPrice: 8, sellingPrice: 26 },
  { name: "Wool Area Rug 5x7", sku: "HOME-010", imageUrl: IMG("photo-1505691938895-1758d7feb511"), category: "Home Goods", costPrice: 78, sellingPrice: 229 },

  // Beauty
  { name: "Vitamin C Brightening Serum", sku: "BTY-001", imageUrl: IMG("photo-1556228720-195a672e8a03"), category: "Beauty", costPrice: 7, sellingPrice: 32 },
  { name: "Hydrating Hyaluronic Moisturizer", sku: "BTY-002", imageUrl: IMG("photo-1570194065650-d99fb4bedf0a"), category: "Beauty", costPrice: 8, sellingPrice: 34 },
  { name: "Matte Lipstick Rosewood", sku: "BTY-003", imageUrl: IMG("photo-1586495777744-4413f21062fa"), category: "Beauty", costPrice: 3, sellingPrice: 18 },
  { name: "Gentle Foaming Cleanser", sku: "BTY-004", imageUrl: IMG("photo-1608248543803-ba4f8c70ae0b"), category: "Beauty", costPrice: 5, sellingPrice: 22 },
  { name: "Argan Oil Hair Mask", sku: "BTY-005", imageUrl: IMG("photo-1526045478516-99145907023c"), category: "Beauty", costPrice: 6, sellingPrice: 26 },
  { name: "Mineral SPF 50 Sunscreen", sku: "BTY-006", imageUrl: IMG("photo-1556228852-80b6e5eeff06"), category: "Beauty", costPrice: 7, sellingPrice: 28 },
  { name: "Retinol Night Cream", sku: "BTY-007", imageUrl: IMG("photo-1571781926291-c477ebfd024b"), category: "Beauty", costPrice: 9, sellingPrice: 38 },
  { name: "Volumizing Mascara", sku: "BTY-008", imageUrl: IMG("photo-1631214524020-7e18db9a8f92"), category: "Beauty", costPrice: 4, sellingPrice: 22 },
  { name: "Rose Water Facial Toner", sku: "BTY-009", imageUrl: IMG("photo-1598440947619-2c35fc9aa908"), category: "Beauty", costPrice: 4, sellingPrice: 18 },
  { name: "Nude Eyeshadow Palette (12)", sku: "BTY-010", imageUrl: IMG("photo-1512496015851-a90fb38ba796"), category: "Beauty", costPrice: 11, sellingPrice: 42 },

  // Sports
  { name: "Non-Slip Yoga Mat 6mm", sku: "SPRT-001", imageUrl: IMG("photo-1601925260368-ae2f83cf8b7f"), category: "Sports", costPrice: 12, sellingPrice: 38 },
  { name: "Adjustable Dumbbell 25lb", sku: "SPRT-002", imageUrl: IMG("photo-1517836357463-d25dfeac3438"), category: "Sports", costPrice: 45, sellingPrice: 129 },
  { name: "Insulated Water Bottle 32oz", sku: "SPRT-003", imageUrl: IMG("photo-1602143407151-7111542de6e8"), category: "Sports", costPrice: 8, sellingPrice: 28 },
  { name: "Resistance Bands Set", sku: "SPRT-004", imageUrl: IMG("photo-1571019613454-1cb2f99b2d8b"), category: "Sports", costPrice: 6, sellingPrice: 22 },
  { name: "Foam Roller High-Density", sku: "SPRT-005", imageUrl: IMG("photo-1599058917212-d750089bc07e"), category: "Sports", costPrice: 9, sellingPrice: 29 },
  { name: "Running Belt Pouch", sku: "SPRT-006", imageUrl: IMG("photo-1595950653106-6c9ebd614d3a"), category: "Sports", costPrice: 4, sellingPrice: 18 },
  { name: "Jump Rope Pro", sku: "SPRT-007", imageUrl: IMG("photo-1434596922112-19c563067271"), category: "Sports", costPrice: 5, sellingPrice: 19 },
  { name: "Hiking Daypack 25L", sku: "SPRT-008", imageUrl: IMG("photo-1553062407-98eeb64c6a62"), category: "Sports", costPrice: 28, sellingPrice: 79 },
  { name: "Cycling Gloves Padded", sku: "SPRT-009", imageUrl: IMG("photo-1558981806-ec527fa84c39"), category: "Sports", costPrice: 7, sellingPrice: 24 },
  { name: "Compression Socks Pair", sku: "SPRT-010", imageUrl: IMG("photo-1606902965551-dce093cda6e7"), category: "Sports", costPrice: 4, sellingPrice: 16 },
];

// Deterministic pseudo-random so demo data is stable across renders
function rand(seed: number) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

export interface SeededProduct extends SeedProduct {
  recommendationType?: ActionType;
  recommendationConfidence?: number;
  recommendationExplanation?: string;
  recommendationOutcome?: string;
  recommendationImpact?: number;
}

export function seedProducts(): SeededProduct[] {
  const r = rand(42);
  const now = Date.now();

  return CATALOG.map((p, i): SeededProduct => {
    // Stratify: 40% dead, 30% slow, 30% healthy — forces visible data in all states
    let daysSinceLastSale: number;
    if (i % 10 < 4) daysSinceLastSale = 31 + Math.floor(r() * 90);
    else if (i % 10 < 7) daysSinceLastSale = 15 + Math.floor(r() * 15);
    else daysSinceLastSale = Math.floor(r() * 14);

    const unitsInStock = 8 + Math.floor(r() * 180);
    const lastSaleDate = new Date(now - daysSinceLastSale * 86400000);

    const seeded: SeededProduct = {
      ...p,
      id: `prod_${p.sku.toLowerCase()}`,
      unitsInStock,
      daysSinceLastSale,
      lastSaleDate,
    };

    const rec = recommendationFor(seeded);
    if (rec) Object.assign(seeded, rec);
    return seeded;
  });
}

function recommendationFor(p: SeededProduct): Partial<SeededProduct> | null {
  const inventoryValue = p.unitsInStock * p.costPrice;
  const margin = ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100;

  if (p.daysSinceLastSale >= 60) {
    const recovery = Math.round(p.unitsInStock * p.costPrice * 0.35);
    return {
      recommendationType: "LIQUIDATE",
      recommendationConfidence: 91,
      recommendationExplanation: `${p.name} hasn't sold in ${p.daysSinceLastSale} days and is tying up ${formatUsd(inventoryValue)} in capital. Liquidation recovers cash now instead of continuing to hold dead stock.`,
      recommendationOutcome: `Recover ~${formatUsd(recovery)} of working capital. Free warehouse space immediately.`,
      recommendationImpact: recovery,
    };
  }

  if (p.daysSinceLastSale >= 30) {
    const discounted = Math.round(p.sellingPrice * 0.7);
    const expected = Math.round(p.unitsInStock * 0.85 * discounted);
    return {
      recommendationType: "DISCOUNT",
      recommendationConfidence: 84,
      recommendationExplanation: `${p.name} is dead stock (${p.daysSinceLastSale} days since last sale). A 30% price drop to ${formatUsd(discounted)} is the fastest path to clearing inventory while margin is still positive.`,
      recommendationOutcome: `Estimated sell-through: 85% of ${p.unitsInStock} units in 14 days. Projected revenue: ${formatUsd(expected)}.`,
      recommendationImpact: expected,
    };
  }

  if (p.daysSinceLastSale >= 20) {
    const bundlePrice = Math.round(p.sellingPrice * 1.6);
    return {
      recommendationType: "BUNDLE",
      recommendationConfidence: 78,
      recommendationExplanation: `${p.name} has slowed but isn't dead. Bundle it with a complementary ${p.category} item to raise perceived value without cutting its headline price.`,
      recommendationOutcome: `Bundle price ${formatUsd(bundlePrice)}. Projected lift: +25% units moved in 30 days.`,
      recommendationImpact: Math.round(p.unitsInStock * 0.25 * bundlePrice),
    };
  }

  if (p.daysSinceLastSale >= 15) {
    return {
      recommendationType: "PROMOTE",
      recommendationConfidence: 72,
      recommendationExplanation: `${p.name} has a healthy ${margin.toFixed(0)}% margin but velocity has softened. A flash promo will restore momentum before it drifts to dead stock.`,
      recommendationOutcome: `Suggested 20% flash sale on Instagram. Projected +35% units moved in 7 days.`,
      recommendationImpact: Math.round(p.unitsInStock * 0.35 * p.sellingPrice * 0.8),
    };
  }

  if (p.unitsInStock > 120 && p.daysSinceLastSale < 10) {
    return {
      recommendationType: "REORDER_PAUSE",
      recommendationConfidence: 88,
      recommendationExplanation: `${p.name} is healthy but overstocked. At current velocity you have 90+ days of inventory — pausing reorders prevents tying up more cash.`,
      recommendationOutcome: `Avoid ~${formatUsd(Math.round(p.costPrice * 60))} in unnecessary reorder costs over the next cycle.`,
      recommendationImpact: Math.round(p.costPrice * 60),
    };
  }

  return null;
}

function formatUsd(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

export function seedSalesFor(productId: string, p: SeededProduct) {
  const sales: { productId: string; quantity: number; saleDate: Date; revenue: number }[] = [];
  const r = rand(p.sku.charCodeAt(0) * 13 + p.sku.length);
  // Generate up to 90 days of sales history based on how healthy the product is
  const density = p.daysSinceLastSale >= 30 ? 0.05 : p.daysSinceLastSale >= 15 ? 0.25 : 0.55;
  for (let d = p.daysSinceLastSale; d < 90; d++) {
    if (r() < density) {
      const qty = 1 + Math.floor(r() * 4);
      sales.push({
        productId,
        quantity: qty,
        saleDate: new Date(Date.now() - d * 86400000),
        revenue: qty * p.sellingPrice,
      });
    }
  }
  return sales;
}

export function seedRecommendationsFor(productId: string, p: SeededProduct) {
  if (!p.recommendationType) return [];
  return [
    {
      productId,
      actionType: p.recommendationType,
      explanation: p.recommendationExplanation!,
      expectedOutcome: p.recommendationOutcome!,
      confidenceScore: p.recommendationConfidence!,
      dollarImpact: p.recommendationImpact ?? 0,
      status: "PENDING" as const,
    },
  ];
}
