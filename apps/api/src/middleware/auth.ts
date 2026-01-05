import { NextFunction, Request, Response } from "express";
import prisma from "../db/prisma";
import { verifyToken } from "../auth/jwt";
import { Permission } from "@prisma/client";

export type UserContext = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: Permission[];
  warehouseIds: string[];
  isAdmin: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing authorization token" });
  }

  const token = header.substring("Bearer ".length);
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: { include: { role: { include: { permissions: true } } } },
        warehouses: true
      }
    });

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ message: "Invalid or inactive user" });
    }

    const roles = user.roles.map((entry) => entry.role.name);
    const permissions = user.roles.flatMap((entry) => entry.role.permissions.map((perm) => perm.permission));
    const warehouseIds = user.warehouses.map((entry) => entry.warehouseId);
    const isAdmin = roles.includes("ADMIN");

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      permissions: Array.from(new Set(permissions)),
      warehouseIds,
      isAdmin
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid authorization token" });
  }
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.isAdmin || req.user.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({ message: "Missing permission" });
  };
}

export function requireWarehouseAccess(warehouseId: string | null | undefined, req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return false;
  }

  if (!warehouseId) {
    return true;
  }

  if (req.user.isAdmin || req.user.warehouseIds.includes(warehouseId)) {
    return true;
  }

  res.status(403).json({ message: "No access to requested warehouse" });
  return false;
}