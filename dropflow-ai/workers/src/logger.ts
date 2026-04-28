type Level = "info" | "warn" | "error";
function fmt(level: Level, scope: string, msg: string, meta?: unknown) {
  const ts = new Date().toISOString();
  if (meta !== undefined) console.log(`[${ts}] [${level.toUpperCase()}] [${scope}]`, msg, meta);
  else console.log(`[${ts}] [${level.toUpperCase()}] [${scope}]`, msg);
}
export function logger(scope: string) {
  return {
    info: (m: string, meta?: unknown) => fmt("info", scope, m, meta),
    warn: (m: string, meta?: unknown) => fmt("warn", scope, m, meta),
    error: (m: string, meta?: unknown) => fmt("error", scope, m, meta),
  };
}
