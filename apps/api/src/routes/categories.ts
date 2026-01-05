import { Router } from "express";
import { z } from "zod";
import prisma from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { Permission } from "@prisma/client";
import { logAudit } from "../services/audit";

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1),
  parentId: z.string().uuid().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional()
});

router.get("/", requireAuth, requirePermission(Permission.VIEW_MASTER_DATA), async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: { parent: true, children: true },
      orderBy: { name: "asc" }
    });

    return res.json({ data: categories });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const payload = categorySchema.parse(req.body);
    const category = await prisma.category.create({
      data: {
        name: payload.name,
        parentId: payload.parentId ?? null,
        status: payload.status ?? "ACTIVE"
      }
    });

    await logAudit({
      entityType: "Category",
      entityId: category.id,
      action: "CREATE",
      dataAfter: category,
      userId: req.user?.id
    });

    return res.status(201).json({ data: category });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const payload = categorySchema.partial().parse(req.body);
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Category not found" });
    }

    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        name: payload.name,
        parentId: payload.parentId ?? undefined,
        status: payload.status
      }
    });

    await logAudit({
      entityType: "Category",
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

router.delete("/:id", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Category not found" });
    }

    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: { status: "INACTIVE" }
    });

    await logAudit({
      entityType: "Category",
      entityId: updated.id,
      action: "DEACTIVATE",
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
