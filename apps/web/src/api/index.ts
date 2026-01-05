import { apiFetch, buildQuery } from "./client";
import type {
  ApiResponse,
  Alert,
  AuditLog,
  Category,
  Item,
  LoginResponse,
  Movement,
  Role,
  StockBalance,
  Unit,
  AuthUser,
  UserRecord,
  Warehouse,
  ImportResult
} from "./types";

export async function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function getMe(token: string) {
  return apiFetch<{ user: AuthUser }>("/auth/me", {}, token);
}

export async function listItems(token: string, query?: { q?: string; status?: string; categoryId?: string }) {
  const qs = buildQuery({ q: query?.q, status: query?.status, categoryId: query?.categoryId });
  return apiFetch<ApiResponse<Item[]>>(`/items${qs}`, {}, token);
}

export async function createItem(token: string, payload: Record<string, unknown>) {
  return apiFetch<ApiResponse<Item>>("/items", { method: "POST", body: JSON.stringify(payload) }, token);
}

export async function updateItem(token: string, itemId: string, payload: Record<string, unknown>) {
  return apiFetch<ApiResponse<Item>>(`/items/${itemId}`, { method: "PUT", body: JSON.stringify(payload) }, token);
}

export async function deactivateItem(token: string, itemId: string) {
  return apiFetch<ApiResponse<Item>>(`/items/${itemId}`, { method: "DELETE" }, token);
}

export async function listCategories(token: string) {
  return apiFetch<ApiResponse<Category[]>>("/categories", {}, token);
}

export async function listUnits(token: string) {
  return apiFetch<ApiResponse<Unit[]>>("/units", {}, token);
}

export async function listWarehouses(token: string) {
  return apiFetch<ApiResponse<Warehouse[]>>("/warehouses", {}, token);
}

export async function createWarehouse(token: string, payload: Record<string, unknown>) {
  return apiFetch<ApiResponse<Warehouse>>("/warehouses", { method: "POST", body: JSON.stringify(payload) }, token);
}

export async function updateWarehouse(token: string, warehouseId: string, payload: Record<string, unknown>) {
  return apiFetch<ApiResponse<Warehouse>>(
    `/warehouses/${warehouseId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    token
  );
}

export async function deactivateWarehouse(token: string, warehouseId: string) {
  return apiFetch<ApiResponse<Warehouse>>(`/warehouses/${warehouseId}`, { method: "DELETE" }, token);
}

export async function listMovements(
  token: string,
  query?: { type?: string; status?: string; warehouseId?: string; itemId?: string }
) {
  const qs = buildQuery(query || {});
  return apiFetch<ApiResponse<Movement[]>>(`/movements${qs}`, {}, token);
}

export async function createMovement(token: string, payload: Record<string, unknown>) {
  return apiFetch<ApiResponse<Movement>>("/movements", { method: "POST", body: JSON.stringify(payload) }, token);
}

export async function confirmMovement(token: string, movementId: string) {
  return apiFetch<ApiResponse<Movement>>(`/movements/${movementId}/confirm`, { method: "POST" }, token);
}

export async function cancelMovement(token: string, movementId: string, reason?: string) {
  return apiFetch<ApiResponse<Movement>>(
    `/movements/${movementId}/cancel`,
    { method: "POST", body: JSON.stringify({ reason }) },
    token
  );
}

export async function listStock(token: string, query?: { itemId?: string; warehouseId?: string }) {
  const qs = buildQuery(query || {});
  return apiFetch<ApiResponse<StockBalance[]>>(`/stock${qs}`, {}, token);
}

export async function listAlerts(token: string) {
  return apiFetch<ApiResponse<Alert[]>>("/alerts", {}, token);
}

export async function computeAlerts(token: string) {
  return apiFetch<ApiResponse<Alert[]>>("/alerts/compute", { method: "POST" }, token);
}

export async function listAuditLogs(token: string) {
  return apiFetch<ApiResponse<AuditLog[]>>("/audit", {}, token);
}

export async function listUsers(token: string) {
  return apiFetch<ApiResponse<UserRecord[]>>("/users", {}, token);
}

export async function createUser(token: string, payload: Record<string, unknown>) {
  return apiFetch<ApiResponse<UserRecord>>("/users", { method: "POST", body: JSON.stringify(payload) }, token);
}

export async function updateUser(token: string, userId: string, payload: Record<string, unknown>) {
  return apiFetch<ApiResponse<UserRecord>>(`/users/${userId}`, { method: "PUT", body: JSON.stringify(payload) }, token);
}

export async function deactivateUser(token: string, userId: string) {
  return apiFetch<ApiResponse<UserRecord>>(`/users/${userId}`, { method: "DELETE" }, token);
}

export async function listRoles(token: string) {
  return apiFetch<ApiResponse<Role[]>>("/roles", {}, token);
}

export async function stockReport(token: string, warehouseId?: string) {
  const qs = buildQuery({ warehouseId });
  return apiFetch<ApiResponse<{ item?: Item | null; warehouse?: Warehouse | null; quantity: number | string }[]>>(
    `/reports/stock${qs}`,
    {},
    token
  );
}

export async function valuationReport(token: string, warehouseId?: string) {
  const qs = buildQuery({ warehouseId });
  return apiFetch<
    ApiResponse<{ item?: Item | null; quantity: number | string; unitCost: number | string; totalValue: number | string }[]>
  >(`/reports/valuation${qs}`, {}, token);
}

export async function rotationReport(token: string, from?: string, to?: string) {
  const qs = buildQuery({ from, to });
  return apiFetch<ApiResponse<{ item?: Item | null; consumed: number | string; currentStock: number | string; turnoverRate: number | string }[]>>(
    `/reports/rotation${qs}`,
    {},
    token
  );
}

export async function importWarehouses(token: string, csv: string) {
  return apiFetch<ImportResult>(
    "/import/warehouses",
    {
      method: "POST",
      body: csv,
      headers: { "Content-Type": "text/csv" }
    },
    token
  );
}

export async function importItems(token: string, csv: string) {
  return apiFetch<ImportResult>(
    "/import/items",
    {
      method: "POST",
      body: csv,
      headers: { "Content-Type": "text/csv" }
    },
    token
  );
}

export async function importStock(token: string, csv: string) {
  return apiFetch<ImportResult>(
    "/import/stock",
    {
      method: "POST",
      body: csv,
      headers: { "Content-Type": "text/csv" }
    },
    token
  );
}
