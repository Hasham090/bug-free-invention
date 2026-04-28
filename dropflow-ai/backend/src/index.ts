import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import http from "node:http";
import rateLimit from "express-rate-limit";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error.js";
import { attachIO } from "./sockets/io.js";

import auth from "./routes/auth.js";
import shopify from "./routes/shopify.js";
import storeBuilder from "./routes/storeBuilder.js";
import products from "./routes/products.js";
import orders from "./routes/orders.js";
import suppliers from "./routes/suppliers.js";
import ads from "./routes/ads.js";
import dashboard from "./routes/dashboard.js";
import internal from "./routes/internal.js";

const log = logger("server");
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Note: shopify webhook routes parse req.body as raw — they're mounted before the JSON body parser handles them.
app.use((req, res, next) => {
  if (req.path.startsWith("/api/shopify/webhooks/")) return next();
  express.json({ limit: "5mb" })(req, res, next);
});

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

const apiLimiter = rateLimit({ windowMs: 60_000, max: 240 });
app.use("/api", apiLimiter);

app.use("/api/auth", auth);
app.use("/api/shopify", shopify);
app.use("/api/store-builder", storeBuilder);
app.use("/api/products", products);
app.use("/api/orders", orders);
app.use("/api/suppliers", suppliers);
app.use("/api/ads", ads);
app.use("/api/dashboard", dashboard);
app.use("/api/internal", internal);

app.use(errorHandler);

const server = http.createServer(app);
attachIO(server);

server.listen(env.PORT, () => {
  log.info(`backend listening on :${env.PORT} (env=${env.NODE_ENV})`);
});

process.on("SIGTERM", () => {
  log.info("SIGTERM received — shutting down");
  server.close(() => process.exit(0));
});
