import prisma from "../db/prisma";
import { AlertType } from "@prisma/client";

export async function computeAlerts(persist = true) {
  const stockGroups = await prisma.stockBalance.groupBy({
    by: ["itemId", "warehouseId"],
    _sum: { quantity: true }
  });

  const stockMap = new Map<string, number>();
  for (const group of stockGroups) {
    const key = `${group.itemId}:${group.warehouseId}`;
    stockMap.set(key, Number(group._sum.quantity || 0));
  }

  const configs = await prisma.itemWarehouseConfig.findMany({
    include: { item: true, warehouse: true }
  });

  const alerts = configs
    .map((config) => {
      const key = `${config.itemId}:${config.warehouseId}`;
      const quantity = stockMap.get(key) || 0;
      const minStock = Number(config.minStock);
      const reorderPoint = Number(config.reorderPoint);

      if (quantity <= minStock) {
        return {
          itemId: config.itemId,
          warehouseId: config.warehouseId,
          type: AlertType.BELOW_MIN,
          quantity,
          minStock,
          reorderPoint
        };
      }

      if (quantity <= reorderPoint) {
        return {
          itemId: config.itemId,
          warehouseId: config.warehouseId,
          type: AlertType.BELOW_REORDER,
          quantity,
          minStock,
          reorderPoint
        };
      }

      return null;
    })
    .filter((alert): alert is NonNullable<typeof alert> => Boolean(alert));

  if (persist) {
    await prisma.alert.deleteMany({});
    if (alerts.length) {
      await prisma.alert.createMany({
        data: alerts.map((alert) => ({
          itemId: alert.itemId,
          warehouseId: alert.warehouseId,
          type: alert.type,
          quantity: alert.quantity,
          minStock: alert.minStock,
          reorderPoint: alert.reorderPoint
        }))
      });
    }
  }

  return alerts;
}

export async function listAlerts() {
  return prisma.alert.findMany({
    include: { item: true, warehouse: true },
    orderBy: { createdAt: "desc" }
  });
}