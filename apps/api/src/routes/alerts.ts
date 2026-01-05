import { Router } from "express";
import prisma from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { Permission, Prisma } from "@prisma/client";
import { computeAlerts } from "../services/alertService";

const router = Router();

router.get("/", requireAuth, requirePermission(Permission.VIEW_REPORTS), async (req, res, next) => {
  try {
    const where: Prisma.AlertWhereInput = {};
    if (!req.user?.isAdmin) {
      where.warehouseId = { in: req.user?.warehouseIds ?? [] };
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: { item: true, warehouse: true },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ data: alerts });
  } catch (error) {
    return next(error);
  }
});

router.post("/compute", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (_req, res, next) => {
  try {
    const alerts = await computeAlerts(true);
    return res.json({ data: alerts });
  } catch (error) {
    return next(error);
  }
});

export default router;
