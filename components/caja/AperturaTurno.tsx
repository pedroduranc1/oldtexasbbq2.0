'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { DollarSign, Sun, Sunset, Moon, Loader2, AlertTriangle } from 'lucide-react';
import { useAbrirTurno } from '@/lib/hooks/useCaja';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useRolGuard } from '@/lib/hooks/useRolGuard';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TipoTurno } from '@/lib/types/firestore';
import { toast } from 'sonner';

const FONDO_ESTANDAR = 800;

/** Detecta el tipo de turno según la hora actual:
 *  06:00–16:59 → matutino | 17:00–22:59 → vespertino | 23:00–05:59 → nocturno
 */
function detectarTipoPorHora(): TipoTurno {
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return 'matutino';
  if (h >= 17 && h < 23) return 'vespertino';
  return 'nocturno';
}

interface FormValues {
  tipo: TipoTurno;
  fondoInicial: number;
  razonFondoCero?: string;
}

export function AperturaTurno() {
  const { userData: usuario } = useAuthStore();
  const { mutate: abrirTurno, isPending } = useAbrirTurno();
  const { allowed, isLoading: guardLoading } = useRolGuard(['admin', 'encargado', 'cajera']);
  const [tipoAuto] = useState<TipoTurno>(detectarTipoPorHora);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { tipo: tipoAuto, fondoInicial: FONDO_ESTANDAR },
  });

  const tipoSeleccionado = watch('tipo');
  const fondoWatch = watch('fondoInicial');
  const fondoCero = Number(fondoWatch) === 0;

  // Sync tipo auto-detectado al montar.
  // Importante: este hook debe declararse antes de cualquier `return`
  // condicional (guardLoading / !allowed) para no violar las reglas de
  // hooks de React (el número de hooks debe ser el mismo en cada render).
  useEffect(() => {
    setValue('tipo', tipoAuto);
  }, [tipoAuto, setValue]);

  if (guardLoading) return null;
  if (!allowed) return (
    <div className="p-4 text-sm text-muted-foreground text-center">
      No tienes permiso para abrir turnos.
    </div>
  );

  const onSubmit = (data: FormValues) => {
    if (!usuario) {
      toast.error('No hay sesión activa');
      return;
    }
    if (fondoCero && !data.razonFondoCero?.trim()) {
      toast.error('Indica el motivo del fondo $0 antes de continuar');
      return;
    }
    abrirTurno(
      {
        tipo: data.tipo,
        cajeroId: usuario.id,
        cajeroNombre: [usuario.nombre, usuario.apellido].filter(Boolean).join(' '),
        fondoInicial: data.fondoInicial,
      },
      {
        onSuccess: () => toast.success('Turno abierto correctamente'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Error al abrir turno'),
      }
    );
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Apertura de Turno
        </CardTitle>
        <CardDescription>
          Ingresa el fondo inicial de caja para comenzar el turno
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Tipo de turno */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de turno</Label>
            <Select
              value={tipoSeleccionado}
              onValueChange={(v) => setValue('tipo', v as TipoTurno)}
            >
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matutino">
                  <span className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Matutino (6:00–16:59)
                  </span>
                </SelectItem>
                <SelectItem value="vespertino">
                  <span className="flex items-center gap-2">
                    <Sunset className="h-4 w-4" />
                    Vespertino (17:00–22:59)
                  </span>
                </SelectItem>
                <SelectItem value="nocturno">
                  <span className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Nocturno (23:00–5:59)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {tipoSeleccionado !== tipoAuto && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Auto-detectado: <strong>{tipoAuto}</strong> — estás cambiando manualmente
              </p>
            )}
          </div>

          {/* Fondo inicial */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fondoInicial">Fondo inicial ($)</Label>
              <button
                type="button"
                className="text-xs text-primary underline"
                onClick={() => setValue('fondoInicial', FONDO_ESTANDAR)}
              >
                Usar estándar (${FONDO_ESTANDAR})
              </button>
            </div>
            <Controller
              name="fondoInicial"
              control={control}
              rules={{
                required: 'El fondo inicial es requerido',
                min: { value: 0, message: 'El fondo no puede ser negativo' },
              }}
              render={({ field }) => (
                <CurrencyInput
                  id="fondoInicial"
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.fondoInicial && (
              <p className="text-sm text-destructive">{errors.fondoInicial.message}</p>
            )}
            {Number(fondoWatch) > 0 && Number(fondoWatch) !== FONDO_ESTANDAR && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Fondo distinto al estándar de ${FONDO_ESTANDAR}
              </p>
            )}
          </div>

          {/* Razón fondo $0 — solo si aplica */}
          {fondoCero && (
            <div className="space-y-2">
              <Label htmlFor="razonFondoCero">
                Motivo del fondo $0 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="razonFondoCero"
                rows={2}
                placeholder="Ej: fondo en tránsito, situación especial…"
                {...register('razonFondoCero', {
                  required: fondoCero ? 'Indica el motivo del fondo $0' : false,
                })}
              />
              {errors.razonFondoCero && (
                <p className="text-sm text-destructive">{errors.razonFondoCero.message}</p>
              )}
              <div className="flex gap-2 p-3 bg-amber-500/10 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Iniciar con fondo $0 requiere autorización del encargado.</p>
              </div>
            </div>
          )}

          {/* Cajero (informativo) */}
          {usuario && (
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p className="text-muted-foreground">Cajero(a)</p>
              <p className="font-medium">
                {usuario.nombre} {usuario.apellido}
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Abriendo turno…
              </>
            ) : (
              'Abrir Turno'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
