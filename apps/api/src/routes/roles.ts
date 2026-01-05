import { Router } from "express";
import { z } from "zod";
import prisma from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { Permission } from "@prisma/client";
import { logAudit } from "../services/audit";

const router = Router();

const roleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  permissions: z.array(z.nativeEnum(Permission)).optional()
});

router.get("/", requireAuth, requirePermission(Permission.MANAGE_USERS), async (_req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: { permissions: true },
      orderBy: { name: "asc" }
    });

    return res.json({ data: roles });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requirePermission(Permission.MANAGE_USERS), async (req, res, next) => {
  try {
    const payload = roleSchema.parse(req.body);
    const role = await prisma.role.create({
      data: {
        name: payload.name,
        description: payload.description ?? null,
        permissions: payload.permissions
          ? {
              create: payload.permissions.map((permission) => ({ permission }))
            }
          : undefined
      },
      include: { permissions: true }
    });

    await logAudit({
      entityType: "Role",
      entityId: role.id,
      action: "CREATE",
      dataAfter: role,
      userId: req.user?.id
    });

    return res.status(201).json({ data: role });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", requireAuth, requirePermission(Permission.MANAGE_USERS), async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: { permissions: true }
    });

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    return res.json({ data: role });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", requireAuth, requirePermission(Permission.MANAGE_USERS), async (req, res, next) => {
  try {
    const payload = roleSchema.partial().parse(req.body);
    const existing = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: { permissions: true }
    });
    if (!existing) {
      return res.status(404).json({ message: "Role not found" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const role = await tx.role.update({
        where: { id: req.params.id },
        data: {
          name: payload.name,
          description: payload.description ?? undefined
        }
      });

      if (payload.permissions) {
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        if (payload.permissions.length) {
          await tx.rolePermission.createMany({
            data: payload.permissions.map((permission) => ({
              roleId: role.id,
              permission
            }))
          });
        }
      }

      return role;
    });

    const result = await prisma.role.findUnique({
      where: { id: updated.id },
      include: { permissions: true }
    });

    await logAudit({
      entityType: "Role",
      entityId: updated.id,
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

router.delete("/:id", requireAuth, requirePermission(Permission.MANAGE_USERS), async (req, res, next) => {
  try {
    const existing = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Role not found" });
    }

    await prisma.role.delete({ where: { id: req.params.id } });

    await logAudit({
      entityType: "Role",
      entityId: existing.id,
      action: "DELETE",
      dataBefore: existing,
      userId: req.user?.id
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
