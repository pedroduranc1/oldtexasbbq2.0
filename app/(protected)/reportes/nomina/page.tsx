'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { Receipt, Download } from 'lucide-react';
import { toast } from 'sonner';

import { nominasService, ResumenNominaTotales } from '@/lib/services/nominas.service';
import { empleadosService } from '@/lib/services/empleados.service';
import { Nomina } from '@/lib/types/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const fmtPesos = (n: number) =>
  n === 0 ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  pagada:    'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-700',
};

function exportarCSV(nominas: Nomina[], totales: ResumenNominaTotales) {
  const header = [
    'Empleado','Cargo','Periodo inicio','Periodo fin','Estado',
    'Salario base','Bono PA','Bono Limpieza','Comisiones','Tiempo extra',
    'Adelanto','Desc. préstamo','Desc. comida','Faltantes caja','Fondo ahorro',
    'Total neto',
  ].join(',');

  const rows = nominas.map((n) => [
    n.empleadoNombre, n.cargo, n.periodoInicio, n.periodoFin, n.estado,
    n.salarioBase ?? 0,
    n.bonoPA ?? 0, n.bonoLimpieza ?? 0, n.comisiones ?? 0, n.tiempoExtra ?? 0,
    n.adelantoSueldo ?? 0, n.descuentoPrestamo ?? 0, n.descuentoComida ?? 0,
    n.faltantesCaja ?? 0, n.fondoAhorro ?? 0,
    n.totalNeto,
  ].join(','));

  const totalRow = [
    'TOTALES','','','','',
    totales.salarioBase,
    totales.bonoPA, totales.bonoLimpieza, totales.comisiones, totales.tiempoExtra,
    totales.adelantoSueldo, totales.descuentoPrestamo, totales.descuentoComida,
    totales.faltantesCaja, totales.fondoAhorro,
    totales.totalNeto,
  ].join(',');

  const csv = [header, ...rows, '', totalRow].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `nominas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exportado');
}

export default function ReporteNominaPage() {
  const [empleadoId, setEmpleadoId] = useState<string>('__todos__');
  const [inicio, setInicio] = useState(format(subWeeks(new Date(), 4), 'yyyy-MM-dd'));
  const [fin, setFin]       = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados-activos'],
    queryFn:  () => empleadosService.getActivos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: resumen, isLoading } = useQuery({
    queryKey: ['reporte-nomina', inicio, fin],
    queryFn:  () => nominasService.getResumenPorPeriodo(inicio, fin),
    staleTime: 2 * 60 * 1000,
    enabled:  !!inicio && !!fin,
  });

  const nominasFiltradas = resumen
    ? empleadoId === '__todos__'
      ? resumen.nominas
      : resumen.nominas.filter((n) => n.empleadoId === empleadoId)
    : [];

  // Recalcular totales si hay filtro de empleado
  const totalesFiltrados: ResumenNominaTotales = nominasFiltradas.reduce(
    (acc, n) => ({
      salarioBase:       acc.salarioBase       + (n.salarioBase       ?? 0),
      bonoPA:            acc.bonoPA            + (n.bonoPA            ?? 0),
      bonoLimpieza:      acc.bonoLimpieza      + (n.bonoLimpieza      ?? 0),
      comisiones:        acc.comisiones        + (n.comisiones        ?? 0),
      tiempoExtra:       acc.tiempoExtra       + (n.tiempoExtra       ?? 0),
      adelantoSueldo:    acc.adelantoSueldo    + (n.adelantoSueldo    ?? 0),
      descuentoPrestamo: acc.descuentoPrestamo + (n.descuentoPrestamo ?? 0),
      descuentoComida:   acc.descuentoComida   + (n.descuentoComida   ?? 0),
      faltantesCaja:     acc.faltantesCaja     + (n.faltantesCaja     ?? 0),
      fondoAhorro:       acc.fondoAhorro       + (n.fondoAhorro       ?? 0),
      totalNeto:         acc.totalNeto         + (n.totalNeto         ?? 0),
    }),
    {
      salarioBase: 0, bonoPA: 0, bonoLimpieza: 0, comisiones: 0, tiempoExtra: 0,
      adelantoSueldo: 0, descuentoPrestamo: 0, descuentoComida: 0,
      faltantesCaja: 0, fondoAhorro: 0, totalNeto: 0,
    },
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Reporte de Nómina
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Desglose por concepto en el periodo seleccionado
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start"
          onClick={() => exportarCSV(nominasFiltradas, totalesFiltrados)}
          disabled={nominasFiltradas.length === 0}
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Empleado</Label>
          <Select value={empleadoId} onValueChange={setEmpleadoId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos los empleados</SelectItem>
              {empleados.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Nóminas', value: String(nominasFiltradas.length), color: '' },
            { label: 'Total salarios', value: fmtPesos(totalesFiltrados.salarioBase), color: '' },
            { label: 'Total bonos', value: fmtPesos(totalesFiltrados.bonoPA + totalesFiltrados.bonoLimpieza + totalesFiltrados.comisiones + totalesFiltrados.tiempoExtra), color: 'text-emerald-600' },
            { label: 'Total neto pagado', value: fmtPesos(totalesFiltrados.totalNeto), color: 'text-primary' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`text-lg font-bold mt-1 ${kpi.color || 'text-foreground'}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla desglosada */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-3 text-left font-medium text-muted-foreground sticky left-0 bg-muted/40">Empleado</th>
              <th className="px-3 py-3 text-left font-medium text-muted-foreground">Periodo</th>
              <th className="px-3 py-3 text-left font-medium text-muted-foreground">Estado</th>
              <th className="px-3 py-3 text-right font-medium text-muted-foreground">Salario</th>
              <th className="px-3 py-3 text-right font-medium text-emerald-600">Bono PA</th>
              <th className="px-3 py-3 text-right font-medium text-emerald-600">Limpieza</th>
              <th className="px-3 py-3 text-right font-medium text-emerald-600">Comisiones</th>
              <th className="px-3 py-3 text-right font-medium text-emerald-600">T.Extra</th>
              <th className="px-3 py-3 text-right font-medium text-red-500">Adelanto</th>
              <th className="px-3 py-3 text-right font-medium text-red-500">Préstamo</th>
              <th className="px-3 py-3 text-right font-medium text-red-500">Comida</th>
              <th className="px-3 py-3 text-right font-medium text-red-500">Faltantes</th>
              <th className="px-3 py-3 text-right font-medium text-red-500">F.Ahorro</th>
              <th className="px-3 py-3 text-right font-medium text-foreground border-l border-border">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 14 }).map((__, j) => (
                    <td key={j} className="px-3 py-3"><div className="h-3 rounded bg-muted animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : nominasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-10 text-center text-muted-foreground">
                  Sin nóminas en el periodo seleccionado
                </td>
              </tr>
            ) : (
              <>
                {nominasFiltradas.map((nom) => (
                  <tr key={nom.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 sticky left-0 bg-card">
                      <div className="font-medium text-foreground">{nom.empleadoNombre}</div>
                      <div className="text-muted-foreground">{nom.cargo}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                      {format(new Date(nom.periodoInicio + 'T12:00:00'), "d MMM", { locale: es })}
                      {' – '}
                      {format(new Date(nom.periodoFin   + 'T12:00:00'), "d MMM yy", { locale: es })}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${ESTADO_COLORS[nom.estado]}`}>
                        {nom.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-foreground">{fmtPesos(nom.salarioBase ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600">{fmtPesos(nom.bonoPA ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600">{fmtPesos(nom.bonoLimpieza ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600">{fmtPesos(nom.comisiones ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-600">{fmtPesos(nom.tiempoExtra ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right text-red-500">{fmtPesos(nom.adelantoSueldo ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right text-red-500">{fmtPesos(nom.descuentoPrestamo ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right text-red-500">{fmtPesos(nom.descuentoComida ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right text-red-500">{fmtPesos(nom.faltantesCaja ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right text-red-500">{fmtPesos(nom.fondoAhorro ?? 0)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-foreground border-l border-border">{fmtPesos(nom.totalNeto)}</td>
                  </tr>
                ))}
                {/* Fila de totales */}
                <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                  <td className="px-3 py-3 sticky left-0 bg-muted/50 text-foreground" colSpan={3}>
                    Totales ({nominasFiltradas.length} nóminas)
                  </td>
                  <td className="px-3 py-3 text-right text-foreground">{fmtPesos(totalesFiltrados.salarioBase)}</td>
                  <td className="px-3 py-3 text-right text-emerald-600">{fmtPesos(totalesFiltrados.bonoPA)}</td>
                  <td className="px-3 py-3 text-right text-emerald-600">{fmtPesos(totalesFiltrados.bonoLimpieza)}</td>
                  <td className="px-3 py-3 text-right text-emerald-600">{fmtPesos(totalesFiltrados.comisiones)}</td>
                  <td className="px-3 py-3 text-right text-emerald-600">{fmtPesos(totalesFiltrados.tiempoExtra)}</td>
                  <td className="px-3 py-3 text-right text-red-500">{fmtPesos(totalesFiltrados.adelantoSueldo)}</td>
                  <td className="px-3 py-3 text-right text-red-500">{fmtPesos(totalesFiltrados.descuentoPrestamo)}</td>
                  <td className="px-3 py-3 text-right text-red-500">{fmtPesos(totalesFiltrados.descuentoComida)}</td>
                  <td className="px-3 py-3 text-right text-red-500">{fmtPesos(totalesFiltrados.faltantesCaja)}</td>
                  <td className="px-3 py-3 text-right text-red-500">{fmtPesos(totalesFiltrados.fondoAhorro)}</td>
                  <td className="px-3 py-3 text-right text-foreground border-l border-border">{fmtPesos(totalesFiltrados.totalNeto)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
