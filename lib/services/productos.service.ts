/**
 * Servicio de Productos
 * Old Texas BBQ - CRM
 *
 * Gestiona operaciones CRUD para productos y personalizaciones
 * Incluye: Soft Delete, Verificación de Pedidos, Audit Log
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BaseService, QueryOptions } from './base.service';
import {
  Producto,
  PersonalizacionProducto,
  NuevoProducto,
  CambioProducto,
} from '@/lib/types/firestore';

class ProductosService extends BaseService<Producto> {
  constructor() {
    super('productos');
  }

  // ==========================================================================
  // MÉTODOS ESPECÍFICOS DE PRODUCTOS
  // ==========================================================================

  /**
   * Obtiene productos por categoría
   */
  async getByCategoria(categoriaId: string): Promise<Producto[]> {
    return this.search([
      { field: 'categoriaId', operator: '==', value: categoriaId },
      { field: 'disponible', operator: '==', value: true },
    ]);
  }

  /**
   * Obtiene productos disponibles ordenados por popularidad
   */
  async getDisponiblesOrdenadosPorPopularidad(): Promise<Producto[]> {
    return this.getAll({
      filters: [{ field: 'disponible', operator: '==', value: true }],
      orderByField: 'popularidad',
      orderDirection: 'desc',
    });
  }

  /**
   * Obtiene productos disponibles ordenados por orden de menú
   */
  async getDisponiblesOrdenadosPorMenu(): Promise<Producto[]> {
    return this.getAll({
      filters: [{ field: 'disponible', operator: '==', value: true }],
      orderByField: 'orden',
      orderDirection: 'asc',
    });
  }

  /**
   * Obtiene productos en promoción
   */
  async getEnPromocion(): Promise<Producto[]> {
    return this.search([
      { field: 'enPromocion', operator: '==', value: true },
      { field: 'disponible', operator: '==', value: true },
    ]);
  }

  /**
   * Busca productos por nombre
   */
  async searchByNombre(searchTerm: string): Promise<Producto[]> {
    // Nota: búsqueda básica, se puede mejorar con Algolia
    const allProducts = await this.getAll({
      filters: [{ field: 'disponible', operator: '==', value: true }],
    });

    const term = searchTerm.toLowerCase();
    return allProducts.filter(
      (product) =>
        product.nombre.toLowerCase().includes(term) ||
        product.descripcion.toLowerCase().includes(term) ||
        (product.etiquetas && product.etiquetas.some((tag) => tag.toLowerCase().includes(term)))
    );
  }

  /**
   * Marca un producto como disponible/no disponible
   */
  async toggleDisponibilidad(id: string, disponible: boolean): Promise<void> {
    await this.update(id, { disponible });
  }

  /**
   * Actualiza el stock de un producto
   */
  async actualizarStock(id: string, nuevoStock: number): Promise<void> {
    await this.update(id, { stock: nuevoStock } as any);
  }

  /**
   * Incrementa la popularidad de un producto (cuando se vende)
   */
  async incrementarPopularidad(id: string): Promise<void> {
    const producto = await this.getById(id);
    if (!producto) return;

    await this.update(id, {
      popularidad: producto.popularidad + 1,
    } as any);
  }

  /**
   * Configura una promoción en un producto
   */
  async setPromocion(
    id: string,
    precioPromocion: number,
    enPromocion: boolean
  ): Promise<void> {
    await this.update(id, {
      precioPromocion,
      enPromocion,
    } as any);
  }

  /**
   * Reordena productos (actualiza campo orden)
   */
  async reordenarProductos(
    productos: Array<{ id: string; orden: number }>
  ): Promise<void> {
    const updates = productos.map((p) => ({
      id: p.id,
      data: { orden: p.orden },
    }));

    await this.batchUpdate(updates as any);
  }

  // ==========================================================================
  // SOFT DELETE Y VERIFICACIONES
  // ==========================================================================

  /**
   * Soft delete - Marca producto como eliminado sin borrarlo físicamente
   */
  async softDelete(
    id: string,
    usuarioId: string,
    usuarioNombre: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar si hay pedidos activos con este producto
      const pedidosActivos = await this.verificarProductoEnPedidosActivos(id);

      if (pedidosActivos.length > 0) {
        return {
          success: false,
          message: `No se puede eliminar: el producto está en ${pedidosActivos.length} pedido(s) activo(s)`,
        };
      }

      // Obtener producto actual para audit log
      const producto = await this.getById(id);
      if (!producto) {
        return { success: false, message: 'Producto no encontrado' };
      }

      // Registrar cambio en audit log
      const cambio: Omit<CambioProducto, 'fecha'> & { fecha: any } = {
        fecha: serverTimestamp(),
        usuarioId,
        usuarioNombre,
        campo: 'eliminado',
        valorAnterior: false,
        valorNuevo: true,
        accion: 'eliminar',
      };

      // Actualizar producto con soft delete
      await this.update(id, {
        eliminado: true,
        fechaEliminacion: serverTimestamp(),
        eliminadoPor: usuarioId,
        disponible: false, // También marcamos como no disponible
        historialCambios: [...(producto.historialCambios || []), cambio],
      } as any);

      return { success: true, message: 'Producto eliminado correctamente' };
    } catch (error) {
      console.error('Error en soft delete:', error);
      throw error;
    }
  }

  /**
   * Restaurar producto eliminado
   */
  async restaurarProducto(
    id: string,
    usuarioId: string,
    usuarioNombre: string
  ): Promise<void> {
    const producto = await this.getById(id);
    if (!producto) throw new Error('Producto no encontrado');

    const cambio: Omit<CambioProducto, 'fecha'> & { fecha: any } = {
      fecha: serverTimestamp(),
      usuarioId,
      usuarioNombre,
      campo: 'eliminado',
      valorAnterior: true,
      valorNuevo: false,
      accion: 'restaurar',
    };

    await this.update(id, {
      eliminado: false,
      fechaEliminacion: null,
      eliminadoPor: null,
      historialCambios: [...(producto.historialCambios || []), cambio],
    } as any);
  }

  /**
   * Verifica si un producto está en pedidos activos (no entregados/cancelados)
   */
  async verificarProductoEnPedidosActivos(productoId: string): Promise<string[]> {
    try {
      if (!db) throw new Error('Firebase no configurado');

      // Buscar pedidos con estados activos
      const pedidosRef = collection(db, 'pedidos');
      const estadosActivos = ['pendiente', 'en_preparacion', 'listo', 'en_reparto'];

      const pedidosActivos: string[] = [];

      for (const estado of estadosActivos) {
        const q = query(pedidosRef, where('estado', '==', estado));
        const snapshot = await getDocs(q);

        for (const docSnap of snapshot.docs) {
          const pedido = docSnap.data();
          // Verificar si el producto está en los items del pedido
          const tieneProducto = pedido.items?.some(
            (item: any) => item.productoId === productoId
          );

          if (tieneProducto) {
            pedidosActivos.push(docSnap.id);
          }
        }
      }

      return pedidosActivos;
    } catch (error) {
      console.error('Error verificando pedidos activos:', error);
      return [];
    }
  }

  /**
   * Obtiene productos incluyendo eliminados (para admin)
   */
  async getAllIncluyendoEliminados(): Promise<Producto[]> {
    return super.getAll();
  }

  /**
   * Obtiene solo productos eliminados
   */
  async getEliminados(): Promise<Producto[]> {
    return this.search([
      { field: 'eliminado', operator: '==', value: true },
    ]);
  }

  /**
   * Override getAll para excluir eliminados por defecto
   */
  async getAll(options?: QueryOptions): Promise<Producto[]> {
    const productos = await super.getAll(options);
    // Filtrar productos eliminados
    return productos.filter(p => !p.eliminado);
  }

  // ==========================================================================
  // AUDIT LOG
  // ==========================================================================

  /**
   * Registra un cambio en el historial del producto
   */
  async registrarCambio(
    productoId: string,
    usuarioId: string,
    usuarioNombre: string,
    campo: string,
    valorAnterior: any,
    valorNuevo: any,
    accion: CambioProducto['accion'] = 'actualizar'
  ): Promise<void> {
    const producto = await this.getById(productoId);
    if (!producto) return;

    const cambio: Omit<CambioProducto, 'fecha'> & { fecha: any } = {
      fecha: serverTimestamp(),
      usuarioId,
      usuarioNombre,
      campo,
      valorAnterior,
      valorNuevo,
      accion,
    };

    await this.update(productoId, {
      historialCambios: [...(producto.historialCambios || []), cambio],
    } as any);
  }

  /**
   * Obtiene el historial de cambios de un producto
   */
  async getHistorialCambios(productoId: string): Promise<CambioProducto[]> {
    const producto = await this.getById(productoId);
    return producto?.historialCambios || [];
  }

  /**
   * Actualiza producto con registro de cambios automático
   */
  async updateConAudit(
    id: string,
    data: Partial<Producto>,
    usuarioId: string,
    usuarioNombre: string
  ): Promise<void> {
    const productoActual = await this.getById(id);
    if (!productoActual) throw new Error('Producto no encontrado');

    // Registrar cambios para campos modificados
    const cambios: Array<Omit<CambioProducto, 'fecha'> & { fecha: any }> = [];

    for (const [campo, valorNuevo] of Object.entries(data)) {
      const valorAnterior = (productoActual as any)[campo];
      if (valorAnterior !== valorNuevo) {
        cambios.push({
          fecha: serverTimestamp(),
          usuarioId,
          usuarioNombre,
          campo,
          valorAnterior,
          valorNuevo,
          accion: 'actualizar',
        });
      }
    }

    // Actualizar producto con cambios registrados
    await this.update(id, {
      ...data,
      historialCambios: [...(productoActual.historialCambios || []), ...cambios],
    } as any);
  }

  // ==========================================================================
  // MÉTODOS DE PERSONALIZACIONES (SUBCOLECCIÓN)
  // ==========================================================================

  /**
   * Obtiene las personalizaciones de un producto
   */
  async getPersonalizaciones(
    productoId: string
  ): Promise<PersonalizacionProducto[]> {
    try {
      const personalizacionesRef = this.getSubcollectionRef(
        productoId,
        'personalizaciones'
      );
      const querySnapshot = await getDocs(personalizacionesRef);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PersonalizacionProducto[];
    } catch (error) {
      console.error('Error obteniendo personalizaciones:', error);
      throw error;
    }
  }

  /**
   * Agrega una personalización a un producto
   */
  async addPersonalizacion(
    productoId: string,
    personalizacion: Omit<PersonalizacionProducto, 'id'>
  ): Promise<string> {
    try {
      const personalizacionesRef = this.getSubcollectionRef(
        productoId,
        'personalizaciones'
      );
      const docRef = await addDoc(personalizacionesRef, personalizacion);
      return docRef.id;
    } catch (error) {
      console.error('Error agregando personalización:', error);
      throw error;
    }
  }

  /**
   * Actualiza una personalización de un producto
   */
  async updatePersonalizacion(
    productoId: string,
    personalizacionId: string,
    data: Partial<PersonalizacionProducto>
  ): Promise<void> {
    try {
      const personalizacionRef = doc(
        db,
        this.collectionName,
        productoId,
        'personalizaciones',
        personalizacionId
      );
      await updateDoc(personalizacionRef, data as any);
    } catch (error) {
      console.error('Error actualizando personalización:', error);
      throw error;
    }
  }

  /**
   * Elimina una personalización de un producto
   */
  async deletePersonalizacion(
    productoId: string,
    personalizacionId: string
  ): Promise<void> {
    try {
      const personalizacionRef = doc(
        db,
        this.collectionName,
        productoId,
        'personalizaciones',
        personalizacionId
      );
      await deleteDoc(personalizacionRef);
    } catch (error) {
      console.error('Error eliminando personalización:', error);
      throw error;
    }
  }

  /**
   * Obtiene un producto con sus personalizaciones
   */
  async getProductoConPersonalizaciones(productoId: string): Promise<
    | (Producto & { personalizaciones: PersonalizacionProducto[] })
    | null
  > {
    const producto = await this.getById(productoId);
    if (!producto) return null;

    const personalizaciones = await this.getPersonalizaciones(productoId);

    return {
      ...producto,
      personalizaciones,
    };
  }

  // ==========================================================================
  // ESTADÍSTICAS Y REPORTES
  // ==========================================================================

  /**
   * Obtiene los productos más vendidos (top N)
   */
  async getTopProductos(limit: number = 10): Promise<Producto[]> {
    return this.getAll({
      orderByField: 'popularidad',
      orderDirection: 'desc',
      limitCount: limit,
    });
  }

  /**
   * Obtiene productos con stock bajo
   */
  async getProductosStockBajo(): Promise<Producto[]> {
    const allProducts = await this.getAll();

    return allProducts.filter(
      (p) =>
        p.stock !== undefined &&
        p.stockMinimo !== undefined &&
        p.stock <= p.stockMinimo
    );
  }

  /**
   * Obtiene estadísticas de productos
   */
  async getEstadisticas(): Promise<{
    total: number;
    disponibles: number;
    enPromocion: number;
    conStockBajo: number;
  }> {
    const allProducts = await this.getAll();

    return {
      total: allProducts.length,
      disponibles: allProducts.filter((p) => p.disponible).length,
      enPromocion: allProducts.filter((p) => p.enPromocion).length,
      conStockBajo: allProducts.filter(
        (p) =>
          p.stock !== undefined &&
          p.stockMinimo !== undefined &&
          p.stock <= p.stockMinimo
      ).length,
    };
  }

  // ==========================================================================
  // MÉTODOS DE TIEMPO REAL
  // ==========================================================================

  /**
   * Escucha productos disponibles por categoría
   */
  onProductosByCategoriaChange(
    categoriaId: string,
    callback: (productos: Producto[]) => void,
    onError?: (error: Error) => void
  ) {
    return this.onCollectionChange(
      callback,
      {
        filters: [
          { field: 'categoriaId', operator: '==', value: categoriaId },
          { field: 'disponible', operator: '==', value: true },
        ],
        orderByField: 'orden',
        orderDirection: 'asc',
      },
      onError
    );
  }

  /**
   * Escucha productos disponibles
   */
  onProductosDisponiblesChange(
    callback: (productos: Producto[]) => void,
    onError?: (error: Error) => void
  ) {
    return this.onCollectionChange(
      callback,
      {
        filters: [{ field: 'disponible', operator: '==', value: true }],
        orderByField: 'orden',
        orderDirection: 'asc',
      },
      onError
    );
  }

  // ==========================================================================
  // IMPORT/EXPORT Y UTILIDADES
  // ==========================================================================

  /**
   * Exporta productos a formato CSV
   */
  exportToCSV(productos: Producto[]): string {
    const headers = [
      'ID',
      'SKU',
      'Nombre',
      'Descripción',
      'Categoría ID',
      'Categoría Nombre',
      'Precio',
      'Precio Promoción',
      'En Promoción',
      'Disponible',
      'Imagen',
      'Orden',
      'Popularidad',
      'Etiquetas',
      'Ingredientes',
    ];

    const rows = productos.map((p) => [
      p.id,
      p.sku || '',
      `"${(p.nombre || '').replace(/"/g, '""')}"`,
      `"${(p.descripcion || '').replace(/"/g, '""')}"`,
      p.categoriaId,
      p.categoriaNombre,
      p.precio,
      p.precioPromocion || '',
      p.enPromocion ? 'Sí' : 'No',
      p.disponible ? 'Sí' : 'No',
      p.imagen || '',
      p.orden,
      p.popularidad,
      `"${(p.etiquetas || []).join(', ')}"`,
      `"${(p.ingredientes || []).join(', ')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Parsea CSV y retorna datos listos para importar
   */
  parseCSV(csvContent: string): Array<Partial<Producto>> {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const productos: Array<Partial<Producto>> = [];

    for (let i = 1; i < lines.length; i++) {
      // Parsear línea respetando comillas
      const values = this.parseCSVLine(lines[i]);
      const producto: any = {};

      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';

        switch (header) {
          case 'nombre':
            producto.nombre = value;
            break;
          case 'descripción':
          case 'descripcion':
            producto.descripcion = value;
            break;
          case 'categoría id':
          case 'categoria id':
          case 'categoriaid':
            producto.categoriaId = value;
            break;
          case 'categoría nombre':
          case 'categoria nombre':
          case 'categorianombre':
            producto.categoriaNombre = value;
            break;
          case 'precio':
            producto.precio = parseFloat(value) || 0;
            break;
          case 'precio promoción':
          case 'precio promocion':
          case 'preciopromocion':
            producto.precioPromocion = value ? parseFloat(value) : undefined;
            break;
          case 'en promoción':
          case 'en promocion':
          case 'enpromocion':
            producto.enPromocion = value.toLowerCase() === 'sí' || value.toLowerCase() === 'si' || value === '1';
            break;
          case 'disponible':
            producto.disponible = value.toLowerCase() === 'sí' || value.toLowerCase() === 'si' || value === '1';
            break;
          case 'imagen':
            producto.imagen = value || undefined;
            break;
          case 'orden':
            producto.orden = parseInt(value) || 0;
            break;
          case 'etiquetas':
            producto.etiquetas = value ? value.split(',').map((t: string) => t.trim()) : [];
            break;
          case 'ingredientes':
            producto.ingredientes = value ? value.split(',').map((i: string) => i.trim()) : [];
            break;
          case 'sku':
            producto.sku = value || undefined;
            break;
        }
      });

      // Solo agregar si tiene nombre (campo requerido)
      if (producto.nombre) {
        productos.push({
          ...producto,
          popularidad: producto.popularidad || 0,
          permitePersonalizacion: false,
        });
      }
    }

    return productos;
  }

  /**
   * Parsea una línea CSV respetando comillas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Importa productos desde CSV (crea nuevos)
   */
  async importFromCSV(
    csvContent: string,
    creadoPor: string
  ): Promise<{ exitosos: number; errores: string[] }> {
    const productos = this.parseCSV(csvContent);
    const errores: string[] = [];
    let exitosos = 0;

    for (const producto of productos) {
      try {
        // Validar nombre duplicado
        const duplicado = await this.validarNombreDuplicado(producto.nombre || '');
        if (duplicado) {
          errores.push(`"${producto.nombre}" ya existe`);
          continue;
        }

        await this.create({
          ...producto,
          creadoPor,
          disponible: producto.disponible ?? true,
          enPromocion: producto.enPromocion ?? false,
          popularidad: producto.popularidad || 0,
          orden: producto.orden || 0,
          permitePersonalizacion: false,
        } as any);

        exitosos++;
      } catch (error: any) {
        errores.push(`Error en "${producto.nombre}": ${error.message}`);
      }
    }

    return { exitosos, errores };
  }

  /**
   * Duplica un producto existente
   */
  async duplicarProducto(
    productoId: string,
    creadoPor: string,
    nuevoNombre?: string
  ): Promise<string> {
    const original = await this.getById(productoId);
    if (!original) throw new Error('Producto no encontrado');

    // Generar nombre para la copia
    const nombreCopia = nuevoNombre || `${original.nombre} (copia)`;

    // Verificar que el nuevo nombre no exista
    const duplicado = await this.validarNombreDuplicado(nombreCopia);
    if (duplicado) {
      throw new Error(`Ya existe un producto con el nombre "${nombreCopia}"`);
    }

    // Crear copia sin campos que no deben copiarse
    const copia: any = {
      nombre: nombreCopia,
      descripcion: original.descripcion,
      categoriaId: original.categoriaId,
      categoriaNombre: original.categoriaNombre,
      precio: original.precio,
      precioPromocion: original.precioPromocion,
      enPromocion: original.enPromocion,
      disponible: false, // Copia inicia como no disponible
      imagen: original.imagen,
      imagenes: original.imagenes,
      permitePersonalizacion: original.permitePersonalizacion,
      popularidad: 0, // Reiniciar popularidad
      orden: original.orden + 1,
      creadoPor,
      etiquetas: original.etiquetas,
      ingredientes: original.ingredientes,
      sku: original.sku ? `${original.sku}-COPIA` : undefined,
    };

    return await this.create(copia);
  }

  /**
   * Valida si existe un producto con el mismo nombre
   */
  async validarNombreDuplicado(nombre: string, excludeId?: string): Promise<boolean> {
    const productos = await this.getAllIncluyendoEliminados();
    const nombreLower = nombre.toLowerCase().trim();

    return productos.some(
      (p) =>
        p.nombre.toLowerCase().trim() === nombreLower &&
        !p.eliminado &&
        p.id !== excludeId
    );
  }

  /**
   * Obtiene productos sin foto
   */
  async getProductosSinFoto(): Promise<Producto[]> {
    const productos = await this.getAll();
    return productos.filter((p) => !p.imagen && !p.eliminado);
  }

  /**
   * Obtiene estadísticas de productos sin foto
   */
  async getEstadisticasFotos(): Promise<{
    total: number;
    conFoto: number;
    sinFoto: number;
    porcentajeSinFoto: number;
  }> {
    const productos = await this.getAll();
    const sinFoto = productos.filter((p) => !p.imagen);

    return {
      total: productos.length,
      conFoto: productos.length - sinFoto.length,
      sinFoto: sinFoto.length,
      porcentajeSinFoto: productos.length > 0
        ? Math.round((sinFoto.length / productos.length) * 100)
        : 0,
    };
  }
}

// Importar updateDoc y deleteDoc que faltaban
import { updateDoc, deleteDoc } from 'firebase/firestore';

// Exportar instancia única (Singleton)
export const productosService = new ProductosService();
