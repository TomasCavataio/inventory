import { Router } from "express";
import { z } from "zod";
import prisma from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { Permission } from "@prisma/client";
import { logAudit } from "../services/audit";

const router = Router();

const itemSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid(),
  defaultWarehouseId: z.string().uuid().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  standardCost: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  configs: z
    .array(
      z.object({
        warehouseId: z.string().uuid(),
        minStock: z.number().nonnegative(),
        reorderPoint: z.number().nonnegative()
      })
    )
    .optional()
});

router.get("/", requireAuth, requirePermission(Permission.VIEW_MASTER_DATA), async (req, res, next) => {
  try {
    const { q, status, categoryId } = req.query;

    const items = await prisma.item.findMany({
      where: {
        status: typeof status === "string" ? status : undefined,
        categoryId: typeof categoryId === "string" ? categoryId : undefined,
        OR:
          typeof q === "string"
            ? [
                { code: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } }
              ]
            : undefined
      },
      include: {
        category: true,
        unit: true,
        defaultWarehouse: true,
        itemConfigs: { include: { warehouse: true } }
      },
      orderBy: { name: "asc" }
    });

    return res.json({ data: items });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const payload = itemSchema.parse(req.body);
    const item = await prisma.item.create({
      data: {
        code: payload.code,
        name: payload.name,
        description: payload.description ?? null,
        categoryId: payload.categoryId ?? null,
        unitId: payload.unitId,
        defaultWarehouseId: payload.defaultWarehouseId ?? null,
        status: payload.status ?? "ACTIVE",
        standardCost: payload.standardCost ?? 0,
        notes: payload.notes ?? null,
        itemConfigs: payload.configs
          ? {
              create: payload.configs.map((config) => ({
                warehouseId: config.warehouseId,
                minStock: config.minStock,
                reorderPoint: config.reorderPoint
              }))
            }
          : undefined
      }
    });

    await logAudit({
      entityType: "Item",
      entityId: item.id,
      action: "CREATE",
      dataAfter: item,
      userId: req.user?.id
    });

    return res.status(201).json({ data: item });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", requireAuth, requirePermission(Permission.VIEW_MASTER_DATA), async (req, res, next) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        unit: true,
        defaultWarehouse: true,
        itemConfigs: { include: { warehouse: true } }
      }
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    return res.json({ data: item });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const payload = itemSchema.partial().parse(req.body);
    const existing = await prisma.item.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Item not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.item.update({
        where: { id: req.params.id },
        data: {
          code: payload.code,
          name: payload.name,
          description: payload.description ?? undefined,
          categoryId: payload.categoryId ?? undefined,
          unitId: payload.unitId,
          defaultWarehouseId: payload.defaultWarehouseId ?? undefined,
          status: payload.status,
          standardCost: payload.standardCost,
          notes: payload.notes ?? undefined
        }
      });

      if (payload.configs) {
        for (const config of payload.configs) {
          await tx.itemWarehouseConfig.upsert({
            where: { itemId_warehouseId: { itemId: updated.id, warehouseId: config.warehouseId } },
            update: { minStock: config.minStock, reorderPoint: config.reorderPoint },
            create: {
              itemId: updated.id,
              warehouseId: config.warehouseId,
              minStock: config.minStock,
              reorderPoint: config.reorderPoint
            }
          });
        }
      }

      return updated;
    });

    await logAudit({
      entityType: "Item",
      entityId: result.id,
      action: "UPDATE",
      dataBefore: existing,
      dataAfter: result,
      userId: req.user?.id
    });

    return res.json({ data: result });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const existing = await prisma.item.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Item not found" });
    }

    const updated = await prisma.item.update({
      where: { id: req.params.id },
      data: { status: "INACTIVE" }
    });

    await logAudit({
      entityType: "Item",
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
