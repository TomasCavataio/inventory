import { Router } from "express";
import prisma from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
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

router.get("/", requireAuth, requirePermission(Permission.VIEW_AUDIT), async (req, res, next) => {
  try {
    const { entityType, entityId, userId, from, to } = req.query;
    const where: Prisma.AuditLogWhereInput = {};

    if (typeof entityType === "string") {
      where.entityType = entityType;
    }
    if (typeof entityId === "string") {
      where.entityId = entityId;
    }
    if (typeof userId === "string") {
      where.userId = userId;
    }

    const startDate = parseDate(from);
    const endDate = parseDate(to);
    if (startDate || endDate) {
      where.createdAt = { gte: startDate, lte: endDate };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: userSelect } },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ data: logs });
  } catch (error) {
    return next(error);
  }
});

export default router;
