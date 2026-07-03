/**
 * setup-firebase.js
 * Old Texas BBQ - CRM
 *
 * Estructura el proyecto Firebase desde cero:
 *   1. Seed de ConceptosFinancieros
 *   2. Seed de Categorías base
 *   3. Seed de Configuración global
 *   4. Documento de usuario admin inicial
 *
 * Uso: node scripts/setup-firebase.js
 */

const admin = require('firebase-admin');
const sa = require('../docs/firebase-admin.json');

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const PROJECT_ID = sa.project_id;
const now = () => FieldValue.serverTimestamp();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function upsert(coleccion, id, data) {
  const ref = id ? db.collection(coleccion).doc(id) : db.collection(coleccion).doc();
  const exists = (await ref.get()).exists;
  if (exists) {
    console.log(`  ⏭  ${coleccion}/${id ?? ref.id} ya existe — omitido`);
    return;
  }
  await ref.set({ ...data, fechaCreacion: now(), fechaActualizacion: now() });
  console.log(`  ✅ ${coleccion}/${id ?? ref.id}`);
}

async function batchWrite(coleccion, items) {
  const chunks = [];
  for (let i = 0; i < items.length; i += 400) chunks.push(items.slice(i, i + 400));
  for (const chunk of chunks) {
    const batch = db.batch();
    for (const item of chunk) {
      const ref = item.id
        ? db.collection(coleccion).doc(item.id)
        : db.collection(coleccion).doc();
      const exists = (await ref.get()).exists;
      if (!exists) batch.set(ref, { ...item.data, fechaCreacion: now(), fechaActualizacion: now() });
      else console.log(`  ⏭  ${coleccion}/${item.id ?? ref.id} ya existe`);
    }
    await batch.commit();
  }
}

// ── 1. Conceptos Financieros ─────────────────────────────────────────────────

async function seedConceptosFinancieros() {
  console.log('\n📂 ConceptosFinancieros');
  const conceptos = [
    // INGRESOS
    { tipo: 'ingreso', nombre: 'Venta mostrador',        orden: 1,  activo: true },
    { tipo: 'ingreso', nombre: 'Venta delivery',         orden: 2,  activo: true },
    { tipo: 'ingreso', nombre: 'Anticipo cliente',       orden: 3,  activo: true },
    { tipo: 'ingreso', nombre: 'Recuperación faltante',  orden: 4,  activo: true },
    { tipo: 'ingreso', nombre: 'Venta por aplicación',   orden: 5,  activo: true },
    { tipo: 'ingreso', nombre: 'Otro ingreso',           orden: 99, activo: true },
    // EGRESOS
    { tipo: 'egreso',  nombre: 'Compra insumos',                orden: 1,  activo: true },
    { tipo: 'egreso',  nombre: 'Pago proveedor',                orden: 2,  activo: true },
    { tipo: 'egreso',  nombre: 'Nómina',                        orden: 3,  activo: true },
    { tipo: 'egreso',  nombre: 'Servicios (agua/luz/gas)',       orden: 4,  activo: true },
    { tipo: 'egreso',  nombre: 'Mantenimiento',                 orden: 5,  activo: true },
    { tipo: 'egreso',  nombre: 'Retiro para depósito',          orden: 6,  activo: true },
    { tipo: 'egreso',  nombre: 'Comisión repartidor',           orden: 7,  activo: true },
    { tipo: 'egreso',  nombre: 'Gastos de limpieza',            orden: 8,  activo: true },
    { tipo: 'egreso',  nombre: 'Gastos varios',                 orden: 9,  activo: true },
    { tipo: 'egreso',  nombre: 'Otro egreso',                   orden: 99, activo: true },
  ];
  for (const c of conceptos) {
    await db.collection('ConceptosFinancieros').add({ ...c, fechaCreacion: now() });
    console.log(`  ✅ [${c.tipo}] ${c.nombre}`);
  }
}

// ── 2. Categorías de productos ───────────────────────────────────────────────

