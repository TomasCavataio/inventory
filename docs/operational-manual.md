# Operational manual (MVP)

## Roles
- Admin: manages users, roles, and master data.
- Warehouse operator: registers movements and checks stock.
- Supervisor: approves movements and reviews reports.
- Auditor: reviews audit logs and movements.
- Viewer: read-only access to master data and reports.

## Daily flows

### Ingress (Ingreso)
1. Open Movements -> New movement.
2. Select type Ingress and destination warehouse.
3. Add items and quantities.
4. Save as draft or confirm (if you have approval rights).

### Egress (Egreso)
1. Open Movements -> New movement.
2. Select type Egress and origin warehouse.
3. Add items and quantities.
4. Confirm to update stock.

### Transfer
1. Select type Transfer.
2. Choose origin and destination warehouses.
3. Add items and confirm.

### Adjustment
1. Select type Adjustment.
2. Choose direction Increase or Decrease.
3. Provide a reason and confirm.

## Reporting
- Stock report: current on-hand by item and warehouse.
- Movement history: filter by date, type, user, and status.
- Rotation and valuation: basic metrics for planning.

## Alerts
- Alerts are generated from min stock and reorder points.
- Use Alerts view to prioritize replenishment.

## Audits
- Use the Audit view to review critical changes and movement lifecycle events.
