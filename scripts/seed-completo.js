/**
 * Seed completo — datos reales de la Dark Kitchen
 * Fuentes:
 *   02-Costeo de recetas.xlsx  → productos (60) + recetas (68)
 *   03-Ventas por ingrediente  → ventas semana 39 por platillo
 *   04-Flujo de inventario     → mermas semana 39
 *   ADM RESTAURANTE 2025       → gastos reales (movimientosCaja)
 *   NOMINA 2025                → empleados activos
 *
 * Ejecutar: node scripts/seed-completo.js
 */

const admin = require('firebase-admin');
const sa    = require('../docs/firebase-admin.json');

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db          = admin.firestore();
const { Timestamp, FieldValue } = admin.firestore;

function ts(fechaStr) {
  return Timestamp.fromDate(new Date(fechaStr + 'T12:00:00'));
}

function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ── Helpers de batch con auto-flush ──────────────────────────────────────────
function createBatchWriter() {
  let batch = db.batch();
  let ops = 0;
  const batches = [];

  return {
    set(ref, data) {
      if (ops >= 450) { batches.push(batch.commit()); batch = db.batch(); ops = 0; }
      batch.set(ref, data);
      ops++;
    },
    update(ref, data) {
      if (ops >= 450) { batches.push(batch.commit()); batch = db.batch(); ops = 0; }
      batch.update(ref, data);
      ops++;
    },
    async commit() {
      batches.push(batch.commit());
      await Promise.all(batches);
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1 — PRODUCTOS (67 platillos con precio y costo real)
// ═══════════════════════════════════════════════════════════════════════════════

const CAT_ICON = {
  BEBIDAS: '🥤', BURGERS: '🍔', FREIDORA: '🍟', PARRILLA: '🥩',
  GUARNICIONES: '🥗', EXTRAS: '🫙', POSTRES: '🍰', MODIFICADOR: '✏️',
};

const PRODUCTOS = [
  // BEBIDAS
  { nombre: '7UP 600 ML',           categoria: 'BEBIDAS',      precio: 25,   costo: 10.91  },
  { nombre: 'LIGHT 600 ML',         categoria: 'BEBIDAS',      precio: 25,   costo: 10.91  },
  { nombre: 'MANZANITA SOL 600 ML', categoria: 'BEBIDAS',      precio: 25,   costo: 10.91  },
  { nombre: 'MIRINDA 600 ML',       categoria: 'BEBIDAS',      precio: 25,   costo: 10.91  },
  { nombre: 'PEPSI 600 ML',         categoria: 'BEBIDAS',      precio: 25,   costo: 10.91  },
  // BURGERS
  { nombre: 'KIDS BURGER',          categoria: 'BURGERS',      precio: 39,   costo: 0      },
  { nombre: 'BURGER BONELESS',      categoria: 'BURGERS',      precio: 84,   costo: 39.00  },
  { nombre: 'BURGER CHEESE',        categoria: 'BURGERS',      precio: 75,   costo: 23.91  },
  { nombre: 'BURGER DOBLE CHEESE',  categoria: 'BURGERS',      precio: 95,   costo: 34.82  },
  { nombre: 'BURGER DOBLE ESPECIAL',categoria: 'BURGERS',      precio: 85,   costo: 33.56  },
  { nombre: 'BURGER DOBLE POLAKA',  categoria: 'BURGERS',      precio: 104,  costo: 45.94  },
  { nombre: 'BURGER DOBLE SIRLOIN', categoria: 'BURGERS',      precio: 109,  costo: 59.81  },
  { nombre: 'BURGER DOBLE TOCINO',  categoria: 'BURGERS',      precio: 99,   costo: 34.96  },
  { nombre: 'BURGER ESPECIAL',      categoria: 'BURGERS',      precio: 65,   costo: 22.47  },
  { nombre: 'BURGER MONSTER',       categoria: 'BURGERS',      precio: 115,  costo: 44.39  },
  { nombre: 'BURGER POLAKA',        categoria: 'BURGERS',      precio: 85,   costo: 34.85  },
  { nombre: 'BURGER SIRLOIN',       categoria: 'BURGERS',      precio: 90,   costo: 48.72  },
  { nombre: 'BURGER TOCINO',        categoria: 'BURGERS',      precio: 80,   costo: 23.87  },
  { nombre: 'COMBO BONELESS BURGER',categoria: 'BURGERS',      precio: 185,  costo: 78.58  },
  { nombre: 'COMBO CHEESE',         categoria: 'BURGERS',      precio: 180,  costo: 62.05  },
  { nombre: 'COMBO ESPECIAL',       categoria: 'BURGERS',      precio: 160,  costo: 59.81  },
  { nombre: 'COMBO POLAKA',         categoria: 'BURGERS',      precio: 185,  costo: 74.42  },
  { nombre: 'COMBO SIRLOIN',        categoria: 'BURGERS',      precio: 198,  costo: 88.30  },
  { nombre: 'COMBO TOCINO',         categoria: 'BURGERS',      precio: 185,  costo: 63.27  },
  // EXTRAS / SALSAS
  { nombre: 'BBQ (EXTRA)',          categoria: 'EXTRAS',       precio: 10,   costo: 1.98   },
  { nombre: 'BUFFALO (EXTRA)',      categoria: 'EXTRAS',       precio: 10,   costo: 1.57   },
  { nombre: 'CHILES TOREADOS',      categoria: 'EXTRAS',       precio: 10,   costo: 0.74   },
  { nombre: 'LEMON PEPPER (EXTRA)', categoria: 'EXTRAS',       precio: 15,   costo: 0.90   },
  { nombre: 'MANGO HABANERO (EXTRA)',categoria:'EXTRAS',        precio: 15,   costo: 3.52   },
  { nombre: 'QUESO (EXTRA)',        categoria: 'EXTRAS',       precio: 10,   costo: 2.52   },
  { nombre: 'RANCH (EXTRA)',        categoria: 'EXTRAS',       precio: 15,   costo: 2.52   },
  { nombre: 'SALSA GUACAMOLE (EXTRA)',categoria:'EXTRAS',       precio: 10,   costo: 1.03   },
  // FREIDORA
  { nombre: 'BONELESS 1/2KG',            categoria: 'FREIDORA', precio: 205,  costo: 75.09  },
  { nombre: 'BONELESS 1KG',              categoria: 'FREIDORA', precio: 399,  costo: 144.88 },
  { nombre: 'BONELESS CON PAPAS',        categoria: 'FREIDORA', precio: 119,  costo: 36.27  },
  { nombre: 'BONELESS DIDI (250GR SIN PAPAS)', categoria: 'FREIDORA', precio: 90, costo: 34.60 },
  { nombre: 'NACHOS SIRLOIN',            categoria: 'FREIDORA', precio: 89,   costo: 41.34  },
  { nombre: 'PAPAS CHICAS',              categoria: 'FREIDORA', precio: 30,   costo: 4.19   },
  { nombre: 'PAPAS GRANDE',              categoria: 'FREIDORA', precio: 50,   costo: 6.98   },
  { nombre: 'PAPAS QUESO CHICAS',        categoria: 'FREIDORA', precio: 35,   costo: 3.95   },
  { nombre: 'PAPAS QUESO GRANDE',        categoria: 'FREIDORA', precio: 60,   costo: 6.74   },
  { nombre: 'PAPAS SIRLOIN CHICAS',      categoria: 'FREIDORA', precio: 50,   costo: 30.20  },
  { nombre: 'PAPAS SIRLOIN GRANDE',      categoria: 'FREIDORA', precio: 89,   costo: 41.74  },
  { nombre: 'PAPAS TOCINO CHICAS',       categoria: 'FREIDORA', precio: 40,   costo: 5.35   },
  { nombre: 'PAPAS TOCINO GRANDE',       categoria: 'FREIDORA', precio: 69,   costo: 9.54   },
  { nombre: 'PALOMITAS DE POLLO',        categoria: 'FREIDORA', precio: 79,   costo: 23.71  },
  { nombre: 'BOTANERO',                  categoria: 'FREIDORA', precio: 150,  costo: 54.21  },
  // GUARNICIONES
  { nombre: 'ELOTE DULCE',               categoria: 'GUARNICIONES', precio: 20,  costo: 4.55  },
  { nombre: 'GALLETAS SALADAS (3 PIEZAS)',categoria:'GUARNICIONES', precio: 15,  costo: 3.45  },
  { nombre: 'MACARRONES',                categoria: 'GUARNICIONES', precio: 40,  costo: 11.09 },
  { nombre: 'PAPATEXAS',                 categoria: 'GUARNICIONES', precio: 20,  costo: 17.63 },
  { nombre: 'PORCION POLAKA',            categoria: 'GUARNICIONES', precio: 25,  costo: 5.16  },
  { nombre: 'PURE DE PAPA',              categoria: 'GUARNICIONES', precio: 40,  costo: 8.47  },
  { nombre: 'TORTILLAS HARINA (5 PZS)',  categoria: 'GUARNICIONES', precio: 15,  costo: 5.38  },
  { nombre: 'TORTILLAS MAIZ (5 PIEZAS)', categoria: 'GUARNICIONES', precio: 15,  costo: 2.50  },
  // PARRILLA
  { nombre: 'COMBO COSTILLA',            categoria: 'PARRILLA', precio: 160,  costo: 77.74  },
  { nombre: 'COSTILLA 1/2KG',            categoria: 'PARRILLA', precio: 239,  costo: 64.06  },
  { nombre: 'COSTILLA 1KG',              categoria: 'PARRILLA', precio: 420,  costo: 124.98 },
  { nombre: 'COSTILLA 250GR',            categoria: 'PARRILLA', precio: 129,  costo: 33.69  },
  { nombre: 'ORDEN TACOS SIRLOIN HARINA',categoria: 'PARRILLA', precio: 95,   costo: 37.45  },
  { nombre: 'ORDEN TACOS SIRLOIN MAIZ',  categoria: 'PARRILLA', precio: 95,   costo: 34.52  },
  { nombre: 'PAPA ASADA CON SIRLOIN',    categoria: 'PARRILLA', precio: 89,   costo: 40.25  },
  { nombre: 'PARRILLADA MIXTA 1/2KG',    categoria: 'PARRILLA', precio: 245,  costo: 95.50  },
  { nombre: 'PARRILLADA MIXTA 1KG',      categoria: 'PARRILLA', precio: 449,  costo: 185.00 },
  { nombre: 'SIRLOIN 1KG',               categoria: 'PARRILLA', precio: 399,  costo: 154.00 },
  { nombre: 'TACO SIRLOIN MAIZ (PIEZA)', categoria: 'PARRILLA', precio: 22,   costo: 7.30   },
  // POSTRES
  { nombre: 'PAY DE QUESO',             categoria: 'POSTRES',  precio: 45,   costo: 30.00  },
];

// Ventas semana 39 (2025-09-22 al 2025-09-28) — fecha clave para popularidad
const FECHA_SEM39 = '2025-09-22';
const VENTAS_SEM39 = {
  'PAPA ASADA CON SIRLOIN':       61,
  'ORDEN TACOS SIRLOIN MAIZ':     54,
  'BONELESS 1/2KG':               39,
  'PEPSI 600 ML':                  38,
  'PALOMITAS DE POLLO':           37,
  'BONELESS CON PAPAS':           32,
  'BURGER ESPECIAL':               28,
  'BURGER SIRLOIN':                28,
  'BURGER CHEESE':                 21,
  'BURGER BONELESS':               18,
  'ORDEN TACOS SIRLOIN HARINA':   17,
  'PAY DE QUESO':                  17,
  'PAPAS QUESO GRANDE':           15,
  'BURGER TOCINO':                 14,
  'PAPAS CHICAS':                  14,
  'PAPAS GRANDE':                  12,
  'COSTILLA 1/2KG':               10,
  'QUESO (EXTRA)':                  8,
  'ELOTE DULCE':                    8,
  'PORCION POLAKA':                 8,
  'MACARRONES':                     7,
  'COSTILLA 250GR':                 7,
  'BURGER DOBLE SIRLOIN':           6,
  'MANGO HABANERO (EXTRA)':         6,
  'COMBO COSTILLA':                 6,
  'PAPAS TOCINO GRANDE':            5,
  'PARRILLADA MIXTA 1/2KG':         5,
  '7UP 600 ML':                     4,
  'MIRINDA 600 ML':                 4,
  'BURGER MONSTER':                 4,
  'RANCH (EXTRA)':                  4,
  'BONELESS 1KG':                   4,
  'SIRLOIN 1KG':                    4,
  'MANZANITA SOL 600 ML':           3,
  'BURGER DOBLE TOCINO':            3,
  'BURGER POLAKA':                  3,
  'COMBO ESPECIAL':                 3,
  'BUFFALO (EXTRA)':                3,
  'PAPAS QUESO CHICAS':             3,
  'PARRILLADA MIXTA 1KG':           3,
  'LIGHT 600 ML':                   2,
  'LEMON PEPPER (EXTRA)':           2,
  'BONELESS DIDI (250GR SIN PAPAS)':2,
  'PAPATEXAS':                      2,
  'COSTILLA 1KG':                   2,
  'BURGER DOBLE CHEESE':            1,
  'BURGER DOBLE ESPECIAL':          1,
  'BURGER DOBLE POLAKA':            1,
  'COMBO CHEESE':                   1,
  'COMBO SIRLOIN':                  1,
  'COMBO TOCINO':                   1,
  'BOTANERO':                       1,
  'PAPAS SIRLOIN CHICAS':           1,
  'PAPAS SIRLOIN GRANDE':           1,
  'PAPAS TOCINO CHICAS':            1,
  'TACO SIRLOIN MAIZ (PIEZA)':      1,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2 — RECETAS (ingredientes por platillo)
// ═══════════════════════════════════════════════════════════════════════════════

const RECETAS = {
  'BURGER ESPECIAL': {
    categoria: 'BURGERS', costo: 22.47, precio: 65,
    ingredientes: [
      { nombre: 'Pan Hamburguesa',  cantidad: 1,    unidad: 'PIEZA', costoUnitario: 5.53,  costoTotal: 5.53  },
      { nombre: 'Carne Hamburguesa',cantidad: 1,    unidad: 'PIEZA', costoUnitario: 8.90,  costoTotal: 8.90  },
      { nombre: 'Jamon',            cantidad: 0.02, unidad: 'KILO',  costoUnitario: 53.0,  costoTotal: 1.06  },
      { nombre: 'Queso americano',  cantidad: 0.013,unidad: 'KILO',  costoUnitario: 86.5,  costoTotal: 1.12  },
      { nombre: 'Aguacate',         cantidad: 0.04, unidad: 'KILO',  costoUnitario: 75.0,  costoTotal: 3.00  },
      { nombre: 'Aderezo Mayonesa', cantidad: 0.01, unidad: 'KILO',  costoUnitario: 42.0,  costoTotal: 0.42  },
      { nombre: 'Aderezo ranch',    cantidad: 0.01, unidad: 'KILO',  costoUnitario: 42.0,  costoTotal: 0.42  },
      { nombre: 'Tomate',           cantidad: 0.03, unidad: 'KILO',  costoUnitario: 25.0,  costoTotal: 0.75  },
      { nombre: 'Cebolla blanca',   cantidad: 0.015,unidad: 'KILO',  costoUnitario: 18.0,  costoTotal: 0.27  },
    ],
  },
  'BURGER SIRLOIN': {
    categoria: 'BURGERS', costo: 48.72, precio: 90,
    ingredientes: [
      { nombre: 'Pan Hamburguesa',  cantidad: 1,    unidad: 'PIEZA', costoUnitario: 5.53,  costoTotal: 5.53  },
      { nombre: 'Sirloin',          cantidad: 0.15, unidad: 'KILO',  costoUnitario: 154.0, costoTotal: 23.10 },
      { nombre: 'Queso americano',  cantidad: 0.013,unidad: 'KILO',  costoUnitario: 86.5,  costoTotal: 1.12  },
      { nombre: 'Aguacate',         cantidad: 0.04, unidad: 'KILO',  costoUnitario: 75.0,  costoTotal: 3.00  },
      { nombre: 'Aderezo Mayonesa', cantidad: 0.01, unidad: 'KILO',  costoUnitario: 42.0,  costoTotal: 0.42  },
      { nombre: 'Tomate',           cantidad: 0.03, unidad: 'KILO',  costoUnitario: 25.0,  costoTotal: 0.75  },
      { nombre: 'Cebolla blanca',   cantidad: 0.015,unidad: 'KILO',  costoUnitario: 18.0,  costoTotal: 0.27  },
    ],
  },
  'BURGER CHEESE': {
    categoria: 'BURGERS', costo: 23.91, precio: 75,
    ingredientes: [
      { nombre: 'Pan Hamburguesa',  cantidad: 1,    unidad: 'PIEZA', costoUnitario: 5.53,  costoTotal: 5.53  },
      { nombre: 'Carne Hamburguesa',cantidad: 1,    unidad: 'PIEZA', costoUnitario: 8.90,  costoTotal: 8.90  },
      { nombre: 'Queso americano',  cantidad: 0.02, unidad: 'KILO',  costoUnitario: 86.5,  costoTotal: 1.73  },
      { nombre: 'Aderezo Mayonesa', cantidad: 0.015,unidad: 'KILO',  costoUnitario: 42.0,  costoTotal: 0.63  },
      { nombre: 'Tomate',           cantidad: 0.03, unidad: 'KILO',  costoUnitario: 25.0,  costoTotal: 0.75  },
      { nombre: 'Cebolla blanca',   cantidad: 0.015,unidad: 'KILO',  costoUnitario: 18.0,  costoTotal: 0.27  },
    ],
  },
  'BURGER BONELESS': {
    categoria: 'BURGERS', costo: 39.00, precio: 84,
    ingredientes: [
      { nombre: 'Pan Hamburguesa',  cantidad: 1,    unidad: 'PIEZA', costoUnitario: 5.53,  costoTotal: 5.53  },
      { nombre: 'Boneless',         cantidad: 0.25, unidad: 'KILO',  costoUnitario: 123.0, costoTotal: 30.75 },
      { nombre: 'Salsa buffalo',    cantidad: 0.04, unidad: 'KILO',  costoUnitario: 35.0,  costoTotal: 1.40  },
      { nombre: 'Aderezo ranch',    cantidad: 0.01, unidad: 'KILO',  costoUnitario: 42.0,  costoTotal: 0.42  },
    ],
  },
  'BONELESS 1/2KG': {
    categoria: 'FREIDORA', costo: 75.09, precio: 205,
    ingredientes: [
      { nombre: 'Boneless',         cantidad: 0.5,  unidad: 'KILO',  costoUnitario: 123.0, costoTotal: 61.50 },
      { nombre: 'Aceite',           cantidad: 0.08, unidad: 'LITRO', costoUnitario: 34.0,  costoTotal: 2.72  },
      { nombre: 'Sazonador hamburguesa',cantidad:0.01,unidad:'KILO',costoUnitario:68.9,  costoTotal: 0.69  },
    ],
  },
  'BONELESS 1KG': {
    categoria: 'FREIDORA', costo: 144.88, precio: 399,
    ingredientes: [
      { nombre: 'Boneless',         cantidad: 1.0,  unidad: 'KILO',  costoUnitario: 123.0, costoTotal: 123.00 },
      { nombre: 'Aceite',           cantidad: 0.15, unidad: 'LITRO', costoUnitario: 34.0,  costoTotal: 5.10   },
      { nombre: 'Sazonador hamburguesa',cantidad:0.02,unidad:'KILO',costoUnitario:68.9,  costoTotal: 1.38   },
    ],
  },
  'BONELESS CON PAPAS': {
    categoria: 'FREIDORA', costo: 36.27, precio: 119,
    ingredientes: [
      { nombre: 'Boneless',         cantidad: 0.25, unidad: 'KILO',  costoUnitario: 123.0, costoTotal: 30.75 },
      { nombre: 'Papas fritas',     cantidad: 0.09, unidad: 'KILO',  costoUnitario: 42.83, costoTotal: 3.85  },
      { nombre: 'Aceite',           cantidad: 0.03, unidad: 'LITRO', costoUnitario: 34.0,  costoTotal: 1.02  },
    ],
  },
  'PALOMITAS DE POLLO': {
    categoria: 'FREIDORA', costo: 23.71, precio: 79,
    ingredientes: [
      { nombre: 'Palomitas de pollo',cantidad:0.14, unidad: 'KILO',  costoUnitario: 125.0, costoTotal: 17.50 },
      { nombre: 'Aceite',           cantidad: 0.08, unidad: 'LITRO', costoUnitario: 34.0,  costoTotal: 2.72  },
      { nombre: 'Salsa buffalo',    cantidad: 0.04, unidad: 'KILO',  costoUnitario: 35.0,  costoTotal: 1.40  },
    ],
  },
  'PAPAS CHICAS': {
    categoria: 'FREIDORA', costo: 4.19, precio: 30,
    ingredientes: [
      { nombre: 'Papas fritas',     cantidad: 0.09, unidad: 'KILO',  costoUnitario: 42.83, costoTotal: 3.85  },
      { nombre: 'Aceite',           cantidad: 0.01, unidad: 'LITRO', costoUnitario: 34.0,  costoTotal: 0.34  },
    ],
  },
  'PAPAS GRANDE': {
    categoria: 'FREIDORA', costo: 6.98, precio: 50,
    ingredientes: [
      { nombre: 'Papas fritas',     cantidad: 0.15, unidad: 'KILO',  costoUnitario: 42.83, costoTotal: 6.42  },
      { nombre: 'Aceite',           cantidad: 0.016,unidad: 'LITRO', costoUnitario: 34.0,  costoTotal: 0.54  },
    ],
  },
  'ORDEN TACOS SIRLOIN MAIZ': {
    categoria: 'PARRILLA', costo: 34.52, precio: 95,
    ingredientes: [
      { nombre: 'Sirloin',          cantidad: 0.15, unidad: 'KILO',  costoUnitario: 154.0, costoTotal: 23.10 },
      { nombre: 'Tortilla maiz',    cantidad: 10,   unidad: 'PIEZA', costoUnitario: 0.245, costoTotal: 2.45  },
      { nombre: 'Aguacate',         cantidad: 0.04, unidad: 'KILO',  costoUnitario: 75.0,  costoTotal: 3.00  },
      { nombre: 'Cebolla blanca',   cantidad: 0.03, unidad: 'KILO',  costoUnitario: 18.0,  costoTotal: 0.54  },
      { nombre: 'Chile jalapeño',   cantidad: 0.02, unidad: 'KILO',  costoUnitario: 25.0,  costoTotal: 0.50  },
      { nombre: 'Limon',            cantidad: 0.03, unidad: 'KILO',  costoUnitario: 18.0,  costoTotal: 0.54  },
    ],
  },
  'ORDEN TACOS SIRLOIN HARINA': {
    categoria: 'PARRILLA', costo: 37.45, precio: 95,
    ingredientes: [
      { nombre: 'Sirloin',          cantidad: 0.15, unidad: 'KILO',  costoUnitario: 154.0, costoTotal: 23.10 },
      { nombre: 'Tortilla harina',  cantidad: 5,    unidad: 'PIEZA', costoUnitario: 0.93,  costoTotal: 4.65  },
      { nombre: 'Aguacate',         cantidad: 0.04, unidad: 'KILO',  costoUnitario: 75.0,  costoTotal: 3.00  },
      { nombre: 'Cebolla blanca',   cantidad: 0.03, unidad: 'KILO',  costoUnitario: 18.0,  costoTotal: 0.54  },
      { nombre: 'Chile jalapeño',   cantidad: 0.02, unidad: 'KILO',  costoUnitario: 25.0,  costoTotal: 0.50  },
      { nombre: 'Limon',            cantidad: 0.03, unidad: 'KILO',  costoUnitario: 18.0,  costoTotal: 0.54  },
    ],
  },
  'PAPA ASADA CON SIRLOIN': {
    categoria: 'PARRILLA', costo: 40.25, precio: 89,
    ingredientes: [
      { nombre: 'Sirloin',          cantidad: 0.15, unidad: 'KILO',  costoUnitario: 154.0, costoTotal: 23.10 },
      { nombre: 'Papa blanca',      cantidad: 0.35, unidad: 'KILO',  costoUnitario: 15.0,  costoTotal: 5.25  },
      { nombre: 'Queso americano',  cantidad: 0.02, unidad: 'KILO',  costoUnitario: 86.5,  costoTotal: 1.73  },
      { nombre: 'Aderezo queso',    cantidad: 0.03, unidad: 'KILO',  costoUnitario: 42.0,  costoTotal: 1.26  },
      { nombre: 'Aderezo ranch',    cantidad: 0.01, unidad: 'KILO',  costoUnitario: 42.0,  costoTotal: 0.42  },
    ],
  },
  'COSTILLA 1/2KG': {
    categoria: 'PARRILLA', costo: 64.06, precio: 239,
    ingredientes: [
      { nombre: 'Costilla de cerdo',cantidad: 0.5,  unidad: 'KILO',  costoUnitario: 125.0, costoTotal: 62.50 },
      { nombre: 'Salsa bbq',        cantidad: 0.04, unidad: 'KILO',  costoUnitario: 35.0,  costoTotal: 1.40  },
    ],
  },
  'COSTILLA 250GR': {
    categoria: 'PARRILLA', costo: 33.69, precio: 129,
    ingredientes: [
      { nombre: 'Costilla de cerdo',cantidad: 0.25, unidad: 'KILO',  costoUnitario: 125.0, costoTotal: 31.25 },
      { nombre: 'Salsa bbq',        cantidad: 0.04, unidad: 'KILO',  costoUnitario: 35.0,  costoTotal: 1.40  },
    ],
  },
  'PAY DE QUESO': {
    categoria: 'POSTRES', costo: 30.00, precio: 45,
    ingredientes: [
      { nombre: 'Pay de queso',     cantidad: 1,    unidad: 'PIEZA', costoUnitario: 30.0,  costoTotal: 30.00 },
    ],
  },
  'PEPSI 600 ML': {
    categoria: 'BEBIDAS', costo: 10.91, precio: 25,
    ingredientes: [
      { nombre: 'Pepsi 600 ml',     cantidad: 1,    unidad: 'PIEZA', costoUnitario: 10.91, costoTotal: 10.91 },
    ],
  },
  'MACARRONES': {
    categoria: 'GUARNICIONES', costo: 11.09, precio: 40,
    ingredientes: [
      { nombre: 'Macarron con queso',cantidad:0.1,  unidad: 'KILO',  costoUnitario: 38.5,  costoTotal: 3.85  },
      { nombre: 'Pure de papa',     cantidad: 0.1,  unidad: 'KILO',  costoUnitario: 30.0,  costoTotal: 3.00  },
      { nombre: 'Queso americano',  cantidad: 0.02, unidad: 'KILO',  costoUnitario: 86.5,  costoTotal: 1.73  },
    ],
  },
  'PURE DE PAPA': {
    categoria: 'GUARNICIONES', costo: 8.47, precio: 40,
    ingredientes: [
      { nombre: 'Pure de papa',     cantidad: 0.25, unidad: 'KILO',  costoUnitario: 30.0,  costoTotal: 7.50  },
      { nombre: 'Queso americano',  cantidad: 0.01, unidad: 'KILO',  costoUnitario: 86.5,  costoTotal: 0.87  },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3 — MERMAS semana 39
// ═══════════════════════════════════════════════════════════════════════════════

const MERMAS_SEM39 = [
  { producto: 'Boneless',          slug: 'boneless',          cantidad: 0.622,  unidad: 'KILO'  },
  { producto: 'Sirloin',          slug: 'sirloin',           cantidad: 16.404, unidad: 'KILO'  },
  { producto: 'Aguacate',         slug: 'aguacate',          cantidad: 0.664,  unidad: 'KILO'  },
  { producto: 'Papa blanca',      slug: 'papa_blanca',       cantidad: 0.204,  unidad: 'KILO'  },
  { producto: 'Limon',            slug: 'limon',             cantidad: 0.062,  unidad: 'KILO'  },
  { producto: 'Cebolla blanca',   slug: 'cebolla_blanca',    cantidad: 0.582,  unidad: 'KILO'  },
  { producto: 'Tortilla maiz',    slug: 'tortilla_maiz',     cantidad: 6,      unidad: 'PIEZA' },
  { producto: 'Tortilla harina',  slug: 'tortilla_harina',   cantidad: 2,      unidad: 'PIEZA' },
  { producto: 'Macarron con queso',slug:'macarron_con_queso',cantidad: 0.292,  unidad: 'KILO'  },
  { producto: 'Elote amarillo',   slug: 'elote_amarillo',    cantidad: 2,      unidad: 'PIEZA' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4 — GASTOS reales (MovimientosCaja) — muestra de septiembre 2025
// ═══════════════════════════════════════════════════════════════════════════════

const GASTOS = [
  { concepto: 'Nómina semana 35', monto: 13597, fecha: '2025-09-01', categoria: 'nomina',       proveedor: null              },
  { concepto: 'Fruteria el vaquero', monto: 1200,  fecha: '2025-09-01', categoria: 'insumos',  proveedor: 'Fruteria el vaquero'},
  { concepto: 'Tortillas Avión',  monto: 140,   fecha: '2025-09-01', categoria: 'insumos',      proveedor: 'Tortillas avion' },
  { concepto: 'Agua y Drenaje',   monto: 140,   fecha: '2025-09-01', categoria: 'servicios',    proveedor: null              },
  { concepto: 'Pepsi distribuidora', monto: 1310,fecha: '2025-09-01', categoria: 'insumos',     proveedor: 'Pepsi'           },
  { concepto: 'Real Foods',       monto: 3405,  fecha: '2025-09-01', categoria: 'insumos',      proveedor: 'Real foods'      },
  { concepto: 'Comisión Clip',    monto: 20,    fecha: '2025-09-01', categoria: 'operacion',    proveedor: null              },
  { concepto: 'Rocket Agency',    monto: 5000,  fecha: '2025-09-02', categoria: 'otro',         proveedor: null              },
  { concepto: 'Carnicería Alcón', monto: 3260,  fecha: '2025-09-03', categoria: 'insumos',      proveedor: 'Carniceria alcon'},
  { concepto: 'Kesos y Kosas',    monto: 4306,  fecha: '2025-09-03', categoria: 'insumos',      proveedor: 'Kesos y kosas'   },
  { concepto: 'Travezada',        monto: 396,   fecha: '2025-09-04', categoria: 'insumos',      proveedor: 'Travezada'       },
  { concepto: 'Aguacate (3 kg)',  monto: 210,   fecha: '2025-09-04', categoria: 'insumos',      proveedor: 'Fruteria el vaquero'},
  { concepto: 'Real Foods',       monto: 5435,  fecha: '2025-09-04', categoria: 'insumos',      proveedor: 'Real foods'      },
  { concepto: 'Tortillas San Miguel', monto: 367,fecha: '2025-09-04',categoria: 'insumos',      proveedor: 'Tortillas san miguel'},
  { concepto: 'Bimbo',            monto: 714,   fecha: '2025-09-05', categoria: 'insumos',      proveedor: 'Bimbo'           },
  { concepto: 'Nómina semana 36', monto: 13200, fecha: '2025-09-08', categoria: 'nomina',       proveedor: null              },
  { concepto: 'Real Foods',       monto: 4120,  fecha: '2025-09-09', categoria: 'insumos',      proveedor: 'Real foods'      },
  { concepto: 'Taga alimentos',   monto: 2850,  fecha: '2025-09-10', categoria: 'insumos',      proveedor: 'Taga alimentos'  },
  { concepto: 'Nómina semana 37', monto: 13597, fecha: '2025-09-15', categoria: 'nomina',       proveedor: null              },
  { concepto: 'Carnicería Alcón', monto: 2363,  fecha: '2025-09-23', categoria: 'insumos',      proveedor: 'Carniceria alcon'},
  { concepto: 'Real Foods',       monto: 4986,  fecha: '2025-09-22', categoria: 'insumos',      proveedor: 'Real foods'      },
  { concepto: 'Pepsi semana 39',  monto: 1645,  fecha: '2025-09-22', categoria: 'insumos',      proveedor: 'Pepsi'           },
  { concepto: 'Kesos y Kosas',    monto: 3186,  fecha: '2025-09-25', categoria: 'insumos',      proveedor: 'Kesos y kosas'   },
  { concepto: 'Taga alimentos',   monto: 4468,  fecha: '2025-09-27', categoria: 'insumos',      proveedor: 'Taga alimentos'  },
  { concepto: 'Fruteria el vaquero',monto:1134, fecha: '2025-09-27', categoria: 'insumos',      proveedor: 'Fruteria el vaquero'},
  { concepto: 'Bimbo',            monto: 855,   fecha: '2025-09-26', categoria: 'insumos',      proveedor: 'Bimbo'           },
  { concepto: 'Nómina semana 39', monto: 13597, fecha: '2025-09-29', categoria: 'nomina',       proveedor: null              },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 5 — EMPLEADOS activos
// ═══════════════════════════════════════════════════════════════════════════════

const EMPLEADOS = [
  { nombre: 'Marco Antonio Caldera Paz',     puesto: 'SUPERVISOR',  salarioDiario: 428.57, sucursal: 'SAN FCO',     fechaIngreso: '2019-10-25', estatus: 'ACTIVO' },
  { nombre: 'Margarita Arias Díaz',          puesto: 'CAJERO',      salarioDiario: 285.72, sucursal: 'SAN FCO',     fechaIngreso: '2024-08-01', estatus: 'ACTIVO' },
  { nombre: 'Mónica Mancilla Contreras',     puesto: 'AYUDANTE',    salarioDiario: 242.00, sucursal: 'SAN FCO',     fechaIngreso: '2025-06-24', estatus: 'ACTIVO' },
  { nombre: 'Tania Leija Cristal',           puesto: 'CAJERO',      salarioDiario: 285.72, sucursal: 'SAN FCO',     fechaIngreso: '2025-09-29', estatus: 'ACTIVO' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES SEED
// ═══════════════════════════════════════════════════════════════════════════════

async function seedProductos() {
  console.log('\n🍔 Subiendo productos…');
  const bw = createBatchWriter();
  let productoIds = {};

  for (let i = 0; i < PRODUCTOS.length; i++) {
    const p = PRODUCTOS[i];
    const slug = slugify(p.nombre);
    productoIds[p.nombre] = slug;
    const vendidosSem39 = VENTAS_SEM39[p.nombre] || 0;
    const cantPorDia = vendidosSem39 > 0 ? { [FECHA_SEM39]: vendidosSem39 } : {};

    bw.set(db.collection('productos').doc(slug), {
      nombre: p.nombre,
      descripcion: `${p.nombre} — ${p.categoria}`,
      precio: p.precio,
      costoProduccion: p.costo,
      margenPorcentaje: Math.round(((p.precio - p.costo) / p.precio) * 100),
      categoriaId: slugify(p.categoria),
      categoriaNombre: p.categoria,
      disponible: true,
      eliminado: false,
      popularidad: vendidosSem39,
      cantidadVendidaPorDia: cantPorDia,
      cantidadVendidaPorTurno: {},
      icono: CAT_ICON[p.categoria] || '🍽️',
      orden: i + 1,
      creadoPor: 'seed-excel',
      fechaCreacion: ts('2025-09-01'),
      fechaActualizacion: ts('2025-09-22'),
    });
  }
  await bw.commit();
  console.log(`  ✅ ${PRODUCTOS.length} productos`);
  return productoIds;
}

async function seedRecetas() {
  console.log('\n📋 Subiendo recetas…');
  const bw = createBatchWriter();
  let count = 0;

  for (const [nombre, receta] of Object.entries(RECETAS)) {
    const slug = slugify(nombre);
    const costoTotal = receta.ingredientes.reduce((acc, i) => acc + i.costoTotal, 0);
    bw.set(db.collection('recetas').doc(slug), {
      nombre,
      categoria: receta.categoria,
      precio: receta.precio,
      costoTotal: Math.round(costoTotal * 100) / 100,
      margen: Math.round(((receta.precio - costoTotal) / receta.precio) * 100),
      ingredientes: receta.ingredientes.map(ing => ({
        ingredienteId: slugify(ing.nombre),
        ingredienteNombre: ing.nombre,
        cantidad: ing.cantidad,
        unidadMedida: ing.unidad,
        costoUnitario: ing.costoUnitario,
        costoTotal: ing.costoTotal,
      })),
      activo: true,
      creadoPor: 'seed-excel',
      fechaCreacion: ts('2025-09-01'),
    });
    count++;
  }
  await bw.commit();
  console.log(`  ✅ ${count} recetas`);
}

async function seedMermas() {
  console.log('\n🗑️  Subiendo mermas semana 39…');
  const bw = createBatchWriter();
  for (const m of MERMAS_SEM39) {
    bw.set(db.collection('MovimientosInventario').doc(), {
      ingrediente_id: m.slug,
      ingredienteNombre: m.producto,
      tipo: 'merma',
      cantidad: m.cantidad,
      costo_unitario: null,
      costoTotal: null,
      stockAnterior: 0,
      stockNuevo: 0,
      motivo: 'Merma registrada semana 39 — conteo físico',
      usuarioId: 'seed-excel',
      usuarioNombre: 'Importación Excel',
      fecha: ts('2025-09-28'),
    });
  }
  await bw.commit();
  console.log(`  ✅ ${MERMAS_SEM39.length} mermas`);
}

async function seedGastos() {
  console.log('\n💸 Subiendo gastos (MovimientosCaja)…');
  // Necesitamos un turno_id ficticio para referencia
  const turnoRef = db.collection('turnos').doc('turno_seed_sep2025');
  await turnoRef.set({
    cajeroId: 'seed-excel',
    cajeroNombre: 'Marco Antonio Caldera',
    fecha: '2025-09-01',
    estado: 'cerrado',
    tipoTurno: 'matutino',
    fondoInicial: 800,
    horaApertura: ts('2025-09-01'),
    horaCierre: ts('2025-09-29'),
    notas: 'Turno seed — gastos septiembre 2025',
  }, { merge: true });

  const bw = createBatchWriter();
  for (const g of GASTOS) {
    bw.set(db.collection('MovimientosCaja').doc(), {
      turno_id: 'turno_seed_sep2025',
      tipo: 'egreso',
      monto: g.monto,
      concepto: g.concepto,
      descripcion: g.proveedor ? `Pago a ${g.proveedor}` : g.concepto,
      categoria: g.categoria,
      fecha: ts(g.fecha),
      usuario_id: 'seed-excel',
      usuarioNombre: 'Marco Antonio Caldera',
    });
  }
  await bw.commit();
  console.log(`  ✅ ${GASTOS.length} gastos`);
}

async function seedEmpleados() {
  console.log('\n👥 Subiendo empleados activos…');
  const bw = createBatchWriter();
  for (const e of EMPLEADOS) {
    const slug = slugify(e.nombre);
    bw.set(db.collection('Empleados').doc(slug), {
      nombre: e.nombre,
      puesto: e.puesto,
      salarioDiario: e.salarioDiario,
      salarioSemanal: Math.round(e.salarioDiario * 7 * 100) / 100,
      sucursal: e.sucursal,
      fechaIngreso: ts(e.fechaIngreso),
      estatus: e.estatus,
      activo: e.estatus === 'ACTIVO',
      creadoPor: 'seed-excel',
      creadoEn: ts('2025-09-01'),
    });
  }
  await bw.commit();
  console.log(`  ✅ ${EMPLEADOS.length} empleados`);
}

// Agregar regla Empleados a firestore.rules necesaria
async function main() {
  console.log('🚀 Seed completo — Dark Kitchen CRM');
  console.log(`   Proyecto: ${sa.project_id}`);
  try {
    await seedProductos();
    await seedRecetas();
    await seedMermas();
    await seedGastos();
    await seedEmpleados();
    console.log('\n🎉 Seed completo exitosamente.\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message, err);
    process.exit(1);
  }
}

main();
