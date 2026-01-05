import { Prisma } from "@prisma/client";
import config from "../config";

export type MovementInput = {
  type: "INGRESS" | "EGRESS" | "TRANSFER" | "ADJUSTMENT";
  adjustmentDirection?: "INCREASE" | "DECREASE" | null;
  originWarehouseId?: string | null;
  originLocationId?: string | null;
  destinationWarehouseId?: string | null;
  destinationLocationId?: string | null;
};

export type MovementLineInput = {
  itemId: string;
  quantity: number;
};

export type StockDelta = {
  itemId: string;
  warehouseId: string;
  locationId?: string | null;
  delta: number;
};

export function validateMovementInput(movement: MovementInput, lines: MovementLineInput[]) {
  if (!lines.length) {
    throw new Error("Movement must include at least one line");
  }

  for (const line of lines) {
    if (!line.itemId || line.quantity <= 0) {
      throw new Error("Movement lines require item and positive quantity");
    }
  }

  switch (movement.type) {
    case "INGRESS":
      if (!movement.destinationWarehouseId) {
        throw new Error("Ingress requires a destination warehouse");
      }
      break;
    case "EGRESS":
      if (!movement.originWarehouseId) {
        throw new Error("Egress requires an origin warehouse");
      }
      break;
    case "TRANSFER":
      if (!movement.originWarehouseId || !movement.destinationWarehouseId) {
        throw new Error("Transfer requires origin and destination warehouses");
      }
      if (movement.originWarehouseId === movement.destinationWarehouseId) {
        throw new Error("Transfer requires different origin and destination warehouses");
      }
      break;
    case "ADJUSTMENT":
      if (!movement.originWarehouseId) {
        throw new Error("Adjustment requires a warehouse");
      }
      if (!movement.adjustmentDirection) {
        throw new Error("Adjustment requires direction");
      }
      break;
    default:
      throw new Error("Unsupported movement type");
  }
}

export function computeStockDeltas(movement: MovementInput, lines: MovementLineInput[]): StockDelta[] {
  validateMovementInput(movement, lines);

  const deltas: StockDelta[] = [];
  for (const line of lines) {
    if (movement.type === "INGRESS") {
      deltas.push({
        itemId: line.itemId,
        warehouseId: movement.destinationWarehouseId!,
        locationId: movement.destinationLocationId ?? null,
        delta: line.quantity
      });
    }

    if (movement.type === "EGRESS") {
      deltas.push({
        itemId: line.itemId,
        warehouseId: movement.originWarehouseId!,
        locationId: movement.originLocationId ?? null,
        delta: -line.quantity
      });
    }

    if (movement.type === "TRANSFER") {
      deltas.push({
        itemId: line.itemId,
        warehouseId: movement.originWarehouseId!,
        locationId: movement.originLocationId ?? null,
        delta: -line.quantity
      });
      deltas.push({
        itemId: line.itemId,
        warehouseId: movement.destinationWarehouseId!,
        locationId: movement.destinationLocationId ?? null,
        delta: line.quantity
      });
    }

    if (movement.type === "ADJUSTMENT") {
      const sign = movement.adjustmentDirection === "INCREASE" ? 1 : -1;
      deltas.push({
        itemId: line.itemId,
        warehouseId: movement.originWarehouseId!,
        locationId: movement.originLocationId ?? null,
        delta: line.quantity * sign
      });
    }
  }

  return deltas;
}

export async function applyStockDeltas(tx: Prisma.TransactionClient, deltas: StockDelta[]) {
  const allowNegative = config.allowNegativeStock;

  for (const delta of deltas) {
    const existing = await tx.stockBalance.findUnique({
      where: {
        itemId_warehouseId_locationId: {
          itemId: delta.itemId,
          warehouseId: delta.warehouseId,
          locationId: delta.locationId ?? null
        }
      }
    });

    const currentQty = existing ? new Prisma.Decimal(existing.quantity) : new Prisma.Decimal(0);
    const nextQty = currentQty.plus(new Prisma.Decimal(delta.delta));

    if (!allowNegative && nextQty.isNegative()) {
      throw new Error("Movement would result in negative stock");
    }

    if (existing) {
      await tx.stockBalance.update({
        where: { id: existing.id },
        data: { quantity: nextQty }
      });
    } else {
      await tx.stockBalance.create({
        data: {
          itemId: delta.itemId,
          warehouseId: delta.warehouseId,
          locationId: delta.locationId ?? null,
          quantity: nextQty
        }
      });
    }
  }
}