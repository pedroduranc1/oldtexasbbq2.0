'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Loader2,
  Lock,
  Info,
} from 'lucide-react';
import { useTurnoActivo, useCrearCierre, usePrevisualizarCierre } from '@/lib/hooks/useCaja';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useRolGuard } from '@/lib/hooks/useRolGuard';
import { useAccesoTotalCaja } from '@/lib/hooks/useAccesoTotalCaja';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { clasificarDiferencia } from '@/lib/services/cierreCaja.service';
import { toast } from 'sonner';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

type NivelAlerta = 'info' | 'warning' | 'critical';

function nivelAlerta(diff: number): NivelAlerta | null {
  const abs = Math.abs(diff);
  if (abs === 0) return null;
  if (abs < 50) return 'info';
  if (abs < 200) return 'warning';
  return 'critical';
}

interface FormValues {
  montoReal: number;
  notas?: string;
}

export default function CierreTurnoPage() {
  const router = useRouter();
  const { userData: usuario } = useAuthStore();
  const { allowed, isLoading: loadingRol } = useRolGuard(['admin', 'encargado', 'cajera']);
  const { data: turno, isLoading: loadingTurno } = useTurnoActivo();
  const accesoTotal = useAccesoTotalCaja();

  const [montoRealPreview, setMontoRealPreview] = useState(0);
  const { mutate: crearCierre, isPending } = useCrearCierre(turno?.id ?? '');
  const { data: preview, isLoading: loadingPreview } = usePrevisualizarCierre(
    turno?.id,
    montoRealPreview
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { montoReal: 0, notas: '' } });

  const handleMontoChange = (v: number) => setMontoRealPreview(isNaN(v) ? 0 : v);

  if (loadingTurno || loadingRol) {
    return (
      <div className="container mx-auto p-6 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-sm text-muted-foreground">No tienes permisos para cerrar turnos.</p>
      </div>
    );
  }

  if (!turno) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/caja">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Caja
          </Link>
        </Button>
        <p className="text-muted-foreground text-sm">No hay turno activo para cerrar.</p>
      </div>
    );
  }

  const esSupervisionAjena =
    !!usuario && usuario.rol !== 'cajera' && turno.cajeroId !== usuario.id && !accesoTotal;

  if (esSupervisionAjena) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/caja">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Caja
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Este turno fue abierto por <strong>{turno.cajeroNombre}</strong>. Solo {turno.cajeroNombre}{' '}
          puede cerrarlo.
        </p>
      </div>
    );
  }

  const diferencia = preview?.diferencia ?? 0;
  const clasificacion = preview ? clasificarDiferencia(diferencia) : null;
  const nivel = nivelAlerta(diferencia);
  const notasObligatorias = Math.abs(diferencia) >= 50;

  const usuarioActualNombre = usuario ? `${usuario.nombre} ${usuario.apellido ?? ''}`.trim() : '';
  const turnoCruzado =
    !!usuario &&
    !!turno.cajeroNombre &&
    turno.cajeroNombre.trim().toLowerCase() !== usuarioActualNombre.toLowerCase();

  const colorDiferencia =
    clasificacion === 'cuadre'
      ? 'text-green-600'
      : clasificacion === 'sobrante'
      ? 'text-blue-600'
      : 'text-destructive';

  const iconoDiferencia =
    clasificacion === 'cuadre' ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : clasificacion === 'sobrante' ? (
      <TrendingUp className="h-4 w-4 text-blue-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-destructive" />
    );

  const onSubmit = (data: FormValues) => {
    if (!usuario) {
      toast.error('No hay sesión activa');
      return;
    }
    if (!usuarioActualNombre) {
      toast.error('No se pudo determinar tu nombre de usuario. Vuelve a iniciar sesión.');
      return;
    }
    if (notasObligatorias && !data.notas?.trim()) {
      toast.error('Debes agregar una nota para diferencias ≥ $50');
      return;
    }
    crearCierre(
      {
        montoReal: data.montoReal,
        usuarioId: usuario.id,
        usuarioNombre: usuarioActualNombre,
        notas: data.notas,
      },
      {
        onSuccess: () => {
          toast.success('Turno cerrado correctamente');
          router.push('/caja');
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Error al cerrar el turno'),
      }
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-1" asChild>
          <Link href="/caja">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Caja
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lock className="h-6 w-6 text-destructive" />
          Cierre de Turno
        </h1>
        <p className="text-sm text-muted-foreground">
          Turno {turno.tipo} · abierto por {turno.cajeroNombre}. Esta acción no se puede deshacer.
        </p>
      </div>

      {turnoCruzado && (
        <div className="flex gap-2 p-3 bg-amber-500/10 rounded-lg text-sm text-amber-700 dark:text-amber-400 border border-amber-500/30">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Este turno fue abierto por <strong>{turno.cajeroNombre}</strong>. Asegúrate de haber
            verificado la caja con el cajero de apertura antes de continuar.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conciliación de Efectivo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="montoReal">Efectivo contado en caja ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  id="montoReal"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-7"
                  autoFocus
                  {...register('montoReal', {
                    required: 'El monto es requerido',
                    valueAsNumber: true,
                    min: { value: 0, message: 'No puede ser negativo' },
                    onChange: (e) => handleMontoChange(parseFloat(e.target.value)),
                  })}
                />
              </div>
              {errors.montoReal && (
                <p className="text-sm text-destructive">{errors.montoReal.message}</p>
              )}
            </div>

            {preview && !loadingPreview && (
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fondo inicial</span>
                  <span>{fmt(preview.fondoInicial)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>+ Ingresos</span>
                  <span>{fmt(preview.totalIngresos)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>− Egresos</span>
                  <span>{fmt(preview.totalEgresos)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Esperado en caja</span>
                  <span>{fmt(preview.montoEsperado)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Contado en caja</span>
                  <span>{fmt(preview.montoReal)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold items-center">
                  <span className="flex items-center gap-1">
                    {iconoDiferencia}
                    Diferencia
                  </span>
                  <span className={colorDiferencia}>
                    {diferencia > 0 ? '+' : ''}
                    {fmt(diferencia)}
                  </span>
                </div>
                {clasificacion && (
                  <Badge
                    variant={
                      clasificacion === 'cuadre'
                        ? 'default'
                        : clasificacion === 'sobrante'
                        ? 'outline'
                        : 'destructive'
                    }
                    className="w-full justify-center"
                  >
                    {clasificacion === 'cuadre'
                      ? '✓ Cuadre exacto'
                      : clasificacion === 'sobrante'
                      ? `↑ Sobrante de ${fmt(diferencia)}`
                      : `↓ Faltante de ${fmt(Math.abs(diferencia))}`}
                  </Badge>
                )}
              </div>
            )}

            {nivel === 'info' && (
              <div className="flex gap-2 p-3 bg-blue-500/10 rounded-lg text-sm text-blue-700 dark:text-blue-400">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Diferencia menor a $50 — sin impacto operativo.</p>
              </div>
            )}
            {nivel === 'warning' && (
              <div className="flex gap-2 p-3 bg-amber-500/10 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Diferencia entre $50 y $199 — agrega una nota explicativa obligatoria.</p>
              </div>
            )}
            {nivel === 'critical' && (
              <div className="flex gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Diferencia ≥ $200 — requiere revisión inmediata y nota detallada obligatoria.</p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="notas">
                Notas{' '}
                {notasObligatorias ? (
                  <span className="text-destructive font-normal">(obligatorio)</span>
                ) : (
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                )}
              </Label>
              <Textarea
                id="notas"
                rows={3}
                placeholder={
                  notasObligatorias
                    ? 'Explica la causa de la diferencia…'
                    : 'Observaciones del cierre…'
                }
                {...register('notas', {
                  validate: (v) =>
                    !notasObligatorias || !!v?.trim() || 'Nota obligatoria para diferencias ≥ $50',
                })}
              />
              {errors.notas && (
                <p className="text-sm text-destructive">{errors.notas.message}</p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" asChild disabled={isPending}>
                <Link href="/caja">Cancelar</Link>
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cerrando…
                  </>
                ) : (
                  'Confirmar Cierre'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
