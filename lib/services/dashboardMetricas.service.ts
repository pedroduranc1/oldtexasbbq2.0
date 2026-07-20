/**
 * Dashboard de Métricas — Old Texas BBQ CRM
 *
 * Agrega datos de pedidos, movimientos de caja e inventario en un único
 * resumen listo para consumir en KPIs y gráficas del dashboard.
 */

import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { pedidosService } from './pedidos.service';
import { turnosService } from './turnos.service';
import { getMovimientosPorTurnos } from './movimientosCaja.service';
import { getMovimientos } from './movimientosInventario.service';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface MetricasDia {
  fecha: string;           // YYYY-MM-DD
  ventas: number;
  pedidos: number;
  egresos: number;         // egresos de caja (no cancelaciones)
  ganancia: number;        // ventas - egresos
  costoInventario: number; // entradas de inventario del día
}

export interface ResumenMetricas {
  periodo: { inicio: Date; fin: Date };
  totalVentas: number;
  totalPedidos: number;
  ticketPromedio: number;
  totalEgresos: number;
  gananciaNeta: number;
  costoInventario: number;
  pedidosCancelados: number;
  ventasPorMetodoPago: Record<string, number>;
  porDia: MetricasDia[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function agruparPorFecha<T extends { fecha: string; valor: number }>(
  items: T[]
): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.fecha] = (acc[item.fecha] ?? 0) + item.valor;
    return acc;
  }, {});
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export async function getMetricasPorPeriodo(
  inicio: Date,
  fin: Date
): Promise<ResumenMetricas> {
  const inicioTs = Timestamp.fromDate(startOfDay(inicio));
  const finTs    = Timestamp.fromDate(endOfDay(fin));

  // Cargar pedidos del periodo
  const pedidos = await pedidosService.getByRangoFechas(
    inicioTs.toDate(),
    finTs.toDate()
  );

  const pedidosValidos    = pedidos.filter((p) => !p.cancelado);
  const pedidosCancelados = pedidos.filter((p) => p.cancelado).length;

  const totalVentas = pedidosValidos.reduce((s, p) => s + (p.totales?.total ?? 0), 0);
  const ticketPromedio = pedidosValidos.length > 0 ? totalVentas / pedidosValidos.length : 0;

  // Ventas por método de pago
  const ventasPorMetodoPago: Record<string, number> = {};
  for (const p of pedidosValidos) {
    const m = p.pago?.metodo ?? 'otro';
    ventasPorMetodoPago[m] = (ventasPorMetodoPago[m] ?? 0) + (p.totales?.total ?? 0);
  }

  // Turnos del periodo para leer movimientos de caja
  const turnos = await turnosService.getTurnosPorRango(
    format(inicio, 'yyyy-MM-dd'),
    format(fin,    'yyyy-MM-dd')
  );
  const movCaja = await getMovimientosPorTurnos(turnos.map((t) => t.id));

  const egresosValidos  = movCaja.filter((m) => m.tipo === 'egreso' && !m.corregidoPor);
  const totalEgresos    = egresosValidos.reduce((s, m) => s + m.monto, 0);
  const gananciaNeta    = totalVentas - totalEgresos;

  // Movimientos de inventario (entradas = costo de compra)
  const movInv = await getMovimientos({
    tipo: 'entrada',
    fechaInicio: startOfDay(inicio),
    fechaFin: endOfDay(fin),
  });
  const costoInventario = movInv.reduce((s, m) => s + (m.costoTotal ?? 0), 0);

  // Construir serie por día
  const ventasDiaMap: Record<string, number> = {};
  const pedidosDiaMap: Record<string, number> = {};
  for (const p of pedidosValidos) {
    const k = format(p.horaRecepcion.toDate(), 'yyyy-MM-dd');
    ventasDiaMap[k]   = (ventasDiaMap[k] ?? 0) + (p.totales?.total ?? 0);
    pedidosDiaMap[k]  = (pedidosDiaMap[k] ?? 0) + 1;
  }
  const egresosDiaMap: Record<string, number> = {};
  for (const m of egresosValidos) {
    const k = format(m.fecha.toDate(), 'yyyy-MM-dd');
    egresosDiaMap[k] = (egresosDiaMap[k] ?? 0) + m.monto;
  }
  const costoDiaMap: Record<string, number> = {};
  for (const m of movInv) {
    const k = format(m.fecha.toDate(), 'yyyy-MM-dd');
    costoDiaMap[k] = (costoDiaMap[k] ?? 0) + (m.costoTotal ?? 0);
  }

  // Generar un punto por cada día del rango (aunque no tenga datos)
  const porDia: MetricasDia[] = [];
  const cursor = new Date(startOfDay(inicio));
  while (cursor <= endOfDay(fin)) {
    const k = format(cursor, 'yyyy-MM-dd');
    const ventas   = ventasDiaMap[k]   ?? 0;
    const egresos  = egresosDiaMap[k]  ?? 0;
    porDia.push({
      fecha: k,
      ventas,
      pedidos:         pedidosDiaMap[k]  ?? 0,
      egresos,
      ganancia:        ventas - egresos,
      costoInventario: costoDiaMap[k]    ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    periodo: { inicio: startOfDay(inicio), fin: endOfDay(fin) },
    totalVentas,
    totalPedidos: pedidosValidos.length,
    ticketPromedio,
    totalEgresos,
    gananciaNeta,
    costoInventario,
    pedidosCancelados,
    ventasPorMetodoPago,
    porDia,
  };
}

/** Atajo: últimos N días hasta hoy */
export async function getMetricasUltimosNDias(n: number): Promise<ResumenMetricas> {
  const fin    = new Date();
  const inicio = subDays(fin, n - 1);
  return getMetricasPorPeriodo(inicio, fin);
}
