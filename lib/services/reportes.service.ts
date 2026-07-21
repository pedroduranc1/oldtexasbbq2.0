/**
 * Servicio de Reportes y Métricas
 * Old Texas BBQ - CRM
 *
 * Genera reportes y estadísticas del negocio
 */

import { Timestamp } from 'firebase/firestore';
import { pedidosService } from './pedidos.service';
import {
  Pedido,
  ItemPedido,
  CanalVenta,
  MetodoPago,
  EstadoPedido,
} from '@/lib/types/firestore';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

// ============================================================================
// TIPOS DE REPORTES
// ============================================================================

export interface VentasPorHora {
  hora: string; // "08:00", "09:00", etc.
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
  tiempoPromedioEntrega: number; // en minutos
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
  variacionPedidos: number; // porcentaje
  variacionVentas: number; // porcentaje
  variacionTicketPromedio: number; // porcentaje
}

export interface ReporteFull {
  resumen: ResumenDiario;
  ventasPorHora: VentasPorHora[];
  ventasPorCanal: VentasPorCanal[];
  productosMasVendidos: ProductoMasVendido[];
  desempenoRepartidores: DesempenoRepartidor[];
}

// ============================================================================
// SERVICIO DE REPORTES
// ============================================================================

class ReportesService {
  /**
   * Obtiene el resumen diario de ventas
   */
  async getResumenDiario(fecha: Date): Promise<ResumenDiario> {
    const inicio = Timestamp.fromDate(startOfDay(fecha));
    const fin = Timestamp.fromDate(endOfDay(fecha));

    const pedidos = await pedidosService.getByRangoFechas(
      inicio.toDate(),
      fin.toDate()
    );

    // Filtrar pedidos no cancelados
    const pedidosValidos = pedidos.filter((p) => !p.cancelado);

    // Calcular totales
    const totalVentas = pedidosValidos.reduce(
      (sum, p) => sum + (p.totales?.total || 0),
      0
    );
    const totalEnvios = pedidosValidos.reduce(
      (sum, p) => sum + (p.totales?.envio || 0),
      0
    );
    const totalDescuentos = pedidosValidos.reduce(
      (sum, p) => sum + (p.totales?.descuento || 0),
      0
    );

    // Pedidos por estado
    const pedidosPorEstado: Record<EstadoPedido, number> = {
      pendiente: 0,
      en_preparacion: 0,
      listo: 0,
      en_reparto: 0,
      entregado: 0,
      cancelado: 0,
    };

    pedidos.forEach((p) => {
      pedidosPorEstado[p.estado]++;
    });

    // Ventas por método de pago
    const ventasPorMetodoPago: Record<MetodoPago, number> = {
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0,
      uber: 0,
      didi: 0,
    };

    pedidosValidos.forEach((p) => {
      const metodo = p.pago?.metodo;
      if (metodo && Object.prototype.hasOwnProperty.call(ventasPorMetodoPago, metodo)) {
        ventasPorMetodoPago[metodo as MetodoPago] += p.totales?.total || 0;
      }
    });

    return {
      fecha: format(fecha, 'yyyy-MM-dd'),
      totalPedidos: pedidosValidos.length,
      totalVentas,
      ticketPromedio: pedidosValidos.length > 0 ? totalVentas / pedidosValidos.length : 0,
      pedidosPorEstado,
      ventasPorMetodoPago,
      totalEnvios,
      totalDescuentos,
    };
  }

