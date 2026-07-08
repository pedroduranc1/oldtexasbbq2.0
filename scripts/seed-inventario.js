/**
 * Seed de inventario — datos reales semana 39
 * Fuente: Copia de 04-Flujo de inventario semana 39.xlsx
 *
 * Ejecutar: node scripts/seed-inventario.js
 */

const admin = require('firebase-admin');
const sa = require('../docs/firebase-admin.json');

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const { Timestamp } = admin.firestore;

// ─── Ingredientes (61 productos del Excel) ─────────────────────────────────────

const INGREDIENTES = [
  { nombre: 'Boneless',                categoria: 'CONGELADOS',        unidadMedida: 'KILO',   precioPorUnidad: 123.00, stockActual: 40.05, stockMinimo: 8.0,   stockMaximo: 80.0   },
  { nombre: 'Palomitas de pollo',      categoria: 'CONGELADOS',        unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 5.0,   stockMaximo: 20.0   },
  { nombre: 'Papas fritas',            categoria: 'CONGELADOS',        unidadMedida: 'KILO',   precioPorUnidad: 42.83,  stockActual: 32.64, stockMinimo: 6.0,   stockMaximo: 65.0   },
  { nombre: 'Carne Hamburguesa',       categoria: 'PROTEINAS',         unidadMedida: 'PIEZA',  precioPorUnidad: 8.50,   stockActual: 278,   stockMinimo: 50.0,  stockMaximo: 500.0  },
  { nombre: 'Sirloin',                categoria: 'PROTEINAS',         unidadMedida: 'KILO',   precioPorUnidad: 154.00, stockActual: 35.0,  stockMinimo: 7.0,   stockMaximo: 70.0   },
  { nombre: 'Costilla de cerdo',      categoria: 'PROTEINAS',         unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 5.0,   stockMaximo: 20.0   },
  { nombre: 'Jamon',                  categoria: 'PROTEINAS',         unidadMedida: 'KILO',   precioPorUnidad: 53.00,  stockActual: 4.0,   stockMinimo: 2.0,   stockMaximo: 10.0   },
  { nombre: 'Queso americano',        categoria: 'ABARROTES',         unidadMedida: 'KILO',   precioPorUnidad: 77.22,  stockActual: 3.6,   stockMinimo: 1.0,   stockMaximo: 8.0    },
  { nombre: 'Salchicha polaka',       categoria: 'PROTEINAS',         unidadMedida: 'PIEZA',  precioPorUnidad: 39.61,  stockActual: 10,    stockMinimo: 5.0,   stockMaximo: 30.0   },
  { nombre: 'Tocino',                categoria: 'PROTEINAS',         unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 2.0,   stockMaximo: 10.0   },
  { nombre: 'Aguacate',              categoria: 'VERDURAS',          unidadMedida: 'KILO',   precioPorUnidad: 60.00,  stockActual: 10.0,  stockMinimo: 3.0,   stockMaximo: 20.0   },
  { nombre: 'Papa blanca',           categoria: 'VERDURAS',          unidadMedida: 'KILO',   precioPorUnidad: 15.00,  stockActual: 35.62, stockMinimo: 8.0,   stockMaximo: 70.0   },
  { nombre: 'Tomate',                categoria: 'VERDURAS',          unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 3.0,   stockMaximo: 15.0   },
  { nombre: 'Limon',                 categoria: 'VERDURAS',          unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 2.0,   stockMaximo: 10.0   },
  { nombre: 'Chile jalapeño',        categoria: 'VERDURAS',          unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Cebolla blanca',        categoria: 'VERDURAS',          unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 2.0,   stockMaximo: 10.0   },
  { nombre: 'Pan Hamburguesa',       categoria: 'ABARROTES',         unidadMedida: 'PIEZA',  precioPorUnidad: 5.94,   stockActual: 144,   stockMinimo: 30.0,  stockMaximo: 300.0  },
  { nombre: 'Pay de queso',          categoria: 'POSTRES',           unidadMedida: 'PIEZA',  precioPorUnidad: 30.00,  stockActual: 26,    stockMinimo: 5.0,   stockMaximo: 50.0   },
  { nombre: 'Tortilla maiz',         categoria: 'ABARROTES',         unidadMedida: 'PIEZA',  precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 50.0,  stockMaximo: 500.0  },
  { nombre: 'Tortilla harina',       categoria: 'ABARROTES',         unidadMedida: 'PIEZA',  precioPorUnidad: 0.93,   stockActual: 150,   stockMinimo: 30.0,  stockMaximo: 300.0  },
  { nombre: 'Desechable 7x7 liso',   categoria: 'INSUMOS EMPAQUE',   unidadMedida: 'PIEZA',  precioPorUnidad: 1.96,   stockActual: 800,   stockMinimo: 100.0, stockMaximo: 2000.0 },
  { nombre: 'Desechable hamburguesa', categoria: 'INSUMOS EMPAQUE',  unidadMedida: 'PIEZA',  precioPorUnidad: 0.978,  stockActual: 1000,  stockMinimo: 100.0, stockMaximo: 2000.0 },
  { nombre: 'Desechable 855',        categoria: 'INSUMOS EMPAQUE',   unidadMedida: 'PIEZA',  precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 50.0,  stockMaximo: 500.0  },
  { nombre: 'Bolsa camiseta mediana',categoria: 'INSUMOS EMPAQUE',   unidadMedida: 'KILO',   precioPorUnidad: 52.20,  stockActual: 2.0,   stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Bolsa camiseta grande', categoria: 'INSUMOS EMPAQUE',   unidadMedida: 'KILO',   precioPorUnidad: 52.20,  stockActual: 2.0,   stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Bolsa basura',          categoria: 'INSUMOS EMPAQUE',   unidadMedida: 'KILO',   precioPorUnidad: 48.00,  stockActual: 2.865, stockMinimo: 1.0,   stockMaximo: 6.0    },
  { nombre: 'Bolsa bollo',           categoria: 'INSUMOS EMPAQUE',   unidadMedida: 'KILO',   precioPorUnidad: 67.00,  stockActual: 5.87,  stockMinimo: 1.0,   stockMaximo: 12.0   },
  { nombre: 'Pepsi 600 ml',          categoria: 'BEBIDAS',           unidadMedida: 'PIEZA',  precioPorUnidad: 10.91,  stockActual: 48,    stockMinimo: 12.0,  stockMaximo: 96.0   },
  { nombre: 'Mirinda 600 ml',        categoria: 'BEBIDAS',           unidadMedida: 'PIEZA',  precioPorUnidad: 10.91,  stockActual: 24,    stockMinimo: 6.0,   stockMaximo: 48.0   },
  { nombre: '7up 600 ml',            categoria: 'BEBIDAS',           unidadMedida: 'PIEZA',  precioPorUnidad: 10.91,  stockActual: 12,    stockMinimo: 6.0,   stockMaximo: 24.0   },
  { nombre: 'Manzanita 600 ml',      categoria: 'BEBIDAS',           unidadMedida: 'PIEZA',  precioPorUnidad: 10.91,  stockActual: 12,    stockMinimo: 6.0,   stockMaximo: 24.0   },
  { nombre: 'Pepsi light 600 ml',    categoria: 'BEBIDAS',           unidadMedida: 'PIEZA',  precioPorUnidad: 10.91,  stockActual: 0,     stockMinimo: 6.0,   stockMaximo: 24.0   },
  { nombre: 'Pepsi 2 Litros',        categoria: 'BEBIDAS',           unidadMedida: 'PIEZA',  precioPorUnidad: 28.00,  stockActual: 16,    stockMinimo: 6.0,   stockMaximo: 32.0   },
  { nombre: 'Salsa bbq',             categoria: 'SALSAS Y ADEREZOS', unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Salsa buffalo',         categoria: 'SALSAS Y ADEREZOS', unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Salsa Mango habanero',  categoria: 'SALSAS Y ADEREZOS', unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Salsa Lemon pepper',    categoria: 'SALSAS Y ADEREZOS', unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Salsa p/tacos',         categoria: 'SALSAS Y ADEREZOS', unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Aderezo ranch',         categoria: 'SALSAS Y ADEREZOS', unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Aderezo queso',         categoria: 'SALSAS Y ADEREZOS', unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Aderezo Mayonesa',      categoria: 'SALSAS Y ADEREZOS', unidadMedida: 'KILO',   precioPorUnidad: 33.23,  stockActual: 3.52,  stockMinimo: 1.0,   stockMaximo: 8.0    },
  { nombre: 'Salsa catsup',          categoria: 'SALSAS Y ADEREZOS', unidadMedida: 'KILO',   precioPorUnidad: 23.92,  stockActual: 3.72,  stockMinimo: 1.0,   stockMaximo: 8.0    },
  { nombre: 'Sazonador Pimienta Limon', categoria: 'ESPECIAS',       unidadMedida: 'KILO',   precioPorUnidad: 64.00,  stockActual: 1.5,   stockMinimo: 0.5,   stockMaximo: 4.0    },
  { nombre: 'Ajo molido',            categoria: 'ESPECIAS',          unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 0.2,   stockMaximo: 1.0    },
  { nombre: 'Pimienta molida',       categoria: 'ESPECIAS',          unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 0.2,   stockMaximo: 1.0    },
  { nombre: 'Sazonador hamburguesa', categoria: 'ESPECIAS',          unidadMedida: 'KILO',   precioPorUnidad: 68.90,  stockActual: 1.01,  stockMinimo: 0.3,   stockMaximo: 3.0    },
  { nombre: 'Sazonador Finas hierbas',categoria:'ESPECIAS',          unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 0.2,   stockMaximo: 1.0    },
  { nombre: 'Azucar',                categoria: 'ABARROTES',         unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Sal',                   categoria: 'ESPECIAS',          unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Carbon',                categoria: 'ABARROTES',         unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 5.0,   stockMaximo: 30.0   },
  { nombre: 'Pure de papa',          categoria: 'ABARROTES',         unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Macarron con queso',    categoria: 'ABARROTES',         unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Sopa coditos #2',       categoria: 'ABARROTES',         unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Papel ajedrez',         categoria: 'INSUMOS EMPAQUE',   unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Aluminio',              categoria: 'INSUMOS EMPAQUE',   unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 0.5,   stockMaximo: 3.0    },
  { nombre: 'Papel film',            categoria: 'INSUMOS EMPAQUE',   unidadMedida: 'PIEZA',  precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 1.0,   stockMaximo: 5.0    },
  { nombre: 'Sobre catsup',          categoria: 'INSUMOS EMPAQUE',   unidadMedida: 'PIEZA',  precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 50.0,  stockMaximo: 500.0  },
  { nombre: 'Separador hamburguesa', categoria: 'INSUMOS EMPAQUE',   unidadMedida: 'KILO',   precioPorUnidad: 0,      stockActual: 0,     stockMinimo: 0.5,   stockMaximo: 3.0    },
  { nombre: 'Galletas saladas',      categoria: 'ABARROTES',         unidadMedida: 'PIEZA',  precioPorUnidad: 1.10,   stockActual: 200,   stockMinimo: 30.0,  stockMaximo: 400.0  },
  { nombre: 'Aceite',                categoria: 'ABARROTES',         unidadMedida: 'LITRO',  precioPorUnidad: 34.00,  stockActual: 20.0,  stockMinimo: 5.0,   stockMaximo: 40.0   },
  { nombre: 'Elote Amarillo',        categoria: 'CONGELADOS',        unidadMedida: 'PIEZA',  precioPorUnidad: 14.27,  stockActual: 12,    stockMinimo: 4.0,   stockMaximo: 24.0   },
];

const PROVEEDORES = [
  { nombre: 'Real foods',                 contacto: 'Vendedor Real foods',       email: 'ventas@realfoods.mx',        telefono: '8110000001' },
  { nombre: 'Pepsi',                      contacto: 'Distribuidor Pepsi',        email: 'pepsi@distribuidora.mx',     telefono: '8110000002' },
  { nombre: 'Bimbo',                      contacto: 'Vendedor Bimbo',            email: 'bimbo@distribuidora.mx',     telefono: '8110000003' },
  { nombre: 'Fruteria el vaquero',        contacto: 'El Vaquero',                email: 'vaquero@fruteria.mx',        telefono: '8110000004' },
  { nombre: 'Carniceria alcon',           contacto: 'Carnicería Alcón',          email: 'alcon@carniceria.mx',        telefono: '8110000005' },
  { nombre: 'Taga alimentos',             contacto: 'Taga Alimentos',            email: 'ventas@taga.mx',             telefono: '8110000006' },
  { nombre: 'Kesos y kosas',              contacto: 'Kesos y Kosas',             email: 'contacto@kesosykosas.mx',    telefono: '8110000007' },
  { nombre: 'Don Marco',                  contacto: 'Don Marco',                 email: 'donmarco@proveedores.mx',    telefono: '8110000008' },
  { nombre: 'Travezada',                  contacto: 'Travezada',                 email: 'travezada@proveedor.mx',     telefono: '8110000009' },
  { nombre: 'Tortillas avion',            contacto: 'Tortillas Avión',           email: 'avion@tortillas.mx',         telefono: '8110000010' },
  { nombre: 'Tortillas san miguel',       contacto: 'San Miguel',                email: 'sanmiguel@tortillas.mx',     telefono: '8110000011' },
  { nombre: 'Bodega aurrera',             contacto: 'Bodega Aurrerá',            email: 'compras@aurrera.mx',         telefono: '8110000012' },
  { nombre: 'Comercializadora SF',        contacto: 'Comercializadora SF',       email: 'sf@comercializadora.mx',     telefono: '8110000013' },
  { nombre: 'Oferton de cantu',           contacto: 'Ofertón de Cantú',          email: 'oferton@cantu.mx',           telefono: '8110000014' },
  { nombre: 'Carnes G',                   contacto: 'Carnes G',                  email: 'carnesg@proveedor.mx',       telefono: '8110000015' },
  { nombre: 'Salchichoneria Grandy',      contacto: 'Grandy',                    email: 'grandy@salchichoneria.mx',   telefono: '8110000016' },
  { nombre: 'Hr desechables',             contacto: 'HR Desechables',            email: 'hr@desechables.mx',          telefono: '8110000017' },
  { nombre: 'Doña bolsa multicomercial',  contacto: 'Doña Bolsa',               email: 'dona@bolsamulti.mx',         telefono: '8110000018' },
];

const ENTRADAS = [
  { producto: 'Boneless',               cantidad: 30.00,  precio: 125.00,  fecha: '2025-09-22', proveedor: 'Real foods',         pago: 'Transferencia' },
  { producto: 'Sirloin',               cantidad: 5.00,   precio: 154.00,  fecha: '2025-09-22', proveedor: 'Real foods',         pago: 'Efectivo'      },
  { producto: 'Aceite',                cantidad: 10.00,  precio: 34.00,   fecha: '2025-09-22', proveedor: 'Real foods',         pago: 'Efectivo'      },
  { producto: 'Tortilla harina',       cantidad: 150.00, precio: 0.93,    fecha: '2025-09-22', proveedor: 'Tortillas avion',    pago: 'Efectivo'      },
  { producto: 'Pepsi 600 ml',          cantidad: 48.00,  precio: 10.91,   fecha: '2025-09-22', proveedor: 'Pepsi',              pago: 'Transferencia' },
  { producto: 'Mirinda 600 ml',        cantidad: 24.00,  precio: 10.91,   fecha: '2025-09-22', proveedor: 'Pepsi',              pago: 'Transferencia' },
  { producto: '7up 600 ml',            cantidad: 12.00,  precio: 10.91,   fecha: '2025-09-22', proveedor: 'Pepsi',              pago: 'Transferencia' },
  { producto: 'Manzanita 600 ml',      cantidad: 12.00,  precio: 10.91,   fecha: '2025-09-22', proveedor: 'Pepsi',              pago: 'Transferencia' },
  { producto: 'Pepsi 2 Litros',        cantidad: 16.00,  precio: 28.00,   fecha: '2025-09-22', proveedor: 'Pepsi',              pago: 'Transferencia' },
  { producto: 'Sazonador hamburguesa', cantidad: 1.01,   precio: 68.90,   fecha: '2025-09-23', proveedor: 'Carniceria alcon',   pago: 'Efectivo'      },
  { producto: 'Carne Hamburguesa',     cantidad: 278.00, precio: 8.50,    fecha: '2025-09-23', proveedor: 'Carniceria alcon',   pago: 'Efectivo'      },
  { producto: 'Salchicha polaka',      cantidad: 10.00,  precio: 39.61,   fecha: '2025-09-25', proveedor: 'Travezada',          pago: 'Efectivo'      },
  { producto: 'Pan Hamburguesa',       cantidad: 144.00, precio: 5.94,    fecha: '2025-09-26', proveedor: 'Bimbo',              pago: 'Efectivo'      },
  { producto: 'Sirloin',              cantidad: 30.00,  precio: 154.00,  fecha: '2025-09-26', proveedor: 'Real foods',         pago: 'Efectivo'      },
  { producto: 'Desechable 7x7 liso',  cantidad: 800.00, precio: 1.96,    fecha: '2025-09-25', proveedor: 'Kesos y kosas',      pago: 'Efectivo'      },
  { producto: 'Desechable hamburguesa',cantidad:1000.00, precio: 0.978,   fecha: '2025-09-25', proveedor: 'Kesos y kosas',      pago: 'Efectivo'      },
  { producto: 'Bolsa bollo',           cantidad: 5.87,   precio: 67.00,   fecha: '2025-09-25', proveedor: 'Kesos y kosas',      pago: 'Efectivo'      },
  { producto: 'Bolsa camiseta grande', cantidad: 2.00,   precio: 52.20,   fecha: '2025-09-25', proveedor: 'Kesos y kosas',      pago: 'Efectivo'      },
  { producto: 'Bolsa camiseta mediana',cantidad: 2.00,   precio: 52.20,   fecha: '2025-09-25', proveedor: 'Kesos y kosas',      pago: 'Efectivo'      },
  { producto: 'Bolsa basura',          cantidad: 2.865,  precio: 48.00,   fecha: '2025-09-25', proveedor: 'Kesos y kosas',      pago: 'Efectivo'      },
  { producto: 'Papa blanca',           cantidad: 35.62,  precio: 15.00,   fecha: '2025-09-27', proveedor: 'Fruteria el vaquero',pago: 'Efectivo'      },
  { producto: 'Aguacate',              cantidad: 10.00,  precio: 60.00,   fecha: '2025-09-27', proveedor: 'Fruteria el vaquero',pago: 'Efectivo'      },
  { producto: 'Papas fritas',          cantidad: 32.64,  precio: 42.83,   fecha: '2025-09-27', proveedor: 'Taga alimentos',     pago: 'Efectivo'      },
  { producto: 'Aceite',                cantidad: 10.00,  precio: 38.50,   fecha: '2025-09-27', proveedor: 'Taga alimentos',     pago: 'Efectivo'      },
  { producto: 'Salsa catsup',          cantidad: 3.72,   precio: 23.92,   fecha: '2025-09-27', proveedor: 'Taga alimentos',     pago: 'Efectivo'      },
  { producto: 'Aderezo Mayonesa',      cantidad: 3.52,   precio: 33.23,   fecha: '2025-09-27', proveedor: 'Taga alimentos',     pago: 'Efectivo'      },
  { producto: 'Boneless',              cantidad: 10.05,  precio: 123.00,  fecha: '2025-09-27', proveedor: 'Taga alimentos',     pago: 'Efectivo'      },
  { producto: 'Galletas saladas',      cantidad: 200.00, precio: 1.10,    fecha: '2025-09-27', proveedor: 'Taga alimentos',     pago: 'Efectivo'      },
  { producto: 'Elote Amarillo',        cantidad: 12.00,  precio: 14.273,  fecha: '2025-09-27', proveedor: 'Taga alimentos',     pago: 'Efectivo'      },
  { producto: 'Queso americano',       cantidad: 3.60,   precio: 77.22,   fecha: '2025-09-27', proveedor: 'Taga alimentos',     pago: 'Efectivo'      },
  { producto: 'Jamon',                cantidad: 4.00,   precio: 53.00,   fecha: '2025-09-27', proveedor: 'Taga alimentos',     pago: 'Efectivo'      },
  { producto: 'Pay de queso',         cantidad: 26.00,  precio: 30.00,   fecha: '2025-09-27', proveedor: 'Don Marco',          pago: 'Efectivo'      },
  { producto: 'Sazonador Pimienta Limon',cantidad: 1.50, precio: 64.00,  fecha: '2025-09-27', proveedor: 'Don Marco',          pago: 'Efectivo'      },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ─── Seed functions ───────────────────────────────────────────────────────────

async function seedProveedores() {
  console.log('\n🏭 Subiendo proveedores…');
  const batch = db.batch();
  for (const p of PROVEEDORES) {
    const ref = db.collection('Proveedores').doc();
    batch.set(ref, {
      ...p,
      activo: true,
      creadoPor: 'seed-excel',
      creadoEn: Timestamp.fromDate(new Date('2025-09-22')),
    });
  }
  await batch.commit();
  console.log(`  ✅ ${PROVEEDORES.length} proveedores`);
}

async function seedIngredientes() {
  console.log('\n🥩 Subiendo ingredientes…');
  const idMap = {};
  const LOTE = 40;
  for (let i = 0; i < INGREDIENTES.length; i += LOTE) {
    const batch = db.batch();
    const trozo = INGREDIENTES.slice(i, i + LOTE);
    for (const ing of trozo) {
      const slug = slugify(ing.nombre);
      const ref = db.collection('ingredientes').doc(slug);
      idMap[ing.nombre] = slug;
      batch.set(ref, {
        ...ing,
        activo: true,
        creadoPor: 'seed-excel',
        fechaCreacion: Timestamp.fromDate(new Date('2025-09-22')),
        ultimaActualizacion: Timestamp.fromDate(new Date('2025-09-22')),
      });
    }
    await batch.commit();
  }
  console.log(`  ✅ ${INGREDIENTES.length} ingredientes`);
  return idMap;
}

async function seedMovimientos(idMap) {
  console.log('\n📋 Subiendo movimientos de entrada (semana 39)…');
  const batch = db.batch();
  for (const e of ENTRADAS) {
    const ingrediente_id = idMap[e.producto] || slugify(e.producto);
    const ref = db.collection('MovimientosInventario').doc();
    batch.set(ref, {
      ingrediente_id,
      ingredienteNombre: e.producto,
      tipo: 'entrada',
      cantidad: e.cantidad,
      costo_unitario: e.precio,
      costoTotal: Math.round(e.cantidad * e.precio * 100) / 100,
      stockAnterior: 0,
      stockNuevo: e.cantidad,
      motivo: `Compra semana 39 — ${e.proveedor}`,
      proveedorNombre: e.proveedor,
      usuarioId: 'seed-excel',
      usuarioNombre: 'Importación Excel',
      fecha: Timestamp.fromDate(new Date(e.fecha + 'T10:00:00')),
    });
  }
  await batch.commit();
  console.log(`  ✅ ${ENTRADAS.length} movimientos`);
}

async function main() {
  console.log('🚀 Seed inventario — datos reales semana 39');
  console.log(`   Proyecto: ${sa.project_id}`);
  try {
    await seedProveedores();
    const idMap = await seedIngredientes();
    await seedMovimientos(idMap);
    console.log('\n🎉 Seed completado exitosamente.\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
