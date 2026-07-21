/**
 * Servicio de Reportes y Métricas — Old Texas BBQ CRM
 *
 * Fuente de datos:
 *   - KPIs diarios → turno.resumen (ya agregado, sin query compleja)
 *   - Desglose por hora → pedidos del turno (filtro por turnoId, sin rango de fechas)
 *   - Productos más vendidos → items de los pedidos del turno
 *   - Repartidores → pedidos entregados del turno
 *
 * Por qué NO usamos fechaCreacion para filtrar pedidos:
 *   serverTimestamp() en Firestore puede causar inconsistencias en queries
 *   de rango si el índice no está definido. Los turnos tienen `fecha: string`
 *   (YYYY-MM-DD) que es un campo simple y siempre confiable.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format, subDays } from 'date-fns';
import { turnosService } from './turnos.service';
import type {
  Pedido,
  ItemPedido,
  CanalVenta,
  MetodoPago,
  EstadoPedido,
} from '@/lib/types/firestore';

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface VentasPorHora {
  hora: string;
  cantidad: number;
  total: number;
}

export interface VentasPorCanal {
  canal: CanalVenta;
  cantidad: number;
  total: number;
  porcentaje: number;
}

export interface ProductoMasVendido {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  total: number;
}

export interface DesempenoRepartidor {
  repartidorId: string;
  repartidorNombre: string;
  pedidosEntregados: number;
  totalEntregado: number;
  comisionesGanadas: number;
  tiempoPromedioEntrega: number;
}

export interface ResumenDiario {
  fecha: string;
  totalPedidos: number;
  totalVentas: number;
  ticketPromedio: number;
  pedidosPorEstado: Record<EstadoPedido, number>;
  ventasPorMetodoPago: Record<MetodoPago, number>;
  totalEnvios: number;
  totalDescuentos: number;
}

export interface ComparativaConDiaAnterior {
  hoy: ResumenDiario;
  ayer: ResumenDiario;
  variacionPedidos: number;
  variacionVentas: number;
  variacionTicketPromedio: number;
}

export interface ReporteFull {
  resumen: ResumenDiario;
  ventasPorHora: VentasPorHora[];
  ventasPorCanal: VentasPorCanal[];
  productosMasVendidos: ProductoMasVendido[];
  desempenoRepartidores: DesempenoRepartidor[];
}

// ─── Helpers internos ──────────────────────────────────────────────────────────

function fechaStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Obtiene todos los pedidos de una lista de turnoIds directamente por turnoId. */
async function getPedidosDeTurnos(turnoIds: string[]): Promise<Pedido[]> {
  if (!db || turnoIds.length === 0) return [];
  // Firestore "in" acepta máximo 30 valores; dividimos en chunks si hace falta
  const chunks: string[][] = [];
  for (let i = 0; i < turnoIds.length; i += 30) {
    chunks.push(turnoIds.slice(i, i + 30));
  }
  const results: Pedido[] = [];
  for (const chunk of chunks) {
    const q = query(collection(db, 'pedidos'), where('turnoId', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => results.push({ id: d.id, ...d.data() } as Pedido));
  }
  return results;
}

/** Construye ResumenDiario vacío (sin datos) para una fecha. */
function resumenVacio(fecha: string): ResumenDiario {
  return {
    fecha,
    totalPedidos: 0,
    totalVentas: 0,
    ticketPromedio: 0,
    pedidosPorEstado: {
      pendiente: 0, en_preparacion: 0, listo: 0,
      en_reparto: 0, entregado: 0, cancelado: 0,
    },
    ventasPorMetodoPago: {
      efectivo: 0, tarjeta: 0, transferencia: 0, uber: 0, didi: 0,
    },
    totalEnvios: 0,
    totalDescuentos: 0,
  };
}

// ─── Servicio ──────────────────────────────────────────────────────────────────

class ReportesService {

  /**
   * Resumen diario construido desde turno.resumen + pedidos del turno.
   * No usa rango de fechas sobre pedidos → sin problema de índice.
   */
  async getResumenDiario(fecha: Date): Promise<ResumenDiario> {
    const fechaKey = fechaStr(fecha);
    const turnos = await turnosService.getByFecha(fechaKey);

    if (turnos.length === 0) {
      return resumenVacio(fechaKey);
    }

    // Agregar resúmenes de todos los turnos del día
    const acum = resumenVacio(fechaKey);
    for (const turno of turnos) {
      const r = turno.resumen;
      acum.totalPedidos      += r.totalPedidos ?? 0;
      acum.totalVentas       += r.totalVentas  ?? 0;
      acum.totalEnvios       += r.totalEnvios  ?? 0;
      acum.totalDescuentos   += r.totalDescuentos ?? 0;
      acum.ventasPorMetodoPago.efectivo      += r.efectivo      ?? 0;
      acum.ventasPorMetodoPago.tarjeta       += r.tarjeta       ?? 0;
      acum.ventasPorMetodoPago.transferencia += r.transferencia ?? 0;
      acum.ventasPorMetodoPago.uber          += r.uber          ?? 0;
      acum.ventasPorMetodoPago.didi          += r.didi          ?? 0;
    }

    acum.ticketPromedio = acum.totalPedidos > 0
      ? Math.round((acum.totalVentas / acum.totalPedidos) * 100) / 100
      : 0;

    // Estados: necesitamos los pedidos individuales
    const turnoIds = turnos.map((t) => t.id);
    const pedidos = await getPedidosDeTurnos(turnoIds);
    pedidos.forEach((p) => {
      if (acum.pedidosPorEstado[p.estado] !== undefined) {
        acum.pedidosPorEstado[p.estado]++;
      }
    });

    return acum;
  }

  /**
   * Ventas por hora del día, usando horaRecepcion de los pedidos del turno.
   */
  async getVentasPorHora(fecha: Date): Promise<VentasPorHora[]> {
    const fechaKey = fechaStr(fecha);
    const turnos = await turnosService.getByFecha(fechaKey);
    if (turnos.length === 0) return horasVacias();

    const pedidos = await getPedidosDeTurnos(turnos.map((t) => t.id));
    const pedidosValidos = pedidos.filter((p) => !p.cancelado);

    const mapa: Record<string, { cantidad: number; total: number }> = {};
    for (let i = 0; i < 24; i++) {
      mapa[i.toString().padStart(2, '0') + ':00'] = { cantidad: 0, total: 0 };
    }

    pedidosValidos.forEach((p) => {
      const ts = p.horaRecepcion ?? p.fechaCreacion;
      if (!ts?.toDate) return;
      const hora = ts.toDate().getHours().toString().padStart(2, '0') + ':00';
      if (mapa[hora]) {
        mapa[hora].cantidad++;
        mapa[hora].total += p.totales?.total ?? 0;
      }
    });

    return Object.entries(mapa).map(([hora, d]) => ({
      hora,
      cantidad: d.cantidad,
      total: Math.round(d.total * 100) / 100,
    }));
  }

  /**
   * Ventas por canal usando pedidos del turno.
   */
  async getVentasPorCanal(fecha: Date): Promise<VentasPorCanal[]> {
    const fechaKey = fechaStr(fecha);
    const turnos = await turnosService.getByFecha(fechaKey);
    if (turnos.length === 0) return canalesVacios();

    const pedidos = await getPedidosDeTurnos(turnos.map((t) => t.id));
    const pedidosValidos = pedidos.filter((p) => !p.cancelado);

    const mapa: Record<string, { cantidad: number; total: number }> = {
      whatsapp: { cantidad: 0, total: 0 },
      mostrador: { cantidad: 0, total: 0 },
      uber: { cantidad: 0, total: 0 },
      didi: { cantidad: 0, total: 0 },
      llamada: { cantidad: 0, total: 0 },
      web: { cantidad: 0, total: 0 },
    };

    let totalVentas = 0;
    pedidosValidos.forEach((p) => {
      if (mapa[p.canal]) {
        mapa[p.canal].cantidad++;
        const t = p.totales?.total ?? 0;
        mapa[p.canal].total += t;
        totalVentas += t;
      }
    });

    return Object.entries(mapa).map(([canal, d]) => ({
      canal: canal as CanalVenta,
      cantidad: d.cantidad,
      total: Math.round(d.total * 100) / 100,
      porcentaje: totalVentas > 0
        ? Math.round((d.total / totalVentas) * 1000) / 10
        : 0,
    }));
  }

  /**
   * Productos más vendidos usando items de los pedidos del turno.
   */
  async getProductosMasVendidos(fecha: Date, limite = 10): Promise<ProductoMasVendido[]> {
    const fechaKey = fechaStr(fecha);
    const turnos = await turnosService.getByFecha(fechaKey);
    if (turnos.length === 0) return [];

    const pedidos = await getPedidosDeTurnos(turnos.map((t) => t.id));
    const pedidosValidos = pedidos.filter((p) => !p.cancelado);

    const mapa: Record<string, { nombre: string; cantidad: number; total: number }> = {};

    for (const pedido of pedidosValidos) {
      if (!db) continue;
      try {
        const itemsSnap = await getDocs(
          collection(db, 'pedidos', pedido.id, 'items')
        );
        itemsSnap.docs.forEach((d) => {
          const item = d.data() as ItemPedido;
          if (!mapa[item.productoId]) {
            mapa[item.productoId] = { nombre: item.productoNombre, cantidad: 0, total: 0 };
          }
          mapa[item.productoId].cantidad += item.cantidad ?? 1;
          mapa[item.productoId].total    += item.subtotal ?? 0;
        });
      } catch {
        // continuar si un pedido no tiene items
      }
    }

    return Object.entries(mapa)
      .map(([productoId, d]) => ({
        productoId,
        productoNombre: d.nombre,
        cantidad: d.cantidad,
        total: Math.round(d.total * 100) / 100,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, limite);
  }

  /**
   * Desempeño de repartidores usando pedidos entregados del turno.
   */
  async getDesempenoRepartidores(fecha: Date): Promise<DesempenoRepartidor[]> {
    const fechaKey = fechaStr(fecha);
    const turnos = await turnosService.getByFecha(fechaKey);
    if (turnos.length === 0) return [];

    const pedidos = await getPedidosDeTurnos(turnos.map((t) => t.id));
    const entregados = pedidos.filter(
      (p) => p.estado === 'entregado' && p.reparto && !p.cancelado
    );

    const mapa: Record<string, {
      nombre: string; pedidos: number; total: number;
      comisiones: number; tiempos: number[];
    }> = {};

    entregados.forEach((p) => {
      if (!p.reparto) return;
      const id = p.reparto.repartidorId;
      if (!mapa[id]) {
        mapa[id] = { nombre: p.reparto.repartidorNombre, pedidos: 0, total: 0, comisiones: 0, tiempos: [] };
      }
      mapa[id].pedidos++;
      mapa[id].total      += p.totales?.total ?? 0;
      mapa[id].comisiones += p.reparto.comisionRepartidor ?? 0;
      if (p.horaListo && p.horaEntrega) {
        mapa[id].tiempos.push(
          (p.horaEntrega.toMillis() - p.horaListo.toMillis()) / 60000
        );
      }
    });

    return Object.entries(mapa).map(([repartidorId, d]) => ({
      repartidorId,
      repartidorNombre: d.nombre,
      pedidosEntregados: d.pedidos,
      totalEntregado: Math.round(d.total * 100) / 100,
      comisionesGanadas: Math.round(d.comisiones * 100) / 100,
      tiempoPromedioEntrega: d.tiempos.length > 0
        ? Math.round(d.tiempos.reduce((s, t) => s + t, 0) / d.tiempos.length)
        : 0,
    })).sort((a, b) => b.pedidosEntregados - a.pedidosEntregados);
  }

  async getComparativaConDiaAnterior(fecha: Date): Promise<ComparativaConDiaAnterior> {
    const [hoy, ayer] = await Promise.all([
      this.getResumenDiario(fecha),
      this.getResumenDiario(subDays(fecha, 1)),
    ]);

    const pct = (a: number, b: number) =>
      b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : 0;

    return {
      hoy,
      ayer,
      variacionPedidos:       pct(hoy.totalPedidos,    ayer.totalPedidos),
      variacionVentas:        pct(hoy.totalVentas,     ayer.totalVentas),
      variacionTicketPromedio: pct(hoy.ticketPromedio, ayer.ticketPromedio),
    };
  }

  async getReporteFull(fecha: Date): Promise<ReporteFull> {
    const [resumen, ventasPorHora, ventasPorCanal, productosMasVendidos, desempenoRepartidores] =
      await Promise.all([
        this.getResumenDiario(fecha),
        this.getVentasPorHora(fecha),
        this.getVentasPorCanal(fecha),
        this.getProductosMasVendidos(fecha, 10),
        this.getDesempenoRepartidores(fecha),
      ]);
    return { resumen, ventasPorHora, ventasPorCanal, productosMasVendidos, desempenoRepartidores };
  }

  async getReportePorRango(fechaInicio: Date, fechaFin: Date): Promise<{
    resumen: { totalPedidos: number; totalVentas: number; ticketPromedio: number };
    ventasPorDia: { fecha: string; total: number; pedidos: number }[];
    ventasPorCanal: VentasPorCanal[];
    productosMasVendidos: ProductoMasVendido[];
  }> {
    const inicio = fechaStr(fechaInicio);
    const fin    = fechaStr(fechaFin);

    const turnos = await turnosService.getTurnosPorRango(inicio, fin);
    const turnoIds = turnos.map((t) => t.id);
    const pedidos = await getPedidosDeTurnos(turnoIds);
    const pedidosValidos = pedidos.filter((p) => !p.cancelado);

    // KPIs totales desde resúmenes de turno
    let totalPedidos = 0;
    let totalVentas  = 0;
    const ventasPorDiaMap: Record<string, { total: number; pedidos: number }> = {};

    for (const turno of turnos) {
      const r = turno.resumen;
      totalPedidos += r.totalPedidos ?? 0;
      totalVentas  += r.totalVentas  ?? 0;
      ventasPorDiaMap[turno.fecha] = ventasPorDiaMap[turno.fecha] ?? { total: 0, pedidos: 0 };
      ventasPorDiaMap[turno.fecha].total   += r.totalVentas  ?? 0;
      ventasPorDiaMap[turno.fecha].pedidos += r.totalPedidos ?? 0;
    }

    // Canales desde pedidos individuales
    const canalMapa: Record<string, { cantidad: number; total: number }> = {
      whatsapp: { cantidad: 0, total: 0 }, mostrador: { cantidad: 0, total: 0 },
      uber: { cantidad: 0, total: 0 },     didi: { cantidad: 0, total: 0 },
      llamada: { cantidad: 0, total: 0 },  web: { cantidad: 0, total: 0 },
    };
    pedidosValidos.forEach((p) => {
      if (canalMapa[p.canal]) {
        canalMapa[p.canal].cantidad++;
        canalMapa[p.canal].total += p.totales?.total ?? 0;
      }
    });
    const ventasPorCanal: VentasPorCanal[] = Object.entries(canalMapa).map(([canal, d]) => ({
      canal: canal as CanalVenta,
      cantidad: d.cantidad,
      total: Math.round(d.total * 100) / 100,
      porcentaje: totalVentas > 0 ? Math.round((d.total / totalVentas) * 1000) / 10 : 0,
    }));

    // Productos
    const productoMapa: Record<string, { nombre: string; cantidad: number; total: number }> = {};
    for (const pedido of pedidosValidos) {
      if (!db) continue;
      try {
        const snap = await getDocs(collection(db, 'pedidos', pedido.id, 'items'));
        snap.docs.forEach((d) => {
          const item = d.data() as ItemPedido;
          if (!productoMapa[item.productoId]) {
            productoMapa[item.productoId] = { nombre: item.productoNombre, cantidad: 0, total: 0 };
          }
          productoMapa[item.productoId].cantidad += item.cantidad ?? 1;
          productoMapa[item.productoId].total    += item.subtotal ?? 0;
        });
      } catch { /* continuar */ }
    }

    return {
      resumen: {
        totalPedidos,
        totalVentas: Math.round(totalVentas * 100) / 100,
        ticketPromedio: totalPedidos > 0 ? Math.round((totalVentas / totalPedidos) * 100) / 100 : 0,
      },
      ventasPorDia: Object.entries(ventasPorDiaMap)
        .map(([fecha, d]) => ({ fecha, ...d, total: Math.round(d.total * 100) / 100 }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
      ventasPorCanal,
      productosMasVendidos: Object.entries(productoMapa)
        .map(([productoId, d]) => ({ productoId, productoNombre: d.nombre, cantidad: d.cantidad, total: Math.round(d.total * 100) / 100 }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10),
    };
  }
}

// ─── Constantes internas ───────────────────────────────────────────────────────

function horasVacias(): VentasPorHora[] {
  return Array.from({ length: 24 }, (_, i) => ({
    hora: i.toString().padStart(2, '0') + ':00',
    cantidad: 0,
    total: 0,
  }));
}

function canalesVacios(): VentasPorCanal[] {
  return (['whatsapp', 'mostrador', 'uber', 'didi', 'llamada', 'web'] as CanalVenta[]).map(
    (canal) => ({ canal, cantidad: 0, total: 0, porcentaje: 0 })
  );
}

export const reportesService = new ReportesService();
