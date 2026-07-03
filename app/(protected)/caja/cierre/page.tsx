'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { useTurnoActivo } from '@/lib/hooks/useCaja';
import { useCierreTurnoForm } from '@/lib/hooks/useCierreTurnoForm';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useRolGuard } from '@/lib/hooks/useRolGuard';
import { useAccesoTotalCaja } from '@/lib/hooks/useAccesoTotalCaja';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConciliacionPreview, AlertaNivelDescuadre, AvisoTurnoCruzado, MontoRealInput } from '@/components/caja/ConciliacionCierre';

function CierreForm({ turno }: { turno: NonNullable<ReturnType<typeof useTurnoActivo>['data']> }) {
  const router = useRouter();
  const {
    form: {
      register,
      handleSubmit,
      control,
      formState: { errors },
    },
    isPending,
    preview,
    loadingPreview,
    diferencia,
    clasificacion,
    nivel,
    notasObligatorias,
    turnoCruzado,
    handleMontoChange,
    submitCierre,
  } = useCierreTurnoForm(turno, true);

  const onSubmit = handleSubmit((data) =>
    submitCierre(data, { onSuccess: () => router.push('/caja') })
  );

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

      {turnoCruzado && <AvisoTurnoCruzado cajeroNombre={turno.cajeroNombre} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conciliación de Efectivo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <MontoRealInput
              control={control}
              error={errors.montoReal}
              onAmountChange={handleMontoChange}
              autoFocus
            />

            {preview && !loadingPreview && clasificacion && (
              <ConciliacionPreview preview={preview} diferencia={diferencia} clasificacion={clasificacion} />
            )}

            <AlertaNivelDescuadre nivel={nivel} />

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

export default function CierreTurnoPage() {
  const { userData: usuario } = useAuthStore();
  const { allowed, isLoading: loadingRol } = useRolGuard(['admin', 'encargado', 'cajera']);
  const { data: turno, isLoading: loadingTurno } = useTurnoActivo();
  const accesoTotal = useAccesoTotalCaja();

  if (loadingTurno || loadingRol) {
    return (
      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
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

  return <CierreForm turno={turno} />;
}
