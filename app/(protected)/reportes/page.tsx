/**
 * Página de Reportes y Métricas
 * Old Texas BBQ - CRM
 */

'use client';

import { useState } from 'react';
import { Calendar, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

import { useReportes, useExportarReporte } from '@/lib/hooks/useReportes';
import { ResumenDiario } from '@/components/reportes/ResumenDiario';
import { GraficaVentasPorHora } from '@/components/reportes/GraficaVentasPorHora';
import { GraficaVentasPorCanal } from '@/components/reportes/GraficaVentasPorCanal';
import { TablaProductosMasVendidos } from '@/components/reportes/TablaProductosMasVendidos';
import { TablaDesempenoRepartidores } from '@/components/reportes/TablaDesempenoRepartidores';

export default function ReportesPage() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const {
    resumenDiario,
    ventasPorHora,
    ventasPorCanal,
    productosMasVendidos,
    desempenoRepartidores,
    comparativa,
    isLoading,
    refetchResumen,
  } = useReportes(fechaSeleccionada);

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

      {/* Resumen Diario */}
      <ResumenDiario
        resumen={resumenDiario!}
        comparativa={comparativa}
        isLoading={isLoading}
      />

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
