"use client";
import { useEffect } from "react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

export function ToastBridge() {
  useEffect(() => {
    const s = getSocket();
    const onToast = (m: { level: "info" | "success" | "warn" | "error"; title: string; body?: string }) => {
      const fn = m.level === "success" ? toast.success : m.level === "warn" ? toast.warning : m.level === "error" ? toast.error : toast.message;
      fn(m.title, { description: m.body });
    };
    const onProgress = (m: { jobId: string; step: string; pct: number }) => {
      toast.message(`${m.step} (${m.pct}%)`, { id: m.jobId });
    };
    s.on("toast", onToast);
    s.on("job:progress", onProgress);
    return () => {
      s.off("toast", onToast);
      s.off("job:progress", onProgress);
    };
  }, []);
  return null;
}
