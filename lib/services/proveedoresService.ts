/**
 * Servicio de Proveedores
 * Old Texas BBQ - CRM
 *
 * Gestiona operaciones CRUD para proveedores del sistema de inventario
 * Incluye: soft delete, filtros por categoría, listener en tiempo real
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
  serverTimestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ProveedorCompleto, CategoriaIngrediente } from '@/lib/types';

export interface FiltrosProveedores {
  activo?: boolean;
  categoria?: CategoriaIngrediente;
  busqueda?: string;
}

class ProveedoresService {

  // ==========================================================================
  // MÉTODOS CRUD BÁSICOS
  // ==========================================================================

  /**
   * Crea un nuevo proveedor
   */
  async createProveedor(
    proveedor: Omit<ProveedorCompleto, 'id' | 'fechaCreacion'>
  ): Promise<string> {
    try {
      const proveedorRef = await addDoc(collection(db, 'proveedores'), {
        ...proveedor,
        activo: true,
        fechaCreacion: serverTimestamp(),
      });

      console.log('✅ Proveedor creado:', proveedorRef.id);
      return proveedorRef.id;
    } catch (error) {
      console.error('❌ Error al crear proveedor:', error);
      throw new Error('Error al crear proveedor');
    }
  }

  /**
   * Actualiza un proveedor existente
   */
  async updateProveedor(
    id: string,
    data: Partial<Omit<ProveedorCompleto, 'id' | 'fechaCreacion'>>
  ): Promise<void> {
    try {
      const proveedorRef = doc(db, 'proveedores', id);
      await updateDoc(proveedorRef, {
        ...data,
        ultimaActualizacion: serverTimestamp(),
      });

      console.log('✅ Proveedor actualizado:', id);
    } catch (error) {
      console.error('❌ Error al actualizar proveedor:', error);
      throw new Error('Error al actualizar proveedor');
    }
  }

  /**
   * Elimina un proveedor (soft delete)
   */
  async deleteProveedor(id: string): Promise<void> {
    try {
      const proveedorRef = doc(db, 'proveedores', id);
      await updateDoc(proveedorRef, {
        activo: false,
        ultimaActualizacion: serverTimestamp(),
      });

      console.log('✅ Proveedor eliminado (soft delete):', id);
    } catch (error) {
      console.error('❌ Error al eliminar proveedor:', error);
      throw new Error('Error al eliminar proveedor');
    }
  }

  /**
   * Obtiene un proveedor por ID
   */
  async getProveedorById(id: string): Promise<ProveedorCompleto | null> {
    try {
      const proveedorRef = doc(db, 'proveedores', id);
      const proveedorSnap = await getDoc(proveedorRef);

      if (!proveedorSnap.exists()) {
        return null;
      }

      return {
        id: proveedorSnap.id,
        ...proveedorSnap.data(),
        fechaCreacion: proveedorSnap.data().fechaCreacion?.toDate(),
      } as ProveedorCompleto;
    } catch (error) {
      console.error('❌ Error al obtener proveedor:', error);
      throw new Error('Error al obtener proveedor');
    }
  }

  // ==========================================================================
  // MÉTODOS DE CONSULTA Y FILTRADO
  // ==========================================================================

  /**
   * Obtiene todos los proveedores con filtros opcionales
   */
  async getProveedores(filtros?: FiltrosProveedores): Promise<ProveedorCompleto[]> {
    try {
      let q = query(collection(db, 'proveedores'));

      // Filtro de activos
      if (filtros?.activo !== undefined) {
        q = query(q, where('activo', '==', filtros.activo));
      } else {
        // Por defecto solo activos
        q = query(q, where('activo', '==', true));
      }

      // Filtro por categoría (array-contains para arrays de categorías)
      if (filtros?.categoria) {
        q = query(q, where('categorias', 'array-contains', filtros.categoria));
      }

      // Ordenar por nombre
      q = query(q, orderBy('nombre', 'asc'));

      const querySnapshot = await getDocs(q);
      let proveedores = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate(),
      })) as ProveedorCompleto[];

      // Filtro de búsqueda post-query
      if (filtros?.busqueda) {
        const term = filtros.busqueda.toLowerCase();
        proveedores = proveedores.filter(
          (prov) =>
            prov.nombre.toLowerCase().includes(term) ||
            prov.razonSocial?.toLowerCase().includes(term) ||
            prov.contacto?.nombre?.toLowerCase().includes(term)
        );
      }

      return proveedores;
    } catch (error) {
      console.error('❌ Error al obtener proveedores:', error);
      throw new Error('Error al obtener proveedores');
    }
  }

  /**
   * Obtiene proveedores por categoría de ingrediente
   */
  async getProveedoresByCategoria(
    categoria: CategoriaIngrediente
  ): Promise<ProveedorCompleto[]> {
    return this.getProveedores({ categoria });
  }

  // ==========================================================================
  // LISTENERS EN TIEMPO REAL
  // ==========================================================================

  /**
   * Escucha cambios en tiempo real en los proveedores
   */
  onProveedoresChange(
    callback: (proveedores: ProveedorCompleto[]) => void
  ): () => void {
    const q = query(
      collection(db, 'proveedores'),
      where('activo', '==', true),
      orderBy('nombre', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        const proveedores = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          fechaCreacion: doc.data().fechaCreacion?.toDate(),
        })) as ProveedorCompleto[];

        callback(proveedores);
      },
      (error) => {
        console.error('❌ Error en listener de proveedores:', error);
      }
    );

    return unsubscribe;
  }
}

// Exportar instancia singleton
export const proveedoresService = new ProveedoresService();
export default proveedoresService;
