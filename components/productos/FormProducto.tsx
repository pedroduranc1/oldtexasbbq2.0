/**
 * FormProducto Component
 * Old Texas BBQ - CRM
 *
 * Formulario completo para crear/editar productos con:
 * - Validación completa con React Hook Form
 * - Upload de imagen con Cloudinary
 * - Campos configurables según estado
 */

'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Producto, Categoria } from '@/lib/types/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/ui/image-upload';
import { Spinner } from '@/components/ui/spinner';
import { validatePositiveNumber } from '@/lib/utils/validators';
import { categoriasService } from '@/lib/services/categorias.service';
import { Loader2 } from 'lucide-react';

interface FormProductoData {
  nombre: string;
  descripcion: string;
  precio: number;
  categoriaId: string;
  imagen?: string;
  imagenFile?: File; // Archivo de imagen para subir después de guardar en Firebase
  disponible: boolean;
  enPromocion: boolean;
  precioPromocion?: number;
  orden: number;
}

interface FormProductoProps {
  producto?: Producto;
  onSubmit: (data: FormProductoData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function FormProducto({
  producto,
  onSubmit,
  onCancel,
  loading = false,
}: FormProductoProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [imagenUrl, setImagenUrl] = useState<string | null>(producto?.imagen || null);
  const [imagenFile, setImagenFile] = useState<File | null>(null); // Archivo pendiente de subir
  const [imagenPreview, setImagenPreview] = useState<string | null>(producto?.imagen || null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormProductoData>({
    defaultValues: {
      nombre: producto?.nombre || '',
      descripcion: producto?.descripcion || '',
      precio: producto?.precio || 0,
      categoriaId: producto?.categoriaId || '',
      imagen: producto?.imagen || '',
      disponible: producto?.disponible ?? true,
      enPromocion: producto?.enPromocion || false,
      precioPromocion: producto?.precioPromocion || undefined,
      orden: producto?.orden || 0,
    },
  });

  // Watch para campos condicionales
  const enPromocion = watch('enPromocion');
  const precio = watch('precio');
  const categoriaId = watch('categoriaId');

  // Registrar campo categoriaId manualmente
  useEffect(() => {
    register('categoriaId', { required: 'La categoría es requerida' });
  }, [register]);

  // Cargar categorías activas
  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const todasCategorias = await categoriasService.getAll({
          orderByField: 'orden',
          orderDirection: 'asc',
        });

        // Filtrar solo categorías activas
        const categoriasActivas = todasCategorias.filter(c => c.activa);
        setCategorias(categoriasActivas);
      } catch (error) {
        console.error('Error cargando categorías:', error);
      } finally {
        setLoadingCategorias(false);
      }
    };

    cargarCategorias();
  }, []);

  // Función de "upload" para ImageUpload - NO sube realmente, solo guarda el archivo
  const handleUploadImage = async (
    file: File,
    onProgress?: (progress: number) => void
  ) => {
    // Simular progreso instantáneo (no hay upload real)
    onProgress?.(100);

    // Guardar el archivo para subirlo después
    setImagenFile(file);

    // Crear preview local
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagenPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Retornar éxito con la preview local (no es URL de Cloudinary aún)
    return {
      success: true,
      secureUrl: URL.createObjectURL(file), // URL temporal para preview
      message: 'Imagen lista para subir',
    };
  };

  // Manejar cambio de imagen
  const handleImageChange = (url: string | null) => {
    if (!url) {
      // Si se elimina la imagen
      setImagenUrl(null);
      setImagenFile(null);
      setImagenPreview(null);
      setValue('imagen', '');
    } else {
      setImagenPreview(url);
    }
  };

  // Manejar submit del formulario
  const handleFormSubmit = async (data: FormProductoData) => {
    // Validación de precio de promoción
    if (data.enPromocion && data.precioPromocion) {
      if (data.precioPromocion >= data.precio) {
        alert('El precio de promoción debe ser menor al precio normal');
        return;
      }
    }

    // Pasar la imagen existente (URL) si no hay archivo nuevo
    if (imagenUrl && !imagenFile) {
      data.imagen = imagenUrl;
    }

    // Pasar el archivo de imagen si hay uno nuevo pendiente
    if (imagenFile) {
      data.imagenFile = imagenFile;
    }

    await onSubmit(data);
  };

  const isFormLoading = isSubmitting || loading;

  if (loadingCategorias) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
        <p className="ml-3 text-muted-foreground">Cargando categorías...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Imagen del producto */}
      <div className="space-y-2">
        <Label htmlFor="imagen">Foto del producto</Label>
        <ImageUpload
          value={imagenPreview || undefined}
          onChange={handleImageChange}
          disabled={isFormLoading}
          uploadFunction={handleUploadImage}
          maxSize={5}
          showPreview
        />
        <p className="text-xs text-muted-foreground">
          Formatos: JPG, PNG, WEBP • Máximo 5MB
          {imagenFile && <span className="text-primary ml-2">• Imagen pendiente de guardar</span>}
        </p>
      </div>

      {/* Nombre */}
      <div className="space-y-2">
        <Label htmlFor="nombre">
          Nombre del producto <span className="text-destructive">*</span>
        </Label>
        <Input
          id="nombre"
          {...register('nombre', {
            required: 'El nombre es requerido',
            minLength: {
              value: 3,
              message: 'El nombre debe tener al menos 3 caracteres',
            },
          })}
          placeholder="Ej: Costillas BBQ"
          disabled={isFormLoading}
        />
        {errors.nombre && (
          <p className="text-sm text-destructive">{errors.nombre.message}</p>
        )}
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          {...register('descripcion')}
          placeholder="Describe el producto (opcional)"
          rows={3}
          disabled={isFormLoading}
        />
        {errors.descripcion && (
          <p className="text-sm text-destructive">{errors.descripcion.message}</p>
        )}
      </div>

      {/* Categoría */}
      <div className="space-y-2">
        <Label htmlFor="categoriaId">
          Categoría <span className="text-destructive">*</span>
        </Label>
        {categorias.length === 0 && !loadingCategorias ? (
          <div className="p-4 border-2 border-dashed rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">
              No hay categorías disponibles
            </p>
            <a
              href="/productos/categorias"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Crear categorías primero →
            </a>
          </div>
        ) : (
          <>
            <Select
              value={categoriaId}
              onValueChange={(value) => setValue('categoriaId', value)}
              disabled={isFormLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        {errors.categoriaId && (
          <p className="text-sm text-destructive">{errors.categoriaId.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {categorias.length} categorías disponibles
        </p>
      </div>

      {/* Grid de Precio y Orden */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Precio */}
        <div className="space-y-2">
          <Label htmlFor="precio">
            Precio (MXN) <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="precio"
            control={control}
            rules={{
              required: 'El precio es requerido',
              validate: (value) =>
                validatePositiveNumber(value) || 'El precio debe ser mayor a 0',
            }}
            render={({ field }) => (
              <CurrencyInput
                id="precio"
                ref={field.ref}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isFormLoading}
              />
            )}
          />
          {errors.precio && (
            <p className="text-sm text-destructive">{errors.precio.message}</p>
          )}
        </div>

        {/* Orden de visualización */}
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
      </div>

      {/* Switches */}
      <div className="space-y-4 p-4 border rounded-lg">
        {/* Disponible */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="disponible">Disponible para venta</Label>
            <p className="text-xs text-muted-foreground">
              El producto se mostrará en el catálogo
            </p>
          </div>
          <Switch
            id="disponible"
            checked={watch('disponible')}
            onCheckedChange={(checked) => setValue('disponible', checked)}
            disabled={isFormLoading}
          />
        </div>

        {/* En Promoción */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enPromocion">En promoción</Label>
            <p className="text-xs text-muted-foreground">
              Mostrar badge de promoción
            </p>
          </div>
          <Switch
            id="enPromocion"
            checked={watch('enPromocion')}
            onCheckedChange={(checked) => {
              setValue('enPromocion', checked);
              if (!checked) {
                setValue('precioPromocion', undefined);
              }
            }}
            disabled={isFormLoading}
          />
        </div>

        {/* Precio de Promoción (condicional) */}
        {enPromocion && (
          <div className="space-y-2 pl-4 border-l-2 border-primary">
            <Label htmlFor="precioPromocion">
              Precio de promoción (MXN)
            </Label>
            <Controller
              name="precioPromocion"
              control={control}
              rules={{
                validate: (value) => {
                  if (!value) return true;
                  if (!validatePositiveNumber(value)) {
                    return 'El precio debe ser mayor a 0';
                  }
                  if (value >= precio) {
                    return 'Debe ser menor al precio normal';
                  }
                  return true;
                },
              }}
              render={({ field }) => (
                <CurrencyInput
                  id="precioPromocion"
                  ref={field.ref}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isFormLoading}
                />
              )}
            />
            {errors.precioPromocion && (
              <p className="text-sm text-destructive">
                {errors.precioPromocion.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Precio normal: ${precio.toFixed(2)} MXN
            </p>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isFormLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isFormLoading}>
          {isFormLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {producto ? 'Actualizando...' : 'Creando...'}
            </>
          ) : (
            <>{producto ? 'Actualizar producto' : 'Crear producto'}</>
          )}
        </Button>
      </div>
    </form>
  );
}
