import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../middleware/auth.js";
import { badRequest, conflict, unauthorized } from "../lib/errors.js";

const r = Router();

r.post("/signup", async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().optional() }).parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw conflict("user already exists");
    const hash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({ data: { email: body.email, password: hash, name: body.name } });
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token: signToken(user.id) });
  } catch (e) {
    next(e);
  }
});

r.post("/login", async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw unauthorized("invalid credentials");
    const ok = await bcrypt.compare(body.password, user.password);
    if (!ok) throw unauthorized("invalid credentials");
    res.json({ user: { id: user.id, email: user.email, name: user.name }, token: signToken(user.id) });
  } catch (e) {
    next(e);
  }
});

r.get("/me", async (req, res, next) => {
  try {
    const auth = req.header("authorization");
    if (!auth) throw unauthorized();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default r;
