const fs = require("fs");
const path = require("path");

const PAGE_W = 1366;
const PAGE_H = 768;

const COLORS = {
  navy: [0.05, 0.12, 0.18],
  teal: [0.14, 0.76, 0.66],
  gold: [0.96, 0.72, 0.18],
  white: [1, 1, 1],
  light: [0.93, 0.95, 0.97],
  gray: [0.78, 0.82, 0.86],
  dark: [0.03, 0.05, 0.08],
};

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(3));
const colorStr = (c) => c.map(fmt).join(" ");
const rg = (c) => `${colorStr(c)} rg`;
const RG = (c) => `${colorStr(c)} RG`;

const escapeText = (text) =>
  text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const rectFill = (cmds, x, y, w, h, color) => {
  cmds.push(rg(color));
  cmds.push(`${x} ${y} ${w} ${h} re f`);
};

const rectStroke = (cmds, x, y, w, h, color, width = 2) => {
  cmds.push(`${width} w`);
  cmds.push(RG(color));
  cmds.push(`${x} ${y} ${w} ${h} re S`);
};

const line = (cmds, x1, y1, x2, y2, color, width = 2) => {
  cmds.push(`${width} w`);
  cmds.push(RG(color));
  cmds.push(`${x1} ${y1} m ${x2} ${y2} l S`);
};

const textBlock = (
  cmds,
  lines,
  x,
  y,
  size,
  font,
  color,
  leading = Math.round(size * 1.3)
) => {
  cmds.push(rg(color));
  cmds.push(`BT /${font} ${size} Tf ${x} ${y} Td ${leading} TL`);
  lines.forEach((lineText, idx) => {
    cmds.push(`(${escapeText(lineText)}) Tj`);
    if (idx !== lines.length - 1) {
      cmds.push("T*");
    }
  });
  cmds.push("ET");
};

const bullets = (items) => items.map((item) => `- ${item}`);

const slideCover = () => {
  const cmds = [];
  rectFill(cmds, 0, 0, PAGE_W, PAGE_H, COLORS.navy);
  rectFill(cmds, 0, PAGE_H - 12, PAGE_W, 12, COLORS.teal);
  textBlock(cmds, ["MSLO Inventory System"], 90, 580, 58, "F2", COLORS.white);
  textBlock(
    cmds,
    ["Inventario municipal en tiempo real"],
    90,
    520,
    26,
    "F1",
    COLORS.gray
  );
  textBlock(
    cmds,
    ["MVP para la Municipalidad de San Lorenzo"],
    90,
    480,
    20,
    "F1",
    COLORS.gray
  );

  const boxW = 300;
  const boxH = 56;
  const gap = 30;
  const startX = Math.round((PAGE_W - (boxW * 3 + gap * 2)) / 2);
  const boxY = 120;
  const labels = ["Transparencia", "Control", "Eficiencia"];
  labels.forEach((label, idx) => {
    const x = startX + idx * (boxW + gap);
    rectFill(cmds, x, boxY, boxW, boxH, COLORS.gold);
    textBlock(cmds, [label], x + 24, boxY + 20, 20, "F2", COLORS.dark, 24);
  });
  return cmds.join("\n");
};

const slideProblem = () => {
  const cmds = [];
  rectFill(cmds, 0, 0, PAGE_W, PAGE_H, COLORS.navy);
  rectFill(cmds, 0, PAGE_H - 12, PAGE_W, 12, COLORS.teal);
  textBlock(cmds, ["Desafio actual"], 90, 640, 40, "F2", COLORS.white);
  rectFill(cmds, 60, 520, 6, 200, COLORS.teal);
  textBlock(
    cmds,
    bullets([
      "Datos de stock dispersos entre depositos",
      "Poca trazabilidad en movimientos",
      "Decisiones lentas y reposicion reactiva",
      "Dificil consolidar reportes para gestion",
    ]),
    90,
    560,
    24,
    "F1",
    COLORS.gray,
    34
  );
  return cmds.join("\n");
};

const slideSolution = () => {
  const cmds = [];
  rectFill(cmds, 0, 0, PAGE_W, PAGE_H, COLORS.navy);
  rectFill(cmds, 0, PAGE_H - 12, PAGE_W, 12, COLORS.teal);
  textBlock(cmds, ["Nuestra solucion"], 90, 640, 40, "F2", COLORS.white);
  textBlock(
    cmds,
    bullets([
      "Plataforma web unica para todas las depositos",
      "Movimientos con validacion y auditoria",
      "Alertas automaticas por minimos y reposicion",
      "Reportes listos para supervision y control",
    ]),
    90,
    560,
    24,
    "F1",
    COLORS.gray,
    34
  );
  rectFill(cmds, 760, 140, 520, 100, COLORS.teal);
  textBlock(
    cmds,
    ["API REST + UI Web + PostgreSQL"],
    790,
    190,
    22,
    "F2",
    COLORS.white,
    28
  );
  return cmds.join("\n");
};

