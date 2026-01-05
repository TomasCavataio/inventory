import path from "path";
import dotenv from "dotenv";
import { Prisma, PrismaClient, Permission } from "@prisma/client";
import { hashPassword } from "../src/auth/passwords";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const toDecimal = (value: number, scale = 2) => new Prisma.Decimal(value.toFixed(scale));
const toDecimal3 = (value: number) => toDecimal(value, 3);

type WarehouseSeed = {
  code: string;
  name: string;
  type: "CENTRAL" | "SATELLITE" | "OTHER";
  address: string;
  contact: string;
  locations: { code: string; name: string }[];
};

type RoleSeed = {
  name: string;
  description: string;
  permissions: Permission[];
};

type UserSeed = {
  name: string;
  email: string;
  role: string;
  warehouseCodes: string[];
};

type ItemSeed = {
  code: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  standardCost: number;
  defaultWarehouse?: string;
  minStock: number;
  reorderPoint: number;
  notes?: string;
};

type MovementSeed = {
  code: string;
  type: "INGRESS" | "EGRESS" | "TRANSFER" | "ADJUSTMENT";
  status: "DRAFT" | "CONFIRMED" | "CANCELED";
  createdByEmail: string;
  approvedByEmail?: string;
  originWarehouseCode?: string;
  destinationWarehouseCode?: string;
  originLocationCode?: string;
  destinationLocationCode?: string;
  adjustmentDirection?: "INCREASE" | "DECREASE";
  reference?: string;
  reason?: string;
  createdAtDaysAgo: number;
  confirmedAtDaysAgo?: number;
  canceledAtDaysAgo?: number;
  lines: { itemCode: string; quantity: number; notes?: string }[];
};

const warehouseSeeds: WarehouseSeed[] = [
  {
    code: "WH-CEN",
    name: "Almacen Central",
    type: "CENTRAL",
    address: "Av. Libertad 123",
    contact: "central@mslo.local",
    locations: [
      { code: "A1", name: "Pasillo A1" },
      { code: "A2", name: "Pasillo A2" },
      { code: "B1", name: "Zona de granel B1" },
      { code: "OUT", name: "Zona de despacho" }
    ]
  },
  {
    code: "WH-NOR",
    name: "Deposito Norte",
    type: "SATELLITE",
    address: "Ruta 9 Km 12",
    contact: "north@mslo.local",
    locations: [
      { code: "A1", name: "Norte A1" },
      { code: "B1", name: "Norte B1" },
      { code: "C1", name: "Norte C1" }
    ]
  },
  {
    code: "WH-SUR",
    name: "Deposito Sur",
    type: "SATELLITE",
    address: "Av. San Martin 456",
    contact: "south@mslo.local",
    locations: [
      { code: "A1", name: "Sur A1" },
      { code: "B1", name: "Sur B1" },
      { code: "C1", name: "Sur C1" }
    ]
  }
];

const unitSeeds = [
  { code: "EA", name: "Unidad" },
  { code: "PK", name: "Paquete" },
  { code: "BOX", name: "Caja" },
  { code: "KG", name: "Kilogramo" },
  { code: "L", name: "Litro" },
  { code: "M", name: "Metro" }
];

const roleSeeds: RoleSeed[] = [
  {
    name: "OPERATOR",
    description: "Operador de almacen",
    permissions: [Permission.VIEW_MASTER_DATA, Permission.CREATE_MOVEMENTS, Permission.VIEW_REPORTS]
  },
  {
    name: "SUPERVISOR",
    description: "Aprobador de movimientos",
    permissions: [
      Permission.VIEW_MASTER_DATA,
      Permission.APPROVE_MOVEMENTS,
      Permission.VIEW_REPORTS,
      Permission.VIEW_AUDIT
    ]
  },
  {
    name: "AUDITOR",
    description: "Revisor de auditoria",
    permissions: [Permission.VIEW_MASTER_DATA, Permission.VIEW_REPORTS, Permission.VIEW_AUDIT]
  },
  {
    name: "VIEWER",
    description: "Acceso solo lectura",
    permissions: [Permission.VIEW_MASTER_DATA, Permission.VIEW_REPORTS]
  }
];

