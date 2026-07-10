'use client';

import { useState, useCallback } from 'react';
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  format,
  eachDayOfInterval,
  addWeeks,
  isAfter,
  startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  ShoppingBag,
  DollarSign,
  Receipt,
  BarChart3,
  Package,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { toast } from 'sonner';

import { reportesService } from '@/lib/services/reportes.service';
import { turnosService } from '@/lib/services/turnos.service';
import { getMovimientosPorTurnos } from '@/lib/services/movimientosCaja.service';

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtPesos = (n: number) => `$${fmt(n)}`;

function variacion(actual: number, anterior: number) {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100 * 10) / 10;
}

// ─── componentes pequeños ────────────────────────────────────────────────────

function KPI({
  label,
  value,
  sub,
  icon: Icon,
  delta,
  color = 'blue',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  delta?: number | null;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const colors = {
    blue:   'bg-blue-500/10   text-blue-600   dark:text-blue-400',
    green:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    orange: 'bg-orange-500/10 text-orange-600  dark:text-orange-400',
    purple: 'bg-purple-500/10 text-purple-600  dark:text-purple-400',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={`rounded-lg p-2 ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {delta !== null && delta !== undefined && (
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
          }`}
        >
          {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta >= 0 ? '+' : ''}{delta}% vs semana anterior
        </div>
      )}
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

// ─── lógica de datos ──────────────────────────────────────────────────────────

async function getReporteSemanal(semana: Date) {
  const inicio = startOfWeek(semana, { weekStartsOn: 1 }); // lunes
  const fin    = endOfWeek(semana,   { weekStartsOn: 1 }); // domingo
  const iniAnterior = startOfWeek(subWeeks(semana, 1), { weekStartsOn: 1 });
  const finAnterior = endOfWeek(subWeeks(semana, 1),   { weekStartsOn: 1 });

  const [rangoActual, rangoAnterior] = await Promise.all([
    reportesService.getReportePorRango(inicio, fin),
    reportesService.getReportePorRango(iniAnterior, finAnterior),
  ]);

  // Turnos del periodo para obtener movimientos de caja
  const turnos = await turnosService.getTurnosPorRango(
    format(inicio, 'yyyy-MM-dd'),
    format(fin,    'yyyy-MM-dd')
  );
  const turnoIds = turnos.map((t) => t.id);

  const movimientos = await getMovimientosPorTurnos(turnoIds);
  const egresos = movimientos.filter((m) => m.tipo === 'egreso' && !m.corregidoPor);
  const ingresos = movimientos.filter((m) => m.tipo === 'ingreso' && !m.corregidoPor);

  const totalEgresos  = egresos.reduce((s, m) => s + m.monto, 0);
  const totalIngresos = ingresos.reduce((s, m) => s + m.monto, 0);

  // Egresos agrupados por concepto
  const egresosMap = new Map<string, number>();
  for (const e of egresos) {
    egresosMap.set(e.concepto, (egresosMap.get(e.concepto) ?? 0) + e.monto);
  }
  const egresosPorConcepto = Array.from(egresosMap.entries())
    .map(([concepto, total]) => ({ concepto, total }))
    .sort((a, b) => b.total - a.total);

  // Ventas por día con egresos
  const dias = eachDayOfInterval({ start: inicio, end: fin });
  const ventasPorDiaMap = Object.fromEntries(
    rangoActual.ventasPorDia.map((d) => [d.fecha, d])
  );
  const ventasPorDia = dias.map((d) => {
    const key = format(d, 'yyyy-MM-dd');
    const vta = ventasPorDiaMap[key];
    return {
      dia: format(d, 'EEE', { locale: es }),
      fecha: key,
      ventas: vta?.total ?? 0,
      pedidos: vta?.pedidos ?? 0,
      egresos: egresos
        .filter((m) => {
          const f = m.fecha?.toDate?.();
          return f && format(f, 'yyyy-MM-dd') === key;
        })
        .reduce((s, m) => s + m.monto, 0),
    };
  });

  const gananciaEstimada = rangoActual.resumen.totalVentas - totalEgresos;

  return {
    inicio,
    fin,
    ventas: rangoActual.resumen.totalVentas,
    pedidos: rangoActual.resumen.totalPedidos,
    ticketPromedio: rangoActual.resumen.ticketPromedio,
    egresos: totalEgresos,
    ingresos: totalIngresos,
    gananciaEstimada,
    productosMasVendidos: rangoActual.productosMasVendidos,
    ventasPorCanal: rangoActual.ventasPorCanal,
    ventasPorDia,
    egresosPorConcepto,
    turnos: turnos.length,
    // comparativa
    ventasAnterior: rangoAnterior.resumen.totalVentas,
    pedidosAnterior: rangoAnterior.resumen.totalPedidos,
    ticketAnterior: rangoAnterior.resumen.ticketPromedio,
  };
}

// ─── página ───────────────────────────────────────────────────────────────────

export default function ReporteSemanalPage() {
  const [semana, setSemana] = useState(new Date());

  const inicioSemana = startOfWeek(semana, { weekStartsOn: 1 });
  const finSemana    = endOfWeek(semana,   { weekStartsOn: 1 });
  const esActual     = !isAfter(startOfDay(new Date()), finSemana);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reporte-semanal', format(inicioSemana, 'yyyy-MM-dd')],
    queryFn:  () => getReporteSemanal(semana),
    staleTime: 1000 * 60 * 5,
  });

  const irSemanaAnterior = () => setSemana((s) => subWeeks(s, 1));
  const irSemanaSiguiente = () => {
    const sig = addWeeks(semana, 1);
    if (isAfter(startOfDay(sig), startOfDay(new Date()))) return;
    setSemana(sig);
  };

  const handleExportar = useCallback(async () => {
    if (!data) return;
    try {
      toast.loading('Exportando reporte semanal…', { id: 'export-semanal' });
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Hoja resumen
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ['REPORTE SEMANAL — OLD TEXAS BBQ'],
          ['Semana', `${format(data.inicio, 'dd/MM/yyyy')} – ${format(data.fin, 'dd/MM/yyyy')}`],
          [],
          ['Ventas totales',    fmtPesos(data.ventas)],
          ['Total pedidos',     data.pedidos],
          ['Ticket promedio',   fmtPesos(data.ticketPromedio)],
          ['Egresos caja',      fmtPesos(data.egresos)],
          ['Ganancia estimada', fmtPesos(data.gananciaEstimada)],
          ['Turnos operados',   data.turnos],
        ]),
        'Resumen'
      );

      // Hoja ventas por día
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ['Día', 'Fecha', 'Ventas', 'Pedidos', 'Egresos'],
          ...data.ventasPorDia.map((d) => [d.dia, d.fecha, d.ventas, d.pedidos, d.egresos]),
        ]),
        'Ventas por día'
      );

      // Hoja productos
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ['Producto', 'Cantidad', 'Total'],
          ...data.productosMasVendidos.map((p) => [p.productoNombre, p.cantidad, p.total]),
        ]),
        'Productos'
      );

      // Hoja egresos
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ['Concepto', 'Total'],
          ...data.egresosPorConcepto.map((e) => [e.concepto, e.total]),
        ]),
        'Egresos'
      );

      XLSX.writeFile(
        wb,
        `Reporte_Semanal_${format(data.inicio, 'yyyy-MM-dd')}.xlsx`
      );
      toast.success('Reporte exportado', { id: 'export-semanal' });
    } catch {
      toast.error('Error al exportar', { id: 'export-semanal' });
    }
  }, [data]);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">

      {/* Encabezado */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reporte Semanal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ventas, egresos y productos de la semana
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Navegación de semana */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card">
            <button
              onClick={irSemanaAnterior}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-l-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm font-medium text-foreground whitespace-nowrap">
              {format(inicioSemana, "d MMM", { locale: es })}
              {' – '}
              {format(finSemana, "d MMM yyyy", { locale: es })}
              {esActual && (
                <span className="ml-2 text-xs text-primary font-semibold">ACTUAL</span>
              )}
            </span>
            <button
              onClick={irSemanaSiguiente}
              disabled={isAfter(startOfDay(addWeeks(semana, 1)), startOfDay(new Date()))}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-r-lg transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportar}
            disabled={isLoading || !data}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-600 dark:text-red-400">
          Error al cargar los datos. Intenta de nuevo.
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : data ? (
          <>
            <KPI
              label="Ventas totales"
              value={fmtPesos(data.ventas)}
              icon={DollarSign}
              color="green"
              delta={variacion(data.ventas, data.ventasAnterior)}
            />
            <KPI
              label="Pedidos"
              value={fmt(data.pedidos)}
              icon={ShoppingBag}
              color="blue"
              delta={variacion(data.pedidos, data.pedidosAnterior)}
            />
            <KPI
              label="Ticket promedio"
              value={fmtPesos(data.ticketPromedio)}
              icon={Receipt}
              color="purple"
              delta={variacion(data.ticketPromedio, data.ticketAnterior)}
            />
            <KPI
              label="Egresos caja"
              value={fmtPesos(data.egresos)}
              icon={TrendingDown}
              color="orange"
            />
            <KPI
              label="Ganancia estimada"
              value={fmtPesos(data.gananciaEstimada)}
              sub="Ventas − egresos"
              icon={BarChart3}
              color={data.gananciaEstimada >= 0 ? 'green' : 'orange'}
            />
            <KPI
              label="Turnos operados"
              value={String(data.turnos)}
              icon={Users}
              color="blue"
            />
          </>
        ) : null}
      </div>

      {/* Gráfica ventas vs egresos por día */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Ventas y Egresos por Día</h2>
        {isLoading ? (
          <Skeleton className="h-60" />
        ) : data ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.ventasPorDia} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 12, className: 'fill-muted-foreground' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                tick={{ fontSize: 11, className: 'fill-muted-foreground' }}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip
                formatter={(value: number | string, name: string) => [
                  fmtPesos(Number(value)),
                  name === 'ventas' ? 'Ventas' : 'Egresos',
                ]}
                labelFormatter={(label) => `Día: ${label}`}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend
                formatter={(val) => (val === 'ventas' ? 'Ventas' : 'Egresos')}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="ventas"  fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="egresos" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </div>

      {/* Pedidos por día (línea) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Pedidos por Día</h2>
        {isLoading ? (
          <Skeleton className="h-44" />
        ) : data ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.ventasPorDia}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip formatter={(v: number | string) => [Number(v), 'Pedidos']} />
              <Line
                type="monotone"
                dataKey="pedidos"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 4, fill: '#6366f1' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </div>

      {/* Tabla inferior: productos + egresos por concepto + canales */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Top productos */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Top Productos</h2>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : data && data.productosMasVendidos.length > 0 ? (
            <div className="space-y-2">
              {data.productosMasVendidos.slice(0, 10).map((p, i) => {
                const maxCant = data.productosMasVendidos[0].cantidad;
                return (
                  <div key={p.productoId} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-1 mb-0.5">
                        <span className="text-xs font-medium text-foreground truncate">{p.productoNombre}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{p.cantidad} uds</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(p.cantidad / maxCant) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-foreground w-16 text-right">
                      {fmtPesos(p.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos de ventas</p>
          )}
        </div>

        {/* Egresos por concepto */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Egresos por Concepto</h2>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : data && data.egresosPorConcepto.length > 0 ? (
            <div className="space-y-2">
              {data.egresosPorConcepto.map((e) => {
                const maxTotal = data.egresosPorConcepto[0].total;
                return (
                  <div key={e.concepto} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-1 mb-0.5">
                        <span className="text-xs font-medium text-foreground truncate">{e.concepto}</span>
                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 shrink-0">
                          {fmtPesos(e.total)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-orange-400 transition-all"
                          style={{ width: `${(e.total / maxTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sin egresos registrados</p>
          )}
        </div>

        {/* Ventas por canal */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Ventas por Canal</h2>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : data && data.ventasPorCanal.filter((c) => c.cantidad > 0).length > 0 ? (
            <div className="space-y-3">
              {data.ventasPorCanal
                .filter((c) => c.cantidad > 0)
                .sort((a, b) => b.total - a.total)
                .map((c) => (
                  <div key={c.canal} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-foreground capitalize">{c.canal}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{c.cantidad} ped.</span>
                      <span className="text-xs font-semibold text-foreground w-20 text-right">
                        {fmtPesos(c.total)}
                      </span>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {c.porcentaje}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos de canales</p>
          )}
        </div>
      </div>

      {/* Tabla detalle por día */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Detalle Diario</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Día</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pedidos</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ventas</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Egresos</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 7 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data?.ventasPorDia.map((d) => {
                    const balance = d.ventas - d.egresos;
                    return (
                      <tr key={d.fecha} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground capitalize">{d.dia}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(d.fecha + 'T12:00:00'), "d 'de' MMMM", { locale: es })}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">{d.pedidos}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {fmtPesos(d.ventas)}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400">
                          {d.egresos > 0 ? fmtPesos(d.egresos) : '—'}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            balance >= 0
                              ? 'text-foreground'
                              : 'text-red-500 dark:text-red-400'
                          }`}
                        >
                          {fmtPesos(balance)}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
            {data && !isLoading && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                  <td className="px-4 py-3 text-foreground" colSpan={2}>TOTAL</td>
                  <td className="px-4 py-3 text-right text-foreground">{data.pedidos}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                    {fmtPesos(data.ventas)}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400">
                    {fmtPesos(data.egresos)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      data.gananciaEstimada >= 0
                        ? 'text-foreground'
                        : 'text-red-500 dark:text-red-400'
                    }`}
                  >
                    {fmtPesos(data.gananciaEstimada)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

    </div>
  );
}