  /**
   * Obtiene las ventas por hora del día
   */
  async getVentasPorHora(fecha: Date): Promise<VentasPorHora[]> {
    const inicio = Timestamp.fromDate(startOfDay(fecha));
    const fin = Timestamp.fromDate(endOfDay(fecha));

    const pedidos = await pedidosService.getByRangoFechas(
      inicio.toDate(),
      fin.toDate()
    );

    // Filtrar pedidos no cancelados
    const pedidosValidos = pedidos.filter((p) => !p.cancelado);

    // Agrupar por hora
    const ventasPorHora: Record<string, { cantidad: number; total: number }> =
      {};

    // Inicializar todas las horas del día
    for (let i = 0; i < 24; i++) {
      const hora = i.toString().padStart(2, '0') + ':00';
      ventasPorHora[hora] = { cantidad: 0, total: 0 };
    }

    pedidosValidos.forEach((p) => {
      const ts = p.horaRecepcion ?? p.fechaCreacion;
      if (!ts) return;
      const hora = ts.toDate().getHours().toString().padStart(2, '0') + ':00';

      if (ventasPorHora[hora]) {
        ventasPorHora[hora].cantidad++;
        ventasPorHora[hora].total += p.totales?.total ?? 0;
      }
    });

    // Convertir a array y filtrar solo horas con ventas (o todas si queremos mostrar todas)
    return Object.entries(ventasPorHora).map(([hora, data]) => ({
      hora,
      cantidad: data.cantidad,
      total: Math.round(data.total * 100) / 100,
    }));
  }

  /**
   * Obtiene las ventas por canal
   */
  async getVentasPorCanal(fecha: Date): Promise<VentasPorCanal[]> {
    const inicio = Timestamp.fromDate(startOfDay(fecha));
    const fin = Timestamp.fromDate(endOfDay(fecha));

    const pedidos = await pedidosService.getByRangoFechas(
      inicio.toDate(),
      fin.toDate()
    );

    // Filtrar pedidos no cancelados
    const pedidosValidos = pedidos.filter((p) => !p.cancelado);

    // Agrupar por canal
    const ventasPorCanal: Record<
      CanalVenta,
      { cantidad: number; total: number }
    > = {
      whatsapp: { cantidad: 0, total: 0 },
      mostrador: { cantidad: 0, total: 0 },
      uber: { cantidad: 0, total: 0 },
      didi: { cantidad: 0, total: 0 },
      llamada: { cantidad: 0, total: 0 },
      web: { cantidad: 0, total: 0 },
    };

    pedidosValidos.forEach((p) => {
      if (ventasPorCanal[p.canal]) {
        ventasPorCanal[p.canal].cantidad++;
        ventasPorCanal[p.canal].total += p.totales?.total ?? 0;
      }
    });

    const totalVentas = pedidosValidos.reduce(
      (sum, p) => sum + (p.totales?.total ?? 0),
      0
    );

    return Object.entries(ventasPorCanal).map(([canal, data]) => ({
      canal: canal as CanalVenta,
      cantidad: data.cantidad,
      total: Math.round(data.total * 100) / 100,
      porcentaje:
        totalVentas > 0
          ? Math.round((data.total / totalVentas) * 100 * 10) / 10
          : 0,
    }));
  }