const userSeeds: UserSeed[] = [
  {
    name: "Lucia Perez",
    email: "lucia.perez@mslo.local",
    role: "OPERATOR",
    warehouseCodes: ["WH-CEN", "WH-NOR"]
  },
  {
    name: "Carlos Gomez",
    email: "carlos.gomez@mslo.local",
    role: "SUPERVISOR",
    warehouseCodes: ["WH-CEN"]
  },
  {
    name: "Sofia Ortiz",
    email: "sofia.ortiz@mslo.local",
    role: "AUDITOR",
    warehouseCodes: ["WH-CEN", "WH-SUR"]
  },
  {
    name: "Mateo Diaz",
    email: "mateo.diaz@mslo.local",
    role: "VIEWER",
    warehouseCodes: ["WH-SUR"]
  }
];

const itemSeeds: ItemSeed[] = [
  {
    code: "OFC-001",
    name: "Resma de papel A4",
    description: "500 hojas, 80 g/m2",
    category: "Papel",
    unit: "PK",
    standardCost: 4.5,
    defaultWarehouse: "WH-CEN",
    minStock: 40,
    reorderPoint: 70,
    notes: "Compra mensual"
  },
  {
    code: "OFC-002",
    name: "Boligrafos azules",
    description: "Caja de 50",
    category: "Escritura",
    unit: "BOX",
    standardCost: 8,
    defaultWarehouse: "WH-CEN",
    minStock: 30,
    reorderPoint: 50
  },
  {
    code: "OFC-003",
    name: "Grapas 26/6",
    description: "Grapas de oficina estandar",
    category: "Escritura",
    unit: "BOX",
    standardCost: 2.4,
    minStock: 25,
    reorderPoint: 40
  },
  {
    code: "OFC-004",
    name: "Toner de impresora 12A",
    description: "Cartucho de toner laser",
    category: "Tinta y toner",
    unit: "EA",
    standardCost: 85,
    minStock: 6,
    reorderPoint: 10
  },
  {
    code: "OFC-005",
    name: "Cuadernos A5",
    description: "Cuaderno de tapa dura",
    category: "Papel",
    unit: "EA",
    standardCost: 1.8,
    minStock: 50,
    reorderPoint: 80
  },
  {
    code: "MNT-001",
    name: "Clavos galvanizados 2in",
    description: "Clavos para construccion",
    category: "Ferreteria",
    unit: "KG",
    standardCost: 3.2,
    minStock: 80,
    reorderPoint: 120
  },
  {
    code: "MNT-002",
    name: "Tornillos para madera 2in",
    description: "Caja de 200",
    category: "Ferreteria",
    unit: "BOX",
    standardCost: 5.6,
    minStock: 70,
    reorderPoint: 100
  },
  {
    code: "MNT-003",
    name: "Broca para concreto 8mm",
    description: "Broca para mamposteria",
    category: "Herramientas",
    unit: "EA",
    standardCost: 7.5,
    minStock: 12,
    reorderPoint: 20
  },
  {
    code: "MNT-004",
    name: "Martillo 16oz",
    description: "Mango de fibra de vidrio",
    category: "Herramientas",
    unit: "EA",
    standardCost: 12,
    minStock: 8,
    reorderPoint: 14
  },
  {
    code: "MNT-005",
    name: "Pincel 2in",
    description: "Cerdas sinteticas",
    category: "Herramientas",
    unit: "EA",
    standardCost: 3.75,
    minStock: 20,
    reorderPoint: 35
  },
  {
    code: "SAF-001",
    name: "Guantes de seguridad",
    description: "Recubrimiento de nitrilo",
    category: "EPP",
    unit: "EA",
    standardCost: 2.1,
    minStock: 60,
    reorderPoint: 100
  },
  {
    code: "SAF-002",
    name: "Casco de seguridad",
    description: "Arnes ajustable",
    category: "EPP",
    unit: "EA",
    standardCost: 14.5,
    minStock: 20,
    reorderPoint: 35
  },
  {
    code: "SAF-003",
    name: "Chaleco reflectivo",
    description: "Alta visibilidad, naranja",
    category: "EPP",
    unit: "EA",
    standardCost: 6.8,
    minStock: 25,
    reorderPoint: 40
  },
  {
    code: "SAF-004",
    name: "Mascarillas descartables",
    description: "Caja de 50",
    category: "EPP",
    unit: "BOX",
    standardCost: 9,
    minStock: 40,
    reorderPoint: 70
  },
  {
    code: "ELE-001",
    name: "Lampara LED 12W",
    description: "Blanco calido",
    category: "Iluminacion",
    unit: "EA",
    standardCost: 2.8,
    minStock: 50,
    reorderPoint: 90
  },
  {
    code: "ELE-002",
    name: "Cable electrico 2.5mm",
    description: "Cobre, vendido por metro",
    category: "Cableado",
    unit: "M",
    standardCost: 1.2,
    minStock: 200,
    reorderPoint: 300
  },
  {
    code: "ELE-003",
    name: "Disyuntor 20A",
    description: "Monopolar",
    category: "Cableado",
    unit: "EA",
    standardCost: 9.5,
    minStock: 10,
    reorderPoint: 18
  },
  {
    code: "ELE-004",
    name: "Prolongador 10m",
    description: "Alta resistencia",
    category: "Cableado",
    unit: "EA",
    standardCost: 11,
    minStock: 15,
    reorderPoint: 25
  },
  {
    code: "PLU-001",
    name: "Tubo PVC 1in",
    description: "Serie 40",
    category: "Tuberias",
    unit: "M",
    standardCost: 2.2,
    minStock: 120,
    reorderPoint: 200
  },
  {
    code: "PLU-002",
    name: "Codo PVC 1in",
    description: "Codo 90 grados",
    category: "Accesorios",
    unit: "EA",
    standardCost: 0.9,
    minStock: 80,
    reorderPoint: 120
  },
  {
    code: "PLU-003",
    name: "Cinta teflon",
    description: "Rollo de cinta selladora",
    category: "Accesorios",
    unit: "EA",
    standardCost: 0.7,
    minStock: 40,
    reorderPoint: 60
  },
  {
    code: "PLU-004",
    name: "Valvula 1in",
    description: "Valvula de bronce",
    category: "Accesorios",
    unit: "EA",
    standardCost: 8.4,
    minStock: 15,
    reorderPoint: 25
  },
  {
    code: "CLN-001",
    name: "Limpiador de pisos",
    description: "Concentrado, 1L",
    category: "Quimicos",
    unit: "L",
    standardCost: 1.6,
    minStock: 100,
    reorderPoint: 150
  },
  {
    code: "CLN-002",
    name: "Lavandina",
    description: "Concentracion regular, 1L",
    category: "Quimicos",
    unit: "L",
    standardCost: 1.1,
    minStock: 120,
    reorderPoint: 180
  },
  {
    code: "CLN-003",
    name: "Jabon de manos",
    description: "Jabon neutro, 1L",
    category: "Higiene",
    unit: "L",
    standardCost: 1.3,
    minStock: 80,
    reorderPoint: 120
  },
  {
    code: "CLN-004",
    name: "Bolsas de residuos 60L",
    description: "Caja de 50",
    category: "Higiene",
    unit: "BOX",
    standardCost: 4.2,
    minStock: 30,
    reorderPoint: 50
  }
];

