/**
 * Servicio de Conceptos Financieros
 * Old Texas BBQ - CRM
 *
 * Gestiona la colección `ConceptosFinancieros` que alimenta los selectores
 * de ingreso/egreso en el módulo de caja.
 *
 * Estructura del documento:
 * {
 *   id: string (auto)
 *   nombre: string
 *   tipo: 'ingreso' | 'egreso'
 *   activo: boolean
 *   orden?: number   — para ordenar en UI
 * }
 */

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export type CategoriaConcepto =
  | 'operacion'     // gastos/ingresos del día a día
  | 'insumos'       // compras de materias primas
  | 'nomina'        // sueldos y pagos de personal
  | 'servicios'     // agua, luz, gas, internet
  | 'mantenimiento' // reparaciones y equipo
  | 'ventas'        // ingresos por ventas directas
  | 'delivery'      // comisiones y cobros de apps
  | 'otro';

export interface ConceptoFinanciero {
  id: string;
  nombre: string;
  tipo: 'ingreso' | 'egreso';
  categoria: CategoriaConcepto;
  descripcion?: string;
  activo: boolean;
  orden?: number;
}

const COLECCION = 'ConceptosFinancieros';

function ref() {
  if (!db) throw new Error('Firestore no disponible');
  return collection(db, COLECCION);
}

/** Obtiene todos los conceptos activos de un tipo. */
export async function getConceptosPorTipo(
  tipo: 'ingreso' | 'egreso'
): Promise<ConceptoFinanciero[]> {
  const q = query(
    ref(),
    where('tipo', '==', tipo),
    where('activo', '==', true),
    orderBy('orden', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ConceptoFinanciero);
}

/** Obtiene todos los conceptos (para administración). */
export async function getTodosLosConceptos(): Promise<ConceptoFinanciero[]> {
  const q = query(ref(), orderBy('tipo', 'asc'), orderBy('orden', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ConceptoFinanciero);
}

/** Crea un nuevo concepto. */
export async function crearConcepto(
  data: Omit<ConceptoFinanciero, 'id'>
): Promise<string> {
  const docRef = await addDoc(ref(), {
    ...data,
    creadoEn: Timestamp.now(),
  });
  return docRef.id;
}

/** Actualiza un concepto existente. */
export async function actualizarConcepto(
  id: string,
  data: Partial<Omit<ConceptoFinanciero, 'id'>>
): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  await updateDoc(doc(db, COLECCION, id), {
    ...data,
    actualizadoEn: Timestamp.now(),
  });
}

/** Elimina permanentemente un concepto (solo admin). */
export async function eliminarConcepto(id: string): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  await deleteDoc(doc(db, COLECCION, id));
}

// ── Seed inicial ──────────────────────────────────────────────────────────────
// Llama esta función una sola vez para poblar la colección en un entorno vacío.
export async function seedConceptos(): Promise<void> {
  const ingresos: Omit<ConceptoFinanciero, 'id'>[] = [
    { nombre: 'Venta mostrador',          tipo: 'ingreso', categoria: 'ventas',    activo: true, orden: 1 },
    { nombre: 'Venta delivery',           tipo: 'ingreso', categoria: 'delivery',  activo: true, orden: 2 },
    { nombre: 'Anticipo pedido especial', tipo: 'ingreso', categoria: 'ventas',    activo: true, orden: 3, descripcion: 'Anticipo de reserva o pedido fuera del flujo normal' },
    { nombre: 'Anticipo cliente',         tipo: 'ingreso', categoria: 'ventas',    activo: true, orden: 4 },
    { nombre: 'Recuperación faltante',    tipo: 'ingreso', categoria: 'operacion', activo: true, orden: 5 },
    { nombre: 'Venta subproducto',        tipo: 'ingreso', categoria: 'operacion', activo: true, orden: 6, descripcion: 'Ej: aceite quemado, cajas, material reutilizable' },
    { nombre: 'Otro ingreso',             tipo: 'ingreso', categoria: 'otro',      activo: true, orden: 99 },
  ];
  const egresos: Omit<ConceptoFinanciero, 'id'>[] = [
    { nombre: 'Compra insumos',              tipo: 'egreso', categoria: 'insumos',       activo: true, orden: 1 },
    { nombre: 'Pago proveedor',              tipo: 'egreso', categoria: 'insumos',       activo: true, orden: 2 },
    { nombre: 'Nómina',                      tipo: 'egreso', categoria: 'nomina',        activo: true, orden: 3 },
    { nombre: 'Adelanto de nómina',          tipo: 'egreso', categoria: 'nomina',        activo: true, orden: 4, descripcion: 'Pago anticipado de salario a empleado' },
    { nombre: 'Servicios (agua/luz/gas)',     tipo: 'egreso', categoria: 'servicios',     activo: true, orden: 5 },
    { nombre: 'Mantenimiento',               tipo: 'egreso', categoria: 'mantenimiento', activo: true, orden: 6 },
    { nombre: 'Retiro para depósito',        tipo: 'egreso', categoria: 'operacion',     activo: true, orden: 7 },
    { nombre: 'Corrección pedido Uber/Didi', tipo: 'egreso', categoria: 'delivery',      activo: true, orden: 8, descripcion: 'Reembolso o gasto adicional por error en pedido de app externa' },
    { nombre: 'Reenvío / Cortesía',          tipo: 'egreso', categoria: 'operacion',     activo: true, orden: 9, descripcion: 'Costo de reenvío o cortesía por error de empaque o entrega' },
    { nombre: 'Descuento a nómina',          tipo: 'egreso', categoria: 'nomina',        activo: true, orden: 10, descripcion: 'Descuento aplicado al empleado responsable del error' },
    { nombre: 'Gastos varios',               tipo: 'egreso', categoria: 'otro',          activo: true, orden: 11 },
    { nombre: 'Otro egreso',                 tipo: 'egreso', categoria: 'otro',          activo: true, orden: 99 },
  ];
  for (const c of [...ingresos, ...egresos]) {
    await crearConcepto(c);
  }
}
