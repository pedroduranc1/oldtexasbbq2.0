'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Landmark, ChevronDown, ChevronUp, CreditCard, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  prestamosService,
  getHistorialPorPrestamo,
  DescuentoAplicado,
} from '@/lib/services/prestamos.service';
import { PrestamoConSemanasRestantes } from '@/lib/services/prestamos.service';
import { Button } from '@/components/ui/button';

const fmtPesos = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

function fmtFecha(ts: any) {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return format(d, "d MMM yyyy", { locale: es });
}

function HistorialRow({ prestamo }: { prestamo: PrestamoConSemanasRestantes }) {
  const [abierto, setAbierto] = useState(false);

  const { data: historial = [], isFetching } = useQuery({
    queryKey: ['historial-prestamo', prestamo.id],
    queryFn:  () => getHistorialPorPrestamo(prestamo.id),
    enabled:  abierto,
    staleTime: 0,
  });

  return (
    <>
      <tr className="hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3 font-medium text-foreground">
          <div>{prestamo.empleadoNombre}</div>
        </td>
        <td className="px-4 py-3 text-right text-foreground">{fmtPesos(prestamo.montoTotal)}</td>
        <td className="px-4 py-3 text-right">
          <span className="font-semibold text-amber-600">{fmtPesos(prestamo.saldoPendiente)}</span>
        </td>
        <td className="px-4 py-3 text-right text-muted-foreground">{fmtPesos(prestamo.descuentoSemanal)}</td>
        <td className="px-4 py-3 text-center">
          {prestamo.semanasRestantes !== null ? (
            <span className={`text-sm font-medium ${prestamo.semanasRestantes <= 2 ? 'text-emerald-600' : 'text-foreground'}`}>
              {prestamo.semanasRestantes} sem.
            </span>
          ) : '—'}
        </td>
        <td className="px-4 py-3 text-muted-foreground text-xs">{fmtFecha(prestamo.fechaCreacion)}</td>
        <td className="px-4 py-3">
          <button
            onClick={() => setAbierto((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Historial
            {abierto ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </td>
      </tr>
      {abierto && (
        <tr>
          <td colSpan={7} className="px-4 pb-3 pt-0 bg-muted/20">
            {isFetching ? (
              <div className="text-xs text-muted-foreground animate-pulse py-2">Cargando historial…</div>
            ) : historial.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2">Sin descuentos aplicados aún</div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden text-xs mt-1">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">Fecha</th>
                      <th className="px-3 py-2 text-right text-muted-foreground font-medium">Monto</th>
                      <th className="px-3 py-2 text-right text-muted-foreground font-medium">Saldo antes</th>
                      <th className="px-3 py-2 text-right text-muted-foreground font-medium">Saldo después</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historial.map((h: DescuentoAplicado) => (
                      <tr key={h.id}>
                        <td className="px-3 py-1.5 text-muted-foreground">{fmtFecha(h.fechaAplicacion)}</td>
                        <td className="px-3 py-1.5 text-right text-red-500">−{fmtPesos(h.monto)}</td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">{fmtPesos(h.saldoAntes)}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-foreground">{fmtPesos(h.saldoDespues)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function ReportePrestamosPage() {
  const qc = useQueryClient();

  const { data: resumen, isLoading } = useQuery({
    queryKey: ['reporte-prestamos'],
    queryFn:  () => prestamosService.getResumenDeuda(),
    staleTime: 0,
  });

  const mutAplicar = useMutation({
    mutationFn: (id: string) => prestamosService.aplicarDescuentoSemanal(id),
    onSuccess: (monto) => {
      qc.invalidateQueries({ queryKey: ['reporte-prestamos'] });
      toast.success(`Descuento de ${fmtPesos(monto)} aplicado`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutSaldar = useMutation({
    mutationFn: (id: string) => prestamosService.saldar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reporte-prestamos'] });
      toast.success('Préstamo saldado');
    },
    onError: () => toast.error('Error al saldar'),
  });

  const activos = resumen?.prestamosActivos ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Reporte de Préstamos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Préstamos activos, saldos pendientes e historial de descuentos
        </p>
      </div>

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Préstamos activos</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activos.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Deuda total</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{fmtPesos(resumen.totalDeuda)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Empleados con deuda</p>
            <p className="text-2xl font-bold text-foreground mt-1">{resumen.totalEmpleadosConDeuda}</p>
          </div>
        </div>
      )}

      {/* Tabla de préstamos activos */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empleado</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Monto original</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Saldo pendiente</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Desc. semanal</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Semanas restantes</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : activos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  Sin préstamos activos
                </td>
              </tr>
            ) : (
              activos.map((p) => <HistorialRow key={p.id} prestamo={p} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Acciones rápidas por empleado */}
      {activos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Acciones rápidas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activos.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.empleadoNombre}</p>
                  <p className="text-xs text-muted-foreground">Saldo: {fmtPesos(p.saldoPendiente)}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => mutAplicar.mutate(p.id)}
                    disabled={mutAplicar.isPending}
                  >
                    <CreditCard className="h-3 w-3" />
                    Aplicar semana
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                    onClick={() => mutSaldar.mutate(p.id)}
                    disabled={mutSaldar.isPending}
                  >
                    Saldar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
