/**
 * Validadores para API Routes
 * Old Texas BBQ - CRM
 *
 * Validación y sanitización de datos en el servidor
 */

import { type Producto } from '@/lib/types/firestore';

// ==========================================================================
// TIPOS
// ==========================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// ==========================================================================
// VALIDACIÓN DE PRODUCTOS
// ==========================================================================

/**
 * Valida el body para crear/actualizar un producto
 */
export function validateProductoBody(
  body: unknown,
  isUpdate = false
): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Body inválido'] };
  }

  const data = body as Record<string, unknown>;

  // Campos requeridos (solo para crear)
  if (!isUpdate) {
    if (!data.nombre || typeof data.nombre !== 'string') {
      errors.push('El nombre es requerido');
    }
    if (!data.categoriaId || typeof data.categoriaId !== 'string') {
      errors.push('La categoría es requerida');
    }
    if (typeof data.precio !== 'number' || data.precio < 0) {
      errors.push('El precio debe ser un número positivo');
    }
  }

  // Validaciones de formato (para crear y actualizar)
  if (data.nombre !== undefined) {
    if (typeof data.nombre !== 'string') {
      errors.push('El nombre debe ser texto');
    } else if (data.nombre.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    } else if (data.nombre.length > 100) {
      errors.push('El nombre no puede exceder 100 caracteres');
    }
  }

  if (data.descripcion !== undefined && typeof data.descripcion !== 'string') {
    errors.push('La descripción debe ser texto');
  }

  if (data.precio !== undefined) {
    if (typeof data.precio !== 'number' || isNaN(data.precio)) {
      errors.push('El precio debe ser un número');
    } else if (data.precio < 0) {
      errors.push('El precio no puede ser negativo');
    } else if (data.precio > 999999) {
      errors.push('El precio excede el máximo permitido');
    }
  }

  if (data.precioPromocion !== undefined && data.precioPromocion !== null) {
    if (typeof data.precioPromocion !== 'number' || isNaN(data.precioPromocion)) {
      errors.push('El precio de promoción debe ser un número');
    } else if (data.precioPromocion < 0) {
      errors.push('El precio de promoción no puede ser negativo');
    }
  }

  if (data.orden !== undefined) {
    if (typeof data.orden !== 'number' || !Number.isInteger(data.orden)) {
      errors.push('El orden debe ser un número entero');
    }
  }

  if (data.etiquetas !== undefined && !Array.isArray(data.etiquetas)) {
    errors.push('Las etiquetas deben ser un array');
  }

  if (data.ingredientes !== undefined && !Array.isArray(data.ingredientes)) {
    errors.push('Los ingredientes deben ser un array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitiza los datos de un producto
 */
export function sanitizeProductoData(
  data: Partial<Producto>
): Partial<Producto> {
  const sanitized: Partial<Producto> = {};

  if (data.nombre !== undefined) {
    sanitized.nombre = sanitizeString(data.nombre);
  }

  if (data.descripcion !== undefined) {
    sanitized.descripcion = sanitizeString(data.descripcion);
  }

  if (data.categoriaId !== undefined) {
    sanitized.categoriaId = data.categoriaId.trim();
  }

  if (data.categoriaNombre !== undefined) {
    sanitized.categoriaNombre = sanitizeString(data.categoriaNombre);
  }

  if (typeof data.precio === 'number') {
    sanitized.precio = Math.round(data.precio * 100) / 100; // 2 decimales
  }

  if (typeof data.precioPromocion === 'number') {
    sanitized.precioPromocion = Math.round(data.precioPromocion * 100) / 100;
  }

  if (typeof data.disponible === 'boolean') {
    sanitized.disponible = data.disponible;
  }

  if (typeof data.enPromocion === 'boolean') {
    sanitized.enPromocion = data.enPromocion;
  }

  if (typeof data.orden === 'number') {
    sanitized.orden = Math.floor(data.orden);
  }

  if (Array.isArray(data.etiquetas)) {
    sanitized.etiquetas = data.etiquetas
      .filter((t) => typeof t === 'string')
      .map((t) => sanitizeString(t));
  }

  if (Array.isArray(data.ingredientes)) {
    sanitized.ingredientes = data.ingredientes
      .filter((i) => typeof i === 'string')
      .map((i) => sanitizeString(i));
  }

  if (data.imagen !== undefined) {
    sanitized.imagen = typeof data.imagen === 'string' ? data.imagen.trim() : undefined;
  }

  if (data.sku !== undefined) {
    sanitized.sku = typeof data.sku === 'string' ? data.sku.trim().toUpperCase() : undefined;
  }

  return sanitized;
}

// ==========================================================================
// VALIDACIÓN DE ARCHIVOS
// ==========================================================================

// Tipos MIME permitidos para imágenes
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

// Tamaño máximo: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Valida un archivo de imagen
 */
export function validateImageFile(file: File): FileValidationResult {
  // Validar tipo
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Tipos aceptados: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  // Validar tamaño
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Validar nombre (seguridad)
  if (!isValidFileName(file.name)) {
    return {
      valid: false,
      error: 'El nombre del archivo contiene caracteres no permitidos',
    };
  }

  return { valid: true };
}

/**
 * Valida que el nombre de archivo sea seguro
 */
function isValidFileName(fileName: string): boolean {
  // Evitar path traversal y caracteres peligrosos
  const dangerousPatterns = [
    /\.\./,        // Path traversal
    /[<>:"|?*]/,   // Caracteres no permitidos en Windows
    /^\./,         // Archivos ocultos
    /\x00/,        // Null byte
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(fileName));
}

// ==========================================================================
// SANITIZACIÓN
// ==========================================================================

/**
 * Sanitiza un string eliminando caracteres peligrosos
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return '';

  return value
    .replace(/[<>]/g, '')           // Eliminar < >
    .replace(/javascript:/gi, '')    // Eliminar javascript:
    .replace(/on\w+=/gi, '')        // Eliminar event handlers
    .replace(/data:/gi, '')         // Eliminar data: URIs
    .trim();
}

/**
 * Sanitiza un objeto recursivamente
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

// ==========================================================================
// VALIDACIÓN DE IDs
// ==========================================================================

/**
 * Valida que un ID tenga formato válido (Firestore)
 */
export function isValidId(id: string): boolean {
  if (typeof id !== 'string') return false;
  // IDs de Firestore: alfanuméricos, guiones y guiones bajos, 1-128 chars
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

// ==========================================================================
// VALIDACIÓN DE PAGINACIÓN
// ==========================================================================

export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Extrae y valida parámetros de paginación de query params
 */
export function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  return { page, limit };
}
