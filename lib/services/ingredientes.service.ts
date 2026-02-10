/**
 * Servicio de Ingredientes
 * Old Texas BBQ - CRM
 *
 * Gestiona operaciones CRUD para ingredientes del inventario
 * Incluye: Control de stock, alertas, búsqueda y filtros
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
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
  Ingrediente,
  CategoriaIngrediente,
  UnidadMedida,
  FiltrosIngredientes,
  TipoMovimiento,
} from '@/lib/types';

class IngredientesService extends BaseService<Ingrediente> {
  constructor() {
    super('ingredientes');
  }

  // ==========================================================================
  // MÉTODOS CRUD BÁSICOS
  // ==========================================================================

  /**
   * Crea un nuevo ingrediente
   */
  async createIngrediente(
    ingrediente: Omit<Ingrediente, 'id' | 'fechaCreacion' | 'ultimaActualizacion'>
  ): Promise<string> {
    try {
      const ingredienteRef = await addDoc(collection(db, 'ingredientes'), {
        ...ingrediente,
        stockActual: ingrediente.stockActual || 0,
        stockMinimo: ingrediente.stockMinimo || 0,
        stockMaximo: ingrediente.stockMaximo || 0,
        activo: true,
        fechaCreacion: serverTimestamp(),
        ultimaActualizacion: serverTimestamp(),
      });

      console.log('✅ Ingrediente creado:', ingredienteRef.id);
      return ingredienteRef.id;
    } catch (error) {
      console.error('❌ Error al crear ingrediente:', error);
      throw new Error('Error al crear ingrediente');
    }
  }

  /**
   * Actualiza un ingrediente existente
   */
  async updateIngrediente(
    id: string,
    data: Partial<Omit<Ingrediente, 'id' | 'fechaCreacion' | 'ultimaActualizacion'>>
  ): Promise<void> {
    try {
      const ingredienteRef = doc(db, 'ingredientes', id);
      await updateDoc(ingredienteRef, {
        ...data,
        ultimaActualizacion: serverTimestamp(),
      });

      console.log('✅ Ingrediente actualizado:', id);
    } catch (error) {
      console.error('❌ Error al actualizar ingrediente:', error);
      throw new Error('Error al actualizar ingrediente');
    }
  }

  /**
   * Elimina un ingrediente (soft delete)
   */
  async deleteIngrediente(id: string): Promise<void> {
    try {
      const ingredienteRef = doc(db, 'ingredientes', id);
      await updateDoc(ingredienteRef, {
        activo: false,
        ultimaActualizacion: serverTimestamp(),
      });

      console.log('✅ Ingrediente eliminado (soft delete):', id);
    } catch (error) {
      console.error('❌ Error al eliminar ingrediente:', error);
      throw new Error('Error al eliminar ingrediente');
    }
  }

  /**
   * Obtiene un ingrediente por ID
   */
  async getIngredienteById(id: string): Promise<Ingrediente | null> {
    try {
      const ingredienteRef = doc(db, 'ingredientes', id);
      const ingredienteSnap = await getDoc(ingredienteRef);

      if (!ingredienteSnap.exists()) {
        return null;
      }

      return {
        id: ingredienteSnap.id,
        ...ingredienteSnap.data(),
      } as Ingrediente;
    } catch (error) {
      console.error('❌ Error al obtener ingrediente:', error);
      throw new Error('Error al obtener ingrediente');
    }
  }

  // ==========================================================================
  // MÉTODOS DE CONSULTA Y FILTRADO
  // ==========================================================================

  /**
   * Obtiene todos los ingredientes con filtros opcionales
   */
  async getIngredientes(filtros?: FiltrosIngredientes): Promise<Ingrediente[]> {
    try {
      let q = query(collection(db, 'ingredientes'));

      // Filtro de activos
      if (filtros?.activo !== undefined) {
        q = query(q, where('activo', '==', filtros.activo));
      } else {
        // Por defecto solo activos
        q = query(q, where('activo', '==', true));
      }

      // Filtro de categoría
      if (filtros?.categoria) {
        q = query(q, where('categoria', '==', filtros.categoria));
      }

      // Filtro de stock bajo
      if (filtros?.stockBajo) {
        // Nota: Este filtro requiere procesamiento post-query
        // porque Firestore no soporta comparar dos campos
      }

      // Filtro de sin stock
      if (filtros?.sinStock) {
        q = query(q, where('stockActual', '==', 0));
      }

      // Ordenar por nombre
      q = query(q, orderBy('nombre', 'asc'));

      const querySnapshot = await getDocs(q);
      let ingredientes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate(),
        ultimaActualizacion: doc.data().ultimaActualizacion?.toDate(),
        fechaVencimiento: doc.data().fechaVencimiento?.toDate(),
        ultimaCompra: doc.data().ultimaCompra
          ? {
              ...doc.data().ultimaCompra,
              fecha: doc.data().ultimaCompra.fecha?.toDate(),
            }
          : undefined,
      })) as Ingrediente[];

      // Aplicar filtro de stock bajo post-query
      if (filtros?.stockBajo) {
        ingredientes = ingredientes.filter(
          (ing) => ing.stockActual < ing.stockMinimo && ing.stockActual > 0
        );
      }

      // Aplicar filtro de búsqueda
      if (filtros?.busqueda) {
        const term = filtros.busqueda.toLowerCase();
        ingredientes = ingredientes.filter((ing) =>
          ing.nombre.toLowerCase().includes(term)
        );
      }

      return ingredientes;
    } catch (error) {
      console.error('❌ Error al obtener ingredientes:', error);
      throw new Error('Error al obtener ingredientes');
    }
  }

  /**
   * Busca ingredientes por nombre
   */
  async searchIngredientes(searchTerm: string): Promise<Ingrediente[]> {
    return this.getIngredientes({ busqueda: searchTerm });
  }

  /**
   * Obtiene ingredientes por categoría
   */
  async getIngredientesByCategoria(
    categoria: CategoriaIngrediente
  ): Promise<Ingrediente[]> {
    return this.getIngredientes({ categoria });
  }

  /**
   * Obtiene ingredientes con stock bajo
   */
  async getIngredientesStockBajo(): Promise<Ingrediente[]> {
    return this.getIngredientes({ stockBajo: true });
  }

  /**
   * Obtiene ingredientes sin stock
   */
  async getIngredientesSinStock(): Promise<Ingrediente[]> {
    return this.getIngredientes({ sinStock: true });
  }

  // ==========================================================================
  // MÉTODOS DE CONTROL DE STOCK
  // ==========================================================================

  /**
   * Actualiza el stock de un ingrediente
   */
  async updateStock(
    id: string,
    cantidad: number,
    tipo: 'incrementar' | 'decrementar' | 'establecer'
  ): Promise<void> {
    try {
      const ingrediente = await this.getIngredienteById(id);
      if (!ingrediente) {
        throw new Error('Ingrediente no encontrado');
      }

      let nuevoStock: number;
      switch (tipo) {
        case 'incrementar':
          nuevoStock = ingrediente.stockActual + cantidad;
          break;
        case 'decrementar':
          nuevoStock = Math.max(0, ingrediente.stockActual - cantidad);
          break;
        case 'establecer':
          nuevoStock = cantidad;
          break;
      }

      await this.updateIngrediente(id, {
        stockActual: nuevoStock,
      });

      console.log(
        `✅ Stock actualizado: ${ingrediente.nombre} - ${ingrediente.stockActual} → ${nuevoStock}`
      );
    } catch (error) {
      console.error('❌ Error al actualizar stock:', error);
      throw new Error('Error al actualizar stock');
    }
  }

  /**
   * Verifica si hay suficiente stock de un ingrediente
   */
  async verificarDisponibilidad(
    ingredienteId: string,
    cantidadNecesaria: number
  ): Promise<boolean> {
    try {
      const ingrediente = await this.getIngredienteById(ingredienteId);
      if (!ingrediente) {
        return false;
      }

      return ingrediente.stockActual >= cantidadNecesaria;
    } catch (error) {
      console.error('❌ Error al verificar disponibilidad:', error);
      return false;
    }
  }

  /**
   * Verifica disponibilidad de múltiples ingredientes
   */
  async verificarDisponibilidadMultiple(
    ingredientes: Array<{ id: string; cantidad: number }>
  ): Promise<{
    disponible: boolean;
    faltantes: Array<{ id: string; nombre: string; cantidad: number; stockActual: number }>;
  }> {
    const faltantes: Array<{
      id: string;
      nombre: string;
      cantidad: number;
      stockActual: number;
    }> = [];

    for (const item of ingredientes) {
      const ingrediente = await this.getIngredienteById(item.id);
      if (!ingrediente) {
        faltantes.push({
          id: item.id,
          nombre: 'Ingrediente no encontrado',
          cantidad: item.cantidad,
          stockActual: 0,
        });
        continue;
      }

      if (ingrediente.stockActual < item.cantidad) {
        faltantes.push({
          id: item.id,
          nombre: ingrediente.nombre,
          cantidad: item.cantidad,
          stockActual: ingrediente.stockActual,
        });
      }
    }

    return {
      disponible: faltantes.length === 0,
      faltantes,
    };
  }

  // ==========================================================================
  // MÉTODOS DE ALERTAS Y NOTIFICACIONES
  // ==========================================================================

  /**
   * Obtiene ingredientes que requieren atención
   */
  async getIngredientesConAlertas(): Promise<{
    stockBajo: Ingrediente[];
    sinStock: Ingrediente[];
    proximosVencer: Ingrediente[];
  }> {
    const [stockBajo, sinStock] = await Promise.all([
      this.getIngredientesStockBajo(),
      this.getIngredientesSinStock(),
    ]);

    // Ingredientes próximos a vencer (7 días)
    const allIngredientes = await this.getIngredientes();
    const ahora = new Date();
    const en7Dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
    const proximosVencer = allIngredientes.filter((ing) => {
      if (!ing.fechaVencimiento) return false;
      const fechaVenc = new Date(ing.fechaVencimiento);
      return fechaVenc <= en7Dias && fechaVenc > ahora;
    });

    return {
      stockBajo,
      sinStock,
      proximosVencer,
    };
  }

  // ==========================================================================
  // LISTENERS EN TIEMPO REAL
  // ==========================================================================

  /**
   * Escucha cambios en tiempo real en los ingredientes
   */
  onIngredientesChange(
    callback: (ingredientes: Ingrediente[]) => void,
    filtros?: FiltrosIngredientes
  ): () => void {
    let q = query(collection(db, 'ingredientes'));

    // Aplicar filtros
    if (filtros?.activo !== undefined) {
      q = query(q, where('activo', '==', filtros.activo));
    } else {
      q = query(q, where('activo', '==', true));
    }

    if (filtros?.categoria) {
      q = query(q, where('categoria', '==', filtros.categoria));
    }

    q = query(q, orderBy('nombre', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        const ingredientes = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          fechaCreacion: doc.data().fechaCreacion?.toDate(),
          ultimaActualizacion: doc.data().ultimaActualizacion?.toDate(),
          fechaVencimiento: doc.data().fechaVencimiento?.toDate(),
        })) as Ingrediente[];

        callback(ingredientes);
      },
      (error) => {
        console.error('❌ Error en listener de ingredientes:', error);
      }
    );

    return unsubscribe;
  }

  // ==========================================================================
  // MÉTODOS DE IMPORTACIÓN
  // ==========================================================================

  /**
   * Importa ingredientes masivamente desde un array
   */
  async importIngredientesBatch(
    ingredientes: Array<Omit<Ingrediente, 'id' | 'fechaCreacion' | 'ultimaActualizacion'>>
  ): Promise<{ success: number; errors: number; errorDetails: string[] }> {
    let success = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Firestore batch tiene límite de 500 operaciones
    const batchSize = 500;
    const batches = Math.ceil(ingredientes.length / batchSize);

    try {
      for (let i = 0; i < batches; i++) {
        const batch = writeBatch(db);
        const start = i * batchSize;
        const end = Math.min((i + 1) * batchSize, ingredientes.length);

        for (let j = start; j < end; j++) {
          const ingrediente = ingredientes[j];
          try {
            const docRef = doc(collection(db, 'ingredientes'));
            batch.set(docRef, {
              ...ingrediente,
              stockActual: ingrediente.stockActual || 0,
              stockMinimo: ingrediente.stockMinimo || 0,
              stockMaximo: ingrediente.stockMaximo || 0,
              activo: true,
              fechaCreacion: serverTimestamp(),
              ultimaActualizacion: serverTimestamp(),
            });
            success++;
          } catch (error) {
            errors++;
            errorDetails.push(
              `Error en ingrediente "${ingrediente.nombre}": ${error}`
            );
          }
        }

        await batch.commit();
        console.log(`✅ Batch ${i + 1}/${batches} importado`);
      }

      console.log(
        `✅ Importación completada: ${success} éxitos, ${errors} errores`
      );
      return { success, errors, errorDetails };
    } catch (error) {
      console.error('❌ Error en importación masiva:', error);
      throw new Error('Error en importación masiva');
    }
  }

  // ==========================================================================
  // MÉTODOS DE EXPORTACIÓN
  // ==========================================================================

  /**
   * Exporta ingredientes a formato CSV
   */
  async exportToCSV(filtros?: FiltrosIngredientes): Promise<string> {
    const ingredientes = await this.getIngredientes(filtros);

    const headers = [
      'ID',
      'Nombre',
      'Categoría',
      'Unidad',
      'Precio/Unidad',
      'Stock Actual',
      'Stock Mínimo',
      'Stock Máximo',
      'Ubicación',
      'Activo',
    ].join(',');

    const rows = ingredientes.map((ing) =>
      [
        ing.id,
        `"${ing.nombre}"`,
        ing.categoria,
        ing.unidadMedida,
        ing.precioPorUnidad,
        ing.stockActual,
        ing.stockMinimo,
        ing.stockMaximo,
        `"${ing.ubicacion || ''}"`,
        ing.activo ? 'Sí' : 'No',
      ].join(',')
    );

    return [headers, ...rows].join('\n');
  }
}

// Exportar instancia singleton
export const ingredientesService = new IngredientesService();
export default ingredientesService;
