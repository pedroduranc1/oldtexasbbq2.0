'use client';

import { useForm, Controller } from 'react-hook-form';
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import { useRegistrarMovimiento } from '@/lib/hooks/useCaja';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useRolGuard } from '@/lib/hooks/useRolGuard';
import { useConceptosPorTipo } from '@/lib/hooks/useConceptosFinancieros';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TipoMovimientoCaja } from '@/lib/types/firestore';
import { toast } from 'sonner';

// Fallback estático mientras cargan los conceptos desde Firestore
const FALLBACK_INGRESOS = ['Venta mostrador', 'Venta delivery', 'Anticipo cliente', 'Otro ingreso'];
const FALLBACK_EGRESOS = ['Compra insumos', 'Pago proveedor', 'Nómina', 'Otro egreso'];

/** Conceptos "escape valve" del catálogo — exigen detalle obligatorio en descripción */
const CONCEPTOS_OTRO = new Set(['Otro ingreso', 'Otro egreso']);

interface FormValues {
  tipo: TipoMovimientoCaja;
  monto: number;
  concepto: string;
  descripcion?: string;
}

interface RegistroMovimientoProps {
  turnoId: string;
}

export function RegistroMovimiento({ turnoId }: RegistroMovimientoProps) {
  const { userData: usuario } = useAuthStore();
  const { mutate: registrar, isPending } = useRegistrarMovimiento(turnoId);
  const { allowed } = useRolGuard(['admin', 'encargado', 'cajera']);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setFocus,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { tipo: 'ingreso', monto: 0, concepto: '', descripcion: '' },
  });

  const tipoActual = watch('tipo');
  const conceptoActual = watch('concepto');
  const esConceptoOtro = CONCEPTOS_OTRO.has(conceptoActual);

  // Conceptos dinámicos desde Firestore
  const { data: conceptosDinamicos = [] } = useConceptosPorTipo(tipoActual);
  const conceptos =
    conceptosDinamicos.length > 0
      ? conceptosDinamicos.map((c) => c.nombre)
      : tipoActual === 'ingreso'
      ? FALLBACK_INGRESOS
      : FALLBACK_EGRESOS;

  if (!allowed) return null;

  const onSubmit = (data: FormValues) => {
    if (!usuario) {
      toast.error('No hay sesión activa');
      return;
    }
    if (esConceptoOtro && !data.descripcion?.trim()) {
      toast.error('Especifica el detalle del concepto en la descripción');
      return;
    }
    registrar(
      {
        turno_id: turnoId,
        tipo: data.tipo,
        monto: data.monto,
        concepto: data.concepto,
        descripcion: data.descripcion || undefined,
        fecha: null as any, // El servicio asigna Timestamp.now()
        usuario_id: usuario.id,
      },
      {
        onSuccess: () => {
          toast.success(
            data.tipo === 'ingreso' ? 'Ingreso registrado' : 'Egreso registrado'
          );
          // Mantenemos tipo y concepto: en la práctica se registran varios
          // movimientos seguidos del mismo concepto (ej. "Venta mostrador").
          // Solo se limpian monto y descripción, y el foco vuelve al monto
          // para encadenar el siguiente registro sin usar el mouse.
          reset({ tipo: data.tipo, monto: 0, concepto: data.concepto, descripcion: '' });
          setFocus('monto');
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Error al registrar movimiento'),
      }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {tipoActual === 'ingreso' ? (
            <ArrowUpCircle className="h-5 w-5 text-green-500" />
          ) : (
            <ArrowDownCircle className="h-5 w-5 text-destructive" />
          )}
          Registrar Movimiento
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo */}
          <Tabs
            value={tipoActual}
            onValueChange={(v) => {
              setValue('tipo', v as TipoMovimientoCaja);
              setValue('concepto', '');
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="ingreso" className="flex-1 gap-1">
                <ArrowUpCircle className="h-4 w-4" />
                Ingreso
              </TabsTrigger>
              <TabsTrigger value="egreso" className="flex-1 gap-1">
                <ArrowDownCircle className="h-4 w-4" />
                Egreso
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Monto */}
          <div className="space-y-1">
            <Label htmlFor="monto">Monto ($)</Label>
            <Controller
              name="monto"
              control={control}
              rules={{
                required: 'El monto es requerido',
                min: { value: 0.01, message: 'El monto debe ser mayor a 0' },
              }}
              render={({ field }) => (
                <CurrencyInput
                  id="monto"
                  ref={field.ref}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.monto && (
              <p className="text-sm text-destructive">{errors.monto.message}</p>
            )}
          </div>

          {/* Concepto — siempre del catálogo, sin texto libre irrestricto */}
          <div className="space-y-1">
            <Label htmlFor="concepto">Concepto</Label>
            <input type="hidden" {...register('concepto', { required: 'Selecciona un concepto' })} />
            <Select
              onValueChange={(v) => setValue('concepto', v, { shouldValidate: true })}
              value={conceptoActual}
            >
              <SelectTrigger id="concepto">
                <SelectValue placeholder="Selecciona un concepto" />
              </SelectTrigger>
              <SelectContent>
                {conceptos.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.concepto && (
              <p className="text-sm text-destructive">{errors.concepto.message}</p>
            )}
          </div>

          {/* Descripción — obligatoria si el concepto es "Otro ingreso/egreso" */}
          <div className="space-y-1">
            <Label htmlFor="descripcion">
              Descripción{' '}
              {esConceptoOtro ? (
                <span className="text-destructive font-normal">(obligatorio)</span>
              ) : (
                <span className="text-muted-foreground font-normal">(opcional)</span>
              )}
            </Label>
            <Textarea
              id="descripcion"
              rows={2}
              placeholder={
                esConceptoOtro
                  ? 'Especifica de qué se trata este concepto…'
                  : 'Detalles adicionales…'
              }
              {...register('descripcion', {
                validate: (v) =>
                  !esConceptoOtro || !!v?.trim() || 'Especifica el detalle de este concepto',
              })}
            />
            {errors.descripcion && (
              <p className="text-sm text-destructive">{errors.descripcion.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            variant={tipoActual === 'ingreso' ? 'default' : 'destructive'}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando…
              </>
            ) : tipoActual === 'ingreso' ? (
              'Registrar Ingreso'
            ) : (
              'Registrar Egreso'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
