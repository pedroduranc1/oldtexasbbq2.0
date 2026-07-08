import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { MovimientoInventario } from './movimientosInventario.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductoVendido {
  productoId: string;
  nombre: string;
  totalVendido: number;
  popularidad: number;
}

export interface TendenciaVentas {
  fecha: string; // YYYY-MM-DD
  totalVentas: number;
  totalIngresos: number;
}

export interface ResumenAnalisis {
  topVendidos: ProductoVendido[];
  tendencias: TendenciaVentas[];
  totalMovimientos: number;
  costoTotalPeriodo: number;
  mermasTotales: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fechaISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function rangoUltimosNDias(n: number): { inicio: Date; fin: Date } {
  const fin = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - n);
  inicio.setHours(0, 0, 0, 0);
  return { inicio, fin };
}

// ─── Análisis de productos ────────────────────────────────────────────────────

/**
 * Devuelve los N productos más vendidos según el campo cantidadVendidaPorDia
 * de la colección `productos`, sumando sólo las fechas del rango dado.
 */
export async function getTopProductosVendidos(
  fechas: string[],
  topN = 10
): Promise<ProductoVendido[]> {
  if (!db) throw new Error('Firestore no disponible');

  const snap = await getDocs(collection(db, 'productos'));
  const result: ProductoVendido[] = [];

  for (const d of snap.docs) {
    const data = d.data();
    const porDia: Record<string, number> = data.cantidadVendidaPorDia ?? {};
    const totalVendido = fechas.reduce((acc, f) => acc + (porDia[f] ?? 0), 0);
    if (totalVendido > 0) {
      result.push({
        productoId: d.id,
        nombre: data.nombre ?? d.id,
        totalVendido,
        popularidad: data.popularidad ?? 0,
      });
    }
  }

  return result.sort((a, b) => b.totalVendido - a.totalVendido).slice(0, topN);
}

/**
 * Atajos para periodos comunes.
 */
export async function getTopVendidosUltimos7Dias(topN = 10): Promise<ProductoVendido[]> {
  const { inicio } = rangoUltimosNDias(7);
  const fechas: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    fechas.push(fechaISO(d));
  }
  return getTopProductosVendidos(fechas, topN);
}

export async function getTopVendidosUltimos30Dias(topN = 10): Promise<ProductoVendido[]> {
  const fechas: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    fechas.push(fechaISO(d));
  }
  return getTopProductosVendidos(fechas, topN);
}

// ─── Tendencias por MovimientosInventario ─────────────────────────────────────

/**
 * Agrupa los movimientos de inventario por día y devuelve tendencias
 * de costos y cantidades en el rango especificado.
 */
export async function getTendenciasMovimientos(
  inicio: Date,
  fin: Date
): Promise<TendenciaVentas[]> {
  if (!db) throw new Error('Firestore no disponible');

  const q = query(
    collection(db, 'MovimientosInventario'),
    where('fecha', '>=', Timestamp.fromDate(inicio)),
    where('fecha', '<=', Timestamp.fromDate(fin)),
    orderBy('fecha', 'asc')
  );

  const snap = await getDocs(q);
  const byDay: Record<string, { totalVentas: number; totalIngresos: number }> = {};

  for (const d of snap.docs) {
    const mov = { id: d.id, ...d.data() } as MovimientoInventario;
    const dia = fechaISO(mov.fecha.toDate());
    if (!byDay[dia]) byDay[dia] = { totalVentas: 0, totalIngresos: 0 };
    byDay[dia].totalVentas += mov.cantidad;
    if (mov.costoTotal) byDay[dia].totalIngresos += mov.costoTotal;
  }

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, v]) => ({ fecha, ...v }));
}

export async function getTendenciasUltimos7Dias(): Promise<TendenciaVentas[]> {
  const { inicio, fin } = rangoUltimosNDias(7);
  return getTendenciasMovimientos(inicio, fin);
}

export async function getTendenciasUltimos30Dias(): Promise<TendenciaVentas[]> {
  const { inicio, fin } = rangoUltimosNDias(30);
  return getTendenciasMovimientos(inicio, fin);
}

// ─── Resumen completo ─────────────────────────────────────────────────────────

export async function getResumenAnalisis(dias = 30): Promise<ResumenAnalisis> {
  if (!db) throw new Error('Firestore no disponible');

  const { inicio, fin } = rangoUltimosNDias(dias);
  const fechas: string[] = [];
  for (let i = 0; i <= dias; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    fechas.push(fechaISO(d));
  }

  const [topVendidos, tendencias, movSnap] = await Promise.all([
    getTopProductosVendidos(fechas, 10),
    getTendenciasMovimientos(inicio, fin),
    getDocs(query(
      collection(db, 'MovimientosInventario'),
      where('fecha', '>=', Timestamp.fromDate(inicio)),
      where('fecha', '<=', Timestamp.fromDate(fin)),
      orderBy('fecha', 'desc'),
      limit(500)
    )),
  ]);

  let costoTotalPeriodo = 0;
  let mermasTotales = 0;

  for (const d of movSnap.docs) {
    const mov = d.data() as Omit<MovimientoInventario, 'id'>;
    costoTotalPeriodo += mov.costoTotal ?? 0;
    if (mov.tipo === 'merma') mermasTotales += mov.cantidad;
  }

  return {
    topVendidos,
    tendencias,
    totalMovimientos: movSnap.size,
    costoTotalPeriodo,
    mermasTotales,
  };
}
