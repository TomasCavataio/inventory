import { Router } from "express";
import authRoutes from "./auth";
import itemRoutes from "./items";
import warehouseRoutes from "./warehouses";
import categoryRoutes from "./categories";
import unitRoutes from "./units";
import userRoutes from "./users";
import roleRoutes from "./roles";
import movementRoutes from "./movements";
import stockRoutes from "./stock";
import alertRoutes from "./alerts";
import auditRoutes from "./audit";
import importRoutes from "./import";
import reportRoutes from "./reports";

const router = Router();

router.use("/auth", authRoutes);
router.use("/items", itemRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/categories", categoryRoutes);
router.use("/units", unitRoutes);
router.use("/users", userRoutes);
router.use("/roles", roleRoutes);
router.use("/movements", movementRoutes);
router.use("/stock", stockRoutes);
router.use("/alerts", alertRoutes);
router.use("/audit", auditRoutes);
router.use("/import", importRoutes);
router.use("/reports", reportRoutes);

export default router;
