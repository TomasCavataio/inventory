import { Router } from "express";
import prisma from "../db/prisma";
import { requireAuth, requirePermission, requireWarehouseAccess } from "../middleware/auth";
import { Permission, Prisma } from "@prisma/client";

const router = Router();
const userSelect = { id: true, name: true, email: true };

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

router.get("/stock", requireAuth, requirePermission(Permission.VIEW_REPORTS), async (req, res, next) => {
  try {
    const { itemId, warehouseId } = req.query;
    const where: Prisma.StockBalanceWhereInput = {};
    if (typeof itemId === "string") {
      where.itemId = itemId;
    }
    if (typeof warehouseId === "string") {
      if (!requireWarehouseAccess(warehouseId, req, res)) {
        return;
      }
      where.warehouseId = warehouseId;
    } else if (!req.user?.isAdmin) {
      where.warehouseId = { in: req.user?.warehouseIds ?? [] };
    }

    const grouped = await prisma.stockBalance.groupBy({
      by: ["itemId", "warehouseId"],
      where,
      _sum: { quantity: true }
    });

    const itemIds = Array.from(new Set(grouped.map((row) => row.itemId)));
    const warehouseIds = Array.from(new Set(grouped.map((row) => row.warehouseId)));

    const [items, warehouses] = await Promise.all([
      prisma.item.findMany({ where: { id: { in: itemIds } } }),
      prisma.warehouse.findMany({ where: { id: { in: warehouseIds } } })
    ]);

    const itemMap = new Map(items.map((item) => [item.id, item]));
    const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));

    const data = grouped.map((row) => ({
      item: itemMap.get(row.itemId),
      warehouse: warehouseMap.get(row.warehouseId),
      quantity: Number(row._sum.quantity || 0)
    }));

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

router.get("/movements", requireAuth, requirePermission(Permission.VIEW_REPORTS), async (req, res, next) => {
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

    if (typeof itemId === "string") {
      andFilters.push({ lines: { some: { itemId } } });
    }

    if (typeof warehouseId === "string") {
      if (!requireWarehouseAccess(warehouseId, req, res)) {
        return;
      }
      andFilters.push({
        OR: [{ originWarehouseId: warehouseId }, { destinationWarehouseId: warehouseId }]
      });
    }

    const startDate = parseDate(from);
    const endDate = parseDate(to);
    if (startDate || endDate) {
      andFilters.push({ createdAt: { gte: startDate, lte: endDate } });
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

router.get("/rotation", requireAuth, requirePermission(Permission.VIEW_REPORTS), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const startDate = parseDate(from);
    const endDate = parseDate(to);
    const allowedWarehouseIds = req.user?.isAdmin ? undefined : req.user?.warehouseIds ?? [];

    const consumption = await prisma.movementLine.groupBy({
      by: ["itemId"],
      where: {
        movement: {
          type: "EGRESS",
          status: "CONFIRMED",
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          ...(allowedWarehouseIds ? { originWarehouseId: { in: allowedWarehouseIds } } : {})
        }
      },
      _sum: { quantity: true }
    });

    const stockGroups = await prisma.stockBalance.groupBy({
      by: ["itemId"],
      ...(allowedWarehouseIds ? { where: { warehouseId: { in: allowedWarehouseIds } } } : {}),
      _sum: { quantity: true }
    });

    const itemIds = Array.from(new Set([...consumption.map((row) => row.itemId), ...stockGroups.map((row) => row.itemId)]));
    const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
    const itemMap = new Map(items.map((item) => [item.id, item]));

    const stockMap = new Map(
      stockGroups.map((row) => [row.itemId, Number(row._sum.quantity || 0)])
    );

    const data = consumption.map((row) => {
      const consumed = Number(row._sum.quantity || 0);
      const currentStock = stockMap.get(row.itemId) || 0;
      const turnoverRate = currentStock > 0 ? consumed / currentStock : consumed;
      return {
        item: itemMap.get(row.itemId),
        consumed,
        currentStock,
        turnoverRate
      };
    });

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

router.get("/valuation", requireAuth, requirePermission(Permission.VIEW_REPORTS), async (req, res, next) => {
  try {
    const { warehouseId } = req.query;
    const where: Prisma.StockBalanceWhereInput = {};
    if (typeof warehouseId === "string") {
      if (!requireWarehouseAccess(warehouseId, req, res)) {
        return;
      }
      where.warehouseId = warehouseId;
    } else if (!req.user?.isAdmin) {
      where.warehouseId = { in: req.user?.warehouseIds ?? [] };
    }

    const grouped = await prisma.stockBalance.groupBy({
      by: ["itemId"],
      where,
      _sum: { quantity: true }
    });

    const itemIds = Array.from(new Set(grouped.map((row) => row.itemId)));
    const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
    const itemMap = new Map(items.map((item) => [item.id, item]));

    const data = grouped.map((row) => {
      const item = itemMap.get(row.itemId);
      const quantity = Number(row._sum.quantity || 0);
      const unitCost = item ? Number(item.standardCost) : 0;
      return {
        item,
        quantity,
        unitCost,
        totalValue: quantity * unitCost
      };
    });

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

export default router;
