"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";

interface Store { id: string; name: string; domain: string; niche: string | null }

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const [store, setStore] = useState<Store | null>(null);
  useEffect(() => { api.get(`/shopify/stores/${id}`).then((r) => setStore(r.data.store)); }, [id]);
  if (!store) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{store.name}</h1>
        <p className="text-sm text-ink-muted">{store.domain} • {store.niche ?? "no niche set"}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/products" className="card p-5 hover:ring-1 hover:ring-teal-400/40">Products</Link>
        <Link href="/orders" className="card p-5 hover:ring-1 hover:ring-teal-400/40">Orders</Link>
        <Link href="/store-builder" className="card p-5 hover:ring-1 hover:ring-teal-400/40">Store builder</Link>
      </div>
    </div>
  );
}