const movementSeeds: MovementSeed[] = [
  {
    code: "MOV-2025-0001",
    type: "INGRESS",
    status: "CONFIRMED",
    createdByEmail: "lucia.perez@mslo.local",
    approvedByEmail: "carlos.gomez@mslo.local",
    destinationWarehouseCode: "WH-CEN",
    destinationLocationCode: "A1",
    reference: "PO-2025-001",
    reason: "Reabastecimiento mensual",
    createdAtDaysAgo: 30,
    confirmedAtDaysAgo: 29,
    lines: [
      { itemCode: "OFC-001", quantity: 120 },
      { itemCode: "OFC-002", quantity: 60 },
      { itemCode: "ELE-001", quantity: 150 }
    ]
  },
  {
    code: "MOV-2025-0002",
    type: "INGRESS",
    status: "CONFIRMED",
    createdByEmail: "lucia.perez@mslo.local",
    approvedByEmail: "carlos.gomez@mslo.local",
    destinationWarehouseCode: "WH-NOR",
    destinationLocationCode: "A1",
    reference: "PO-2025-004",
    reason: "Stock de seguridad",
    createdAtDaysAgo: 26,
    confirmedAtDaysAgo: 25,
    lines: [
      { itemCode: "SAF-001", quantity: 80 },
      { itemCode: "SAF-003", quantity: 40 },
      { itemCode: "CLN-004", quantity: 20 }
    ]
  },
  {
    code: "MOV-2025-0003",
    type: "TRANSFER",
    status: "CONFIRMED",
    createdByEmail: "lucia.perez@mslo.local",
    approvedByEmail: "carlos.gomez@mslo.local",
    originWarehouseCode: "WH-CEN",
    destinationWarehouseCode: "WH-NOR",
    originLocationCode: "B1",
    destinationLocationCode: "B1",
    reference: "TR-2025-006",
    reason: "Soporte de mantenimiento norte",
    createdAtDaysAgo: 21,
    confirmedAtDaysAgo: 20,
    lines: [
      { itemCode: "MNT-001", quantity: 40 },
      { itemCode: "MNT-002", quantity: 35 }
    ]
  },
  {
    code: "MOV-2025-0004",
    type: "EGRESS",
    status: "CONFIRMED",
    createdByEmail: "lucia.perez@mslo.local",
    approvedByEmail: "carlos.gomez@mslo.local",
    originWarehouseCode: "WH-NOR",
    originLocationCode: "A1",
    reference: "EG-2025-011",
    reason: "Solicitud de obras publicas",
    createdAtDaysAgo: 18,
    confirmedAtDaysAgo: 18,
    lines: [
      { itemCode: "PLU-001", quantity: 60 },
      { itemCode: "PLU-002", quantity: 30 }
    ]
  },
  {
    code: "MOV-2025-0005",
    type: "ADJUSTMENT",
    status: "CONFIRMED",
    createdByEmail: "carlos.gomez@mslo.local",
    approvedByEmail: "carlos.gomez@mslo.local",
    originWarehouseCode: "WH-CEN",
    originLocationCode: "A2",
    adjustmentDirection: "DECREASE",
    reason: "Stock danado",
    createdAtDaysAgo: 15,
    confirmedAtDaysAgo: 15,
    lines: [{ itemCode: "OFC-004", quantity: 2 }]
  },
  {
    code: "MOV-2025-0006",
    type: "TRANSFER",
    status: "CONFIRMED",
    createdByEmail: "lucia.perez@mslo.local",
    approvedByEmail: "carlos.gomez@mslo.local",
    originWarehouseCode: "WH-NOR",
    destinationWarehouseCode: "WH-SUR",
    originLocationCode: "C1",
    destinationLocationCode: "A1",
    reference: "TR-2025-010",
    reason: "Soporte electrico",
    createdAtDaysAgo: 12,
    confirmedAtDaysAgo: 11,
    lines: [
      { itemCode: "ELE-002", quantity: 100 },
      { itemCode: "ELE-003", quantity: 15 }
    ]
  },
  {
    code: "MOV-2025-0007",
    type: "EGRESS",
    status: "CONFIRMED",
    createdByEmail: "lucia.perez@mslo.local",
    approvedByEmail: "carlos.gomez@mslo.local",
    originWarehouseCode: "WH-CEN",
    originLocationCode: "OUT",
    reference: "EG-2025-019",
    reason: "Insumos de limpieza",
    createdAtDaysAgo: 9,
    confirmedAtDaysAgo: 9,
    lines: [
      { itemCode: "CLN-001", quantity: 80 },
      { itemCode: "CLN-002", quantity: 60 },
      { itemCode: "CLN-003", quantity: 50 }
    ]
  },
  {
    code: "MOV-2025-0008",
    type: "INGRESS",
    status: "CONFIRMED",
    createdByEmail: "lucia.perez@mslo.local",
    approvedByEmail: "carlos.gomez@mslo.local",
    destinationWarehouseCode: "WH-SUR",
    destinationLocationCode: "B1",
    reference: "PO-2025-018",
    reason: "Reabastecimiento de seguridad",
    createdAtDaysAgo: 6,
    confirmedAtDaysAgo: 5,
    lines: [
      { itemCode: "SAF-002", quantity: 25 },
      { itemCode: "SAF-004", quantity: 30 }
    ]
  },
  {
    code: "MOV-2025-0009",
    type: "ADJUSTMENT",
    status: "CONFIRMED",
    createdByEmail: "carlos.gomez@mslo.local",
    approvedByEmail: "carlos.gomez@mslo.local",
    originWarehouseCode: "WH-SUR",
    originLocationCode: "C1",
    adjustmentDirection: "INCREASE",
    reason: "Conteo de inventario",
    createdAtDaysAgo: 4,
    confirmedAtDaysAgo: 4,
    lines: [{ itemCode: "MNT-005", quantity: 10 }]
  },
  {
    code: "MOV-2025-0010",
    type: "EGRESS",
    status: "DRAFT",
    createdByEmail: "lucia.perez@mslo.local",
    originWarehouseCode: "WH-SUR",
    originLocationCode: "A1",
    reference: "EG-2025-022",
    reason: "Reposicion de oficina",
    createdAtDaysAgo: 2,
    lines: [{ itemCode: "OFC-005", quantity: 40 }]
  },
  {
    code: "MOV-2025-0011",
    type: "EGRESS",
    status: "CANCELED",
    createdByEmail: "lucia.perez@mslo.local",
    originWarehouseCode: "WH-CEN",
    originLocationCode: "OUT",
    reference: "EG-2025-023",
    reason: "Solicitud cancelada",
    createdAtDaysAgo: 1,
    canceledAtDaysAgo: 1,
    lines: [{ itemCode: "ELE-004", quantity: 10 }]
  }
];

