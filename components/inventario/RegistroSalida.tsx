'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { PackageMinus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { registrarSalida, type TipoMovimientoInventario } from '@/lib/services/movimientosInventario.service';
import { ingredientesService } from '@/lib/services/ingredientes.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { Ingrediente } from '@/lib/types';

const TIPOS: { value: 'salida' | 'merma' | 'venta'; label: string }[] = [
  { value: 'salida', label: 'Salida (uso en cocina)' },
  { value: 'merma', label: 'Merma / Desperdicio' },
  { value: 'venta', label: 'Descontada por venta' },
];

interface FormValues {
  ingredienteId: string;
  tipo: 'salida' | 'merma' | 'venta';
  cantidad: string;
  costoUnitario: string;
  motivo: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RegistroSalida({ open, onClose, onSuccess }: Props) {
  const { userData } = useAuthStore();
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState<Ingrediente | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<FormValues>({ defaultValues: { tipo: 'salida', motivo: '' } });

  const ingredienteId = watch('ingredienteId');
  const cantidadStr = watch('cantidad');
  const tipo = watch('tipo');

  useEffect(() => {
    if (!open) return;
    ingredientesService.getIngredientes().then(setIngredientes);
  }, [open]);

  useEffect(() => {
    const ing = ingredientes.find((i) => i.id === ingredienteId) ?? null;
    setIngredienteSeleccionado(ing);
  }, [ingredienteId, ingredientes]);

  const cantidadNum = parseFloat(cantidadStr ?? '0') || 0;
  const stockDespues = ingredienteSeleccionado
    ? Math.max(0, ingredienteSeleccionado.stockActual - cantidadNum)
    : null;
  const alertaSinStock = stockDespues !== null && stockDespues === 0 && cantidadNum > 0;

  async function onSubmit(data: FormValues) {
    if (!userData || !ingredienteSeleccionado) return;
    setLoading(true);
    try {
      await registrarSalida({
        ingrediente_id: ingredienteSeleccionado.id,
        ingredienteNombre: ingredienteSeleccionado.nombre,
        stockActual: ingredienteSeleccionado.stockActual,
        cantidad: parseFloat(data.cantidad),
        costo_unitario: data.costoUnitario ? parseFloat(data.costoUnitario) : undefined,
        tipo: data.tipo,
        motivo: data.motivo,
        usuarioId: userData.id,
        usuarioNombre: `${userData.nombre} ${userData.apellido ?? ''}`.trim(),
      });
      toast.success(`Salida registrada: -${data.cantidad} ${ingredienteSeleccionado.unidadMedida} de ${ingredienteSeleccionado.nombre}`);
      reset();
      setIngredienteSeleccionado(null);
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Error al registrar la salida');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageMinus className="h-5 w-5 text-red-600" />
            Registrar Salida / Merma
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Tipo */}
          <div className="space-y-1">
            <Label>Tipo de salida *</Label>
            <Select defaultValue="salida" onValueChange={(v) => setValue('tipo', v as 'salida' | 'merma' | 'venta')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ingrediente */}
          <div className="space-y-1">
            <Label>Ingrediente *</Label>
            <Select onValueChange={(v) => setValue('ingredienteId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar ingrediente…" />
              </SelectTrigger>
              <SelectContent>
                {ingredientes.map((ing) => (
                  <SelectItem key={ing.id} value={ing.id}>
                    {ing.nombre}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({ing.stockActual} {ing.unidadMedida})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {ingredienteSeleccionado && (
              <div className="text-xs space-y-0.5">
                <p className="text-muted-foreground">
                  Stock actual: <strong>{ingredienteSeleccionado.stockActual} {ingredienteSeleccionado.unidadMedida}</strong>
                </p>
                {stockDespues !== null && cantidadNum > 0 && (
                  <p className={alertaSinStock ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                    Stock después: {stockDespues} {ingredienteSeleccionado.unidadMedida}
                    {alertaSinStock && ' — ⚠ quedará sin stock'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Cantidad y costo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Cantidad *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...register('cantidad', { required: true, min: 0.01 })}
              />
              {errors.cantidad && <p className="text-xs text-destructive">Requerido</p>}
            </div>
            <div className="space-y-1">
              <Label>Costo unitario</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="$0.00"
                {...register('costoUnitario')}
              />
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-1">
            <Label>Motivo *</Label>
            <Textarea
              rows={2}
              placeholder={tipo === 'merma' ? 'Ej: producto vencido, caída accidental…' : 'Ej: preparación de platillos del turno…'}
              {...register('motivo', { required: true })}
            />
            {errors.motivo && <p className="text-xs text-destructive">Requerido</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !ingredienteId}
              variant="destructive"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Salida
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
