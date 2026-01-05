import { Permission } from "@prisma/client";

export const RolePresets: Record<string, Permission[]> = {
  ADMIN: [
    Permission.MANAGE_MASTER_DATA,
    Permission.VIEW_MASTER_DATA,
    Permission.CREATE_MOVEMENTS,
    Permission.APPROVE_MOVEMENTS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_AUDIT,
    Permission.MANAGE_USERS
  ],
  WAREHOUSE_OPERATOR: [
    Permission.VIEW_MASTER_DATA,
    Permission.CREATE_MOVEMENTS,
    Permission.VIEW_REPORTS
  ],
  SUPERVISOR: [
    Permission.VIEW_MASTER_DATA,
    Permission.CREATE_MOVEMENTS,
    Permission.APPROVE_MOVEMENTS,
    Permission.VIEW_REPORTS
  ],
  AUDITOR: [
    Permission.VIEW_MASTER_DATA,
    Permission.VIEW_REPORTS,
    Permission.VIEW_AUDIT
  ],
  VIEWER: [
    Permission.VIEW_MASTER_DATA,
    Permission.VIEW_REPORTS
  ]
};

export type PermissionList = Permission[];