async function seedCategorias() {
  console.log('\n📂 Categorias');
  const cats = [
    { id: 'brisket',    nombre: 'Brisket',       descripcion: 'Cortes de pecho de res ahumado', orden: 1, activa: true, emoji: '🥩' },
    { id: 'costillas',  nombre: 'Costillas',      descripcion: 'Costillas de res y cerdo',        orden: 2, activa: true, emoji: '🍖' },
    { id: 'combos',     nombre: 'Combos',         descripcion: 'Combinaciones especiales',        orden: 3, activa: true, emoji: '🍽️' },
    { id: 'sides',      nombre: 'Sides',          descripcion: 'Guarniciones y acompañamientos',  orden: 4, activa: true, emoji: '🥗' },
    { id: 'bebidas',    nombre: 'Bebidas',         descripcion: 'Refrescos y aguas',               orden: 5, activa: true, emoji: '🥤' },
    { id: 'postres',    nombre: 'Postres',         descripcion: 'Dulces y postres',                orden: 6, activa: true, emoji: '🍮' },
    { id: 'extras',     nombre: 'Extras',          descripcion: 'Salsas, panes y otros extras',    orden: 7, activa: true, emoji: '🫙' },
  ];
  for (const cat of cats) {
    const { id, ...data } = cat;
    await upsert('categorias', id, data);
  }
}

// ── 3. Configuración global ──────────────────────────────────────────────────

async function seedConfiguracion() {
  console.log('\n📂 Configuracion');
  await upsert('configuracion', 'general', {
    negocio: {
      nombre: 'Old Texas BBQ',
      telefono: '',
      direccion: '',
      horarioApertura: '13:00',
      horarioCierre: '22:00',
    },
    caja: {
      fondoEstandar: 800,
      umbralDepositoAlerta: 6000,
      umbralDescuadreWarning: 50,
      umbralDescuadreCritico: 200,
      turnoHorasMaximas: 10,
      // Correos con acceso total a Caja — pueden operar cualquier turno
      // sin restricción de solo-lectura, sin importar quién lo abrió.
      accesoTotalEmails: [],
    },
    delivery: {
      costoEnvioDefault: 50,
      radioMaximoKm: 15,
    },
    version: '2.0.0',
  });
}

// ── 4. Reglas de Firestore (info doc) ────────────────────────────────────────

async function seedMetadata() {
  console.log('\n📂 _metadata');
  await upsert('_metadata', 'proyecto', {
    nombre: 'Old Texas BBQ CRM',
    version: '2.0.0',
    setupAt: now(),
    colecciones: [
      'usuarios', 'pedidos', 'productos', 'categorias',
      'turnos', 'MovimientosCaja', 'CierresCaja', 'ConceptosFinancieros',
      'repartidores', 'colonias', 'configuracion', 'notificaciones',
    ],
  });
}

// ── 5. Usuario admin inicial ─────────────────────────────────────────────────

async function infoAdminUser() {
  console.log('\n👤 Usuario Admin');
  console.log('  ℹ️  Para crear el usuario admin, usa la app de CRM:');
  console.log('     1. Crea la cuenta en Firebase Auth (email/password)');
  console.log('     2. O ejecuta: node scripts/create-admin.js <email> <password> <nombre>');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔥 Estructurando proyecto Firebase: ${PROJECT_ID}`);
  console.log('─'.repeat(50));

  try {
    await seedConceptosFinancieros();
    await seedCategorias();
    await seedConfiguracion();
    await seedMetadata();
    await infoAdminUser();

    console.log('\n' + '─'.repeat(50));
    console.log('✅ Setup completado');
    console.log(`\n📋 Próximos pasos:`);
    console.log('   1. Actualiza .env.local con las credenciales del nuevo proyecto');
    console.log('      NEXT_PUBLIC_FIREBASE_PROJECT_ID=oldtexasbbq');
    console.log('   2. Actualiza las demás variables NEXT_PUBLIC_FIREBASE_* con los valores');
    console.log('      de Firebase Console → Configuración del proyecto → Tus apps');
    console.log('   3. Despliega las reglas de Firestore: firebase deploy --only firestore:rules');
    console.log('   4. Importa el CSV histórico desde la app en /caja/corte');
    console.log('');
  } catch (err) {
    console.error('\n❌ Error durante el setup:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
