'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import {
  asistenciaService,
  DIAS_SEMANA,
  LABELS_DIA,
  ResumenAsistenciaSemana,
} from '@/lib/services/asistencia.service';
import { empleadosService } from '@/lib/services/empleados.service';
import { DiasSemana, ValorAsistencia } from '@/lib/types/firestore';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const CANT_SEMANAS_OPC = [4, 8, 12] as const;

const COLOR_VALOR: Record<ValorAsistencia, string> = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  D: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  V: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  F: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function fmtSemana(semanaInicio: string) {
  const d = new Date(semanaInicio + 'T12:00:00');
  const fin = addDays(d, 6);
  return `${format(d, "d MMM", { locale: es })} – ${format(fin, "d MMM", { locale: es })}`;
}

function exportarCSV(resumen: ResumenAsistenciaSemana[], empleadoNombre: string) {
  const header = ['Empleado', 'Semana', ...DIAS_SEMANA, 'Total días', 'Tasa %'].join(',');
  const rows: string[] = [];

  for (const semana of resumen) {
    for (const reg of semana.registros) {
      const dias = DIAS_SEMANA.map((d) => reg.asistencias[d] ?? '—');
      rows.push([
        reg.empleadoNombre,
        semana.semanaInicio,
        ...dias,
        reg.totalDias,
        semana.tasaAsistencia ?? '—',
      ].join(','));
    }
    if (semana.registros.length === 0) {
      rows.push([empleadoNombre || 'Todos', semana.semanaInicio, ...DIAS_SEMANA.map(() => '—'), 0, '—'].join(','));
    }
  }

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `asistencia_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exportado');
}

export default function ReporteAsistenciaPage() {
  const [empleadoId, setEmpleadoId]       = useState<string>('__todos__');
  const [cantSemanas, setCantSemanas]     = useState<4 | 8 | 12>(4);

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados-activos'],
    queryFn:  () => empleadosService.getActivos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: resumen = [], isLoading } = useQuery({
    queryKey: ['reporte-asistencia', empleadoId, cantSemanas],
    queryFn: () =>
      asistenciaService.getResumenMultiSemana(
        empleadoId === '__todos__' ? null : empleadoId,
        cantSemanas,
      ),
    staleTime: 2 * 60 * 1000,
  });

  const empleadoSel = empleados.find((e) => e.id === empleadoId);

  // Si hay empleado seleccionado, mostrar sus días en grid; si no, mostrar totales por semana
  const modoEmpleado = empleadoId !== '__todos__';

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            Reporte de Asistencia
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historial de asistencia semanal por empleado
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start"
          onClick={() => exportarCSV(resumen, empleadoSel?.nombre ?? 'Todos')}
          disabled={resumen.length === 0}
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Empleado</span>
          <Select value={empleadoId} onValueChange={setEmpleadoId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos los empleados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos los empleados</SelectItem>
              {empleados.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Semanas a mostrar</span>
          <Select value={String(cantSemanas)} onValueChange={(v) => setCantSemanas(Number(v) as 4 | 8 | 12)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CANT_SEMANAS_OPC.map((n) => (
                <SelectItem key={n} value={String(n)}>Últimas {n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla — modo empleado: grid de días */}
      {modoEmpleado ? (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Semana</th>
                {DIAS_SEMANA.map((d) => (
                  <th key={d} className="px-2 py-3 text-center font-medium text-muted-foreground">{LABELS_DIA[d]}</th>
                ))}
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Días</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Tasa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: cantSemanas }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-4 rounded bg-muted animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : resumen.map((semana) => {
                const reg = semana.registros[0];
                const asistencias = reg?.asistencias ?? {};
                const totalDias   = reg?.totalDias ?? 0;
                return (
                  <tr key={semana.semanaInicio} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                      {fmtSemana(semana.semanaInicio)}
                    </td>
                    {DIAS_SEMANA.map((dia) => {
                      const val = asistencias[dia as DiasSemana];
                      return (
                        <td key={dia} className="px-2 py-2.5 text-center">
                          {val ? (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${COLOR_VALOR[val]}`}>
                              {val}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-center font-semibold text-foreground">{reg ? totalDias : '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      {reg ? (
                        <span className={`text-xs font-medium ${totalDias >= 7 ? 'text-emerald-600' : totalDias >= 5 ? 'text-amber-600' : 'text-red-500'}`}>
                          {Math.round((totalDias / 7) * 100)}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin registro</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Modo todos: resumen semanal */
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Semana</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Empleados registrados</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Total días trabajados</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Tasa asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: cantSemanas }).map((_, i) => (
                  <tr key={i}>
                    {[0,1,2,3].map((j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : resumen.map((semana) => (
                <tr key={semana.semanaInicio} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {fmtSemana(semana.semanaInicio)}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground font-medium">
                    {semana.totalEmpleados || <span className="text-muted-foreground text-xs">Sin registros</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-foreground font-medium">
                    {semana.totalDiasTrabajados || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {semana.tasaAsistencia !== null ? (
                      <span className={`text-sm font-semibold ${semana.tasaAsistencia >= 80 ? 'text-emerald-600' : semana.tasaAsistencia >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                        {semana.tasaAsistencia}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex gap-3 flex-wrap text-xs text-muted-foreground">
        {(['A', 'D', 'V', 'F'] as ValorAsistencia[]).map((v) => (
          <span key={v} className={`px-2 py-0.5 rounded font-medium ${COLOR_VALOR[v]}`}>
            {v} — {{ A: 'Asistió', D: 'Descanso', V: 'Vacaciones', F: 'Falta' }[v]}
          </span>
        ))}
      </div>
    </div>
  );
}
