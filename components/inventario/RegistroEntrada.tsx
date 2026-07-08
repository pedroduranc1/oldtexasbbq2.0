'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { PackagePlus, Loader2 } from 'lucide-react';
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
import { registrarEntrada } from '@/lib/services/movimientosInventario.service';
import { getProveedores, type Proveedor } from '@/lib/services/proveedores.service';
import { ingredientesService } from '@/lib/services/ingredientes.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { Ingrediente } from '@/lib/types';

interface FormValues {
  ingredienteId: string;
  cantidad: string;
  costoUnitario: string;
  motivo: string;
  proveedorId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RegistroEntrada({ open, onClose, onSuccess }: Props) {
  const { userData } = useAuthStore();
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState<Ingrediente | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<FormValues>({ defaultValues: { motivo: 'Compra a proveedor', proveedorId: '' } });

  const ingredienteId = watch('ingredienteId');

  useEffect(() => {
    if (!open) return;
    Promise.all([
      ingredientesService.getIngredientes(),
      getProveedores(true),
    ]).then(([ings, provs]) => {
      setIngredientes(ings);
      setProveedores(provs);
    });
  }, [open]);

  useEffect(() => {
    const ing = ingredientes.find((i) => i.id === ingredienteId) ?? null;
    setIngredienteSeleccionado(ing);
  }, [ingredienteId, ingredientes]);

  async function onSubmit(data: FormValues) {
    if (!userData || !ingredienteSeleccionado) return;
    setLoading(true);
    try {
      const proveedor = proveedores.find((p) => p.id === data.proveedorId);
      await registrarEntrada({
        ingrediente_id: ingredienteSeleccionado.id,
        ingredienteNombre: ingredienteSeleccionado.nombre,
        stockActual: ingredienteSeleccionado.stockActual,
        cantidad: parseFloat(data.cantidad),
        costo_unitario: data.costoUnitario ? parseFloat(data.costoUnitario) : undefined,
        motivo: data.motivo,
        proveedorId: proveedor?.id,
        proveedorNombre: proveedor?.nombre,
        usuarioId: userData.id,
        usuarioNombre: `${userData.nombre} ${userData.apellido ?? ''}`.trim(),
      });
      toast.success(`Entrada registrada: +${data.cantidad} ${ingredienteSeleccionado.unidadMedida} de ${ingredienteSeleccionado.nombre}`);
      reset();
      setIngredienteSeleccionado(null);
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Error al registrar la entrada');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-green-600" />
            Registrar Entrada
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
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
                      (stock: {ing.stockActual} {ing.unidadMedida})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ingredienteSeleccionado && (
              <p className="text-xs text-muted-foreground">
                Stock actual: <strong>{ingredienteSeleccionado.stockActual} {ingredienteSeleccionado.unidadMedida}</strong>
                {' · '}Mínimo: {ingredienteSeleccionado.stockMinimo}
              </p>
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

          {/* Proveedor */}
          <div className="space-y-1">
            <Label>Proveedor</Label>
            <Select onValueChange={(v) => setValue('proveedorId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional…" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo */}
          <div className="space-y-1">
            <Label>Motivo *</Label>
            <Textarea
              rows={2}
              {...register('motivo', { required: true })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !ingredienteId}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Entrada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
