import { Router } from "express";
import prisma from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { Permission, Prisma } from "@prisma/client";

const router = Router();

router.get("/", requireAuth, requirePermission(Permission.VIEW_REPORTS), async (req, res, next) => {
  try {
    const { itemId, warehouseId, locationId } = req.query;
    const where: Prisma.StockBalanceWhereInput = {};

    if (typeof itemId === "string") {
      where.itemId = itemId;
    }
    if (typeof warehouseId === "string") {
      if (!req.user?.isAdmin && !req.user?.warehouseIds.includes(warehouseId)) {
        return res.status(403).json({ message: "No access to requested warehouse" });
      }
      where.warehouseId = warehouseId;
    } else if (!req.user?.isAdmin) {
      where.warehouseId = { in: req.user?.warehouseIds ?? [] };
    }
    if (typeof locationId === "string") {
      where.locationId = locationId;
    }

    const balances = await prisma.stockBalance.findMany({
      where,
      include: {
        item: true,
        warehouse: true,
        location: true
      },
      orderBy: [{ warehouseId: "asc" }, { itemId: "asc" }]
    });

    return res.json({ data: balances });
  } catch (error) {
    return next(error);
  }
});

export default router;
