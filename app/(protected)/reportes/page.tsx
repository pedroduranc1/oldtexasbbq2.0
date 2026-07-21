'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Download, RefreshCw, CalendarDays } from 'lucide-react';
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
    error,
    refetchResumen,
  } = useReportes(fechaSeleccionada);

  const { exportarAExcel } = useExportarReporte();

  const handleExportarExcel = async () => {
    try {
      toast.loading('Exportando reporte...', { id: 'export-excel' });
      await exportarAExcel(fechaSeleccionada);
      toast.success('Reporte exportado exitosamente', { id: 'export-excel' });
    } catch (err) {
      console.error('Error exportando:', err);
      toast.error('Error al exportar el reporte', { id: 'export-excel' });
    }
  };

  const handleCambiarFecha = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFechaSeleccionada(new Date(e.target.value + 'T12:00:00'));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes y Métricas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análisis detallado de ventas y desempeño
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={format(fechaSeleccionada, 'yyyy-MM-dd')}
              onChange={handleCambiarFecha}
              className="border-none bg-transparent text-sm text-foreground outline-none"
            />
          </div>

          <button
            onClick={() => setFechaSeleccionada(new Date())}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Hoy
          </button>

          <button
            onClick={() => refetchResumen()}
            disabled={isLoading}
            className="rounded-lg border border-border bg-card p-2 text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            title="Refrescar datos"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/reportes/semanal"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <CalendarDays className="h-4 w-4" />
            Reporte semanal
          </Link>

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

      {/* Fecha seleccionada */}
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <p className="text-center text-sm font-medium text-foreground">
          Mostrando datos de:{' '}
          <span className="text-primary">
            {format(fechaSeleccionada, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </span>
        </p>
      </div>

      {/* Error */}
      {error && !isLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold mb-1">Error al cargar reportes:</p>
          <p className="font-mono text-xs">{String(error)}</p>
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
          Sin turno registrado para este día.
        </div>
      )}

      {/* Gráficas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <GraficaVentasPorHora datos={ventasPorHora || []} isLoading={isLoading} />
        <GraficaVentasPorCanal datos={ventasPorCanal || []} isLoading={isLoading} />
      </div>

      {/* Tablas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TablaProductosMasVendidos productos={productosMasVendidos || []} isLoading={isLoading} />
        <TablaDesempenoRepartidores repartidores={desempenoRepartidores || []} isLoading={isLoading} />
      </div>
    </div>
  );
}
