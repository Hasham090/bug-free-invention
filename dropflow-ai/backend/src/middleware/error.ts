import { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/errors.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, detail: err.detail });
  }
  console.error("[unhandled]", err);
  const msg = err instanceof Error ? err.message : "internal error";
  res.status(500).json({ error: msg });
}
