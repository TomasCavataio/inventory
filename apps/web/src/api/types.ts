export type ApiResponse<T> = {
  data: T;
};

export type UserBase = {
  id: string;
  name: string;
  email: string;
  status?: string;
};

export type AuthUser = UserBase & {
  roles: string[];
  permissions: string[];
  warehouseIds: string[];
};

export type UserRoleLink = {
  roleId: string;
  role: Role;
};

export type UserWarehouseLink = {
  warehouseId: string;
  warehouse: Warehouse;
};

export type UserRecord = UserBase & {
  roles: UserRoleLink[];
  warehouses: UserWarehouseLink[];
};

export type UserLite = UserBase;

export type Role = {
  id: string;
  name: string;
  description?: string | null;
};

export type Warehouse = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  address?: string | null;
  contact?: string | null;
  locations?: Location[];
};

export type Location = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type Category = {
  id: string;
  name: string;
  status: string;
};

export type Unit = {
  id: string;
  code: string;
  name: string;
};

export type Item = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: string;
  standardCost: number | string;
  unitId?: string;
  categoryId?: string | null;
  unit?: Unit;
  category?: Category | null;
};

export type MovementLine = {
  id?: string;
  itemId: string;
  quantity: number | string;
  unitCost?: number | string | null;
  totalCost?: number | string | null;
  item?: Item;
};

export type Movement = {
  id: string;
  type: string;
  status: string;
  reference?: string | null;
  reason?: string | null;
  createdAt: string;
  originWarehouse?: Warehouse | null;
  destinationWarehouse?: Warehouse | null;
  createdBy?: UserLite | null;
  approvedBy?: UserLite | null;
  lines: MovementLine[];
};

export type StockBalance = {
  id: string;
  quantity: number | string;
  item?: Item;
  warehouse?: Warehouse;
  location?: Location | null;
};

export type Alert = {
  id: string;
  type: string;
  quantity: number | string;
  minStock: number | string;
  reorderPoint: number | string;
  item?: Item;
  warehouse?: Warehouse;
};

export type AuditLog = {
  id: string;
  entityType: string;
  action: string;
  createdAt: string;
  user?: UserLite | null;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type ImportResult = {
  created: number;
  updated: number;
  errors: string[];
};
