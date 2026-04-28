import type { SupplierAdapter } from "./types.js";
import { aliexpressAdapter } from "./aliexpress.js";
import { cjAdapter } from "./cj.js";
import { zendropAdapter } from "./zendrop.js";
import { genericAdapter } from "./generic.js";

export const adapters: SupplierAdapter[] = [aliexpressAdapter, cjAdapter, zendropAdapter, genericAdapter];

export function adapterFor(kind: SupplierAdapter["kind"]): SupplierAdapter {
  const a = adapters.find((x) => x.kind === kind);
  if (!a) throw new Error(`No adapter for ${kind}`);
  return a;
}

export { aliexpressAdapter, cjAdapter, zendropAdapter, genericAdapter };
export * from "./types.js";
