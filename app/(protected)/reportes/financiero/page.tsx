'use client';

import { useState, useCallback } from 'react';
import { subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, RefreshCw, Calendar } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { KPIDashboard } from '@/components/reportes/KPIDashboard';
import { GananciasChart } from '@/components/reportes/GananciasChart';
import { IngresosEgresosChart } from '@/components/reportes/IngresosEgresosChart';
import { getMetricasPorPeriodo } from '@/lib/services/dashboardMetricas.service';
import { exportarReporteMetricasPDF } from '@/lib/services/generadorPDF.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Preset = '7' | '14' | '30' | 'custom';

function presetAFechas(preset: Preset): { inicio: string; fin: string } {
  const hoy = new Date();
  const fin  = format(hoy, 'yyyy-MM-dd');
  const map: Record<Exclude<Preset, 'custom'>, string> = {
    '7':  format(subDays(hoy, 6), 'yyyy-MM-dd'),
    '14': format(subDays(hoy, 13), 'yyyy-MM-dd'),
    '30': format(subDays(hoy, 29), 'yyyy-MM-dd'),
  };
  return preset === 'custom' ? { inicio: fin, fin } : { inicio: map[preset], fin };
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ReporteFinancieroPage() {
  const [preset, setPreset]       = useState<Preset>('7');
  const [fechaInicio, setInicio]  = useState(() => presetAFechas('7').inicio);
  const [fechaFin, setFin]        = useState(() => presetAFechas('7').fin);
  const [exportando, setExportando] = useState(false);

  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') {
      const { inicio, fin } = presetAFechas(p);
      setInicio(inicio);
      setFin(fin);
    }
  };

  const queryKey = ['metricas-financiero', fechaInicio, fechaFin];

  const { data: metricas, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => getMetricasPorPeriodo(new Date(fechaInicio + 'T00:00:00'), new Date(fechaFin + 'T23:59:59')),
    staleTime: 5 * 60 * 1000,
  });

  const handleExportar = useCallback(async () => {
    if (!metricas) return;
    setExportando(true);
    try {
      const labelIni = format(new Date(fechaInicio), "dd 'de' MMMM", { locale: es });
      const labelFin = format(new Date(fechaFin),    "dd 'de' MMMM 'de' yyyy", { locale: es });
      exportarReporteMetricasPDF(metricas, `Reporte Financiero — ${labelIni} al ${labelFin}`);
      toast.success('PDF generado correctamente');
    } catch {
      toast.error('Error al generar el PDF');
    } finally {
      setExportando(false);
    }
  }, [metricas, fechaInicio, fechaFin]);

  const labelPeriodo = metricas
    ? `${format(metricas.periodo.inicio, "dd MMM", { locale: es })} — ${format(metricas.periodo.fin, "dd MMM yyyy", { locale: es })}`
    : '';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Reporte Financiero
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ventas, egresos y ganancia neta por periodo
            {labelPeriodo && <span className="ml-2 font-medium text-foreground">· {labelPeriodo}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            onClick={handleExportar}
            disabled={!metricas || exportando}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {exportando ? 'Generando…' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      {/* Selector de periodo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Periodo de análisis
          </CardTitle>
          <CardDescription>
            Selecciona un rango predefinido o elige fechas personalizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Rango rápido</Label>
              <Select value={preset} onValueChange={(v) => handlePreset(v as Preset)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="14">Últimos 14 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {preset === 'custom' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Desde</Label>
                  <Input
                    type="date"
                    value={fechaInicio}
                    max={fechaFin}
                    onChange={(e) => setInicio(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Hasta</Label>
                  <Input
                    type="date"
                    value={fechaFin}
                    min={fechaInicio}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setFin(e.target.value)}
                    className="w-44"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <KPIDashboard metricas={metricas ?? null} isLoading={isLoading} />

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GananciasChart
          porDia={metricas?.porDia ?? []}
          isLoading={isLoading}
        />
        <IngresosEgresosChart
          porDia={metricas?.porDia ?? []}
          isLoading={isLoading}
        />
      </div>

      {/* Tabla de métodos de pago */}
      {metricas && Object.keys(metricas.ventasPorMetodoPago).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Ventas por método de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metricas.ventasPorMetodoPago)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([metodo, monto]) => {
                  const pct = metricas.totalVentas > 0
                    ? ((monto / metricas.totalVentas) * 100).toFixed(1)
                    : '0';
                  return (
                    <div key={metodo} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground capitalize w-28">{metodo}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-24 text-right">
                        {monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
