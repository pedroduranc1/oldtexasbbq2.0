/**
 * GaleriaProducto Component
 * Old Texas BBQ - CRM
 *
 * Componente para manejar múltiples imágenes de un producto
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  Plus,
  X,
  GripVertical,
  Star,
  StarOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GaleriaProductoProps {
  imagenPrincipal?: string;
  imagenes?: string[];
  onImagenPrincipalChange: (url: string | null) => void;
  onImagenesChange: (urls: string[]) => void;
  uploadFunction: (
    file: File,
    onProgress?: (progress: number) => void
  ) => Promise<{ success: boolean; secureUrl?: string; message?: string }>;
  disabled?: boolean;
  maxImages?: number;
}

// Componente de imagen sortable
function SortableImage({
  url,
  index,
  isPrincipal,
  onSetPrincipal,
  onRemove,
}: {
  url: string;
  index: number;
  isPrincipal: boolean;
  onSetPrincipal: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group w-24 h-24 rounded-lg overflow-hidden border-2
        ${isPrincipal ? 'border-primary' : 'border-border'}
      `}
    >
      <Image src={url} alt={`Imagen ${index + 1}`} fill className="object-cover" />

      {/* Overlay con acciones */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 bg-white/20 rounded hover:bg-white/40"
        >
          <GripVertical className="h-4 w-4 text-white" />
        </button>

        {/* Set as principal */}
        <button
          onClick={onSetPrincipal}
          className="p-1 bg-white/20 rounded hover:bg-white/40"
          title={isPrincipal ? 'Imagen principal' : 'Establecer como principal'}
        >
          {isPrincipal ? (
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          ) : (
            <StarOff className="h-4 w-4 text-white" />
          )}
        </button>

        {/* Remove */}
        <button
          onClick={onRemove}
          className="p-1 bg-white/20 rounded hover:bg-red-500/80"
          title="Eliminar imagen"
        >
          <Trash2 className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Badge de principal */}
      {isPrincipal && (
        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
          Principal
        </div>
      )}
    </div>
  );
}

export function GaleriaProducto({
  imagenPrincipal,
  imagenes = [],
  onImagenPrincipalChange,
  onImagenesChange,
  uploadFunction,
  disabled = false,
  maxImages = 5,
}: GaleriaProductoProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Combinar todas las imágenes
  const todasLasImagenes = [
    ...(imagenPrincipal ? [imagenPrincipal] : []),
    ...imagenes.filter((img) => img !== imagenPrincipal),
  ];

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = todasLasImagenes.findIndex((img) => img === active.id);
    const newIndex = todasLasImagenes.findIndex((img) => img === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(todasLasImagenes, oldIndex, newIndex);

    // La primera imagen siempre es la principal
    onImagenPrincipalChange(newOrder[0] || null);
    onImagenesChange(newOrder.slice(1));
  };

  const handleUploadComplete = (url: string | null) => {
    if (!url) return;

    if (!imagenPrincipal) {
      // Si no hay imagen principal, esta se convierte en principal
      onImagenPrincipalChange(url);
    } else {
      // Si ya hay principal, agregar a la galería
      onImagenesChange([...imagenes, url]);
    }

    setShowUpload(false);
  };

  const handleSetPrincipal = (url: string) => {
    if (url === imagenPrincipal) return;

    // Mover la actual principal a la galería
    const nuevasImagenes = imagenes.filter((img) => img !== url);
    if (imagenPrincipal) {
      nuevasImagenes.unshift(imagenPrincipal);
    }

    onImagenPrincipalChange(url);
    onImagenesChange(nuevasImagenes);
  };

  const handleRemove = (url: string) => {
    if (url === imagenPrincipal) {
      // Si es la principal, promover la primera de la galería
      const nuevaPrincipal = imagenes[0] || null;
      onImagenPrincipalChange(nuevaPrincipal);
      onImagenesChange(imagenes.slice(1));
    } else {
      onImagenesChange(imagenes.filter((img) => img !== url));
    }
  };

  const canAddMore = todasLasImagenes.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Preview grande */}
      {todasLasImagenes.length > 0 && (
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <Image
            src={todasLasImagenes[previewIndex] || todasLasImagenes[0]}
            alt="Preview del producto"
            fill
            className="object-contain"
          />

          {/* Navegación si hay múltiples */}
          {todasLasImagenes.length > 1 && (
            <>
              <button
                onClick={() =>
                  setPreviewIndex((i) =>
                    i === 0 ? todasLasImagenes.length - 1 : i - 1
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() =>
                  setPreviewIndex((i) =>
                    i === todasLasImagenes.length - 1 ? 0 : i + 1
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-2 py-1 rounded">
                {previewIndex + 1} / {todasLasImagenes.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Galería de miniaturas con drag & drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={todasLasImagenes}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-wrap gap-2">
            {todasLasImagenes.map((url, index) => (
              <div key={url} onClick={() => setPreviewIndex(index)}>
                <SortableImage
                  url={url}
                  index={index}
                  isPrincipal={url === imagenPrincipal}
                  onSetPrincipal={() => handleSetPrincipal(url)}
                  onRemove={() => handleRemove(url)}
                />
              </div>
            ))}

            {/* Botón para agregar más */}
            {canAddMore && !showUpload && (
              <button
                onClick={() => setShowUpload(true)}
                disabled={disabled}
                className="
                  w-24 h-24 rounded-lg border-2 border-dashed border-border
                  flex items-center justify-center text-muted-foreground
                  hover:border-primary hover:text-primary transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Upload de nueva imagen */}
      {showUpload && (
        <div className="space-y-2">
          <ImageUpload
            onChange={handleUploadComplete}
            uploadFunction={uploadFunction}
            disabled={disabled}
            maxSize={5}
            showPreview={false}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUpload(false)}
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-muted-foreground">
        {todasLasImagenes.length} de {maxImages} imágenes • Arrastra para
        reordenar • La primera es la principal
      </p>
    </div>
  );
}
