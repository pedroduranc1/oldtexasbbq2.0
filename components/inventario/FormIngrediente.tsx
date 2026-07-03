/**
 * FormIngrediente Component
 * Old Texas BBQ - CRM
 *
 * Modal para crear/editar ingredientes del inventario.
 * Incluye validaciones completas con React Hook Form.
 */

'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Ingrediente, CategoriaIngrediente, UnidadMedida, ProveedorCompleto } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
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
import { Spinner } from '@/components/ui/spinner';
import { CATEGORIAS_INGREDIENTES, UNIDADES_MEDIDA, UBICACIONES_ALMACEN } from '@/lib/constants';
import { proveedoresService } from '@/lib/services/proveedoresService';

export interface FormIngredienteData {
  nombre: string;
  categoria: CategoriaIngrediente;
  unidadMedida: UnidadMedida;
  precioPorUnidad: number;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  ubicacion: string;
  proveedorId?: string;
  lote?: string;
}

interface FormIngredienteProps {
  open: boolean;
  ingrediente?: Ingrediente;
  onSubmit: (data: FormIngredienteData) => Promise<void>;
  onClose: () => void;
}

export function FormIngrediente({
  open,
  ingrediente,
  onSubmit,
  onClose,
}: FormIngredienteProps) {
  const [proveedores, setProveedores] = useState<ProveedorCompleto[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormIngredienteData>({
    defaultValues: {
      nombre: '',
      categoria: 'PROTEINAS',
      unidadMedida: 'KILO',
      precioPorUnidad: 0,
      stockActual: 0,
      stockMinimo: 0,
      stockMaximo: 0,
      ubicacion: 'Almacén',
      proveedorId: '',
      lote: '',
    },
  });

  // Cargar proveedores activos
  useEffect(() => {
    const cargarProveedores = async () => {
      try {
        setLoadingProveedores(true);
        const data = await proveedoresService.getProveedores();
        setProveedores(data);
      } catch {
        setProveedores([]);
      } finally {
        setLoadingProveedores(false);
      }
    };

    if (open) {
      cargarProveedores();
    }
  }, [open]);

  // Rellenar formulario cuando se edita
  useEffect(() => {
    if (ingrediente) {
      reset({
        nombre: ingrediente.nombre,
        categoria: ingrediente.categoria,
        unidadMedida: ingrediente.unidadMedida,
        precioPorUnidad: ingrediente.precioPorUnidad,
        stockActual: ingrediente.stockActual,
        stockMinimo: ingrediente.stockMinimo,
        stockMaximo: ingrediente.stockMaximo,
        ubicacion: ingrediente.ubicacion ?? 'Almacén',
        proveedorId: ingrediente.proveedor?.id ?? '',
        lote: ingrediente.lote ?? '',
      });
    } else {
      reset({
        nombre: '',
        categoria: 'PROTEINAS',
        unidadMedida: 'KILO',
        precioPorUnidad: 0,
        stockActual: 0,
        stockMinimo: 0,
        stockMaximo: 0,
        ubicacion: 'Almacén',
        proveedorId: '',
        lote: '',
      });
    }
  }, [ingrediente, reset, open]);

  const handleFormSubmit = async (data: FormIngredienteData) => {
    try {
      setSubmitting(true);
      await onSubmit(data);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const categorias = Object.values(CATEGORIAS_INGREDIENTES);
  const unidades = Object.values(UNIDADES_MEDIDA);
  const ubicaciones = Object.values(UBICACIONES_ALMACEN);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ingrediente ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1">
            <Label htmlFor="nombre">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre"
              placeholder="Ej: Pechuga de pollo"
              {...register('nombre', {
                required: 'El nombre es requerido',
                minLength: { value: 2, message: 'Mínimo 2 caracteres' },
              })}
            />
            {errors.nombre && (
              <p className="text-xs text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          {/* Categoría y Unidad de Medida */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>
                Categoría <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch('categoria')}
                onValueChange={(val) =>
                  setValue('categoria', val as CategoriaIngrediente)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>
                Unidad <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch('unidadMedida')}
                onValueChange={(val) =>
                  setValue('unidadMedida', val as UnidadMedida)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((unidad) => (
                    <SelectItem key={unidad} value={unidad}>
                      {unidad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Precio */}
          <div className="space-y-1">
            <Label htmlFor="precioPorUnidad">
              Precio por Unidad ($) <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="precioPorUnidad"
              control={control}
              rules={{
                required: 'El precio es requerido',
                min: { value: 0, message: 'El precio no puede ser negativo' },
              }}
              render={({ field }) => (
                <CurrencyInput
                  id="precioPorUnidad"
                  ref={field.ref}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.precioPorUnidad && (
              <p className="text-xs text-destructive">
                {errors.precioPorUnidad.message}
              </p>
            )}
          </div>

          {/* Stock */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="stockActual">
                Stock Actual <span className="text-destructive">*</span>
              </Label>
              <Input
                id="stockActual"
                type="number"
                step="0.01"
                min="0"
                {...register('stockActual', {
                  required: 'Requerido',
                  min: { value: 0, message: 'No puede ser negativo' },
                  valueAsNumber: true,
                })}
              />
              {errors.stockActual && (
                <p className="text-xs text-destructive">
                  {errors.stockActual.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="stockMinimo">
                Stock Mín. <span className="text-destructive">*</span>
              </Label>
              <Input
                id="stockMinimo"
                type="number"
                step="0.01"
                min="0"
                {...register('stockMinimo', {
                  required: 'Requerido',
                  min: { value: 0, message: 'No puede ser negativo' },
                  valueAsNumber: true,
                })}
              />
              {errors.stockMinimo && (
                <p className="text-xs text-destructive">
                  {errors.stockMinimo.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="stockMaximo">Stock Máx.</Label>
              <Input
                id="stockMaximo"
                type="number"
                step="0.01"
                min="0"
                {...register('stockMaximo', {
                  min: { value: 0, message: 'No puede ser negativo' },
                  valueAsNumber: true,
                })}
              />
              {errors.stockMaximo && (
                <p className="text-xs text-destructive">
                  {errors.stockMaximo.message}
                </p>
              )}
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-1">
            <Label>Ubicación</Label>
            <Select
              value={watch('ubicacion')}
              onValueChange={(val) => setValue('ubicacion', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {ubicaciones.map((ub) => (
                  <SelectItem key={ub} value={ub}>
                    {ub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Proveedor */}
          <div className="space-y-1">
            <Label>Proveedor</Label>
            {loadingProveedores ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Spinner className="h-4 w-4" />
                Cargando proveedores...
              </div>
            ) : (
              <Select
                value={watch('proveedorId') || '__none__'}
                onValueChange={(val) =>
                  setValue('proveedorId', val === '__none__' ? '' : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin proveedor</SelectItem>
                  {proveedores.map((prov) => (
                    <SelectItem key={prov.id} value={prov.id}>
                      {prov.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Lote (opcional) */}
          <div className="space-y-1">
            <Label htmlFor="lote">Lote (opcional)</Label>
            <Input
              id="lote"
              placeholder="Número de lote"
              {...register('lote')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Guardando...
                </>
              ) : ingrediente ? (
                'Guardar cambios'
              ) : (
                'Crear ingrediente'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
