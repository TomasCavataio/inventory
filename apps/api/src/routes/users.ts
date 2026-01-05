import { Router } from "express";
import { z } from "zod";
import prisma from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { Permission, UserStatus } from "@prisma/client";
import { hashPassword } from "../auth/passwords";
import { logAudit } from "../services/audit";
import { parseEnum } from "../utils/enums";

const router = Router();

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
  warehouseIds: z.array(z.string().uuid()).optional()
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  roles: { include: { role: true } },
  warehouses: { include: { warehouse: true } }
};

router.get("/", requireAuth, requirePermission(Permission.MANAGE_USERS), async (req, res, next) => {
  try {
    const { status } = req.query;
    const statusFilter = parseEnum(UserStatus, status);
    const users = await prisma.user.findMany({
      where: {
        status: statusFilter
      },
      select: userSelect,
      orderBy: { name: "asc" }
    });

    return res.json({ data: users });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requirePermission(Permission.MANAGE_USERS), async (req, res, next) => {
  try {
    const payload = userSchema.parse(req.body);
    if (!payload.password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const passwordHash = await hashPassword(payload.password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          passwordHash,
          status: payload.status ?? "ACTIVE"
        }
      });

      if (payload.roleIds?.length) {
        await tx.userRole.createMany({
          data: payload.roleIds.map((roleId) => ({ userId: created.id, roleId }))
        });
      }

      if (payload.warehouseIds?.length) {
        await tx.userWarehouse.createMany({
          data: payload.warehouseIds.map((warehouseId) => ({ userId: created.id, warehouseId }))
        });
      }

      return created;
    });

    const result = await prisma.user.findUnique({
      where: { id: user.id },
      select: userSelect
    });

    await logAudit({
      entityType: "User",
      entityId: user.id,
      action: "CREATE",
      dataAfter: result,
      userId: req.user?.id
    });

    return res.status(201).json({ data: result });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", requireAuth, requirePermission(Permission.MANAGE_USERS), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: userSelect
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ data: user });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", requireAuth, requirePermission(Permission.MANAGE_USERS), async (req, res, next) => {
  try {
    const payload = userSchema.partial().parse(req.body);
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        name: payload.name,
        email: payload.email,
        status: payload.status
      };

      if (payload.password) {
        updateData.passwordHash = await hashPassword(payload.password);
      }

      const user = await tx.user.update({
        where: { id: req.params.id },
        data: updateData
      });

      if (payload.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: user.id } });
        if (payload.roleIds.length) {
          await tx.userRole.createMany({
            data: payload.roleIds.map((roleId) => ({ userId: user.id, roleId }))
          });
        }
      }

      if (payload.warehouseIds) {
        await tx.userWarehouse.deleteMany({ where: { userId: user.id } });
        if (payload.warehouseIds.length) {
          await tx.userWarehouse.createMany({
            data: payload.warehouseIds.map((warehouseId) => ({ userId: user.id, warehouseId }))
          });
        }
      }

      return user;
    });

    const result = await prisma.user.findUnique({
      where: { id: updated.id },
      select: userSelect
    });

    await logAudit({
      entityType: "User",
      entityId: updated.id,
      action: "UPDATE",
      dataBefore: { id: existing.id, name: existing.name, email: existing.email, status: existing.status },
      dataAfter: result,
      userId: req.user?.id
    });

    return res.json({ data: result });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireAuth, requirePermission(Permission.MANAGE_USERS), async (req, res, next) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { status: "INACTIVE" }
    });

    const updated = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: userSelect
    });
    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    await logAudit({
      entityType: "User",
      entityId: updated.id,
      action: "DEACTIVATE",
      dataBefore: { id: existing.id, name: existing.name, email: existing.email, status: existing.status },
      dataAfter: updated,
      userId: req.user?.id
    });

    return res.json({ data: updated });
  } catch (error) {
    return next(error);
  }
});

export default router;
