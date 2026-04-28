"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const { data } = await api.post(path, { email, password, name });
      localStorage.setItem("dropflow.token", data.token);
      toast.success(mode === "login" ? "Welcome back" : "Account created");
      router.replace("/dashboard");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? "auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gradient-to-br from-teal-300 to-teal-600 shadow-glow" />
          <div>
            <div className="text-lg font-semibold tracking-tight">DropFlow AI</div>
            <div className="text-xs text-ink-muted">Sign {mode === "login" ? "in" : "up"} to continue</div>
          </div>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Working…" : mode === "login" ? "Log in" : "Create account"}</button>
        </form>
        <button className="mt-4 w-full text-center text-xs text-ink-muted hover:text-ink" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
