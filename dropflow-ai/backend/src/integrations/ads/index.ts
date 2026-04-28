import type { AdAdapter } from "./types.js";
import { facebookAdapter } from "./facebook.js";
import { googleAdapter } from "./google.js";
import { tiktokAdapter } from "./tiktok.js";

export const adAdapters: AdAdapter[] = [facebookAdapter, googleAdapter, tiktokAdapter];

export function adAdapterFor(platform: AdAdapter["platform"]): AdAdapter {
  const a = adAdapters.find((x) => x.platform === platform);
  if (!a) throw new Error(`No ad adapter for ${platform}`);
  return a;
}

export * from "./types.js";
export { facebookAdapter, googleAdapter, tiktokAdapter };
