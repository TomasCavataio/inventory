import { Router } from "express";
import express from "express";
import { parse } from "csv-parse/sync";
import prisma from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { ItemStatus, Permission, RecordStatus, WarehouseType } from "@prisma/client";

const router = Router();

router.use(express.text({ type: ["text/csv", "text/plain"] }));

function getCsvText(body: unknown): string | null {
  if (typeof body === "string") {
    return body;
  }
  if (body && typeof body === "object" && "csv" in body && typeof (body as { csv?: string }).csv === "string") {
    return (body as { csv: string }).csv;
  }
  return null;
}

function parseCsv(body: unknown) {
  const csv = getCsvText(body);
  if (!csv) {
    return null;
  }

  return parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, string>[];
}

function normalizeRecordStatus(value?: string | null): RecordStatus {
  const normalized = value?.trim().toUpperCase();
  if (normalized === RecordStatus.INACTIVE) {
    return RecordStatus.INACTIVE;
  }
  return RecordStatus.ACTIVE;
}

function normalizeItemStatus(value?: string | null): ItemStatus {
  const normalized = value?.trim().toUpperCase();
  if (normalized === ItemStatus.INACTIVE) {
    return ItemStatus.INACTIVE;
  }
  return ItemStatus.ACTIVE;
}

function normalizeWarehouseType(value?: string | null): WarehouseType {
  const normalized = value?.trim().toUpperCase();
  if (normalized === WarehouseType.SATELLITE) {
    return WarehouseType.SATELLITE;
  }
  if (normalized === WarehouseType.OTHER) {
    return WarehouseType.OTHER;
  }
  return WarehouseType.CENTRAL;
}

router.post("/warehouses", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const records = parseCsv(req.body);
    if (!records) {
      return res.status(400).json({ message: "CSV payload required" });
    }
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const [index, record] of records.entries()) {
      const code = record.code?.trim();
      const name = record.name?.trim();
      if (!code || !name) {
        errors.push(`Row ${index + 1}: code and name are required`);
        continue;
      }

      const data = {
        code,
        name,
        type: normalizeWarehouseType(record.type),
        address: record.address?.trim() || null,
        contact: record.contact?.trim() || null,
        status: normalizeRecordStatus(record.status)
      };

      const existing = await prisma.warehouse.findUnique({ where: { code } });
      if (existing) {
        await prisma.warehouse.update({
          where: { id: existing.id },
          data
        });
        updated += 1;
      } else {
        await prisma.warehouse.create({ data });
        created += 1;
      }
    }

    return res.json({ created, updated, errors });
  } catch (error) {
    return next(error);
  }
});

