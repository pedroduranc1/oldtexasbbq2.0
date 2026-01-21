/**
 * API Route: /api/productos
 * Old Texas BBQ - CRM
 *
 * GET: Lista productos (requiere autenticación)
 * POST: Crear producto (requiere admin/encargado)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser, canManageProducts } from '@/lib/api/with-auth';
import {
  validateProductoBody,
  sanitizeProductoData,
  parsePaginationParams,
} from '@/lib/api/validators';
import { productosService } from '@/lib/services/productos.service';

/**
 * GET /api/productos
 * Lista todos los productos disponibles
 */
export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const categoriaId = searchParams.get('categoria');
    const search = searchParams.get('search');
    const includeDeleted = searchParams.get('deleted') === 'true';

    let productos;

    // Solo admin/encargado pueden ver productos eliminados
    if (includeDeleted && canManageProducts(user)) {
      productos = await productosService.getAllIncluyendoEliminados();
    } else if (categoriaId) {
      productos = await productosService.getByCategoria(categoriaId);
    } else if (search) {
      productos = await productosService.searchByNombre(search);
    } else {
      productos = await productosService.getAll();
    }

    // Paginación simple
    const start = (page - 1) * limit;
    const paginatedProducts = productos.slice(start, start + limit);

    return NextResponse.json({
      data: paginatedProducts,
      pagination: {
        page,
        limit,
        total: productos.length,
        totalPages: Math.ceil(productos.length / limit),
      },
    });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/productos
 * Crea un nuevo producto (solo admin/encargado)
 */
export const POST = withAuth(
  async (request: NextRequest, user: AuthUser) => {
    // Verificar permisos
    if (!canManageProducts(user)) {
      return NextResponse.json(
        { error: 'No autorizado para crear productos' },
        { status: 403 }
      );
    }

    try {
      const body = await request.json();

      // Validar body
      const validation = validateProductoBody(body, false);
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: validation.errors },
          { status: 400 }
        );
      }

      // Sanitizar datos
      const sanitizedData = sanitizeProductoData(body);

      // Verificar nombre duplicado
      const isDuplicate = await productosService.validarNombreDuplicado(
        sanitizedData.nombre || ''
      );
      if (isDuplicate) {
        return NextResponse.json(
          { error: `Ya existe un producto con el nombre "${sanitizedData.nombre}"` },
          { status: 409 }
        );
      }

      // Crear producto
      const productoId = await productosService.create({
        ...sanitizedData,
        creadoPor: user.userId,
        disponible: sanitizedData.disponible ?? true,
        enPromocion: sanitizedData.enPromocion ?? false,
        popularidad: 0,
        orden: sanitizedData.orden ?? 0,
        permitePersonalizacion: false,
      } as any);

      return NextResponse.json(
        {
          success: true,
          id: productoId,
          message: 'Producto creado correctamente',
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creando producto:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'encargado'] }
);
