/**
 * Página de Reportes y Métricas
 * Old Texas BBQ - CRM
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Download, RefreshCw, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

import { useQuery } from '@tanstack/react-query';
import { useReportes, useExportarReporte } from '@/lib/hooks/useReportes';
import { ResumenDiario } from '@/components/reportes/ResumenDiario';
import { GraficaVentasPorHora } from '@/components/reportes/GraficaVentasPorHora';
import { GraficaVentasPorCanal } from '@/components/reportes/GraficaVentasPorCanal';
import { TablaProductosMasVendidos } from '@/components/reportes/TablaProductosMasVendidos';
import { TablaDesempenoRepartidores } from '@/components/reportes/TablaDesempenoRepartidores';
import { pedidosService } from '@/lib/services/pedidos.service';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export default function ReportesPage() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [showDiag, setShowDiag] = useState(false);

  const {
    resumenDiario,
    ventasPorHora,
    ventasPorCanal,
    productosMasVendidos,
    desempenoRepartidores,
    comparativa,
    isLoading,
    error,
    refetchResumen,
  } = useReportes(fechaSeleccionada);

  // Diagnóstico: query directa a Firestore
  const { data: diagData, error: diagError, refetch: diagRefetch, isLoading: diagLoading } = useQuery({
    queryKey: ['diag-pedidos', fechaSeleccionada.toDateString()],
    queryFn: async () => {
      const inicio = startOfDay(fechaSeleccionada);
      const fin = endOfDay(fechaSeleccionada);
      const hace30 = startOfDay(subDays(fechaSeleccionada, 30));
      const [hoy, mes] = await Promise.all([
        pedidosService.getByRangoFechas(inicio, fin),
        pedidosService.getByRangoFechas(hace30, fin),
      ]);
      return {
        totalHoy: hoy.length,
        totalMes: mes.length,
        primerPedido: mes[0] ? {
          id: mes[0].id,
          fechaCreacion: mes[0].fechaCreacion?.seconds
            ? new Date(mes[0].fechaCreacion.seconds * 1000).toISOString()
            : 'sin fecha',
          estado: mes[0].estado,
          cancelado: mes[0].cancelado,
          total: mes[0].totales?.total,
        } : null,
      };
    },
    enabled: showDiag,
  });

  const { exportarAExcel } = useExportarReporte();

  const handleExportarExcel = async () => {
    try {
      toast.loading('Exportando reporte...', { id: 'export-excel' });
      await exportarAExcel(fechaSeleccionada);
      toast.success('Reporte exportado exitosamente', { id: 'export-excel' });
    } catch (error) {
      console.error('Error exportando:', error);
      toast.error('Error al exportar el reporte', { id: 'export-excel' });
    }
  };

  const handleCambiarFecha = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaFecha = new Date(e.target.value + 'T12:00:00');
    setFechaSeleccionada(nuevaFecha);
  };

  const handleHoy = () => {
    setFechaSeleccionada(new Date());
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Reportes y Métricas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análisis detallado de ventas y desempeño
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Fecha */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={format(fechaSeleccionada, 'yyyy-MM-dd')}
              onChange={handleCambiarFecha}
              className="border-none bg-transparent text-sm text-foreground outline-none"
            />
          </div>

          {/* Botón Hoy */}
          <button
            onClick={handleHoy}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Hoy
          </button>

          {/* Botón Refrescar */}
          <button
            onClick={() => refetchResumen()}
            disabled={isLoading}
            className="rounded-lg border border-border bg-card p-2 text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Link Reporte Semanal */}
          <Link
            href="/reportes/semanal"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <CalendarDays className="h-4 w-4" />
            Reporte semanal
          </Link>

          {/* Botón Exportar */}
          <button
            onClick={handleExportarExcel}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar a Excel
          </button>
        </div>
      </div>

      {/* Fecha Seleccionada */}
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <p className="text-center text-sm font-medium text-foreground">
          Mostrando datos de:{' '}
          <span className="text-primary">
            {format(fechaSeleccionada, "EEEE, d 'de' MMMM 'de' yyyy", {
              locale: es,
            })}
          </span>
        </p>
      </div>

      {/* Panel de diagnóstico */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-amber-800">
            ¿No ves datos? Ejecuta el diagnóstico para ver qué está pasando.
          </p>
          <button
            onClick={() => { setShowDiag(true); diagRefetch(); }}
            className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
          >
            {diagLoading ? 'Consultando...' : 'Diagnosticar'}
          </button>
        </div>
        {showDiag && (
          <div className="mt-2 rounded bg-white p-3 text-xs font-mono">
            {diagLoading && <p>Consultando Firestore...</p>}
            {diagError && <p className="text-red-600">ERROR: {String(diagError)}</p>}
            {diagData && (
              <div className="space-y-1">
                <p>Pedidos HOY ({format(fechaSeleccionada, 'yyyy-MM-dd')}): <strong>{diagData.totalHoy}</strong></p>
                <p>Pedidos últimos 30 días: <strong>{diagData.totalMes}</strong></p>
                {diagData.primerPedido && (
                  <div className="mt-2 border-t pt-2">
                    <p className="font-semibold">Primer pedido encontrado:</p>
                    <pre className="text-[10px] mt-1">{JSON.stringify(diagData.primerPedido, null, 2)}</pre>
                  </div>
                )}
                {diagData.totalMes === 0 && (
                  <p className="text-red-600 mt-1">⚠️ No hay pedidos en los últimos 30 días. Verifica que estás en el proyecto Firebase correcto (oldtexasbbq) y que los pedidos se registran con fechaCreacion.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error de carga */}
      {error && !isLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold mb-1">Error al cargar reportes:</p>
          <p className="font-mono text-xs">{String(error)}</p>
          <p className="mt-2 text-xs text-red-600">
            Revisa la consola del navegador para más detalles. Puede ser un índice faltante en Firestore o un problema de permisos.
          </p>
        </div>
      )}

      {/* Resumen Diario */}
      {resumenDiario && (
        <ResumenDiario
          resumen={resumenDiario}
          comparativa={comparativa}
          isLoading={isLoading}
        />
      )}
      {!resumenDiario && !isLoading && !error && (
        <div className="rounded-lg border border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Sin pedidos registrados para este día.
        </div>
      )}

      {/* Gráficas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <GraficaVentasPorHora
          datos={ventasPorHora || []}
          isLoading={isLoading}
        />
        <GraficaVentasPorCanal
          datos={ventasPorCanal || []}
          isLoading={isLoading}
        />
      </div>

      {/* Tablas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TablaProductosMasVendidos
          productos={productosMasVendidos || []}
          isLoading={isLoading}
        />
        <TablaDesempenoRepartidores
          repartidores={desempenoRepartidores || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
