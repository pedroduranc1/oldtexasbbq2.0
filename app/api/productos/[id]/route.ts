/**
 * API Route: /api/productos/[id]
 * Old Texas BBQ - CRM
 *
 * GET: Obtener detalle de producto
 * PUT: Actualizar producto (requiere admin/encargado)
 * DELETE: Eliminar producto (requiere admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthUser, canManageProducts, isAdmin } from '@/lib/api/with-auth';
import {
  validateProductoBody,
  sanitizeProductoData,
  isValidId,
} from '@/lib/api/validators';
import { productosService } from '@/lib/services/productos.service';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/productos/[id]
 * Obtiene el detalle de un producto
 */
export const GET = withAuth(
  async (
    request: NextRequest,
    user: AuthUser,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    try {
      const params = await context?.params;
      const id = params?.id;

      if (!id || !isValidId(id)) {
        return NextResponse.json(
          { error: 'ID de producto inválido' },
          { status: 400 }
        );
      }

      const producto = await productosService.getById(id);

      if (!producto) {
        return NextResponse.json(
          { error: 'Producto no encontrado' },
          { status: 404 }
        );
      }

      // Si está eliminado, solo admin/encargado pueden verlo
      if (producto.eliminado && !canManageProducts(user)) {
        return NextResponse.json(
          { error: 'Producto no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: producto });
    } catch (error) {
      console.error('Error obteniendo producto:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }
);

/**
 * PUT /api/productos/[id]
 * Actualiza un producto existente (solo admin/encargado)
 */
export const PUT = withAuth(
  async (
    request: NextRequest,
    user: AuthUser,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    // Verificar permisos
    if (!canManageProducts(user)) {
      return NextResponse.json(
        { error: 'No autorizado para actualizar productos' },
        { status: 403 }
      );
    }

    try {
      const params = await context?.params;
      const id = params?.id;

      if (!id || !isValidId(id)) {
        return NextResponse.json(
          { error: 'ID de producto inválido' },
          { status: 400 }
        );
      }

      // Verificar que el producto existe
      const existingProduct = await productosService.getById(id);
      if (!existingProduct) {
        return NextResponse.json(
          { error: 'Producto no encontrado' },
          { status: 404 }
        );
      }

      const body = await request.json();

      // Validar body
      const validation = validateProductoBody(body, true);
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: validation.errors },
          { status: 400 }
        );
      }

      // Sanitizar datos
      const sanitizedData = sanitizeProductoData(body);

      // Verificar nombre duplicado (excluyendo el producto actual)
      if (sanitizedData.nombre) {
        const isDuplicate = await productosService.validarNombreDuplicado(
          sanitizedData.nombre,
          id
        );
        if (isDuplicate) {
          return NextResponse.json(
            { error: `Ya existe un producto con el nombre "${sanitizedData.nombre}"` },
            { status: 409 }
          );
        }
      }

      // Actualizar con audit log
      await productosService.updateConAudit(
        id,
        sanitizedData,
        user.userId,
        user.nombre
      );

      return NextResponse.json({
        success: true,
        message: 'Producto actualizado correctamente',
      });
    } catch (error) {
      console.error('Error actualizando producto:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'encargado'] }
);

/**
 * DELETE /api/productos/[id]
 * Elimina un producto (soft delete, solo admin)
 */
export const DELETE = withAuth(
  async (
    request: NextRequest,
    user: AuthUser,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    // Solo admin puede eliminar
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Solo administradores pueden eliminar productos' },
        { status: 403 }
      );
    }

    try {
      const params = await context?.params;
      const id = params?.id;

      if (!id || !isValidId(id)) {
        return NextResponse.json(
          { error: 'ID de producto inválido' },
          { status: 400 }
        );
      }

      // Soft delete
      const result = await productosService.softDelete(
        id,
        user.userId,
        user.nombre
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('Error eliminando producto:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin'] }
);
