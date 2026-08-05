'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Banknote, Receipt, AlertCircle, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/useAuth';

import { empleadosService } from '@/lib/services/empleados.service';
import { nominasService, ConceptosNomina } from '@/lib/services/nominas.service';
import { asistenciaService, getLunesDeSemana, contarDiasTrabajados } from '@/lib/services/asistencia.service';
import { getFaltantesPorUsuarioYPeriodo } from '@/lib/services/cierreCaja.service';
import { pagarNomina } from '@/lib/services/integracionCaja.service';
import { Nomina, PeriodoNomina, DiasSemana, ValorAsistencia } from '@/lib/types/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PERIODOS: Record<PeriodoNomina, string> = {
  semanal:   'Semanal',
  quincenal: 'Quincenal',
  mensual:   'Mensual',
};

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pagada:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const LABELS_DIA: Record<DiasSemana, string> = {
  L: 'L', M: 'M', Mi: 'Mi', J: 'J', V: 'V', S: 'S', D: 'D',
};

const LABELS_VALOR: Record<ValorAsistencia, string> = {
  A: 'A', D: 'D', V: 'V', F: 'F',
};

const COLOR_VALOR: Record<ValorAsistencia, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  D: 'bg-blue-100 text-blue-700',
  V: 'bg-purple-100 text-purple-700',
  F: 'bg-red-100 text-red-700',
};

const DIAS_SEMANA: DiasSemana[] = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'];

function calcularFinPeriodo(inicio: Date, periodo: PeriodoNomina | undefined): Date {
  switch (periodo) {
    case 'quincenal': return addDays(inicio, 14);
    case 'mensual':   return addDays(addMonths(inicio, 1), -1);
    default:          return addDays(addWeeks(inicio, 1), -1);
  }
}

