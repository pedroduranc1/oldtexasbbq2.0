/**
 * Servicio de Recetas
 * Old Texas BBQ - CRM
 *
 * Gestiona operaciones CRUD para recetas del menú
 * Incluye: Cálculo de costos, verificación de stock, subrecetas
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BaseService } from './base.service';
import {
  Receta,
  CategoriaReceta,
  FiltrosRecetas,
  IngredienteReceta,
} from '@/lib/types';
import { ingredientesService } from './ingredientes.service';

class RecetasService extends BaseService<Receta> {
  constructor() {
    super('recetas');
  }

  // ==========================================================================
  // MÉTODOS CRUD BÁSICOS
  // ==========================================================================

  /**
   * Crea una nueva receta
   */
  async createReceta(
    receta: Omit<Receta, 'id' | 'fechaCreacion' | 'ultimaActualizacion'>
  ): Promise<string> {
    try {
      // Calcular costo total
      const costoTotal = this.calcularCostoTotalLocal(receta.ingredientes);

      const recetaRef = await addDoc(collection(db, 'recetas'), {
        ...receta,
        costoTotal,
        activo: true,
        fechaCreacion: serverTimestamp(),
        ultimaActualizacion: serverTimestamp(),
      });

      console.log('✅ Receta creada:', recetaRef.id);
      return recetaRef.id;
    } catch (error) {
      console.error('❌ Error al crear receta:', error);
      throw new Error('Error al crear receta');
    }
  }

  /**
   * Actualiza una receta existente
   */
  async updateReceta(
    id: string,
    data: Partial<Omit<Receta, 'id' | 'fechaCreacion' | 'ultimaActualizacion'>>
  ): Promise<void> {
    try {
      // Recalcular costo si se actualizaron ingredientes
      let updateData: any = { ...data };
      if (data.ingredientes) {
        updateData.costoTotal = this.calcularCostoTotalLocal(data.ingredientes);
      }

      const recetaRef = doc(db, 'recetas', id);
      await updateDoc(recetaRef, {
        ...updateData,
        ultimaActualizacion: serverTimestamp(),
      });

      console.log('✅ Receta actualizada:', id);
    } catch (error) {
      console.error('❌ Error al actualizar receta:', error);
      throw new Error('Error al actualizar receta');
    }
  }

  /**
   * Elimina una receta
   */
  async deleteReceta(id: string): Promise<void> {
    try {
      const recetaRef = doc(db, 'recetas', id);
      await updateDoc(recetaRef, {
        activo: false,
        ultimaActualizacion: serverTimestamp(),
      });

      console.log('✅ Receta eliminada (soft delete):', id);
    } catch (error) {
      console.error('❌ Error al eliminar receta:', error);
      throw new Error('Error al eliminar receta');
    }
  }

  /**
   * Obtiene una receta por ID
   */
  async getRecetaById(id: string): Promise<Receta | null> {
    try {
      const recetaRef = doc(db, 'recetas', id);
      const recetaSnap = await getDoc(recetaRef);

      if (!recetaSnap.exists()) {
        return null;
      }

      return {
        id: recetaSnap.id,
        ...recetaSnap.data(),
        fechaCreacion: recetaSnap.data().fechaCreacion?.toDate(),
        ultimaActualizacion: recetaSnap.data().ultimaActualizacion?.toDate(),
      } as Receta;
    } catch (error) {
      console.error('❌ Error al obtener receta:', error);
      throw new Error('Error al obtener receta');
    }
  }

  // ==========================================================================
  // MÉTODOS DE CONSULTA Y FILTRADO
  // ==========================================================================

  /**
   * Obtiene todas las recetas con filtros opcionales
   */
  async getRecetas(filtros?: FiltrosRecetas): Promise<Receta[]> {
    try {
      let q = query(collection(db, 'recetas'));

      // Filtro de activos
      if (filtros?.activo !== undefined) {
        q = query(q, where('activo', '==', filtros.activo));
      } else {
        q = query(q, where('activo', '==', true));
      }

      // Filtro de categoría
      if (filtros?.categoria) {
        q = query(q, where('categoria', '==', filtros.categoria));
      }

      // Filtro de producto
      if (filtros?.productoId) {
        q = query(q, where('productoId', '==', filtros.productoId));
      }

      // Filtro de subrecetas
      if (filtros?.esSubreceta !== undefined) {
        q = query(q, where('esSubreceta', '==', filtros.esSubreceta));
      }

      // Ordenar por nombre
      q = query(q, orderBy('nombre', 'asc'));

      const querySnapshot = await getDocs(q);
      let recetas = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate(),
        ultimaActualizacion: doc.data().ultimaActualizacion?.toDate(),
      })) as Receta[];

      // Aplicar filtro de búsqueda
      if (filtros?.busqueda) {
        const term = filtros.busqueda.toLowerCase();
        recetas = recetas.filter((rec) => rec.nombre.toLowerCase().includes(term));
      }

      return recetas;
    } catch (error) {
      console.error('❌ Error al obtener recetas:', error);
      throw new Error('Error al obtener recetas');
    }
  }

  /**
   * Obtiene la receta de un producto específico
   */
  async getRecetaByProductoId(productoId: string): Promise<Receta | null> {
    try {
      const recetas = await this.getRecetas({ productoId });
      return recetas.length > 0 ? recetas[0] : null;
    } catch (error) {
      console.error('❌ Error al obtener receta por producto:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las subrecetas
   */
  async getSubrecetas(): Promise<Receta[]> {
    return this.getRecetas({ esSubreceta: true });
  }

  // ==========================================================================
  // MÉTODOS DE CÁLCULO DE COSTOS
  // ==========================================================================

  /**
   * Calcula el costo total de una receta (local)
   */
  private calcularCostoTotalLocal(ingredientes: IngredienteReceta[]): number {
    return ingredientes.reduce((total, ing) => total + ing.costoTotal, 0);
  }

  /**
   * Calcula el costo total actualizado de una receta
   * (obteniendo precios actuales de ingredientes)
   */
  async calcularCostoReceta(recetaId: string): Promise<number> {
    try {
      const receta = await this.getRecetaById(recetaId);
      if (!receta) {
        throw new Error('Receta no encontrada');
      }

      let costoTotal = 0;

      for (const ingredienteReceta of receta.ingredientes) {
        // Obtener precio actual del ingrediente
        const ingrediente = await ingredientesService.getIngredienteById(
          ingredienteReceta.ingredienteId
        );

        if (ingrediente) {
          const costoIngrediente = ingredienteReceta.cantidad * ingrediente.precioPorUnidad;
          costoTotal += costoIngrediente;
        } else {
          // Si el ingrediente no existe, usar el costo guardado
          costoTotal += ingredienteReceta.costoTotal;
        }
      }

      return costoTotal;
    } catch (error) {
      console.error('❌ Error al calcular costo de receta:', error);
      throw new Error('Error al calcular costo de receta');
    }
  }

  /**
   * Actualiza los costos de una receta con precios actuales
   */
  async actualizarCostosReceta(recetaId: string): Promise<void> {
    try {
      const receta = await this.getRecetaById(recetaId);
      if (!receta) {
        throw new Error('Receta no encontrada');
      }

      const ingredientesActualizados: IngredienteReceta[] = [];

      for (const ingredienteReceta of receta.ingredientes) {
        const ingrediente = await ingredientesService.getIngredienteById(
          ingredienteReceta.ingredienteId
        );

        if (ingrediente) {
          ingredientesActualizados.push({
            ...ingredienteReceta,
            costoUnitario: ingrediente.precioPorUnidad,
            costoTotal: ingredienteReceta.cantidad * ingrediente.precioPorUnidad,
          });
        } else {
          ingredientesActualizados.push(ingredienteReceta);
        }
      }

      await this.updateReceta(recetaId, {
        ingredientes: ingredientesActualizados,
      });

      console.log('✅ Costos de receta actualizados:', recetaId);
    } catch (error) {
      console.error('❌ Error al actualizar costos de receta:', error);
      throw new Error('Error al actualizar costos de receta');
    }
  }

  /**
   * Actualiza los costos de todas las recetas
   */
  async actualizarCostosTodasRecetas(): Promise<{
    success: number;
    errors: number;
  }> {
    try {
      const recetas = await this.getRecetas();
      let success = 0;
      let errors = 0;

      for (const receta of recetas) {
        try {
          await this.actualizarCostosReceta(receta.id);
          success++;
        } catch (error) {
          console.error(`Error actualizando receta ${receta.id}:`, error);
          errors++;
        }
      }

      console.log(`✅ Actualización masiva: ${success} éxitos, ${errors} errores`);
      return { success, errors };
    } catch (error) {
      console.error('❌ Error en actualización masiva de costos:', error);
      throw new Error('Error en actualización masiva de costos');
    }
  }

  // ==========================================================================
  // MÉTODOS DE VERIFICACIÓN DE STOCK
  // ==========================================================================

  /**
   * Verifica si hay suficiente stock para preparar una receta
   */
  async verificarStockReceta(recetaId: string): Promise<{
    disponible: boolean;
    faltantes: Array<{
      id: string;
      nombre: string;
      cantidadNecesaria: number;
      stockActual: number;
    }>;
  }> {
    try {
      const receta = await this.getRecetaById(recetaId);
      if (!receta) {
        throw new Error('Receta no encontrada');
      }

      const ingredientesNecesarios = receta.ingredientes.map((ing) => ({
        id: ing.ingredienteId,
        cantidad: ing.cantidad,
      }));

      const resultado = await ingredientesService.verificarDisponibilidadMultiple(
        ingredientesNecesarios
      );

      return {
        disponible: resultado.disponible,
        faltantes: resultado.faltantes.map((f) => ({
          id: f.id,
          nombre: f.nombre,
          cantidadNecesaria: f.cantidad,
          stockActual: f.stockActual,
        })),
      };
    } catch (error) {
      console.error('❌ Error al verificar stock de receta:', error);
      throw new Error('Error al verificar stock de receta');
    }
  }

  /**
   * Verifica stock de múltiples recetas (ej: para un pedido)
   */
  async verificarStockMultiplesRecetas(recetaIds: string[]): Promise<{
    disponible: boolean;
    faltantes: Array<{
      recetaId: string;
      recetaNombre: string;
      ingredientesFaltantes: Array<{
        id: string;
        nombre: string;
        cantidadNecesaria: number;
        stockActual: number;
      }>;
    }>;
  }> {
    const faltantes: Array<{
      recetaId: string;
      recetaNombre: string;
      ingredientesFaltantes: Array<{
        id: string;
        nombre: string;
        cantidadNecesaria: number;
        stockActual: number;
      }>;
    }> = [];

    for (const recetaId of recetaIds) {
      const resultado = await this.verificarStockReceta(recetaId);
      if (!resultado.disponible) {
        const receta = await this.getRecetaById(recetaId);
        faltantes.push({
          recetaId,
          recetaNombre: receta?.nombre || 'Receta desconocida',
          ingredientesFaltantes: resultado.faltantes,
        });
      }
    }

    return {
      disponible: faltantes.length === 0,
      faltantes,
    };
  }

  // ==========================================================================
  // LISTENERS EN TIEMPO REAL
  // ==========================================================================

  /**
   * Escucha cambios en tiempo real en las recetas
   */
  onRecetasChange(
    callback: (recetas: Receta[]) => void,
    filtros?: FiltrosRecetas
  ): () => void {
    let q = query(collection(db, 'recetas'));

    // Aplicar filtros
    if (filtros?.activo !== undefined) {
      q = query(q, where('activo', '==', filtros.activo));
    } else {
      q = query(q, where('activo', '==', true));
    }

    if (filtros?.categoria) {
      q = query(q, where('categoria', '==', filtros.categoria));
    }

    if (filtros?.productoId) {
      q = query(q, where('productoId', '==', filtros.productoId));
    }

    q = query(q, orderBy('nombre', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        const recetas = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          fechaCreacion: doc.data().fechaCreacion?.toDate(),
          ultimaActualizacion: doc.data().ultimaActualizacion?.toDate(),
        })) as Receta[];

        callback(recetas);
      },
      (error) => {
        console.error('❌ Error en listener de recetas:', error);
      }
    );

    return unsubscribe;
  }

  // ==========================================================================
  // MÉTODOS DE IMPORTACIÓN
  // ==========================================================================

  /**
   * Importa recetas masivamente desde un array
   */
  async importRecetasBatch(
    recetas: Array<Omit<Receta, 'id' | 'fechaCreacion' | 'ultimaActualizacion'>>
  ): Promise<{ success: number; errors: number; errorDetails: string[] }> {
    let success = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    const batchSize = 500;
    const batches = Math.ceil(recetas.length / batchSize);

    try {
      for (let i = 0; i < batches; i++) {
        const batch = writeBatch(db);
        const start = i * batchSize;
        const end = Math.min((i + 1) * batchSize, recetas.length);

        for (let j = start; j < end; j++) {
          const receta = recetas[j];
          try {
            const costoTotal = this.calcularCostoTotalLocal(receta.ingredientes);
            const docRef = doc(collection(db, 'recetas'));
            batch.set(docRef, {
              ...receta,
              costoTotal,
              activo: true,
              fechaCreacion: serverTimestamp(),
              ultimaActualizacion: serverTimestamp(),
            });
            success++;
          } catch (error) {
            errors++;
            errorDetails.push(`Error en receta "${receta.nombre}": ${error}`);
          }
        }

        await batch.commit();
        console.log(`✅ Batch ${i + 1}/${batches} importado`);
      }

      console.log(`✅ Importación completada: ${success} éxitos, ${errors} errores`);
      return { success, errors, errorDetails };
    } catch (error) {
      console.error('❌ Error en importación masiva:', error);
      throw new Error('Error en importación masiva');
    }
  }

  /**
   * Importa recetas desde archivo Excel (placeholder)
   * Nota: La lógica de parseo del Excel debe implementarse según formato
   */
  async importRecetasFromExcel(
    file: File
  ): Promise<{ success: number; errors: number; errorDetails: string[] }> {
    // TODO: Implementar lógica de parseo de Excel
    // Se puede usar librería como xlsx o exceljs
    throw new Error('Método no implementado aún');
  }

  // ==========================================================================
  // MÉTODOS DE EXPORTACIÓN
  // ==========================================================================

  /**
   * Exporta recetas a formato CSV
   */
  async exportToCSV(filtros?: FiltrosRecetas): Promise<string> {
    const recetas = await this.getRecetas(filtros);

    const headers = [
      'ID',
      'Nombre',
      'Categoría',
      'ProductoID',
      'Costo Total',
      '# Ingredientes',
      'Es Subreceta',
      'Activo',
    ].join(',');

    const rows = recetas.map((rec) =>
      [
        rec.id,
        `"${rec.nombre}"`,
        rec.categoria,
        rec.productoId,
        rec.costoTotal.toFixed(2),
        rec.ingredientes.length,
        rec.esSubreceta ? 'Sí' : 'No',
        rec.activo ? 'Sí' : 'No',
      ].join(',')
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Exporta receta detallada con ingredientes
   */
  async exportRecetaDetallada(recetaId: string): Promise<string> {
    const receta = await this.getRecetaById(recetaId);
    if (!receta) {
      throw new Error('Receta no encontrada');
    }

    const headers = ['Receta', 'Ingrediente', 'Cantidad', 'Unidad', 'Costo Unit.', 'Costo Total'].join(
      ','
    );

    const rows = receta.ingredientes.map((ing) =>
      [
        `"${receta.nombre}"`,
        `"${ing.ingredienteNombre}"`,
        ing.cantidad,
        ing.unidadMedida,
        ing.costoUnitario.toFixed(2),
        ing.costoTotal.toFixed(2),
      ].join(',')
    );

    const totalRow = ['', '', '', '', 'TOTAL:', receta.costoTotal.toFixed(2)].join(',');

    return [headers, ...rows, totalRow].join('\n');
  }
}

// Exportar instancia singleton
export const recetasService = new RecetasService();
export default recetasService;
