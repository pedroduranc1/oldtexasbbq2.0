/**
 * ImageUpload Component
 * Old Texas BBQ - CRM
 *
 * Componente reutilizable para subida de imágenes con:
 * - Drag & drop
 * - Preview
 * - Validaciones
 * - Progress bar
 * - Integración con Cloudinary
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Progress } from './progress';
import { cn } from '@/lib/utils';
import { prepareImageForUpload } from '@/lib/cloudinary/upload';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  className?: string;
  maxSize?: number; // En MB
  acceptedFormats?: string[];
  showPreview?: boolean;
  uploadFunction: (file: File, onProgress?: (progress: number) => void) => Promise<{ success: boolean; secureUrl?: string; message?: string }>;
}

const DEFAULT_ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const DEFAULT_MAX_SIZE = 5; // MB

export function ImageUpload({
  value,
  onChange,
  disabled = false,
  className,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedFormats = DEFAULT_ACCEPTED_FORMATS,
  showPreview = true,
  uploadFunction,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpiar error después de 5 segundos
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  // Manejar selección de archivo
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setUploadProgress(0);

    // Validar archivo
    const validation = await prepareImageForUpload(file, acceptedFormats);

    if (!validation.valid) {
      showError(validation.error || 'Archivo inválido');
      return;
    }

    // Validar tamaño
    if (file.size > maxSize * 1024 * 1024) {
      showError(`El archivo no debe superar ${maxSize}MB`);
      return;
    }

    // Mostrar preview inmediatamente
    if (validation.preview && showPreview) {
      setPreview(validation.preview);
    }

    // Subir archivo
    setUploading(true);
    try {
      const result = await uploadFunction(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success && result.secureUrl) {
        setPreview(result.secureUrl);
        onChange(result.secureUrl);
      } else {
        showError(result.message || 'Error al subir imagen');
        setPreview(null);
      }
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      showError(error.message || 'Error al subir imagen');
      setPreview(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [acceptedFormats, maxSize, showPreview, uploadFunction, onChange]);

  // Manejar click en el input
  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  // Manejar cambio en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Manejar drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Manejar eliminación
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && !uploading) {
      setPreview(null);
      onChange(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Área de upload */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-all cursor-pointer overflow-hidden',
          isDragging && 'border-primary bg-primary/5',
          !preview && 'hover:border-primary hover:bg-accent/50',
          disabled && 'opacity-50 cursor-not-allowed',
          uploading && 'cursor-wait',
          preview ? 'border-border' : 'border-border',
          error && 'border-destructive'
        )}
      >
        {preview ? (
          // Preview de imagen
          <div className="relative aspect-video w-full bg-muted">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />

            {/* Overlay al hover */}
            {!uploading && !disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleClick}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Cambiar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                >
                  <X className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            )}

            {/* Loading overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white space-y-2 p-4">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  <p className="text-sm font-medium">Subiendo imagen...</p>
                  <Progress value={uploadProgress} className="w-48" />
                  <p className="text-xs text-muted-foreground">
                    {Math.round(uploadProgress)}%
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Estado vacío
          <div className="aspect-video w-full flex flex-col items-center justify-center gap-2 p-6 text-center">
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
                <p className="text-sm font-medium">Subiendo imagen...</p>
                <Progress value={uploadProgress} className="w-48" />
                <p className="text-xs text-muted-foreground">
                  {Math.round(uploadProgress)}%
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-2">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {isDragging ? 'Suelta la imagen aquí' : 'Click para subir imagen'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    o arrastra y suelta
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {acceptedFormats.map(format => format.split('/')[1].toUpperCase()).join(', ')} • Máx {maxSize}MB
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <p className="text-sm text-destructive mt-2 flex items-center gap-1">
          <X className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}