router.post("/items", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const records = parseCsv(req.body);
    if (!records) {
      return res.status(400).json({ message: "CSV payload required" });
    }
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const [index, record] of records.entries()) {
      const code = record.code?.trim();
      const name = record.name?.trim();
      const unitCode = record.unitCode?.trim();
      if (!code || !name || !unitCode) {
        errors.push(`Row ${index + 1}: code, name, and unitCode are required`);
        continue;
      }

      const unitName = record.unitName?.trim() || unitCode;
      const unit = await prisma.unitOfMeasure.upsert({
        where: { code: unitCode },
        update: { name: unitName },
        create: { code: unitCode, name: unitName }
      });

      let categoryId: string | null = null;
      const categoryName = record.categoryName?.trim() || record.category?.trim();
      if (categoryName) {
        const existingCategory = await prisma.category.findFirst({
          where: { name: categoryName, parentId: null }
        });
        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const createdCategory = await prisma.category.create({
            data: { name: categoryName, status: RecordStatus.ACTIVE }
          });
          categoryId = createdCategory.id;
        }
      }

      let defaultWarehouseId: string | null = null;
      const defaultWarehouseCode = record.defaultWarehouseCode?.trim();
      if (defaultWarehouseCode) {
        const warehouse = await prisma.warehouse.findUnique({ where: { code: defaultWarehouseCode } });
        if (warehouse) {
          defaultWarehouseId = warehouse.id;
        }
      }

      const standardCost = Number(record.standardCost ?? 0);

      const data = {
        code,
        name,
        description: record.description?.trim() || null,
        notes: record.notes?.trim() || null,
        status: normalizeItemStatus(record.status),
        standardCost: Number.isNaN(standardCost) ? 0 : standardCost,
        unitId: unit.id,
        categoryId,
        defaultWarehouseId
      };

      const existing = await prisma.item.findUnique({ where: { code } });
      let itemId: string;
      if (existing) {
        await prisma.item.update({ where: { id: existing.id }, data });
        updated += 1;
        itemId = existing.id;
      } else {
        const createdItem = await prisma.item.create({ data });
        created += 1;
        itemId = createdItem.id;
      }

      const configWarehouseCode = record.warehouseCode?.trim();
      if (configWarehouseCode) {
        const warehouse = await prisma.warehouse.findUnique({ where: { code: configWarehouseCode } });
        if (warehouse) {
          const minStock = Number(record.minStock ?? 0);
          const reorderPoint = Number(record.reorderPoint ?? 0);
          await prisma.itemWarehouseConfig.upsert({
            where: { itemId_warehouseId: { itemId, warehouseId: warehouse.id } },
            update: {
              minStock: Number.isNaN(minStock) ? 0 : minStock,
              reorderPoint: Number.isNaN(reorderPoint) ? 0 : reorderPoint
            },
            create: {
              itemId,
              warehouseId: warehouse.id,
              minStock: Number.isNaN(minStock) ? 0 : minStock,
              reorderPoint: Number.isNaN(reorderPoint) ? 0 : reorderPoint
            }
          });
        }
      }
    }

    return res.json({ created, updated, errors });
  } catch (error) {
    return next(error);
  }
});

router.post("/stock", requireAuth, requirePermission(Permission.MANAGE_MASTER_DATA), async (req, res, next) => {
  try {
    const records = parseCsv(req.body);
    if (!records) {
      return res.status(400).json({ message: "CSV payload required" });
    }
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const [index, record] of records.entries()) {
      const itemCode = record.itemCode?.trim();
      const warehouseCode = record.warehouseCode?.trim();
      if (!itemCode || !warehouseCode) {
        errors.push(`Row ${index + 1}: itemCode and warehouseCode are required`);
        continue;
      }

      const item = await prisma.item.findUnique({ where: { code: itemCode } });
      if (!item) {
        errors.push(`Row ${index + 1}: item ${itemCode} not found`);
        continue;
      }

      const warehouse = await prisma.warehouse.findUnique({ where: { code: warehouseCode } });
      if (!warehouse) {
        errors.push(`Row ${index + 1}: warehouse ${warehouseCode} not found`);
        continue;
      }

      let locationId: string | null = null;
      const locationCode = record.locationCode?.trim();
      if (locationCode) {
        const existingLocation = await prisma.location.findUnique({
          where: {
            warehouseId_code: {
              warehouseId: warehouse.id,
              code: locationCode
            }
          }
        });
        if (existingLocation) {
          locationId = existingLocation.id;
        } else {
          const createdLocation = await prisma.location.create({
            data: {
              warehouseId: warehouse.id,
              code: locationCode,
              name: record.locationName?.trim() || locationCode,
              status: RecordStatus.ACTIVE
            }
          });
          locationId = createdLocation.id;
        }
      }

      const quantity = Number(record.quantity ?? 0);
      const normalizedQuantity = Number.isNaN(quantity) ? 0 : quantity;

      const existing = await prisma.stockBalance.findFirst({
        where: {
          itemId: item.id,
          warehouseId: warehouse.id,
          locationId
        }
      });

      if (existing) {
        await prisma.stockBalance.update({
          where: { id: existing.id },
          data: { quantity: normalizedQuantity }
        });
        updated += 1;
      } else {
        await prisma.stockBalance.create({
          data: {
            itemId: item.id,
            warehouseId: warehouse.id,
            locationId,
            quantity: normalizedQuantity
          }
        });
        created += 1;
      }
    }

    return res.json({ created, updated, errors });
  } catch (error) {
    return next(error);
  }
});

export default router;
