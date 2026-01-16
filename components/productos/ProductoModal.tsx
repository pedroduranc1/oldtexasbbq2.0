/**
 * ProductoModal Component
 * Old Texas BBQ - CRM
 *
 * Modal para crear y editar productos
 * Flujo: Guarda en Firebase primero, luego sube imagen a Cloudinary
 */

'use client';

import { useState } from 'react';
import { Producto } from '@/lib/types/firestore';
import { productosService } from '@/lib/services/productos.service';
import { uploadProductImage } from '@/lib/cloudinary/upload';
import { useAuth } from '@/lib/auth/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormProducto } from './FormProducto';
import { Timestamp } from 'firebase/firestore';

interface ProductoModalProps {
  open: boolean;
  onClose: () => void;
  producto?: Producto;
  onSuccess?: () => void;
}

export function ProductoModal({
  open,
  onClose,
  producto,
  onSuccess,
}: ProductoModalProps) {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);

  const isEditing = !!producto;

  const handleSubmit = async (data: any) => {
    if (!userData) {
      toast.error('Usuario no autenticado');
      return;
    }

    setLoading(true);
    let productoId: string | null = null;

    try {
      if (isEditing) {
        // ============================================
        // ACTUALIZAR PRODUCTO EXISTENTE
        // ============================================
        productoId = producto.id;

        const updateData: Record<string, any> = {
          nombre: data.nombre,
          descripcion: data.descripcion || '',
          precio: data.precio,
          categoriaId: data.categoriaId,
          disponible: data.disponible,
          enPromocion: data.enPromocion,
          orden: data.orden || 0,
          fechaActualizacion: Timestamp.now(),
        };

        // Mantener imagen existente si no hay archivo nuevo
        if (data.imagen && !data.imagenFile) {
          updateData.imagen = data.imagen;
        }

        if (data.enPromocion && data.precioPromocion) {
          updateData.precioPromocion = data.precioPromocion;
        } else {
          updateData.precioPromocion = null;
        }

        // Paso 1: Actualizar producto en Firebase (sin imagen nueva)
        await productosService.update(producto.id, updateData);
        toast.success('Producto actualizado correctamente');

        // Paso 2: Si hay imagen nueva, subirla a Cloudinary
        if (data.imagenFile) {
          toast.loading('Subiendo imagen...', { id: 'upload-image' });

          const uploadResult = await uploadProductImage(
            data.imagenFile,
            producto.id
          );

          if (uploadResult.success && uploadResult.secureUrl) {
            // Paso 3: Actualizar producto con URL de imagen
            await productosService.update(producto.id, {
              imagen: uploadResult.secureUrl,
              fechaActualizacion: Timestamp.now(),
            });
            toast.success('Imagen actualizada', { id: 'upload-image' });
          } else {
            toast.error(uploadResult.message || 'Error al subir imagen', {
              id: 'upload-image',
            });
          }
        }
      } else {
        // ============================================
        // CREAR NUEVO PRODUCTO
        // ============================================

        // Obtener la categoría seleccionada para tener el nombre
        const categoriasService = (
          await import('@/lib/services/categorias.service')
        ).categoriasService;
        const categoria = await categoriasService.getById(data.categoriaId);

        if (!categoria) {
          toast.error('Categoría no encontrada');
          return;
        }

        const nuevoProducto: Record<string, any> = {
          nombre: data.nombre,
          descripcion: data.descripcion || '',
          precio: data.precio,
          categoriaId: data.categoriaId,
          categoriaNombre: categoria.nombre,
          disponible: data.disponible,
          enPromocion: data.enPromocion,
          orden: data.orden || 0,
          popularidad: 0,
          permitePersonalizacion: false,
          fechaCreacion: Timestamp.now(),
          fechaActualizacion: Timestamp.now(),
          creadoPor: userData.id,
        };

        if (data.enPromocion && data.precioPromocion) {
          nuevoProducto.precioPromocion = data.precioPromocion;
        }

        // Paso 1: Crear producto en Firebase (sin imagen)
        productoId = await productosService.create(nuevoProducto);
        toast.success('Producto creado correctamente');

        // Paso 2: Si hay imagen, subirla a Cloudinary
        if (data.imagenFile && productoId) {
          toast.loading('Subiendo imagen...', { id: 'upload-image' });

          const uploadResult = await uploadProductImage(
            data.imagenFile,
            productoId
          );

          if (uploadResult.success && uploadResult.secureUrl) {
            // Paso 3: Actualizar producto con URL de imagen
            await productosService.update(productoId, {
              imagen: uploadResult.secureUrl,
              fechaActualizacion: Timestamp.now(),
            });
            toast.success('Imagen guardada', { id: 'upload-image' });
          } else {
            toast.error(
              uploadResult.message || 'Error al subir imagen. El producto se guardó sin imagen.',
              { id: 'upload-image' }
            );
          }
        }
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error al guardar producto:', error);
      toast.error(error.message || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza la información del producto'
              : 'Completa los datos para crear un nuevo producto'}
          </DialogDescription>
        </DialogHeader>

        <FormProducto
          producto={producto}
          onSubmit={handleSubmit}
          onCancel={onClose}
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  );
}
