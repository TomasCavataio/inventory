import prisma from "../db/prisma";
import { applyStockDeltas, computeStockDeltas } from "./stockEngine";
import { logAudit } from "./audit";

export async function createMovement(data: {
  type: "INGRESS" | "EGRESS" | "TRANSFER" | "ADJUSTMENT";
  adjustmentDirection?: "INCREASE" | "DECREASE" | null;
  originWarehouseId?: string | null;
  originLocationId?: string | null;
  destinationWarehouseId?: string | null;
  destinationLocationId?: string | null;
  reference?: string | null;
  reason?: string | null;
  createdById: string;
  lines: {
    itemId: string;
    quantity: number;
    unitCost?: number | null;
    totalCost?: number | null;
    notes?: string | null;
  }[];
}) {
  const movement = await prisma.movement.create({
    data: {
      type: data.type,
      adjustmentDirection: data.adjustmentDirection ?? null,
      originWarehouseId: data.originWarehouseId ?? null,
      originLocationId: data.originLocationId ?? null,
      destinationWarehouseId: data.destinationWarehouseId ?? null,
      destinationLocationId: data.destinationLocationId ?? null,
      reference: data.reference ?? null,
      reason: data.reason ?? null,
      createdById: data.createdById,
      lines: {
        create: data.lines.map((line) => ({
          itemId: line.itemId,
          quantity: line.quantity,
          unitCost: line.unitCost ?? null,
          totalCost: line.totalCost ?? null,
          notes: line.notes ?? null
        }))
      }
    },
    include: { lines: true }
  });

  await logAudit({
    entityType: "Movement",
    entityId: movement.id,
    action: "CREATE",
    dataAfter: movement,
    userId: data.createdById
  });

  return movement;
}

export async function confirmMovement(movementId: string, approvedById: string) {
  return prisma.$transaction(async (tx) => {
    const movement = await tx.movement.findUnique({
      where: { id: movementId },
      include: { lines: true }
    });

    if (!movement) {
      throw new Error("Movement not found");
    }

    if (movement.status !== "DRAFT") {
      throw new Error("Only draft movements can be confirmed");
    }

    const deltas = computeStockDeltas(
      {
        type: movement.type,
        adjustmentDirection: movement.adjustmentDirection,
        originWarehouseId: movement.originWarehouseId,
        originLocationId: movement.originLocationId,
        destinationWarehouseId: movement.destinationWarehouseId,
        destinationLocationId: movement.destinationLocationId
      },
      movement.lines.map((line) => ({ itemId: line.itemId, quantity: Number(line.quantity) }))
    );

    await applyStockDeltas(tx, deltas);

    const updated = await tx.movement.update({
      where: { id: movementId },
      data: {
        status: "CONFIRMED",
        approvedById,
        confirmedAt: new Date()
      },
      include: { lines: true }
    });

    await logAudit({
      entityType: "Movement",
      entityId: updated.id,
      action: "CONFIRM",
      dataAfter: updated,
      userId: approvedById
    });

    return updated;
  });
}

export async function cancelMovement(movementId: string, userId: string, reason?: string | null) {
  const movement = await prisma.movement.findUnique({
    where: { id: movementId }
  });

  if (!movement) {
    throw new Error("Movement not found");
  }

  if (movement.status === "CANCELED") {
    throw new Error("Movement already canceled");
  }

  if (movement.status === "CONFIRMED") {
    throw new Error("Confirmed movements cannot be canceled in MVP");
  }

  const updated = await prisma.movement.update({
    where: { id: movementId },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      reason: reason ?? movement.reason
    }
  });

  await logAudit({
    entityType: "Movement",
    entityId: updated.id,
    action: "CANCEL",
    dataAfter: updated,
    userId
  });

  return updated;
}