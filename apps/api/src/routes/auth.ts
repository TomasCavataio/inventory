import { Router } from "express";
import { z } from "zod";
import prisma from "../db/prisma";
import { signToken } from "../auth/jwt";
import { verifyPassword } from "../auth/passwords";
import { requireAuth } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      include: {
        roles: { include: { role: { include: { permissions: true } } } },
        warehouses: true
      }
    });

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await verifyPassword(payload.password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ userId: user.id });
    const roles = user.roles.map((entry) => entry.role.name);
    const permissions = user.roles.flatMap((entry) => entry.role.permissions.map((perm) => perm.permission));

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles,
        permissions,
        warehouseIds: user.warehouses.map((entry) => entry.warehouseId)
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

export default router;