const slideValue = () => {
  const cmds = [];
  rectFill(cmds, 0, 0, PAGE_W, PAGE_H, COLORS.navy);
  rectFill(cmds, 0, PAGE_H - 12, PAGE_W, 12, COLORS.teal);
  textBlock(
    cmds,
    ["Beneficios comerciales"],
    90,
    640,
    40,
    "F2",
    COLORS.white
  );
  textBlock(
    cmds,
    bullets([
      "Visibilidad inmediata del inventario",
      "Reduccion de quiebres y sobrestock",
      "Mayor transparencia y cumplimiento",
      "Mejor uso del presupuesto municipal",
    ]),
    90,
    560,
    24,
    "F1",
    COLORS.gray,
    34
  );
  rectFill(cmds, 90, 160, 520, 70, COLORS.gold);
  textBlock(
    cmds,
    ["MVP listo para piloto en semanas"],
    120,
    200,
    22,
    "F2",
    COLORS.dark,
    28
  );
  return cmds.join("\n");
};

const slideModules = () => {
  const cmds = [];
  rectFill(cmds, 0, 0, PAGE_W, PAGE_H, COLORS.navy);
  rectFill(cmds, 0, PAGE_H - 12, PAGE_W, 12, COLORS.teal);
  textBlock(cmds, ["Modulos clave"], 90, 640, 40, "F2", COLORS.white);
  textBlock(
    cmds,
    bullets([
      "Maestros: items, categorias, unidades",
      "Depositos y ubicaciones",
      "Usuarios y roles",
    ]),
    90,
    560,
    24,
    "F1",
    COLORS.gray,
    34
  );
  textBlock(
    cmds,
    bullets(["Movimientos y stock", "Reportes y alertas", "Auditoria completa"]),
    720,
    560,
    24,
    "F1",
    COLORS.gray,
    34
  );
  return cmds.join("\n");
};

const slideFlows = () => {
  const cmds = [];
  rectFill(cmds, 0, 0, PAGE_W, PAGE_H, COLORS.navy);
  rectFill(cmds, 0, PAGE_H - 12, PAGE_W, 12, COLORS.teal);
  textBlock(cmds, ["Flujos diarios"], 90, 640, 40, "F2", COLORS.white);
  textBlock(
    cmds,
    bullets([
      "Ingreso: registra entradas y confirma stock",
      "Egreso: salida controlada con aprobacion",
      "Transferencia: entre bodegas",
      "Ajuste: incrementos o disminuciones con motivo",
    ]),
    90,
    560,
    24,
    "F1",
    COLORS.gray,
    34
  );

  const boxW = 230;
  const boxH = 50;
  const gap = 40;
  const startX = Math.round((PAGE_W - (boxW * 4 + gap * 3)) / 2);
  const y = 180;
  const labels = ["Ingreso", "Egreso", "Transferencia", "Ajuste"];
  labels.forEach((label, idx) => {
    const x = startX + idx * (boxW + gap);
    rectFill(cmds, x, y, boxW, boxH, COLORS.teal);
    textBlock(cmds, [label], x + 22, y + 18, 18, "F2", COLORS.white, 22);
    if (idx < labels.length - 1) {
      const lineX1 = x + boxW;
      const lineX2 = x + boxW + gap;
      line(cmds, lineX1, y + boxH / 2, lineX2, y + boxH / 2, COLORS.gray, 2);
    }
  });
  return cmds.join("\n");
};

const slideSecurity = () => {
  const cmds = [];
  rectFill(cmds, 0, 0, PAGE_W, PAGE_H, COLORS.navy);
  rectFill(cmds, 0, PAGE_H - 12, PAGE_W, 12, COLORS.teal);
  textBlock(
    cmds,
    ["Seguridad y gobernanza"],
    90,
    640,
    40,
    "F2",
    COLORS.white
  );
  textBlock(
    cmds,
    bullets([
      "Autenticacion JWT",
      "Permisos por rol y bodega",
      "Registro de auditoria para acciones criticas",
      "Bloqueo de stock negativo (configurable)",
    ]),
    90,
    560,
    24,
    "F1",
    COLORS.gray,
    34
  );
  rectFill(cmds, 90, 160, 600, 70, COLORS.gold);
  textBlock(
    cmds,
    ["Trazabilidad total en cada movimiento"],
    120,
    200,
    22,
    "F2",
    COLORS.dark,
    28
  );
  return cmds.join("\n");
};

