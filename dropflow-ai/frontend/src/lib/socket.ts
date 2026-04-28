"use client";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
export function getSocket(): Socket {
  if (socket) return socket;
  const url = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";
  const token = typeof window !== "undefined" ? localStorage.getItem("dropflow.token") : null;
  socket = io(url, { transports: ["websocket"], auth: token ? { token } : undefined });
  return socket;
}
