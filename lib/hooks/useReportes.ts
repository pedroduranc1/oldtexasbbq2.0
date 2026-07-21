/**
 * Hook useReportes
 * Old Texas BBQ - CRM
 *
 * Hook para gestionar reportes y métricas con React Query
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { reportesService } from '@/lib/services/reportes.service';
import { turnosService } from '@/lib/services/turnos.service';
import { productosService } from '@/lib/services/productos.service';
import { startOfDay, format } from 'date-fns';

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useReportes(fecha: Date = new Date()) {
  const fechaNormalizada = startOfDay(fecha);

  // Resumen diario
  const {
    data: resumenDiario,
    isLoading: isLoadingResumen,
    error: errorResumen,
    refetch: refetchResumen,
  } = useQuery({
    queryKey: ['reportes', 'resumen-diario', fechaNormalizada.toISOString()],
    queryFn: () => reportesService.getResumenDiario(fechaNormalizada),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Ventas por hora
  const {
    data: ventasPorHora,
    isLoading: isLoadingVentasHora,
    error: errorVentasHora,
  } = useQuery({
    queryKey: [
      'reportes',
      'ventas-por-hora',
      fechaNormalizada.toISOString(),
    ],
    queryFn: () => reportesService.getVentasPorHora(fechaNormalizada),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Ventas por canal
  const {
    data: ventasPorCanal,
    isLoading: isLoadingVentasCanal,
    error: errorVentasCanal,
  } = useQuery({
    queryKey: [
      'reportes',
      'ventas-por-canal',
      fechaNormalizada.toISOString(),
    ],
    queryFn: () => reportesService.getVentasPorCanal(fechaNormalizada),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Productos más vendidos
  const {
    data: productosMasVendidos,
    isLoading: isLoadingProductos,
    error: errorProductos,
  } = useQuery({
    queryKey: [
      'reportes',
      'productos-mas-vendidos',
      fechaNormalizada.toISOString(),
    ],
    queryFn: () => reportesService.getProductosMasVendidos(fechaNormalizada, 10),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Desempeño de repartidores
  const {
    data: desempenoRepartidores,
    isLoading: isLoadingRepartidores,
    error: errorRepartidores,
  } = useQuery({
    queryKey: [
      'reportes',
      'desempeno-repartidores',
      fechaNormalizada.toISOString(),
    ],
    queryFn: () => reportesService.getDesempenoRepartidores(fechaNormalizada),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Comparativa con día anterior
  const {
    data: comparativa,
    isLoading: isLoadingComparativa,
    error: errorComparativa,
  } = useQuery({
    queryKey: [
      'reportes',
      'comparativa-dia-anterior',
      fechaNormalizada.toISOString(),
    ],
    queryFn: () =>
      reportesService.getComparativaConDiaAnterior(fechaNormalizada),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Reporte completo (todos los datos)
  const {
    data: reporteFull,
    isLoading: isLoadingReporteFull,
    error: errorReporteFull,
    refetch: refetchReporteFull,
  } = useQuery({
    queryKey: ['reportes', 'reporte-full', fechaNormalizada.toISOString()],
    queryFn: () => reportesService.getReporteFull(fechaNormalizada),
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: false, // Solo se ejecuta manualmente cuando se necesite
  });

  // Turnos del día (para gráficas comparativas y resumen caja)
  const {
    data: turnosDia,
    isLoading: isLoadingTurnos,
  } = useQuery({
    queryKey: ['reportes', 'turnos-dia', fechaNormalizada.toISOString()],
    queryFn: () => turnosService.getByFecha(format(fechaNormalizada, 'yyyy-MM-dd')),
    staleTime: 1000 * 60 * 5,
  });

  // Productos del catálogo (para ranking por cantidadVendidaPorDia)
  const {
    data: productosCatalogo,
    isLoading: isLoadingCatalogo,
  } = useQuery({
    queryKey: ['reportes', 'productos-catalogo'],
    queryFn: () => productosService.getAll(),
    staleTime: 1000 * 60 * 10, // 10 min — el catálogo no cambia tan seguido
  });

  const isLoading =
    isLoadingResumen ||
    isLoadingVentasHora ||
    isLoadingVentasCanal ||
    isLoadingProductos ||
    isLoadingRepartidores ||
    isLoadingComparativa ||
    isLoadingTurnos ||
    isLoadingCatalogo;

  const error =
    errorResumen ||
    errorVentasHora ||
    errorVentasCanal ||
    errorProductos ||
    errorRepartidores ||
    errorComparativa;

  return {
    // Datos
    resumenDiario,
    ventasPorHora,
    ventasPorCanal,
    productosMasVendidos,
    desempenoRepartidores,
    comparativa,
    reporteFull,
    turnosDia: turnosDia ?? [],
    productosCatalogo: productosCatalogo ?? [],

    // Estados
    isLoading,
    isLoadingResumen,
    isLoadingVentasHora,
    isLoadingVentasCanal,
    isLoadingProductos,
    isLoadingRepartidores,
    isLoadingComparativa,
    isLoadingReporteFull,
    isLoadingTurnos,
    isLoadingCatalogo,

    // Errores
    error,
    errorResumen,
    errorVentasHora,
    errorVentasCanal,
    errorProductos,
    errorRepartidores,
    errorComparativa,
    errorReporteFull,

    // Métodos
    refetchResumen,
    refetchReporteFull,
  };
}

// ============================================================================
// HOOK PARA REPORTES POR RANGO DE FECHAS
// ============================================================================

export function useReportesPorRango(fechaInicio?: Date, fechaFin?: Date) {
  const enabled = !!fechaInicio && !!fechaFin;

  const {
    data: reporteRango,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'reportes',
      'reporte-rango',
      fechaInicio?.toISOString(),
      fechaFin?.toISOString(),
    ],
    queryFn: () =>
      reportesService.getReportePorRango(fechaInicio!, fechaFin!),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    reporteRango,
    isLoading,
    error,
    refetch,
  };
}

// ============================================================================
// HOOK PARA EXPORTAR A EXCEL
// ============================================================================

export function useExportarReporte() {
  const exportarAExcel = async (fecha: Date, nombreArchivo?: string) => {
    try {
      const XLSX = await import('xlsx');
      const reporte = await reportesService.getReporteFull(fecha);

      // Crear un nuevo libro de trabajo
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen
      const resumenData = [
        ['RESUMEN DIARIO'],
        ['Fecha', reporte.resumen.fecha],
        ['Total Pedidos', reporte.resumen.totalPedidos],
        [
          'Total Ventas',
          `$${reporte.resumen.totalVentas.toLocaleString('es-MX')}`,
        ],
        [
          'Ticket Promedio',
          `$${reporte.resumen.ticketPromedio.toLocaleString('es-MX')}`,
        ],
        [
          'Total Envíos',
          `$${reporte.resumen.totalEnvios.toLocaleString('es-MX')}`,
        ],
        [
          'Total Descuentos',
          `$${reporte.resumen.totalDescuentos.toLocaleString('es-MX')}`,
        ],
        [],
        ['PEDIDOS POR ESTADO'],
        ['Estado', 'Cantidad'],
        ...Object.entries(reporte.resumen.pedidosPorEstado).map(
          ([estado, cantidad]) => [estado, cantidad]
        ),
        [],
        ['VENTAS POR MÉTODO DE PAGO'],
        ['Método', 'Total'],
        ...Object.entries(reporte.resumen.ventasPorMetodoPago).map(
          ([metodo, total]) => [metodo, `$${total.toLocaleString('es-MX')}`]
        ),
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      // Hoja 2: Ventas por Hora
      const ventasHoraData = [
        ['VENTAS POR HORA'],
        ['Hora', 'Cantidad', 'Total'],
        ...reporte.ventasPorHora
          .filter((v) => v.cantidad > 0) // Solo horas con ventas
          .map((v) => [v.hora, v.cantidad, `$${v.total.toLocaleString('es-MX')}`]),
      ];
      const wsVentasHora = XLSX.utils.aoa_to_sheet(ventasHoraData);
      XLSX.utils.book_append_sheet(wb, wsVentasHora, 'Ventas por Hora');

      // Hoja 3: Ventas por Canal
      const ventasCanalData = [
        ['VENTAS POR CANAL'],
        ['Canal', 'Cantidad', 'Total', 'Porcentaje'],
        ...reporte.ventasPorCanal.map((v) => [
          v.canal,
          v.cantidad,
          `$${v.total.toLocaleString('es-MX')}`,
          `${v.porcentaje}%`,
        ]),
      ];
      const wsVentasCanal = XLSX.utils.aoa_to_sheet(ventasCanalData);
      XLSX.utils.book_append_sheet(wb, wsVentasCanal, 'Ventas por Canal');

      // Hoja 4: Productos Más Vendidos
      const productosData = [
        ['PRODUCTOS MÁS VENDIDOS'],
        ['Producto', 'Cantidad', 'Total'],
        ...reporte.productosMasVendidos.map((p) => [
          p.productoNombre,
          p.cantidad,
          `$${p.total.toLocaleString('es-MX')}`,
        ]),
      ];
      const wsProductos = XLSX.utils.aoa_to_sheet(productosData);
      XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos');

      // Hoja 5: Desempeño Repartidores
      const repartidoresData = [
        ['DESEMPEÑO DE REPARTIDORES'],
        [
          'Repartidor',
          'Pedidos',
          'Total Entregado',
          'Comisiones',
          'Tiempo Promedio (min)',
        ],
        ...reporte.desempenoRepartidores.map((r) => [
          r.repartidorNombre,
          r.pedidosEntregados,
          `$${r.totalEntregado.toLocaleString('es-MX')}`,
          `$${r.comisionesGanadas.toLocaleString('es-MX')}`,
          r.tiempoPromedioEntrega,
        ]),
      ];
      const wsRepartidores = XLSX.utils.aoa_to_sheet(repartidoresData);
      XLSX.utils.book_append_sheet(wb, wsRepartidores, 'Repartidores');

      // Generar el archivo
      const fechaStr = fecha.toISOString().split('T')[0];
      const fileName =
        nombreArchivo || `Reporte_Old_Texas_BBQ_${fechaStr}.xlsx`;
      XLSX.writeFile(wb, fileName);

      return true;
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      throw error;
    }
  };

  return { exportarAExcel };
}
