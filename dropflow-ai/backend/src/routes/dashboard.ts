import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { dashboardSnapshot, generateDailyTips } from "../services/dashboard.js";
import { prisma } from "../lib/prisma.js";

const r = Router();

r.get("/snapshot", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const data = await dashboardSnapshot(req.userId!);
    res.json(data);
  } catch (e) { next(e); }
});

r.get("/tips", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const tips = await generateDailyTips(req.userId!);
    res.json({ tips });
  } catch (e) { next(e); }
});

r.get("/notifications", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ notifications });
  } catch (e) { next(e); }
});

r.post("/notifications/:id/read", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