const warehouseScale: Record<string, number> = {
  "WH-CEN": 1,
  "WH-NOR": 0.7,
  "WH-SUR": 0.6
};

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function computeSeedQuantity(seedIndex: number, minStock: number, reorderPoint: number) {
  const bucket = seedIndex % 5;
  if (bucket === 0) {
    return Math.max(0, minStock - 2);
  }
  if (bucket === 1) {
    return Math.max(minStock + 1, reorderPoint - 2);
  }
  if (bucket === 2) {
    return reorderPoint + 5;
  }
  return reorderPoint + 15;
}

async function getOrCreateCategory(name: string, parentId: string | null) {
  const existing = await prisma.category.findFirst({
    where: { name, parentId }
  });
  if (existing) {
    return existing;
  }
  return prisma.category.create({
    data: {
      name,
      parentId,
      status: "ACTIVE"
    }
  });
}

async function ensureRole(seed: RoleSeed) {
  const role = await prisma.role.upsert({
    where: { name: seed.name },
    update: { description: seed.description },
    create: { name: seed.name, description: seed.description }
  });

  if (seed.permissions.length) {
    await prisma.rolePermission.createMany({
      data: seed.permissions.map((permission) => ({
        roleId: role.id,
        permission
      })),
      skipDuplicates: true
    });
  }

  return role;
}

