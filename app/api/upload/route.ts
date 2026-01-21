/**
 * API Route: /api/upload
 * Old Texas BBQ - CRM
 *
 * POST: Subir imagen (requiere autenticación)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser } from '@/lib/api/with-auth';
import { validateImageFile } from '@/lib/api/validators';
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Tipos MIME permitidos
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

// Tamaño máximo: 5MB
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/upload
 * Sube una imagen a Cloudinary
 */
export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string | null;

    // Validar que se envió un archivo
    if (!file) {
      return NextResponse.json(
        { error: 'No se envió ningún archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Tipo de archivo no permitido',
          allowedTypes: ALLOWED_TYPES,
        },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: `El archivo excede el tamaño máximo de ${MAX_SIZE / 1024 / 1024}MB`,
          maxSize: `${MAX_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Validar archivo usando el validador
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Convertir archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Subir a Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder || 'old-texas-bbq/productos',
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' }, // Limitar tamaño máximo
            { quality: 'auto:good' }, // Optimizar calidad
            { fetch_format: 'auto' }, // Formato automático
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    // Log de auditoría
    console.log(`[UPLOAD] Usuario ${user.email} subió imagen: ${uploadResult.public_id}`);

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      size: uploadResult.bytes,
    });
  } catch (error) {
    console.error('Error subiendo imagen:', error);
    return NextResponse.json(
      { error: 'Error al subir la imagen' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/upload
 * Elimina una imagen de Cloudinary
 */
export const DELETE = withAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return NextResponse.json(
        { error: 'Se requiere el publicId de la imagen' },
        { status: 400 }
      );
    }

    // Eliminar de Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok') {
      return NextResponse.json(
        { error: 'No se pudo eliminar la imagen' },
        { status: 400 }
      );
    }

    // Log de auditoría
    console.log(`[DELETE] Usuario ${user.email} eliminó imagen: ${publicId}`);

    return NextResponse.json({
      success: true,
      message: 'Imagen eliminada correctamente',
    });
  } catch (error) {
    console.error('Error eliminando imagen:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la imagen' },
      { status: 500 }
    );
  }
});
