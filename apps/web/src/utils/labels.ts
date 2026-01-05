const statusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  DRAFT: "Borrador",
  CONFIRMED: "Confirmado",
  CANCELED: "Cancelado"
};

const movementTypeLabels: Record<string, string> = {
  INGRESS: "Ingreso",
  EGRESS: "Egreso",
  TRANSFER: "Transferencia",
  ADJUSTMENT: "Ajuste"
};

const alertTypeLabels: Record<string, string> = {
  BELOW_MIN: "Por debajo del minimo",
  BELOW_REORDER: "Por debajo del punto de reorden"
};

const warehouseTypeLabels: Record<string, string> = {
  CENTRAL: "Central",
  SATELLITE: "Satelite",
  OTHER: "Otro"
};

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  SUPERVISOR: "Supervisor",
  AUDITOR: "Auditor",
  VIEWER: "Lector"
};

const auditEntityLabels: Record<string, string> = {
  Warehouse: "Almacen",
  Location: "Ubicacion",
  Item: "Articulo",
  Category: "Categoria",
  UnitOfMeasure: "Unidad de medida",
  Movement: "Movimiento",
  User: "Usuario",
  Role: "Rol",
  Alert: "Alerta",
  Config: "Configuracion"
};

const auditActionLabels: Record<string, string> = {
  CREATE: "Crear",
  UPDATE: "Actualizar",
  DELETE: "Eliminar",
  DEACTIVATE: "Desactivar",
  CONFIRM: "Confirmar",
  CANCEL: "Cancelar",
  APPROVE: "Aprobar"
};

export function labelStatus(value?: string | null) {
  if (!value) {
    return "-";
  }
  return statusLabels[value] ?? value;
}

export function labelMovementType(value?: string | null) {
  if (!value) {
    return "-";
  }
  return movementTypeLabels[value] ?? value;
}

export function labelAlertType(value?: string | null) {
  if (!value) {
    return "-";
  }
  return alertTypeLabels[value] ?? value;
}

export function labelWarehouseType(value?: string | null) {
  if (!value) {
    return "-";
  }
  return warehouseTypeLabels[value] ?? value;
}

export function labelRole(value?: string | null) {
  if (!value) {
    return "";
  }
  return roleLabels[value] ?? value;
}

export function labelAuditEntity(value?: string | null) {
  if (!value) {
    return "-";
  }
  return auditEntityLabels[value] ?? value;
}

export function labelAuditAction(value?: string | null) {
  if (!value) {
    return "-";
  }
  return auditActionLabels[value] ?? value;
}