const slideArchitecture = () => {
  const cmds = [];
  rectFill(cmds, 0, 0, PAGE_W, PAGE_H, COLORS.navy);
  rectFill(cmds, 0, PAGE_H - 12, PAGE_W, 12, COLORS.teal);
  textBlock(cmds, ["Arquitectura"], 90, 640, 40, "F2", COLORS.white);

  const boxW = 300;
  const boxH = 120;
  const gap = 70;
  const startX = Math.round((PAGE_W - (boxW * 3 + gap * 2)) / 2);
  const y = 360;
  const boxes = [
    { title: "Web UI", sub: "React + Vite" },
    { title: "API REST", sub: "Node + Express + Prisma" },
    { title: "PostgreSQL", sub: "Base de datos" },
  ];

  boxes.forEach((box, idx) => {
    const x = startX + idx * (boxW + gap);
    rectFill(cmds, x, y, boxW, boxH, COLORS.light);
    rectStroke(cmds, x, y, boxW, boxH, COLORS.teal, 2);
    textBlock(cmds, [box.title], x + 24, y + 70, 22, "F2", COLORS.dark, 26);
    textBlock(cmds, [box.sub], x + 24, y + 40, 16, "F1", COLORS.dark, 20);
    if (idx < boxes.length - 1) {
      const lineX1 = x + boxW;
      const lineX2 = x + boxW + gap;
      line(cmds, lineX1, y + boxH / 2, lineX2, y + boxH / 2, COLORS.teal, 3);
    }
  });

  textBlock(
    cmds,
    ["Versionado /api/v1 + endpoints CSV"],
    90,
    220,
    22,
    "F2",
    COLORS.gray,
    28
  );
  return cmds.join("\n");
};

const slideIntegrations = () => {
  const cmds = [];
  rectFill(cmds, 0, 0, PAGE_W, PAGE_H, COLORS.navy);
  rectFill(cmds, 0, PAGE_H - 12, PAGE_W, 12, COLORS.teal);
  textBlock(
    cmds,
    ["Integraciones y crecimiento"],
    90,
    640,
    40,
    "F2",
    COLORS.white
  );
  textBlock(
    cmds,
    bullets([
      "API REST lista para ERP y BI",
      "Importacion CSV para carga inicial",
      "Multi-bodega con permisos por alcance",
      "Escalado por modulos y roles",
    ]),
    90,
    560,
    24,
    "F1",
    COLORS.gray,
    34
  );
  return cmds.join("\n");
};

const slideNext = () => {
  const cmds = [];
  rectFill(cmds, 0, 0, PAGE_W, PAGE_H, COLORS.navy);
  rectFill(cmds, 0, PAGE_H - 12, PAGE_W, 12, COLORS.teal);
  textBlock(cmds, ["Proximo paso"], 90, 640, 40, "F2", COLORS.white);
  textBlock(
    cmds,
    bullets([
      "Piloto controlado con depositos prioritarias",
      "Capacitacion a operadores y supervisores",
      "Ajustes finales y despliegue municipal",
    ]),
    90,
    560,
    24,
    "F1",
    COLORS.gray,
    34
  );
  rectFill(cmds, 90, 140, 720, 90, COLORS.gold);
  textBlock(
    cmds,
    ["Solicite una demo comercial"],
    120,
    190,
    26,
    "F2",
    COLORS.dark,
    30
  );
  textBlock(
    cmds,
    ["Contacto: equipo MSLO"],
    120,
    160,
    18,
    "F1",
    COLORS.dark,
    22
  );
  return cmds.join("\n");
};

const slides = [
  slideCover(),
  slideProblem(),
  slideSolution(),
  slideValue(),
  slideModules(),
  slideFlows(),
  slideSecurity(),
  slideArchitecture(),
  slideIntegrations(),
  slideNext(),
];

const objects = [];
const addObject = (content) => {
  objects.push(content);
  return objects.length;
};

const fontRegularId = addObject(
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
);
const fontBoldId = addObject(
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
);
const pagesId = addObject("");

const pageIds = [];
slides.forEach((content) => {
  const length = Buffer.byteLength(content, "ascii");
  const stream = `<< /Length ${length} >>\nstream\n${content}\nendstream`;
  const contentId = addObject(stream);
  const pageObj = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  const pageId = addObject(pageObj);
  pageIds.push(pageId);
});

objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds
  .map((id) => `${id} 0 R`)
  .join(" ")}] /Count ${pageIds.length} /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] >>`;

const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

const chunks = [];
let offset = 0;
const push = (text) => {
  chunks.push(text);
  offset += Buffer.byteLength(text, "ascii");
};

push("%PDF-1.4\n");

const offsets = [];
objects.forEach((obj, index) => {
  offsets.push(offset);
  push(`${index + 1} 0 obj\n${obj}\nendobj\n`);
});

const xrefOffset = offset;
push(`xref\n0 ${objects.length + 1}\n`);
push("0000000000 65535 f \n");
offsets.forEach((off) => {
  push(`${String(off).padStart(10, "0")} 00000 n \n`);
});

push(
  `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
);

const outputPath = path.join(
  __dirname,
  "..",
  "docs",
  "presentacion-mslo-inventory.pdf"
);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, chunks.join(""), "binary");
console.log(`PDF creado en: ${outputPath}`);
