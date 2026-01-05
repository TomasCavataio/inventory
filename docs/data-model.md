# Data model summary

## Core entities
- User, Role, RolePermission, UserRole, UserWarehouse
- Warehouse, Location
- Category, UnitOfMeasure, Item, ItemWarehouseConfig
- Movement, MovementLine
- StockBalance
- Alert
- AuditLog
- Config

## Relationships
- Items belong to a category and unit of measure.
- Warehouses can have locations; stock can be tracked by warehouse and optional location.
- Movements reference origin/destination warehouses and locations and include lines.
- ItemWarehouseConfig stores min stock and reorder points per item and warehouse.
- Alerts are generated from item warehouse configs and current stock.

## Stock logic
- StockBalance stores the current on-hand quantity per item and warehouse.
- Confirmed movements generate stock deltas and update balances transactionally.
- Negative stock is blocked unless explicitly enabled.

## Audit
- All master data changes and movement lifecycle events are recorded in AuditLog.
