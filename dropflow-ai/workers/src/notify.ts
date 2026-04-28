import { io } from "socket.io-client";
import { prisma } from "./prisma.js";

const wsUrl = process.env.BACKEND_PUBLIC_URL ?? "http://localhost:4000";
let client: ReturnType<typeof io> | null = null;
function getClient() {
  if (!client) {
    client = io(wsUrl, { transports: ["websocket"], reconnection: true });
  }
  return client;
}

/**
 * Workers don't hold user JWTs, so we publish via a dedicated server room
 * the backend re-broadcasts. As a simpler MVP we persist a Notification row
 * which the frontend polls / receives via the user-room socket from the API.
 */
export async function notify(userId: string, level: "info" | "success" | "warn" | "error", title: string, body?: string, meta?: object) {
  await prisma.notification.create({ data: { userId, level, title, body, meta: meta as object } });
  try {
    getClient().emit("worker:notify", { userId, level, title, body });
  } catch {
    /* ignore */
  }
}

export async function progress(userId: string, jobId: string, step: string, pct: number) {
  try {
    getClient().emit("worker:progress", { userId, jobId, step, pct });
  } catch {
    /* ignore */
  }
}
