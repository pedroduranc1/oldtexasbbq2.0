'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, Save } from 'lucide-react';
import { toast } from 'sonner';

import { asistenciaService, DIAS_SEMANA, LABELS_DIA, LABELS_ASISTENCIA, COLORES_ASISTENCIA, getLunesDeSemana, getDomingoDeSemana, getFechasDeSemana, contarDiasTrabajados } from '@/lib/services/asistencia.service';
import { empleadosService } from '@/lib/services/empleados.service';
import type { Empleado, DiasSemana, ValorAsistencia } from '@/lib/types/firestore';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const VALORES: ValorAsistencia[] = ['A', 'D', 'V', 'F'];

const VALOR_LABELS_CORTO: Record<ValorAsistencia, string> = {
  A: 'A',
  D: 'D',
  V: 'V',
  F: 'F',
};

export function RegistroAsistencia() {
  const qc = useQueryClient();

  // Semana actual (lunes)
  const [semanaRef, setSemanaRef] = useState<Date>(() => getLunesDeSemana(new Date()));
  const [empleadoId, setEmpleadoId] = useState('');

  // Asistencias en edición local (clave: DiasSemana, valor: ValorAsistencia)
  const [asistencias, setAsistencias] = useState<Partial<Record<DiasSemana, ValorAsistencia>>>({});
  const [cargado, setCargado] = useState(false);

  const semanaInicio = format(semanaRef, 'yyyy-MM-dd');
  const semanaFin    = format(getDomingoDeSemana(semanaRef), 'yyyy-MM-dd');
  const fechasDias   = getFechasDeSemana(semanaRef);

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados-activos'],
    queryFn:  () => empleadosService.getActivos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: registroExistente, isLoading: cargandoRegistro } = useQuery({
    queryKey: ['asistencia', empleadoId, semanaInicio],
    queryFn:  async () => {
      if (!empleadoId) return null;
      return asistenciaService.getPorEmpleadoYSemana(empleadoId, semanaInicio);
    },
    enabled: !!empleadoId,
    staleTime: 2 * 60 * 1000,
    // Cuando cambia el resultado, sincronizar estado local
    select: (data) => {
      return data;
    },
  });

  // Sincronizar asistencias locales cuando llega el registro de Firestore
  const onRegistroLoaded = useCallback((data: typeof registroExistente) => {
    if (data) {
      setAsistencias(data.asistencias ?? {});
    } else {
      setAsistencias({});
    }
    setCargado(true);
  }, []);

  // Efecto sustituto: usar onSuccess en la query config via refetch
  // Como no podemos usar onSuccess directamente (deprecated), usamos useQuery.data + useEffect alternativo
  // Solución: dejar que el componente derive el estado de la query al renderizar
  const asistenciasEfectivas = cargado ? asistencias : (registroExistente?.asistencias ?? {});

  const mutGuardar = useMutation({
    mutationFn: async () => {
      if (!empleadoId) throw new Error('Selecciona un empleado');
      const emp = empleados.find((e) => e.id === empleadoId);
      if (!emp) throw new Error('Empleado no encontrado');

      return asistenciaService.guardarSemana({
        empleadoId,
        empleadoNombre: emp.nombre,
        semanaInicio,
        semanaFin,
        asistencias: asistenciasEfectivas,
        totalDias: contarDiasTrabajados(asistenciasEfectivas),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asistencia', empleadoId, semanaInicio] });
      toast.success('Asistencia guardada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleValor = (dia: DiasSemana, valorActual?: ValorAsistencia) => {
    const idx    = valorActual ? VALORES.indexOf(valorActual) : -1;
    const nuevo  = VALORES[(idx + 1) % VALORES.length];
    const nueva  = { ...asistenciasEfectivas, [dia]: nuevo };
    setAsistencias(nueva);
    setCargado(true);
  };

  const totalDias = contarDiasTrabajados(asistenciasEfectivas);

  const semanaLabel = `${format(semanaRef, "d MMM", { locale: es })} – ${format(getDomingoDeSemana(semanaRef), "d MMM yyyy", { locale: es })}`;

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Registro de asistencia</h3>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Selector empleado */}
        <div className="min-w-[200px]">
          <Select value={empleadoId} onValueChange={(v) => { setEmpleadoId(v); setCargado(false); }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar empleado" />
            </SelectTrigger>
            <SelectContent>
              {empleados.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Navegación de semana */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => { setSemanaRef((s) => getLunesDeSemana(subWeeks(s, 1))); setCargado(false); }}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium px-2 min-w-[160px] text-center">{semanaLabel}</span>
          <button
            onClick={() => { setSemanaRef((s) => getLunesDeSemana(addWeeks(s, 1))); setCargado(false); }}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setSemanaRef(getLunesDeSemana(new Date())); setCargado(false); }}
            className="text-xs h-7 ml-1"
          >
            Hoy
          </Button>
        </div>
      </div>

      {/* Grid de asistencia */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Encabezado días */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {DIAS_SEMANA.map((dia, i) => (
            <div key={dia} className="px-2 py-2 text-center">
              <div className="text-xs font-medium text-muted-foreground">{LABELS_DIA[dia]}</div>
              <div className="text-xs text-muted-foreground/60 mt-0.5">
                {format(fechasDias[i], 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Fila de botones */}
        <div className="grid grid-cols-7 p-3 gap-2">
          {DIAS_SEMANA.map((dia) => {
            const valor = asistenciasEfectivas[dia];
            return (
              <button
                key={dia}
                onClick={() => empleadoId && toggleValor(dia, valor)}
                disabled={!empleadoId || cargandoRegistro}
                title={valor ? `${LABELS_ASISTENCIA[valor]} — clic para cambiar` : 'Clic para marcar'}
                className={[
                  'flex flex-col items-center justify-center rounded-lg py-3 px-1 text-xs font-semibold transition-all',
                  'border-2 select-none',
                  empleadoId && !cargandoRegistro
                    ? 'cursor-pointer hover:scale-105'
                    : 'cursor-default opacity-50',
                  valor
                    ? `${COLORES_ASISTENCIA[valor]} border-transparent`
                    : 'bg-muted/30 text-muted-foreground border-dashed border-border',
                ].join(' ')}
              >
                <span className="text-base font-bold leading-none">
                  {valor ? VALOR_LABELS_CORTO[valor] : '—'}
                </span>
                {valor && (
                  <span className="text-[10px] mt-0.5 opacity-80 hidden sm:block">
                    {LABELS_ASISTENCIA[valor]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leyenda + totales */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {VALORES.map((v) => (
            <span key={v} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${COLORES_ASISTENCIA[v]}`}>
              <span className="font-bold">{v}</span> — {LABELS_ASISTENCIA[v]}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Días trabajados: <span className="font-semibold text-foreground">{totalDias}</span> / 7
          </span>
          <Button
            size="sm"
            onClick={() => mutGuardar.mutate()}
            disabled={!empleadoId || mutGuardar.isPending}
            className="gap-2"
          >
            <Save className="h-3.5 w-3.5" />
            Guardar semana
          </Button>
        </div>
      </div>

      {/* Instrucción */}
      {empleadoId && (
        <p className="text-xs text-muted-foreground">
          Clic en cada día para rotar: <strong>A</strong> (Asistió) → <strong>D</strong> (Descanso) → <strong>V</strong> (Vacaciones) → <strong>F</strong> (Falta)
        </p>
      )}
    </div>
  );
}
