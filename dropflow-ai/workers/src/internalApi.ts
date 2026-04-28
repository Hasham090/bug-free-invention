import axios from "axios";

const base = process.env.BACKEND_PUBLIC_URL ?? "http://backend:4000";
const secret = process.env.INTERNAL_API_SECRET ?? process.env.JWT_SECRET ?? "dev-jwt-secret";

export async function callInternal<T>(path: string, body?: unknown): Promise<T> {
  const res = await axios.post(`${base}/api/internal${path}`, body ?? {}, {
    headers: { "x-internal-secret": secret, "Content-Type": "application/json" },
    timeout: 120_000,
  });
  return res.data as T;
}
