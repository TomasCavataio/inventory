import { Router } from "express";
import { z } from "zod";
import prisma from "../db/prisma";
import { requireAuth, requirePermission, requireWarehouseAccess } from "../middleware/auth";
import { Permission, Prisma } from "@prisma/client";
import { cancelMovement, confirmMovement, createMovement } from "../services/movementService";
import { validateMovementInput } from "../services/stockEngine";

const router = Router();
const userSelect = { id: true, name: true, email: true };

const movementLineSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative().optional().nullable(),
  totalCost: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable()
});

const movementSchema = z.object({
  type: z.enum(["INGRESS", "EGRESS", "TRANSFER", "ADJUSTMENT"]),
  adjustmentDirection: z.enum(["INCREASE", "DECREASE"]).optional().nullable(),
  originWarehouseId: z.string().uuid().optional().nullable(),
  originLocationId: z.string().uuid().optional().nullable(),
  destinationWarehouseId: z.string().uuid().optional().nullable(),
  destinationLocationId: z.string().uuid().optional().nullable(),
  reference: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  lines: z.array(movementLineSchema).min(1)
});

function parseDate(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
}

router.get("/", requireAuth, requirePermission(Permission.VIEW_REPORTS), async (req, res, next) => {
  try {
    const { type, status, warehouseId, itemId, createdById, from, to } = req.query;
    const andFilters: Prisma.MovementWhereInput[] = [];

    if (typeof type === "string") {
      andFilters.push({ type });
    }
    if (typeof status === "string") {
      andFilters.push({ status });
    }
    if (typeof createdById === "string") {
      andFilters.push({ createdById });
    }

    const startDate = parseDate(from);
    const endDate = parseDate(to);
    if (startDate || endDate) {
      andFilters.push({
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      });
    }

    if (typeof itemId === "string") {
      andFilters.push({
        lines: {
          some: { itemId }
        }
      });
    }

    if (typeof warehouseId === "string") {
      if (!requireWarehouseAccess(warehouseId, req, res)) {
        return;
      }
      andFilters.push({
        OR: [{ originWarehouseId: warehouseId }, { destinationWarehouseId: warehouseId }]
      });
    }

    if (!req.user?.isAdmin) {
      const allowed = req.user?.warehouseIds ?? [];
      andFilters.push({
        OR: [{ originWarehouseId: { in: allowed } }, { destinationWarehouseId: { in: allowed } }]
      });
    }

    const movements = await prisma.movement.findMany({
      where: andFilters.length ? { AND: andFilters } : undefined,
      include: {
        lines: { include: { item: true } },
        originWarehouse: true,
        destinationWarehouse: true,
        createdBy: { select: userSelect },
        approvedBy: { select: userSelect }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ data: movements });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requirePermission(Permission.CREATE_MOVEMENTS), async (req, res, next) => {
  try {
    const payload = movementSchema.parse(req.body);

    if (payload.type === "ADJUSTMENT" && !payload.reason) {
      return res.status(400).json({ message: "Adjustment requires a reason" });
    }

    if (!requireWarehouseAccess(payload.originWarehouseId ?? null, req, res)) {
      return;
    }
    if (!requireWarehouseAccess(payload.destinationWarehouseId ?? null, req, res)) {
      return;
    }

    const lines = payload.lines.map((line) => {
      const totalCost =
        line.totalCost ?? (line.unitCost !== null && line.unitCost !== undefined ? line.unitCost * line.quantity : null);
      return { ...line, totalCost };
    });

    try {
      validateMovementInput(
        {
          type: payload.type,
          adjustmentDirection: payload.adjustmentDirection ?? null,
          originWarehouseId: payload.originWarehouseId ?? null,
          originLocationId: payload.originLocationId ?? null,
          destinationWarehouseId: payload.destinationWarehouseId ?? null,
          destinationLocationId: payload.destinationLocationId ?? null
        },
        lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity }))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid movement";
      return res.status(400).json({ message });
    }

    const movement = await createMovement({
      type: payload.type,
      adjustmentDirection: payload.adjustmentDirection ?? null,
      originWarehouseId: payload.originWarehouseId ?? null,
      originLocationId: payload.originLocationId ?? null,
      destinationWarehouseId: payload.destinationWarehouseId ?? null,
      destinationLocationId: payload.destinationLocationId ?? null,
      reference: payload.reference ?? null,
      reason: payload.reason ?? null,
      createdById: req.user!.id,
      lines
    });

    return res.status(201).json({ data: movement });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", requireAuth, requirePermission(Permission.VIEW_REPORTS), async (req, res, next) => {
  try {
    const movement = await prisma.movement.findUnique({
      where: { id: req.params.id },
      include: {
        lines: { include: { item: true } },
        originWarehouse: true,
        destinationWarehouse: true,
        createdBy: { select: userSelect },
        approvedBy: { select: userSelect }
      }
    });

    if (!movement) {
      return res.status(404).json({ message: "Movement not found" });
    }

    if (!requireWarehouseAccess(movement.originWarehouseId ?? null, req, res)) {
      return;
    }
    if (!requireWarehouseAccess(movement.destinationWarehouseId ?? null, req, res)) {
      return;
    }

    return res.json({ data: movement });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/confirm", requireAuth, requirePermission(Permission.APPROVE_MOVEMENTS), async (req, res, next) => {
  try {
    const existing = await prisma.movement.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Movement not found" });
    }

    if (!requireWarehouseAccess(existing.originWarehouseId ?? null, req, res)) {
      return;
    }
    if (!requireWarehouseAccess(existing.destinationWarehouseId ?? null, req, res)) {
      return;
    }

    const updated = await confirmMovement(req.params.id, req.user!.id);
    return res.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to confirm movement";
    if (message.toLowerCase().includes("not found")) {
      return res.status(404).json({ message });
    }
    return res.status(400).json({ message });
  }
});

router.post("/:id/cancel", requireAuth, requirePermission(Permission.CREATE_MOVEMENTS), async (req, res, next) => {
  try {
    const reason = typeof req.body?.reason === "string" ? req.body.reason : null;
    const existing = await prisma.movement.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Movement not found" });
    }

    if (!requireWarehouseAccess(existing.originWarehouseId ?? null, req, res)) {
      return;
    }
    if (!requireWarehouseAccess(existing.destinationWarehouseId ?? null, req, res)) {
      return;
    }

    const updated = await cancelMovement(req.params.id, req.user!.id, reason);
    return res.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cancel movement";
    if (message.toLowerCase().includes("not found")) {
      return res.status(404).json({ message });
    }
    return res.status(400).json({ message });
  }
});

export default router;
