import prisma from "../db/prisma";

type AuditEntry = {
  entityType: string;
  entityId: string;
  action: string;
  dataBefore?: unknown;
  dataAfter?: unknown;
  userId?: string | null;
};

export async function logAudit(entry: AuditEntry) {
  return prisma.auditLog.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      dataBefore: entry.dataBefore ?? undefined,
      dataAfter: entry.dataAfter ?? undefined,
      userId: entry.userId ?? undefined
    }
  });
}