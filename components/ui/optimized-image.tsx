'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  fallback?: string;
  cloudinaryTransform?: string;
}

/**
 * Componente de imagen optimizada con:
 * - Lazy loading automático
 * - Placeholder blur
 * - Fallback para imágenes faltantes
 * - Transformaciones de Cloudinary
 * - Manejo de errores
 */
export function OptimizedImage({
  src,
  alt,
  fallback = '/placeholder-product.png',
  cloudinaryTransform,
  className,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determinar la URL de la imagen
  const imageSrc = error || !src ? fallback : src;

  // Aplicar transformaciones de Cloudinary si es una URL de Cloudinary
  const finalSrc = getOptimizedUrl(imageSrc, cloudinaryTransform);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <Image
        src={finalSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onError={() => setError(true)}
        onLoad={() => setIsLoading(false)}
        {...props}
      />
    </div>
  );
}

/**
 * Optimizar URL de Cloudinary con transformaciones
 */
function getOptimizedUrl(url: string, transform?: string): string {
  // Si no es URL de Cloudinary, devolver tal cual
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  // Transformaciones por defecto para optimización
  const defaultTransform = 'f_auto,q_auto';
  const finalTransform = transform
    ? `${defaultTransform},${transform}`
    : defaultTransform;

  // Insertar transformaciones en URL de Cloudinary
  // Formato: https://res.cloudinary.com/cloud/image/upload/[transformaciones]/path
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) {
    return url;
  }

  const beforeUpload = url.slice(0, uploadIndex + 8);
  const afterUpload = url.slice(uploadIndex + 8);

  // Verificar si ya tiene transformaciones
  if (afterUpload.startsWith('f_') || afterUpload.startsWith('q_')) {
    return url; // Ya está optimizada
  }

  return `${beforeUpload}${finalTransform}/${afterUpload}`;
}

/**
 * Hook para generar URLs de Cloudinary optimizadas
 */
export function useCloudinaryUrl(
  publicId: string | null | undefined,
  options?: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'avif' | 'png' | 'jpg';
  }
) {
  if (!publicId) {
    return '/placeholder-product.png';
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    return publicId; // Devolver ID si no hay cloud name
  }

  const transforms: string[] = [];

  // Calidad
  transforms.push(`q_${options?.quality || 'auto'}`);

  // Formato
  transforms.push(`f_${options?.format || 'auto'}`);

  // Dimensiones
  if (options?.width) {
    transforms.push(`w_${options.width}`);
  }
  if (options?.height) {
    transforms.push(`h_${options.height}`);
  }

  // Crop
  if (options?.crop) {
    transforms.push(`c_${options.crop}`);
  }

  const transformString = transforms.join(',');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${publicId}`;
}

/**
 * Presets de transformación comunes
 */
export const ImagePresets = {
  // Thumbnail pequeño (para listas)
  thumbnail: 'w_100,h_100,c_fill',

  // Card de producto
  productCard: 'w_300,h_300,c_fill',

  // Imagen de detalle
  productDetail: 'w_600,h_600,c_fit',

  // Avatar de usuario
  avatar: 'w_80,h_80,c_fill,r_max',

  // Banner
  banner: 'w_1200,h_400,c_fill',

  // OG Image (para redes sociales)
  ogImage: 'w_1200,h_630,c_fill',
} as const;

export default OptimizedImage;
