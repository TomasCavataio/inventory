# Architecture overview

## Goals
- Centralize inventory data for all MSLO warehouses.
- Provide real-time stock visibility, movements, and audit trails.
- Support reporting, alerts, and future integrations.

## Components
- API (apps/api): REST API with authentication, authorization, and audit logging.
- Database: PostgreSQL schema with stock, movements, and master data.
- Web UI (apps/web): responsive web client for operators and supervisors.

## Key modules
- Master data: items, categories, units, warehouses, locations, users, roles.
- Inventory engine: movement validation and stock updates with integrity checks.
- Reporting: stock, movements, rotation, valuation.
- Alerts: min stock and reorder checks.
- Audit: log of master data changes and movement lifecycle.

## Integration points
- REST API is versioned under /api/v1 and designed to be integrated with ERP systems.
- CSV import endpoints support initial data load.

## Security
- JWT authentication.
- Role-based permissions with warehouse scope.
- Audit log for all critical actions.
