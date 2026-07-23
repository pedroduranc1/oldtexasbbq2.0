/**
 * Dashboard de Métricas — Old Texas BBQ CRM
 *
 * Agrega datos de turnos, movimientos de caja e inventario en un único
 * resumen listo para consumir en KPIs y gráficas del dashboard.
 *
 * Fuente de datos:
 *   - Ventas/pedidos → turno.resumen (sin query de rango sobre pedidos)
 *   - Egresos        → MovimientosCaja filtrados por turnoId
 *   - Costo inventario → MovimientosInventario por rango de fechas
 */

import { startOfDay, endOfDay, subDays, format } from 'date-fns';
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

// ─── Servicio ─────────────────────────────────────────────────────────────────

export async function getMetricasPorPeriodo(
  inicio: Date,
  fin: Date
): Promise<ResumenMetricas> {
  const inicioStr = format(inicio, 'yyyy-MM-dd');
  const finStr    = format(fin,    'yyyy-MM-dd');

  // Turnos del periodo → fuente principal de ventas/pedidos
  const turnos = await turnosService.getTurnosPorRango(inicioStr, finStr);

  // Agregar totales desde resúmenes de turno
  let totalVentas       = 0;
  let totalPedidos      = 0;
  let pedidosCancelados = 0;
  const ventasPorMetodoPago: Record<string, number> = {};
  const ventasDiaMap: Record<string, number>  = {};
  const pedidosDiaMap: Record<string, number> = {};

  for (const t of turnos) {
    const r = t.resumen;
    totalVentas  += r.totalVentas  ?? 0;
    totalPedidos += r.totalPedidos ?? 0;

    // Métodos de pago
    const metodos: [string, number][] = [
      ['efectivo',      r.efectivo      ?? 0],
      ['tarjeta',       r.tarjeta       ?? 0],
      ['transferencia', r.transferencia ?? 0],
      ['uber',          r.uber          ?? 0],
      ['didi',          r.didi          ?? 0],
    ];
    for (const [m, v] of metodos) {
      if (v > 0) ventasPorMetodoPago[m] = (ventasPorMetodoPago[m] ?? 0) + v;
    }

    // Serie por día
    ventasDiaMap[t.fecha]  = (ventasDiaMap[t.fecha]  ?? 0) + (r.totalVentas  ?? 0);
    pedidosDiaMap[t.fecha] = (pedidosDiaMap[t.fecha] ?? 0) + (r.totalPedidos ?? 0);
  }

  const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

  // Movimientos de caja → egresos
  const movCaja     = await getMovimientosPorTurnos(turnos.map((t) => t.id));
  const egresosValidos = movCaja.filter((m) => m.tipo === 'egreso' && !m.corregidoPor);
  const totalEgresos   = egresosValidos.reduce((s, m) => s + m.monto, 0);
  const gananciaNeta   = totalVentas - totalEgresos;

  const egresosDiaMap: Record<string, number> = {};
  for (const m of egresosValidos) {
    const k = format(m.fecha.toDate(), 'yyyy-MM-dd');
    egresosDiaMap[k] = (egresosDiaMap[k] ?? 0) + m.monto;
  }

  // Movimientos de inventario (entradas = costo de compra)
  const movInv = await getMovimientos({
    tipo: 'entrada',
    fechaInicio: startOfDay(inicio),
    fechaFin:    endOfDay(fin),
  });
  const costoInventario = movInv.reduce((s, m) => s + (m.costoTotal ?? 0), 0);
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
    const ventas  = ventasDiaMap[k]  ?? 0;
    const egresos = egresosDiaMap[k] ?? 0;
    porDia.push({
      fecha: k,
      ventas,
      pedidos:         pedidosDiaMap[k] ?? 0,
      egresos,
      ganancia:        ventas - egresos,
      costoInventario: costoDiaMap[k]   ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    periodo: { inicio: startOfDay(inicio), fin: endOfDay(fin) },
    totalVentas,
    totalPedidos,
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
