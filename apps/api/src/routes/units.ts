import { Router } from "express";
import { z } from "zod";
import prisma from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { Permission } from "@prisma/client";
import { logAudit } from "../services/audit";

const router = Router();

const unitSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1)
});

router.get("/", requireAuth, requirePermission(Permission.VIEW_MASTER_DATA), async (_req, res, next) => {
  try {
    const units = await prisma.unitOfMeasure.findMany({ orderBy: { name: "asc" } });
    return res.json({ data: units });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const payload = unitSchema.parse(req.body);
    const unit = await prisma.unitOfMeasure.create({ data: payload });

    await logAudit({
      entityType: "UnitOfMeasure",
      entityId: unit.id,
      action: "CREATE",
      dataAfter: unit,
      userId: req.user?.id
    });

    return res.status(201).json({ data: unit });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const payload = unitSchema.partial().parse(req.body);
    const existing = await prisma.unitOfMeasure.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Unit not found" });
    }

    const updated = await prisma.unitOfMeasure.update({
      where: { id: req.params.id },
      data: payload
    });

    await logAudit({
      entityType: "UnitOfMeasure",
      entityId: updated.id,
      action: "UPDATE",
      dataBefore: existing,
      dataAfter: updated,
      userId: req.user?.id
    });

    return res.json({ data: updated });
  } catch (error) {
    return next(error);
  }
});

export default router;
