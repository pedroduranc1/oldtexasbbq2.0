'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Banknote, Receipt, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/useAuth';

import { empleadosService } from '@/lib/services/empleados.service';
import { nominasService } from '@/lib/services/nominas.service';
import { pagarNomina } from '@/lib/services/integracionCaja.service';
import { Nomina, PeriodoNomina } from '@/lib/types/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const PERIODOS: Record<PeriodoNomina, string> = {
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
};

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pagada:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function calcularFinPeriodo(inicio: Date, periodo: PeriodoNomina | undefined): Date {
  switch (periodo) {
    case 'quincenal': return addDays(inicio, 14);
    case 'mensual':   return addDays(addMonths(inicio, 1), -1);
    default:          return addDays(addWeeks(inicio, 1), -1); // semanal o sin dato
  }
}

const fmtPesos = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

export function GeneradorNomina() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [empleadoId, setEmpleadoId] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bonos, setBonos] = useState(0);
  const [descuentos, setDescuentos] = useState(0);
  const [notas, setNotas] = useState('');
  const [filtroEmpleadoId, setFiltroEmpleadoId] = useState('__pendientes__');

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

  const empleadoSel = empleados.find((e) => e.id === empleadoId);
  const totalNeto = empleadoSel ? (empleadoSel.salarioBase ?? 0) + bonos - descuentos : 0;
  const periodoFin = (() => {
    if (!empleadoSel || !periodoInicio) return '';
    const d = new Date(periodoInicio + 'T12:00:00');
    if (isNaN(d.getTime())) return '';
    return format(calcularFinPeriodo(d, empleadoSel.periodoPago), 'yyyy-MM-dd');
  })();

  const mutGenerar = useMutation({
    mutationFn: () => {
      if (!empleadoSel) throw new Error('Selecciona un empleado');
      return nominasService.generarNomina(
        empleadoSel,
        new Date(periodoInicio + 'T12:00:00'),
        bonos,
        descuentos,
        notas || undefined,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nominas'] });
      toast.success('Nómina generada');
      setEmpleadoId('');
      setBonos(0);
      setDescuentos(0);
      setNotas('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutPagar = useMutation({
    mutationFn: (nomina: Nomina) =>
      pagarNomina({
        nominaId: nomina.id,
        empleadoNombre: nomina.empleadoNombre,
        monto: nomina.totalNeto,
        usuarioId: user?.uid ?? 'sistema',
        usuarioNombre: user?.displayName ?? user?.email ?? 'sistema',
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

  return (
    <div className="space-y-8">
      {/* Generador */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Generar nómina</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Empleado *</Label>
            <Select value={empleadoId} onValueChange={setEmpleadoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado" />
              </SelectTrigger>
              <SelectContent>
                {empleados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre} — {PERIODOS[e.periodoPago]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Inicio de periodo</Label>
            <Input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Bonos (MXN)</Label>
            <Input
              type="number"
              min={0}
              value={bonos || ''}
              onChange={(e) => setBonos(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descuentos (MXN)</Label>
            <Input
              type="number"
              min={0}
              value={descuentos || ''}
              onChange={(e) => setDescuentos(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notas</Label>
            <Input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        {/* Preview */}
        {empleadoSel && periodoInicio && (
          <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Empleado</span>
              <span className="font-medium">{empleadoSel.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Periodo</span>
              <span>
                {format(new Date(periodoInicio + 'T12:00:00'), "d MMM", { locale: es })}
                {' — '}
                {format(new Date(periodoFin + 'T12:00:00'), "d MMM yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Salario base</span>
              <span>{fmtPesos(empleadoSel.salarioBase)}</span>
            </div>
            {bonos > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Bonos</span>
                <span>+{fmtPesos(bonos)}</span>
              </div>
            )}
            {descuentos > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Descuentos</span>
                <span>−{fmtPesos(descuentos)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-border pt-2 mt-1 text-foreground">
              <span>Total neto</span>
              <span>{fmtPesos(totalNeto)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={() => mutGenerar.mutate()}
            disabled={!empleadoId || mutGenerar.isPending}
            className="gap-2"
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
