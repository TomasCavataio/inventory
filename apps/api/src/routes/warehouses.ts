import { Router } from "express";
import { z } from "zod";
import prisma from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { Permission, RecordStatus } from "@prisma/client";
import { logAudit } from "../services/audit";
import { parseEnum } from "../utils/enums";

const router = Router();

const locationSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional()
});

const warehouseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["CENTRAL", "SATELLITE", "OTHER"]).optional(),
  address: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  locations: z.array(locationSchema).optional()
});

router.get("/", requireAuth, requirePermission(Permission.VIEW_MASTER_DATA), async (req, res, next) => {
  try {
    const { status } = req.query;
    const statusFilter = parseEnum(RecordStatus, status);
    const warehouses = await prisma.warehouse.findMany({
      where: {
        status: statusFilter
      },
      include: { locations: true },
      orderBy: { name: "asc" }
    });

    return res.json({ data: warehouses });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const payload = warehouseSchema.parse(req.body);
    const warehouse = await prisma.warehouse.create({
      data: {
        code: payload.code,
        name: payload.name,
        type: payload.type ?? "CENTRAL",
        address: payload.address ?? null,
        contact: payload.contact ?? null,
        status: payload.status ?? "ACTIVE",
        locations: payload.locations
          ? {
              create: payload.locations.map((location) => ({
                code: location.code,
                name: location.name,
                status: location.status ?? "ACTIVE"
              }))
            }
          : undefined
      },
      include: { locations: true }
    });

    await logAudit({
      entityType: "Warehouse",
      entityId: warehouse.id,
      action: "CREATE",
      dataAfter: warehouse,
      userId: req.user?.id
    });

    return res.status(201).json({ data: warehouse });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", requireAuth, requirePermission(Permission.VIEW_MASTER_DATA), async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: req.params.id },
      include: { locations: true }
    });

    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    return res.json({ data: warehouse });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const payload = warehouseSchema.partial().parse(req.body);
    const existing = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    const updated = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: {
        code: payload.code,
        name: payload.name,
        type: payload.type,
        address: payload.address ?? undefined,
        contact: payload.contact ?? undefined,
        status: payload.status
      },
      include: { locations: true }
    });

    await logAudit({
      entityType: "Warehouse",
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
    const existing = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    const updated = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: { status: "INACTIVE" }
    });

    await logAudit({
      entityType: "Warehouse",
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

router.get("/:id/locations", requireAuth, requirePermission(Permission.VIEW_MASTER_DATA), async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    const locations = await prisma.location.findMany({
      where: { warehouseId: req.params.id },
      orderBy: { code: "asc" }
    });

    return res.json({ data: locations });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/locations", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const payload = locationSchema.parse(req.body);
    const warehouse = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    const location = await prisma.location.create({
      data: {
        warehouseId: req.params.id,
        code: payload.code,
        name: payload.name,
        status: payload.status ?? "ACTIVE"
      }
    });

    await logAudit({
      entityType: "Location",
      entityId: location.id,
      action: "CREATE",
      dataAfter: location,
      userId: req.user?.id
    });

    return res.status(201).json({ data: location });
  } catch (error) {
    return next(error);
  }
});

router.put(
  "/:id/locations/:locationId",
  requireAuth,
  requirePermission(Permission.MANAGE_MASTER_DATA),
  async (req, res, next) => {
    try {
      const payload = locationSchema.partial().parse(req.body);
      const existing = await prisma.location.findUnique({ where: { id: req.params.locationId } });
      if (!existing || existing.warehouseId !== req.params.id) {
        return res.status(404).json({ message: "Location not found" });
      }

      const updated = await prisma.location.update({
        where: { id: req.params.locationId },
        data: {
          code: payload.code,
          name: payload.name,
          status: payload.status
        }
      });

      await logAudit({
        entityType: "Location",
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
  }
);

router.delete(
  "/:id/locations/:locationId",
  requireAuth,
  requirePermission(Permission.MANAGE_MASTER_DATA),
  async (req, res, next) => {
    try {
      const existing = await prisma.location.findUnique({ where: { id: req.params.locationId } });
      if (!existing || existing.warehouseId !== req.params.id) {
        return res.status(404).json({ message: "Location not found" });
      }

      const updated = await prisma.location.update({
        where: { id: req.params.locationId },
        data: { status: "INACTIVE" }
      });

      await logAudit({
        entityType: "Location",
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
  }
);

export default router;
