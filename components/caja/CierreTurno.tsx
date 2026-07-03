'use client';

import { useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { useRolGuard } from '@/lib/hooks/useRolGuard';
import { useCierreTurnoForm } from '@/lib/hooks/useCierreTurnoForm';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Turno } from '@/lib/types/firestore';
import { ConciliacionPreview, AlertaNivelDescuadre, AvisoTurnoCruzado, MontoRealInput } from './ConciliacionCierre';

interface CierreTurnoProps {
  turno: Turno;
}

export function CierreTurno({ turno }: CierreTurnoProps) {
  const { allowed } = useRolGuard(['admin', 'encargado', 'cajera']);
  const [dialogAbierto, setDialogAbierto] = useState(false);

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
  } = useCierreTurnoForm(turno, dialogAbierto);

  if (!allowed) return null;

  const onSubmit = handleSubmit((data) =>
    submitCierre(data, { onSuccess: () => setDialogAbierto(false) })
  );

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-5 w-5 text-destructive" />
          Cerrar Turno
        </CardTitle>
        <CardDescription>
          Al cerrar el turno se realizará el corte de caja. Esta acción no se puede deshacer.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              Iniciar Cierre de Turno
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Corte de Caja
              </DialogTitle>
              <DialogDescription>
                Ingresa el efectivo real contado en caja para conciliar el turno
              </DialogDescription>
            </DialogHeader>

            {turnoCruzado && <AvisoTurnoCruzado cajeroNombre={turno.cajeroNombre} />}

            <form onSubmit={onSubmit} className="space-y-4">
              <MontoRealInput control={control} error={errors.montoReal} onAmountChange={handleMontoChange} />

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
                  rows={2}
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

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogAbierto(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="destructive" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cerrando…
                    </>
                  ) : (
                    'Confirmar Cierre'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
