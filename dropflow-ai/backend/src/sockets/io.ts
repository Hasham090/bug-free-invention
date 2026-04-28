import { Server as IOServer } from "socket.io";
import http from "node:http";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";

const log = logger("io");
let io: IOServer | null = null;

export function attachIO(server: http.Server): IOServer {
  io = new IOServer(server, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next();
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
      socket.data.userId = payload.sub;
      socket.join(`user:${payload.sub}`);
    } catch {
      /* anonymous */
    }
    next();
  });

  io.on("connection", (socket) => {
    log.debug(`socket connected ${socket.id} user=${socket.data.userId ?? "anon"}`);

    // Worker relay: workers emit `worker:notify` / `worker:progress` and the
    // server fans them out to the user's room as `toast` / `job:progress`.
    socket.on("worker:notify", (msg: { userId: string; level: "info" | "success" | "warn" | "error"; title: string; body?: string }) => {
      if (!msg?.userId) return;
      io?.to(`user:${msg.userId}`).emit("toast", { level: msg.level, title: msg.title, body: msg.body });
    });
    socket.on("worker:progress", (msg: { userId: string; jobId: string; step: string; pct: number }) => {
      if (!msg?.userId) return;
      io?.to(`user:${msg.userId}`).emit("job:progress", { jobId: msg.jobId, step: msg.step, pct: msg.pct });
    });
  });

  return io;
}

export function getIO(): IOServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitJobProgress(userId: string, jobId: string, step: string, pct: number) {
  emitToUser(userId, "job:progress", { jobId, step, pct });
}

export function emitToast(userId: string, level: "info" | "success" | "warn" | "error", title: string, body?: string) {
  emitToUser(userId, "toast", { level, title, body });
}
