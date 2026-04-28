type Level = "debug" | "info" | "warn" | "error";

function fmt(level: Level, scope: string, msg: string, meta?: unknown) {
  const ts = new Date().toISOString();
  const tag = `[${ts}] [${level.toUpperCase()}] [${scope}]`;
  if (meta !== undefined) console.log(tag, msg, meta);
  else console.log(tag, msg);
}

export function logger(scope: string) {
  return {
    debug: (m: string, meta?: unknown) => fmt("debug", scope, m, meta),
    info: (m: string, meta?: unknown) => fmt("info", scope, m, meta),
    warn: (m: string, meta?: unknown) => fmt("warn", scope, m, meta),
    error: (m: string, meta?: unknown) => fmt("error", scope, m, meta),
  };
}
