import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Ingrediente } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResumenStock {
  total: number;
  sinStock: number;
  stockBajo: number;
  stockOk: number;
  valorTotalInventario: number;
}

export interface IngredienteConEstado extends Ingrediente {
  estadoStock: 'ok' | 'bajo' | 'sin_stock';
  valorStock: number; // stockActual * precioPorUnidad
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularEstado(ing: Ingrediente): IngredienteConEstado['estadoStock'] {
  if (ing.stockActual <= 0) return 'sin_stock';
  if (ing.stockActual < ing.stockMinimo) return 'bajo';
  return 'ok';
}

function enriquecerIngrediente(ing: Ingrediente): IngredienteConEstado {
  return {
    ...ing,
    estadoStock: calcularEstado(ing),
    valorStock: ing.stockActual * ing.precioPorUnidad,
  };
}

// ─── Consultas ────────────────────────────────────────────────────────────────

/** Devuelve todos los ingredientes activos con su estado de stock. */
export async function getStockActual(): Promise<IngredienteConEstado[]> {
  if (!db) throw new Error('Firestore no disponible');

  const q = query(
    collection(db, 'ingredientes'),
    where('activo', '==', true),
    orderBy('nombre', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Ingrediente))
    .map(enriquecerIngrediente);
}

/** Sólo ingredientes con stock bajo (sin_stock + bajo). */
export async function getIngredientesBajoStock(): Promise<IngredienteConEstado[]> {
  const todos = await getStockActual();
  return todos.filter((i) => i.estadoStock !== 'ok');
}

/** Resumen numérico del estado del inventario. */
export async function getResumenStock(): Promise<ResumenStock> {
  const todos = await getStockActual();

  return {
    total: todos.length,
    sinStock: todos.filter((i) => i.estadoStock === 'sin_stock').length,
    stockBajo: todos.filter((i) => i.estadoStock === 'bajo').length,
    stockOk: todos.filter((i) => i.estadoStock === 'ok').length,
    valorTotalInventario: todos.reduce((acc, i) => acc + i.valorStock, 0),
  };
}

/** Devuelve ingredientes agrupados por categoría. */
export async function getStockPorCategoria(): Promise<
  Record<string, IngredienteConEstado[]>
> {
  const todos = await getStockActual();
  const grupos: Record<string, IngredienteConEstado[]> = {};
  for (const ing of todos) {
    const cat = ing.categoria ?? 'SIN CATEGORÍA';
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(ing);
  }
  return grupos;
}

// ─── Listener en tiempo real ──────────────────────────────────────────────────

export function suscribirStock(
  callback: (ingredientes: IngredienteConEstado[]) => void
): () => void {
  if (!db) return () => {};

  const q = query(
    collection(db, 'ingredientes'),
    where('activo', '==', true),
    orderBy('nombre', 'asc')
  );

  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Ingrediente))
      .map(enriquecerIngrediente);
    callback(items);
  });
}

/** Proyección de días de stock restante para cada ingrediente.
 *  Necesita el consumo diario promedio (cantidad / días observados).
 */
export function calcularDiasRestantes(
  stockActual: number,
  consumoDiarioPromedio: number
): number | null {
  if (consumoDiarioPromedio <= 0) return null;
  return Math.floor(stockActual / consumoDiarioPromedio);
}
