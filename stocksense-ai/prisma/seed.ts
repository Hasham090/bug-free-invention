import { PrismaClient } from "@prisma/client";
import { seedProducts, seedRecommendationsFor, seedSalesFor } from "../src/lib/seed-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding StockSense AI database...");

  const user = await prisma.user.upsert({
    where: { email: "demo@stocksense.ai" },
    update: {},
    create: {
      clerkId: "user_demo_stocksense",
      email: "demo@stocksense.ai",
      name: "Demo Seller",
      plan: "GROWTH",
      preferences: {
        create: {
          targetMarginPct: 35,
          maxDaysInventory: 60,
          categories: ["Electronics", "Apparel", "Home Goods", "Beauty", "Sports"],
        },
      },
      subscription: {
        create: {
          plan: "GROWTH",
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  const store = await prisma.store.upsert({
    where: { id: "store_demo_shopify" },
    update: {},
    create: {
      id: "store_demo_shopify",
      userId: user.id,
      platform: "SHOPIFY",
      storeName: "Demo Commerce Co.",
      storeDomain: "demo-commerce.myshopify.com",
    },
  });

  await prisma.product.deleteMany({ where: { storeId: store.id } });

  const products = seedProducts();
  for (const p of products) {
    const created = await prisma.product.create({
      data: {
        storeId: store.id,
        name: p.name,
        sku: p.sku,
        imageUrl: p.imageUrl,
        category: p.category,
        unitsInStock: p.unitsInStock,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        lastSaleDate: p.lastSaleDate,
      },
    });

    const sales = seedSalesFor(created.id, p);
    if (sales.length) await prisma.saleRecord.createMany({ data: sales });

    const recs = seedRecommendationsFor(created.id, p);
    if (recs.length) await prisma.aIRecommendation.createMany({ data: recs });
  }

  console.log(`Seeded ${products.length} products with sales + AI recommendations`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