const fmtPesos = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function NumInput({
  label, value, onChange, placeholder = '0.00',
}: { label: string; value: number; onChange: (v: number) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number" min={0}
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function GeneradorNomina() {
  const qc = useQueryClient();
  const { user } = useAuth();

  // Form state
  const [empleadoId, setEmpleadoId]         = useState('');
  const [periodoInicio, setPeriodoInicio]    = useState(format(new Date(), 'yyyy-MM-dd'));
  const [totalDias, setTotalDias]            = useState<number>(0);
  const [notas, setNotas]                    = useState('');
  const [filtroEmpleadoId, setFiltroEmpleadoId] = useState('__pendientes__');
  const [seccionAbierta, setSeccionAbierta]  = useState<'bonos' | 'descuentos' | null>('bonos');

  // Bonos
  const [bonoPA, setBonoPA]               = useState(0);
  const [bonoLimpieza, setBonoLimpieza]   = useState(0);
  const [comisiones, setComisiones]       = useState(0);
  const [tiempoExtra, setTiempoExtra]     = useState(0);

  // Descuentos
  const [adelantoSueldo, setAdelantoSueldo]       = useState(0);
  const [descuentoPrestamo, setDescuentoPrestamo] = useState(0);
  const [descuentoComida, setDescuentoComida]     = useState(0);
  const [faltantesCaja, setFaltantesCaja]         = useState(0);
  const [fondoAhorro, setFondoAhorro]             = useState(0);

  // P2.4 — faltantes caja detectados del corte
  const [faltanteDetectado, setFaltanteDetectado] = useState<number | null>(null);

  // P1.1 — estado de asistencia cargada
  const [asistenciaCargada, setAsistenciaCargada] = useState<{
    id: string;
    asistencias: Partial<Record<DiasSemana, ValorAsistencia>>;
  } | null>(null);
  const [diasEditadosManualmente, setDiasEditadosManualmente] = useState(false);

  // P1.2 — confirmación de Bono PA con asistencia imperfecta
  const [bonoPAConfirmado, setBonoPAConfirmado] = useState(false);

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados-activos'],
    queryFn: () => empleadosService.getActivos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: nominas = [], isLoading: cargandoNominas } = useQuery({
    queryKey: ['nominas', filtroEmpleadoId],
    queryFn: () =>
      filtroEmpleadoId !== '__pendientes__'
        ? nominasService.getPorEmpleado(filtroEmpleadoId)
        : nominasService.getPendientes(),
    staleTime: 2 * 60 * 1000,
  });

  // P1.1 — cargar asistencia cuando cambia empleado o periodo
  const semanaInicioParaQuery = (() => {
    if (!periodoInicio) return null;
    const d = new Date(periodoInicio + 'T12:00:00');
    if (isNaN(d.getTime())) return null;
    const empleadoSel = empleados.find((e) => e.id === empleadoId);
    // Para empleados semanales usar el lunes de la semana; para otros usar la fecha exacta
    if (empleadoSel?.periodoPago === 'semanal') {
      return format(getLunesDeSemana(d), 'yyyy-MM-dd');
    }
    return periodoInicio;
  })();

  const { data: asistenciaRegistro, isFetching: buscandoAsistencia } = useQuery({
    queryKey: ['asistencia-semana', empleadoId, semanaInicioParaQuery],
    queryFn: () => asistenciaService.getPorEmpleadoYSemana(empleadoId, semanaInicioParaQuery!),
    enabled: !!empleadoId && !!semanaInicioParaQuery,
    staleTime: 0,
  });

  // Sincronizar asistencia encontrada → estado local
  useEffect(() => {
    if (!empleadoId || !semanaInicioParaQuery) {
      setAsistenciaCargada(null);
      setTotalDias(0);
      setDiasEditadosManualmente(false);
      return;
    }
    if (asistenciaRegistro) {
      setAsistenciaCargada({ id: asistenciaRegistro.id, asistencias: asistenciaRegistro.asistencias });
      setTotalDias(asistenciaRegistro.totalDias);
      setDiasEditadosManualmente(false);
    } else if (!buscandoAsistencia) {
      setAsistenciaCargada(null);
      setTotalDias(0);
      setDiasEditadosManualmente(false);
    }
  }, [asistenciaRegistro, buscandoAsistencia, empleadoId, semanaInicioParaQuery]);

  // Resetear confirmación de Bono PA cuando cambian los días
  useEffect(() => {
    setBonoPAConfirmado(false);
  }, [totalDias, empleadoId]);

  // ─── Cálculos ──────────────────────────────────────────────────────────────

  const empleadoSel = empleados.find((e) => e.id === empleadoId);

  const usarSalarioDiario = !!empleadoSel?.salarioDiario && totalDias > 0;
  const salarioCalculado  = usarSalarioDiario
    ? (empleadoSel!.salarioDiario ?? 0) * totalDias
    : (empleadoSel?.salarioBase ?? 0);

  const sumaBonos      = bonoPA + bonoLimpieza + comisiones + tiempoExtra;
  const sumaDescuentos = adelantoSueldo + descuentoPrestamo + descuentoComida + faltantesCaja + fondoAhorro;
  const totalNeto      = salarioCalculado + sumaBonos - sumaDescuentos;

  const periodoFin = (() => {
    if (!empleadoSel || !periodoInicio) return '';
    const d = new Date(periodoInicio + 'T12:00:00');
    if (isNaN(d.getTime())) return '';
    return format(calcularFinPeriodo(d, empleadoSel.periodoPago), 'yyyy-MM-dd');
  })();

  // P2.4 — consultar faltantes de caja del periodo para cajeras con usuarioId
  const { data: faltantesDeCaja } = useQuery({
    queryKey: ['faltantes-caja', empleadoId, periodoInicio, periodoFin],
    queryFn: () => getFaltantesPorUsuarioYPeriodo(
      empleadoSel!.usuarioId!,
      periodoInicio,
      periodoFin,
    ),
    enabled: !!empleadoSel?.usuarioId && !!periodoInicio && !!periodoFin,
    staleTime: 0,
  });

  // Sincronizar faltantes detectados con estado local
  useEffect(() => {
    if (faltantesDeCaja !== undefined && faltantesDeCaja > 0) {
      setFaltanteDetectado(faltantesDeCaja);
    } else {
      setFaltanteDetectado(null);
    }
  }, [faltantesDeCaja]);

  // P1.2 — Bono PA válido solo si asistencia perfecta (7/7 A)
  const diasConAsistencia = asistenciaCargada
    ? contarDiasTrabajados(asistenciaCargada.asistencias)
    : totalDias;
  const bonoPARequiereConfirmacion = bonoPA > 0 && diasConAsistencia < 7;
  const bonoPABloqueado            = bonoPARequiereConfirmacion && !bonoPAConfirmado;

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function resetForm() {
    setEmpleadoId('');
    setTotalDias(0);
    setBonoPA(0); setBonoLimpieza(0); setComisiones(0); setTiempoExtra(0);
    setAdelantoSueldo(0); setDescuentoPrestamo(0); setDescuentoComida(0);
    setFaltantesCaja(0); setFondoAhorro(0);
    setNotas('');
    setAsistenciaCargada(null);
    setBonoPAConfirmado(false);
    setDiasEditadosManualmente(false);
  }

  function toggleSeccion(s: 'bonos' | 'descuentos') {
    setSeccionAbierta((prev) => (prev === s ? null : s));
  }

  // ─── Mutaciones ────────────────────────────────────────────────────────────

  const mutGenerar = useMutation({
    mutationFn: () => {
      if (!empleadoSel) throw new Error('Selecciona un empleado');
      if (bonoPABloqueado) throw new Error('Confirma el Bono PA antes de generar');

      const conceptos: ConceptosNomina = {
        ...(usarSalarioDiario                    ? { totalDias }                       : {}),
        ...(asistenciaCargada?.asistencias       ? { asistencias: asistenciaCargada.asistencias } : {}),
        ...(bonoPA           ? { bonoPA }           : {}),
        ...(bonoLimpieza     ? { bonoLimpieza }     : {}),
        ...(comisiones       ? { comisiones }       : {}),
        ...(tiempoExtra      ? { tiempoExtra }      : {}),
        ...(adelantoSueldo   ? { adelantoSueldo }   : {}),
        ...(descuentoPrestamo ? { descuentoPrestamo } : {}),
        ...(descuentoComida  ? { descuentoComida }  : {}),
        ...(faltantesCaja    ? { faltantesCaja }    : {}),
        ...(fondoAhorro      ? { fondoAhorro }      : {}),
        ...(notas            ? { notas }            : {}),
        // Si Bono PA fue confirmado manualmente, registrar la advertencia
        ...(bonoPAConfirmado && diasConAsistencia < 7
          ? { notas: (notas ? notas + ' | ' : '') + `Bono PA aplicado con ${diasConAsistencia}/7 días (confirmado)` }
          : {}),
      };
      return nominasService.generarNomina(
        empleadoSel,
        new Date(periodoInicio + 'T12:00:00'),
        0, 0, undefined,
        conceptos,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nominas'] });
      toast.success('Nómina generada');
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutPagar = useMutation({
    mutationFn: (nomina: Nomina) =>
      pagarNomina({
        nominaId:       nomina.id,
        empleadoNombre: nomina.empleadoNombre,
        monto:          nomina.totalNeto,
        usuarioId:      user?.uid ?? 'sistema',
        usuarioNombre:  user?.displayName ?? user?.email ?? 'sistema',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nominas'] });
      toast.success('Nómina pagada y registrada en caja');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutCancelar = useMutation({
    mutationFn: (id: string) => nominasService.cancelar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nominas'] });
      toast.success('Nómina cancelada');
    },
    onError: () => toast.error('Error al cancelar'),
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Generar nómina</h3>
        </div>

        {/* Empleado + periodo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Empleado *</Label>
            <Select value={empleadoId} onValueChange={(v) => { setEmpleadoId(v); setBonoPAConfirmado(false); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {empleados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre} — {PERIODOS[e.periodoPago]}
                    {!e.salarioDiario && ' ⚠'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {empleadoSel && !empleadoSel.salarioDiario && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" />
                Este empleado usa salario fijo. Configura su salario diario en Empleados para el cálculo real.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Inicio de periodo</Label>
            <Input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
            />
          </div>
        </div>

        {/* P1.1 — Días trabajados con estado de asistencia */}
        {empleadoSel && (
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">Días trabajados</span>
              {buscandoAsistencia ? (
                <span className="text-xs text-muted-foreground animate-pulse">Buscando asistencia…</span>
              ) : asistenciaCargada ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Asistencia cargada desde registro
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <Info className="h-3.5 w-3.5" />
                  Sin registro de asistencia — ingreso manual
                </span>
              )}
            </div>

            {/* Grid de días si hay asistencia cargada */}
            {asistenciaCargada && (
              <div className="flex gap-1.5 flex-wrap">
                {DIAS_SEMANA.map((dia) => {
                  const valor = asistenciaCargada.asistencias[dia];
                  return (
                    <div key={dia} className="flex flex-col items-center gap-0.5">
                      <span className="text-xs text-muted-foreground">{LABELS_DIA[dia]}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${valor ? COLOR_VALOR[valor] : 'bg-muted text-muted-foreground'}`}>
                        {valor ? LABELS_VALOR[valor] : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Input manual de días */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={7}
                  value={totalDias || ''}
                  onChange={(e) => {
                    setTotalDias(Number(e.target.value));
                    if (asistenciaCargada) setDiasEditadosManualmente(true);
                  }}
                  className="w-20 h-8 text-sm"
                  placeholder="0"
                  readOnly={!!asistenciaCargada && !diasEditadosManualmente}
                />
                <span className="text-sm text-muted-foreground">/ 7 días</span>
              </div>
              {asistenciaCargada && !diasEditadosManualmente && (
                <button
                  type="button"
                  onClick={() => setDiasEditadosManualmente(true)}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Editar manualmente
                </button>
              )}
              {diasEditadosManualmente && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Editado manualmente
                </span>
              )}
            </div>
          </div>
        )}

        {/* Sección Bonos */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSeccion('bonos')}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
          >
            <span>Bonos {sumaBonos > 0 && `— +${fmtPesos(sumaBonos)}`}</span>
            {seccionAbierta === 'bonos' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {seccionAbierta === 'bonos' && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <NumInput label="Bono P.A. ($200)" value={bonoPA}       onChange={(v) => { setBonoPA(v); setBonoPAConfirmado(false); }} />
                <NumInput label="Bono Limpieza ($100)" value={bonoLimpieza} onChange={setBonoLimpieza} />
                <NumInput label="Comisiones"      value={comisiones}    onChange={setComisiones} />
                <NumInput label="Tiempo extra"    value={tiempoExtra}   onChange={setTiempoExtra} />
              </div>

              {/* P1.2 — Alerta Bono PA con asistencia imperfecta */}
              {bonoPARequiereConfirmacion && (
                <div className={`rounded-lg border p-3 text-sm flex flex-col gap-2 ${
                  bonoPAConfirmado
                    ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20'
                    : 'border-amber-300 bg-amber-50 dark:bg-amber-950/30'
                }`}>
                  <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Bono PA con asistencia incompleta</p>
                      <p className="text-xs mt-0.5">
                        El empleado tiene <strong>{diasConAsistencia}/7</strong> días trabajados.
                        El Bono P.A. se otorga por asistencia perfecta (7/7 días).
                        {asistenciaCargada
                          ? ' Basado en el registro de asistencia cargado.'
                          : ' (No hay registro de asistencia — días ingresados manualmente.)'}
                      </p>
                    </div>
                  </div>
                  {!bonoPAConfirmado ? (
                    <button
                      type="button"
                      onClick={() => setBonoPAConfirmado(true)}
                      className="self-start text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded font-medium transition-colors"
                    >
                      Confirmar de todas formas
                    </button>
                  ) : (
                    <p className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Bono PA confirmado manualmente — quedará registrado en notas
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sección Descuentos */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSeccion('descuentos')}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
          >
            <span>Descuentos {sumaDescuentos > 0 && `— −${fmtPesos(sumaDescuentos)}`}</span>
            {seccionAbierta === 'descuentos' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {seccionAbierta === 'descuentos' && (
            <div className="p-4 space-y-3">
              {/* P2.4 — alerta de faltante detectado en corte */}
              {faltanteDetectado !== null && faltanteDetectado > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-start gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Faltante detectado en corte de caja</p>
                      <p className="text-xs mt-0.5">
                        Se detectaron <strong>{fmtPesos(faltanteDetectado)}</strong> en diferencias negativas
                        de los cierres de este empleado en el periodo.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0 border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => setFaltantesCaja(faltanteDetectado)}
                  >
                    Aplicar {fmtPesos(faltanteDetectado)}
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <NumInput label="Adelanto sueldo"  value={adelantoSueldo}    onChange={setAdelantoSueldo} />
                <NumInput label="Desc. préstamo"   value={descuentoPrestamo} onChange={setDescuentoPrestamo} />
                <NumInput label="Desc. comida"     value={descuentoComida}   onChange={setDescuentoComida} />
                <NumInput label="Faltantes caja"   value={faltantesCaja}     onChange={setFaltantesCaja} />
                <NumInput label="Fondo ahorro"     value={fondoAhorro}       onChange={setFondoAhorro} />
              </div>
            </div>
          )}
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <Label>Notas</Label>
          <Input
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        {/* Preview desglosado */}
        {empleadoSel && periodoInicio && (
          <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Empleado</span>
              <span className="font-medium">{empleadoSel.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Periodo</span>
              <span>
                {format(new Date(periodoInicio + 'T12:00:00'), "d MMM", { locale: es })}
                {' — '}
                {periodoFin && format(new Date(periodoFin + 'T12:00:00'), "d MMM yyyy", { locale: es })}
              </span>
            </div>
            {usarSalarioDiario ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Salario ({totalDias} días × {fmtPesos(empleadoSel.salarioDiario!)})
                </span>
                <span>{fmtPesos(salarioCalculado)}</span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Salario base</span>
                <span>{fmtPesos(empleadoSel.salarioBase)}</span>
              </div>
            )}
            {bonoPA        > 0 && <div className="flex justify-between text-emerald-600"><span>Bono P.A.{bonoPAConfirmado && diasConAsistencia < 7 ? ' ⚠' : ''}</span><span>+{fmtPesos(bonoPA)}</span></div>}
            {bonoLimpieza  > 0 && <div className="flex justify-between text-emerald-600"><span>Bono limpieza</span><span>+{fmtPesos(bonoLimpieza)}</span></div>}
            {comisiones    > 0 && <div className="flex justify-between text-emerald-600"><span>Comisiones</span><span>+{fmtPesos(comisiones)}</span></div>}
            {tiempoExtra   > 0 && <div className="flex justify-between text-emerald-600"><span>Tiempo extra</span><span>+{fmtPesos(tiempoExtra)}</span></div>}
            {adelantoSueldo    > 0 && <div className="flex justify-between text-red-500"><span>Adelanto sueldo</span><span>−{fmtPesos(adelantoSueldo)}</span></div>}
            {descuentoPrestamo > 0 && <div className="flex justify-between text-red-500"><span>Desc. préstamo</span><span>−{fmtPesos(descuentoPrestamo)}</span></div>}
            {descuentoComida   > 0 && <div className="flex justify-between text-red-500"><span>Desc. comida</span><span>−{fmtPesos(descuentoComida)}</span></div>}
            {faltantesCaja     > 0 && <div className="flex justify-between text-red-500"><span>Faltantes caja</span><span>−{fmtPesos(faltantesCaja)}</span></div>}
            {fondoAhorro       > 0 && <div className="flex justify-between text-red-500"><span>Fondo ahorro</span><span>−{fmtPesos(fondoAhorro)}</span></div>}
            <div className="flex justify-between font-semibold border-t border-border pt-2 mt-1 text-foreground">
              <span>Total neto</span>
              <span>{fmtPesos(totalNeto)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={() => mutGenerar.mutate()}
            disabled={!empleadoId || mutGenerar.isPending || bonoPABloqueado}
            className="gap-2"
            title={bonoPABloqueado ? 'Confirma el Bono PA antes de generar' : undefined}
          >
            <Receipt className="h-4 w-4" />
            Generar nómina
          </Button>
        </div>
      </div>

      {/* Lista nóminas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-semibold text-foreground">Nóminas</h3>
          <Select value={filtroEmpleadoId} onValueChange={setFiltroEmpleadoId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Pendientes de pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__pendientes__">Pendientes de pago</SelectItem>
              {empleados.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empleado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Periodo</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cargandoNominas ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-muted animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : nominas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    No hay nóminas
                  </td>
                </tr>
              ) : (
                nominas.map((nom) => (
                  <tr key={nom.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div>{nom.empleadoNombre}</div>
                      <div className="text-xs text-muted-foreground">{nom.cargo}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(nom.periodoInicio + 'T12:00:00'), "d MMM", { locale: es })}
                      {' – '}
                      {format(new Date(nom.periodoFin + 'T12:00:00'), "d MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {fmtPesos(nom.totalNeto)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[nom.estado]}`}>
                        {nom.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {nom.estado === 'pendiente' && (
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => mutPagar.mutate(nom)}
                            disabled={mutPagar.isPending}
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            Pagar
                          </Button>
                          <button
                            onClick={() => mutCancelar.mutate(nom.id)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors"
                            title="Cancelar nómina"
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