async function cleanDatabase(adminEmail: string) {
  await prisma.movementLine.deleteMany();
  await prisma.movement.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.stockBalance.deleteMany();
  await prisma.itemWarehouseConfig.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany({ where: { parentId: { not: null } } });
  await prisma.category.deleteMany({ where: { parentId: null } });
  await prisma.unitOfMeasure.deleteMany();
  await prisma.location.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.userWarehouse.deleteMany();
  await prisma.role.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany({ where: { email: { not: adminEmail } } });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@mslo.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Admin";
  const userPassword = process.env.SEED_USER_PASSWORD ?? "welcome123";
  const shouldClean = (process.env.SEED_RESET ?? "true") === "true";

  if (shouldClean) {
    await cleanDatabase(adminEmail);
  }

  const adminPasswordHash = await hashPassword(adminPassword);
  const userPasswordHash = await hashPassword(userPassword);

  const allPermissions = Object.values(Permission) as Permission[];
  const roleMap = new Map<string, { id: string; name: string }>();

  const adminRole = await ensureRole({
    name: "ADMIN",
    description: "Administrador del sistema",
    permissions: allPermissions
  });
  roleMap.set(adminRole.name, adminRole);

  for (const seed of roleSeeds) {
    const role = await ensureRole(seed);
    roleMap.set(role.name, role);
  }

  const warehouseMap = new Map<string, { id: string; code: string; name: string }>();
  const locationMap = new Map<string, Map<string, { id: string; code: string }>>();
  const primaryLocationMap = new Map<string, { id: string; code: string }>();

  for (const seed of warehouseSeeds) {
    const warehouse = await prisma.warehouse.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        type: seed.type,
        address: seed.address,
        contact: seed.contact,
        status: "ACTIVE"
      },
      create: {
        code: seed.code,
        name: seed.name,
        type: seed.type,
        address: seed.address,
        contact: seed.contact,
        status: "ACTIVE"
      }
    });

    warehouseMap.set(warehouse.code, warehouse);

    const locationsForWarehouse = new Map<string, { id: string; code: string }>();
    for (const locationSeed of seed.locations) {
      const location = await prisma.location.upsert({
        where: { warehouseId_code: { warehouseId: warehouse.id, code: locationSeed.code } },
        update: { name: locationSeed.name, status: "ACTIVE" },
        create: {
          warehouseId: warehouse.id,
          code: locationSeed.code,
          name: locationSeed.name,
          status: "ACTIVE"
        }
      });

      if (!primaryLocationMap.has(warehouse.code)) {
        primaryLocationMap.set(warehouse.code, location);
      }

      locationsForWarehouse.set(location.code, location);
    }

    locationMap.set(warehouse.code, locationsForWarehouse);
  }

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash: adminPasswordHash,
      status: "ACTIVE"
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: adminPasswordHash,
      status: "ACTIVE"
    }
  });

  await prisma.userRole.createMany({
    data: [{ userId: adminUser.id, roleId: adminRole.id }],
    skipDuplicates: true
  });

  const userMap = new Map<string, { id: string; email: string }>();
  userMap.set(adminUser.email, adminUser);

  for (const seed of userSeeds) {
    const role = roleMap.get(seed.role);
    if (!role) {
      continue;
    }

    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: { name: seed.name, status: "ACTIVE" },
      create: {
        name: seed.name,
        email: seed.email,
        passwordHash: userPasswordHash,
        status: "ACTIVE"
      }
    });

    userMap.set(user.email, user);

    await prisma.userRole.createMany({
      data: [{ userId: user.id, roleId: role.id }],
      skipDuplicates: true
    });

    const warehouseLinks = seed.warehouseCodes
      .map((code) => warehouseMap.get(code))
      .filter((warehouse): warehouse is { id: string; code: string; name: string } => Boolean(warehouse))
      .map((warehouse) => ({ userId: user.id, warehouseId: warehouse.id }));

    if (warehouseLinks.length) {
      await prisma.userWarehouse.createMany({
        data: warehouseLinks,
        skipDuplicates: true
      });
    }
  }

  const unitMap = new Map<string, { id: string; code: string }>();
  for (const seed of unitSeeds) {
    const unit = await prisma.unitOfMeasure.upsert({
      where: { code: seed.code },
      update: { name: seed.name },
      create: { code: seed.code, name: seed.name }
    });
    unitMap.set(unit.code, unit);
  }

  const categoryMap = new Map<string, { id: string; name: string }>();
  const office = await getOrCreateCategory("Suministros de oficina", null);
  const maintenance = await getOrCreateCategory("Mantenimiento", null);
  const safety = await getOrCreateCategory("Seguridad", null);
  const electrical = await getOrCreateCategory("Electricidad", null);
  const plumbing = await getOrCreateCategory("Plomeria", null);
  const cleaning = await getOrCreateCategory("Limpieza", null);

  const paper = await getOrCreateCategory("Papel", office.id);
  const writing = await getOrCreateCategory("Escritura", office.id);
  const toner = await getOrCreateCategory("Tinta y toner", office.id);

  const hardware = await getOrCreateCategory("Ferreteria", maintenance.id);
  const tools = await getOrCreateCategory("Herramientas", maintenance.id);

  const ppe = await getOrCreateCategory("EPP", safety.id);

  const lighting = await getOrCreateCategory("Iluminacion", electrical.id);
  const cabling = await getOrCreateCategory("Cableado", electrical.id);

  const fittings = await getOrCreateCategory("Accesorios", plumbing.id);
  const pipes = await getOrCreateCategory("Tuberias", plumbing.id);

  const chemicals = await getOrCreateCategory("Quimicos", cleaning.id);
  const hygiene = await getOrCreateCategory("Higiene", cleaning.id);

  [
    office,
    maintenance,
    safety,
    electrical,
    plumbing,
    cleaning,
    paper,
    writing,
    toner,
    hardware,
    tools,
    ppe,
    lighting,
    cabling,
    fittings,
    pipes,
    chemicals,
    hygiene
  ].forEach((category) => {
    categoryMap.set(category.name, category);
  });

  const itemMap = new Map<string, { id: string; code: string; name: string; standardCost: Prisma.Decimal }>();

  for (const seed of itemSeeds) {
    const unit = unitMap.get(seed.unit);
    const category = categoryMap.get(seed.category);
    const defaultWarehouse = seed.defaultWarehouse ? warehouseMap.get(seed.defaultWarehouse) : undefined;

    if (!unit || !category) {
      continue;
    }

    const item = await prisma.item.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        description: seed.description,
        categoryId: category.id,
        unitId: unit.id,
        defaultWarehouseId: defaultWarehouse?.id ?? null,
        status: "ACTIVE",
        standardCost: toDecimal(seed.standardCost),
        notes: seed.notes ?? null
      },
      create: {
        code: seed.code,
        name: seed.name,
        description: seed.description,
        categoryId: category.id,
        unitId: unit.id,
        defaultWarehouseId: defaultWarehouse?.id ?? null,
        status: "ACTIVE",
        standardCost: toDecimal(seed.standardCost),
        notes: seed.notes ?? null
      }
    });

    itemMap.set(item.code, item);
  }

  const configMap = new Map<string, { minStock: number; reorderPoint: number }>();

  for (const seed of itemSeeds) {
    const item = itemMap.get(seed.code);
    if (!item) {
      continue;
    }

    for (const warehouseSeed of warehouseSeeds) {
      const warehouse = warehouseMap.get(warehouseSeed.code);
      if (!warehouse) {
        continue;
      }

      const scale = warehouseScale[warehouseSeed.code] ?? 1;
      const minStock = Math.max(1, Math.round(seed.minStock * scale));
      const reorderPoint = Math.max(minStock + 1, Math.round(seed.reorderPoint * scale));

      await prisma.itemWarehouseConfig.upsert({
        where: { itemId_warehouseId: { itemId: item.id, warehouseId: warehouse.id } },
        update: {
          minStock: toDecimal3(minStock),
          reorderPoint: toDecimal3(reorderPoint)
        },
        create: {
          itemId: item.id,
          warehouseId: warehouse.id,
          minStock: toDecimal3(minStock),
          reorderPoint: toDecimal3(reorderPoint)
        }
      });

      configMap.set(`${item.code}:${warehouse.code}`, { minStock, reorderPoint });
    }
  }

  for (const [itemIndex, seed] of itemSeeds.entries()) {
    const item = itemMap.get(seed.code);
    if (!item) {
      continue;
    }

    for (const [warehouseIndex, warehouseSeed] of warehouseSeeds.entries()) {
      const warehouse = warehouseMap.get(warehouseSeed.code);
      const primaryLocation = primaryLocationMap.get(warehouseSeed.code);
      if (!warehouse || !primaryLocation) {
        continue;
      }

      const config = configMap.get(`${item.code}:${warehouse.code}`);
      if (!config) {
        continue;
      }

      const baseQuantity = computeSeedQuantity(itemIndex + warehouseIndex, config.minStock, config.reorderPoint);
      const quantity = Math.max(0, baseQuantity - warehouseIndex * 2);

      await prisma.stockBalance.upsert({
        where: {
          itemId_warehouseId_locationId: {
            itemId: item.id,
            warehouseId: warehouse.id,
            locationId: primaryLocation.id
          }
        },
        update: { quantity: toDecimal3(quantity) },
        create: {
          itemId: item.id,
          warehouseId: warehouse.id,
          locationId: primaryLocation.id,
          quantity: toDecimal3(quantity)
        }
      });
    }
  }

  for (const seed of movementSeeds) {
    const existing = await prisma.movement.findUnique({ where: { code: seed.code } });
    if (existing) {
      continue;
    }

    const createdBy = userMap.get(seed.createdByEmail) ?? adminUser;
    const approvedBy = seed.approvedByEmail ? userMap.get(seed.approvedByEmail) : undefined;

    const originWarehouse = seed.originWarehouseCode ? warehouseMap.get(seed.originWarehouseCode) : undefined;
    const destinationWarehouse = seed.destinationWarehouseCode ? warehouseMap.get(seed.destinationWarehouseCode) : undefined;
    const originLocation = seed.originWarehouseCode
      ? locationMap.get(seed.originWarehouseCode)?.get(seed.originLocationCode ?? "")
      : undefined;
    const destinationLocation = seed.destinationWarehouseCode
      ? locationMap.get(seed.destinationWarehouseCode)?.get(seed.destinationLocationCode ?? "")
      : undefined;

    const lineItems = seed.lines
      .map((line) => {
        const item = itemMap.get(line.itemCode);
        if (!item) {
          return null;
        }
        const unitCost = Number(item.standardCost);
        const totalCost = unitCost * line.quantity;
        return {
          itemId: item.id,
          quantity: toDecimal3(line.quantity),
          unitCost: toDecimal(unitCost),
          totalCost: toDecimal(totalCost),
          notes: line.notes ?? null
        };
      })
      .filter((line): line is NonNullable<typeof line> => Boolean(line));

    if (!lineItems.length) {
      continue;
    }

    await prisma.movement.create({
      data: {
        code: seed.code,
        type: seed.type,
        status: seed.status,
        adjustmentDirection: seed.adjustmentDirection,
        originWarehouseId: originWarehouse?.id ?? null,
        originLocationId: originLocation?.id ?? null,
        destinationWarehouseId: destinationWarehouse?.id ?? null,
        destinationLocationId: destinationLocation?.id ?? null,
        reference: seed.reference ?? null,
        reason: seed.reason ?? null,
        createdById: createdBy.id,
        approvedById: seed.status === "CONFIRMED" ? approvedBy?.id ?? createdBy.id : null,
        createdAt: daysAgo(seed.createdAtDaysAgo),
        confirmedAt: seed.confirmedAtDaysAgo ? daysAgo(seed.confirmedAtDaysAgo) : null,
        canceledAt: seed.canceledAtDaysAgo ? daysAgo(seed.canceledAtDaysAgo) : null,
        lines: { create: lineItems }
      }
    });
  }

  const stockGroups = await prisma.stockBalance.groupBy({
    by: ["itemId", "warehouseId"],
    _sum: { quantity: true }
  });

  const stockMap = new Map<string, number>();
  for (const group of stockGroups) {
    const key = `${group.itemId}:${group.warehouseId}`;
    stockMap.set(key, Number(group._sum.quantity || 0));
  }

  const configs = await prisma.itemWarehouseConfig.findMany();
  const alerts = configs
    .map((config) => {
      const key = `${config.itemId}:${config.warehouseId}`;
      const quantity = stockMap.get(key) || 0;
      const minStock = Number(config.minStock);
      const reorderPoint = Number(config.reorderPoint);

      if (quantity <= minStock) {
        return {
          itemId: config.itemId,
          warehouseId: config.warehouseId,
          type: "BELOW_MIN",
          quantity,
          minStock,
          reorderPoint
        };
      }

      if (quantity <= reorderPoint) {
        return {
          itemId: config.itemId,
          warehouseId: config.warehouseId,
          type: "BELOW_REORDER",
          quantity,
          minStock,
          reorderPoint
        };
      }

      return null;
    })
    .filter((alert): alert is NonNullable<typeof alert> => Boolean(alert));

  await prisma.alert.deleteMany({});
  if (alerts.length) {
    await prisma.alert.createMany({
      data: alerts.map((alert) => ({
        itemId: alert.itemId,
        warehouseId: alert.warehouseId,
        type: alert.type,
        quantity: alert.quantity,
        minStock: alert.minStock,
        reorderPoint: alert.reorderPoint
      }))
    });
  }

  const auditCount = await prisma.auditLog.count();
  if (auditCount === 0) {
    const sampleItem = itemMap.get("OFC-001");
    const sampleWarehouse = warehouseMap.get("WH-CEN");
    const sampleMovement = await prisma.movement.findUnique({ where: { code: "MOV-2025-0001" } });
    const sampleAlert = await prisma.alert.findFirst();

    await prisma.auditLog.createMany({
      data: [
        {
          entityType: "Warehouse",
          entityId: sampleWarehouse?.id ?? adminUser.id,
          action: "CREATE",
          dataAfter: sampleWarehouse
            ? { id: sampleWarehouse.id, code: sampleWarehouse.code, name: sampleWarehouse.name }
            : null,
          userId: adminUser.id,
          createdAt: daysAgo(28)
        },
        {
          entityType: "Item",
          entityId: sampleItem?.id ?? adminUser.id,
          action: "CREATE",
          dataAfter: sampleItem ? { id: sampleItem.id, code: sampleItem.code, name: sampleItem.name } : null,
          userId: adminUser.id,
          createdAt: daysAgo(27)
        },
        {
          entityType: "Movement",
          entityId: sampleMovement?.id ?? adminUser.id,
          action: "CONFIRM",
          dataAfter: sampleMovement
            ? { id: sampleMovement.id, code: sampleMovement.code, status: sampleMovement.status }
            : { code: "MOV-2025-0001", status: "CONFIRMED" },
          userId: adminUser.id,
          createdAt: daysAgo(26)
        },
        {
          entityType: "User",
          entityId: adminUser.id,
          action: "UPDATE",
          dataBefore: { name: "Admin" },
          dataAfter: { name: adminUser.name },
          userId: adminUser.id,
          createdAt: daysAgo(20)
        },
        {
          entityType: "Alert",
          entityId: sampleAlert?.id ?? adminUser.id,
          action: "CREATE",
          dataAfter: sampleAlert
            ? { id: sampleAlert.id, type: sampleAlert.type, count: alerts.length }
            : { count: alerts.length },
          userId: adminUser.id,
          createdAt: daysAgo(10)
        }
      ]
    });
  }

  console.log(`Usuario admin creado: ${adminEmail}`);
  console.log(
    `Datos de ejemplo cargados con ${itemSeeds.length} articulos y ${movementSeeds.length} movimientos.`
  );
}

main()
  .catch((error) => {
    console.error("Fallo el seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