  /**
   * Obtiene los productos más vendidos
   */
  async getProductosMasVendidos(
    fecha: Date,
    limite: number = 10
  ): Promise<ProductoMasVendido[]> {
    const inicio = Timestamp.fromDate(startOfDay(fecha));
    const fin = Timestamp.fromDate(endOfDay(fecha));

    const pedidos = await pedidosService.getByRangoFechas(
      inicio.toDate(),
      fin.toDate()
    );

    // Filtrar pedidos no cancelados
    const pedidosValidos = pedidos.filter((p) => !p.cancelado);

    // Obtener todos los items de todos los pedidos
    const productosMap: Record<
      string,
      { nombre: string; cantidad: number; total: number }
    > = {};

    for (const pedido of pedidosValidos) {
      const items = await pedidosService.getItems(pedido.id);

      items.forEach((item) => {
        if (!productosMap[item.productoId]) {
          productosMap[item.productoId] = {
            nombre: item.productoNombre,
            cantidad: 0,
            total: 0,
          };
        }

        productosMap[item.productoId].cantidad += item.cantidad;
        productosMap[item.productoId].total += item.subtotal;
      });
    }

    // Convertir a array y ordenar por cantidad
    const productos = Object.entries(productosMap)
      .map(([productoId, data]) => ({
        productoId,
        productoNombre: data.nombre,
        cantidad: data.cantidad,
        total: Math.round(data.total * 100) / 100,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, limite);

    return productos;
  }

  /**
   * Obtiene el desempeño de los repartidores
   */
  async getDesempenoRepartidores(fecha: Date): Promise<DesempenoRepartidor[]> {
    const inicio = Timestamp.fromDate(startOfDay(fecha));
    const fin = Timestamp.fromDate(endOfDay(fecha));

    const pedidos = await pedidosService.getByRangoFechas(
      inicio.toDate(),
      fin.toDate()
    );

    // Filtrar solo pedidos entregados con repartidor
    const pedidosEntregados = pedidos.filter(
      (p) => p.estado === 'entregado' && p.reparto && !p.cancelado
    );

    // Agrupar por repartidor
    const repartidoresMap: Record<
      string,
      {
        nombre: string;
        pedidos: number;
        total: number;
        comisiones: number;
        tiempos: number[];
      }
    > = {};

    pedidosEntregados.forEach((p) => {
      if (!p.reparto) return;

      const repartidorId = p.reparto.repartidorId;

      if (!repartidoresMap[repartidorId]) {
        repartidoresMap[repartidorId] = {
          nombre: p.reparto.repartidorNombre,
          pedidos: 0,
          total: 0,
          comisiones: 0,
          tiempos: [],
        };
      }

      repartidoresMap[repartidorId].pedidos++;
      repartidoresMap[repartidorId].total += p.totales?.total ?? 0;
      repartidoresMap[repartidorId].comisiones += p.reparto.comisionRepartidor ?? 0;

      // Calcular tiempo de entrega si existen los timestamps
      if (p.horaListo && p.horaEntrega) {
        const tiempo =
          (p.horaEntrega.toMillis() - p.horaListo.toMillis()) / 1000 / 60;
        repartidoresMap[repartidorId].tiempos.push(tiempo);
      }
    });

    // Convertir a array
    return Object.entries(repartidoresMap)
      .map(([repartidorId, data]) => ({
        repartidorId,
        repartidorNombre: data.nombre,
        pedidosEntregados: data.pedidos,
        totalEntregado: Math.round(data.total * 100) / 100,
        comisionesGanadas: Math.round(data.comisiones * 100) / 100,
        tiempoPromedioEntrega:
          data.tiempos.length > 0
            ? Math.round(
                data.tiempos.reduce((sum, t) => sum + t, 0) / data.tiempos.length
              )
            : 0,
      }))
      .sort((a, b) => b.pedidosEntregados - a.pedidosEntregados);
  }

  /**
   * Obtiene la comparativa con el día anterior
   */
  async getComparativaConDiaAnterior(
    fecha: Date
  ): Promise<ComparativaConDiaAnterior> {
    const hoy = await this.getResumenDiario(fecha);
    const ayer = await this.getResumenDiario(subDays(fecha, 1));

    const variacionPedidos =
      ayer.totalPedidos > 0
        ? ((hoy.totalPedidos - ayer.totalPedidos) / ayer.totalPedidos) * 100
        : 0;

    const variacionVentas =
      ayer.totalVentas > 0
        ? ((hoy.totalVentas - ayer.totalVentas) / ayer.totalVentas) * 100
        : 0;

    const variacionTicketPromedio =
      ayer.ticketPromedio > 0
        ? ((hoy.ticketPromedio - ayer.ticketPromedio) / ayer.ticketPromedio) *
          100
        : 0;

    return {
      hoy,
      ayer,
      variacionPedidos: Math.round(variacionPedidos * 10) / 10,
      variacionVentas: Math.round(variacionVentas * 10) / 10,
      variacionTicketPromedio: Math.round(variacionTicketPromedio * 10) / 10,
    };
  }

  /**
   * Obtiene el reporte completo del día
   */
  async getReporteFull(fecha: Date): Promise<ReporteFull> {
    const [
      resumen,
      ventasPorHora,
      ventasPorCanal,
      productosMasVendidos,
      desempenoRepartidores,
    ] = await Promise.all([
      this.getResumenDiario(fecha),
      this.getVentasPorHora(fecha),
      this.getVentasPorCanal(fecha),
      this.getProductosMasVendidos(fecha, 10),
      this.getDesempenoRepartidores(fecha),
    ]);

    return {
      resumen,
      ventasPorHora,
      ventasPorCanal,
      productosMasVendidos,
      desempenoRepartidores,
    };
  }

  /**
   * Obtiene el reporte de un rango de fechas
   */
  async getReportePorRango(
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<{
    resumen: {
      totalPedidos: number;
      totalVentas: number;
      ticketPromedio: number;
    };
    ventasPorDia: { fecha: string; total: number; pedidos: number }[];
    ventasPorCanal: VentasPorCanal[];
    productosMasVendidos: ProductoMasVendido[];
  }> {
    const inicio = Timestamp.fromDate(startOfDay(fechaInicio));
    const fin = Timestamp.fromDate(endOfDay(fechaFin));

    const pedidos = await pedidosService.getByRangoFechas(
      inicio.toDate(),
      fin.toDate()
    );

    const pedidosValidos = pedidos.filter((p) => !p.cancelado);

    const totalVentas = pedidosValidos.reduce(
      (sum, p) => sum + (p.totales?.total ?? 0),
      0
    );

    // Ventas por día
    const ventasPorDiaMap: Record<string, { total: number; pedidos: number }> =
      {};

    pedidosValidos.forEach((p) => {
      const ts = p.horaRecepcion ?? p.fechaCreacion;
      if (!ts) return;
      const fecha = format(ts.toDate(), 'yyyy-MM-dd');
      if (!ventasPorDiaMap[fecha]) {
        ventasPorDiaMap[fecha] = { total: 0, pedidos: 0 };
      }
      ventasPorDiaMap[fecha].total += p.totales?.total ?? 0;
      ventasPorDiaMap[fecha].pedidos++;
    });

    const ventasPorDia = Object.entries(ventasPorDiaMap).map(
      ([fecha, data]) => ({
        fecha,
        total: Math.round(data.total * 100) / 100,
        pedidos: data.pedidos,
      })
    );

    // Ventas por canal (todo el rango)
    const ventasPorCanalMap: Record<
      CanalVenta,
      { cantidad: number; total: number }
    > = {
      whatsapp: { cantidad: 0, total: 0 },
      mostrador: { cantidad: 0, total: 0 },
      uber: { cantidad: 0, total: 0 },
      didi: { cantidad: 0, total: 0 },
      llamada: { cantidad: 0, total: 0 },
      web: { cantidad: 0, total: 0 },
    };

    pedidosValidos.forEach((p) => {
      if (ventasPorCanalMap[p.canal]) {
        ventasPorCanalMap[p.canal].cantidad++;
        ventasPorCanalMap[p.canal].total += p.totales?.total ?? 0;
      }
    });

    const ventasPorCanal = Object.entries(ventasPorCanalMap).map(
      ([canal, data]) => ({
        canal: canal as CanalVenta,
        cantidad: data.cantidad,
        total: Math.round(data.total * 100) / 100,
        porcentaje:
          totalVentas > 0
            ? Math.round((data.total / totalVentas) * 100 * 10) / 10
            : 0,
      })
    );

    // Productos más vendidos (todo el rango)
    const productosMap: Record<
      string,
      { nombre: string; cantidad: number; total: number }
    > = {};

    for (const pedido of pedidosValidos) {
      const items = await pedidosService.getItems(pedido.id);

      items.forEach((item) => {
        if (!productosMap[item.productoId]) {
          productosMap[item.productoId] = {
            nombre: item.productoNombre,
            cantidad: 0,
            total: 0,
          };
        }

        productosMap[item.productoId].cantidad += item.cantidad;
        productosMap[item.productoId].total += item.subtotal;
      });
    }

    const productosMasVendidos = Object.entries(productosMap)
      .map(([productoId, data]) => ({
        productoId,
        productoNombre: data.nombre,
        cantidad: data.cantidad,
        total: Math.round(data.total * 100) / 100,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    return {
      resumen: {
        totalPedidos: pedidosValidos.length,
        totalVentas: Math.round(totalVentas * 100) / 100,
        ticketPromedio:
          pedidosValidos.length > 0
            ? Math.round((totalVentas / pedidosValidos.length) * 100) / 100
            : 0,
      },
      ventasPorDia,
      ventasPorCanal,
      productosMasVendidos,
    };
  }
}

// Exportar instancia única (Singleton)
export const reportesService = new ReportesService();
