/**
 * CategoriaModal Component
 * Old Texas BBQ - CRM
 *
 * Modal para crear y editar categorías
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Categoria } from '@/lib/types/firestore';
import { categoriasService } from '@/lib/services/categorias.service';
import { useAuth } from '@/lib/auth/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface CategoriaFormData {
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  orden: number;
  activa: boolean;
}

interface CategoriaModalProps {
  open: boolean;
  onClose: () => void;
  categoria?: Categoria;
  onSuccess?: () => void;
}

// Colores predefinidos para categorías
const COLORES_CATEGORIA = [
  { value: '#ef4444', label: 'Rojo' },
  { value: '#f97316', label: 'Naranja' },
  { value: '#f59e0b', label: 'Amarillo' },
  { value: '#84cc16', label: 'Lima' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#14b8a6', label: 'Turquesa' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#6b7280', label: 'Gris' },
];

export function CategoriaModal({
  open,
  onClose,
  categoria,
  onSuccess,
}: CategoriaModalProps) {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validandoNombre, setValidandoNombre] = useState(false);

  const isEditing = !!categoria;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CategoriaFormData>({
    defaultValues: {
      nombre: categoria?.nombre || '',
      descripcion: categoria?.descripcion || '',
      icono: categoria?.icono || '',
      color: categoria?.color || '#3b82f6',
      orden: categoria?.orden || 0,
      activa: categoria?.activa ?? true,
    },
  });

  const colorSeleccionado = watch('color');
  const activa = watch('activa');

  // Reset form cuando cambia la categoría
  useEffect(() => {
    if (categoria) {
      reset({
        nombre: categoria.nombre,
        descripcion: categoria.descripcion || '',
        icono: categoria.icono || '',
        color: categoria.color || '#3b82f6',
        orden: categoria.orden,
        activa: categoria.activa,
      });
    } else {
      reset({
        nombre: '',
        descripcion: '',
        icono: '',
        color: '#3b82f6',
        orden: 0,
        activa: true,
      });
    }
  }, [categoria, reset]);

  // Validar nombre único
  const validarNombreUnico = async (nombre: string): Promise<boolean> => {
    if (!nombre.trim()) return true;

    setValidandoNombre(true);
    try {
      const categorias = await categoriasService.getAll();

      // Si estamos editando, excluir la categoría actual
      const nombreExiste = categorias.some(
        (cat) =>
          cat.nombre.toLowerCase() === nombre.toLowerCase() &&
          cat.id !== categoria?.id
      );

      return !nombreExiste;
    } catch (error) {
      console.error('Error validando nombre:', error);
      return true;
    } finally {
      setValidandoNombre(false);
    }
  };

  const handleFormSubmit = async (data: CategoriaFormData) => {
    if (!userData) {
      toast.error('Usuario no autenticado');
      return;
    }

    // Validar nombre único
    const nombreValido = await validarNombreUnico(data.nombre);
    if (!nombreValido) {
      toast.error('Ya existe una categoría con ese nombre');
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        // Actualizar categoría existente
        await categoriasService.update(categoria.id, {
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || '',
          icono: data.icono?.trim() || '',
          color: data.color,
          orden: data.orden,
          activa: data.activa,
          fechaActualizacion: Timestamp.now(),
        });

        toast.success('Categoría actualizada correctamente');
      } else {
        // Crear nueva categoría
        await categoriasService.create({
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || '',
          icono: data.icono?.trim() || '',
          color: data.color,
          orden: data.orden,
          activa: data.activa,
          fechaCreacion: Timestamp.now(),
          fechaActualizacion: Timestamp.now(),
        });

        toast.success('Categoría creada correctamente');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error al guardar categoría:', error);
      toast.error(error.message || 'Error al guardar la categoría');
    } finally {
      setLoading(false);
    }
  };

  const isFormLoading = loading || validandoNombre;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar categoría' : 'Nueva categoría'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza la información de la categoría'
              : 'Completa los datos para crear una nueva categoría'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="nombre">
              Nombre de la categoría <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre"
              {...register('nombre', {
                required: 'El nombre es requerido',
                minLength: {
                  value: 2,
                  message: 'El nombre debe tener al menos 2 caracteres',
                },
              })}
              placeholder="Ej: Carnes, Guarniciones, Bebidas"
              disabled={isFormLoading}
            />
            {errors.nombre && (
              <p className="text-sm text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Textarea
              id="descripcion"
              {...register('descripcion')}
              placeholder="Describe la categoría"
              rows={2}
              disabled={isFormLoading}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color de la categoría</Label>
            <div className="grid grid-cols-6 gap-2">
              {COLORES_CATEGORIA.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setValue('color', color.value)}
                  disabled={isFormLoading}
                  className={`w-10 h-10 rounded-md transition-all ${
                    colorSeleccionado === color.value
                      ? 'ring-2 ring-offset-2 ring-primary scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Color seleccionado: {COLORES_CATEGORIA.find(c => c.value === colorSeleccionado)?.label}
            </p>
          </div>

          {/* Orden */}
          <div className="space-y-2">
            <Label htmlFor="orden">Orden de visualización</Label>
            <Input
              id="orden"
              type="number"
              min="0"
              {...register('orden', {
                valueAsNumber: true,
              })}
              placeholder="0"
              disabled={isFormLoading}
            />
            <p className="text-xs text-muted-foreground">
              Menor número = aparece primero
            </p>
          </div>

          {/* Activa */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="activa">Categoría activa</Label>
              <p className="text-xs text-muted-foreground">
                Solo las categorías activas se mostrarán
              </p>
            </div>
            <Switch
              id="activa"
              checked={activa}
              onCheckedChange={(checked) => setValue('activa', checked)}
              disabled={isFormLoading}
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isFormLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isFormLoading}>
              {isFormLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                <>{isEditing ? 'Actualizar' : 'Crear categoría'}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
