/**
 * Store de Productos con Zustand
 * Old Texas BBQ - CRM
 *
 * Proporciona:
 * - Cache de productos en memoria
 * - Sincronización en tiempo real con Firestore
 * - Métodos para acceder a productos de forma rápida
 */

import { create } from 'zustand';
import { Producto, Categoria } from '@/lib/types/firestore';
import { productosService } from '@/lib/services/productos.service';
import { categoriasService } from '@/lib/services/categorias.service';

interface ProductosStoreState {
  // Estado
  productos: Producto[];
  categorias: Categoria[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  unsubscribe: (() => void) | null;

  // Acciones
  initializeRealtime: () => void;
  stopRealtime: () => void;
  refreshProductos: () => Promise<void>;
  refreshCategorias: () => Promise<void>;

  // Selectores
  getProductoById: (id: string) => Producto | undefined;
  getProductosByCategoria: (categoriaId: string) => Producto[];
  getProductosDisponibles: () => Producto[];
  getProductosEnPromocion: () => Producto[];
  getCategoriaById: (id: string) => Categoria | undefined;
  getCategoriasActivas: () => Categoria[];
}

export const useProductosStore = create<ProductosStoreState>((set, get) => ({
  // Estado inicial
  productos: [],
  categorias: [],
  loading: true,
  error: null,
  lastUpdated: null,
  unsubscribe: null,

  /**
   * Inicializa la escucha en tiempo real de productos
   */
  initializeRealtime: () => {
    const currentUnsubscribe = get().unsubscribe;

    // Si ya hay un listener activo, no crear otro
    if (currentUnsubscribe) {
      console.log('[ProductosStore] Realtime listener ya activo');
      return;
    }

    console.log('[ProductosStore] Iniciando escucha en tiempo real...');
    set({ loading: true, error: null });

    // Cargar categorías primero (no son en tiempo real, menos frecuentes)
    get().refreshCategorias();

    // Escuchar productos en tiempo real
    const unsubscribe = productosService.onCollectionChange(
      (productos) => {
        console.log('[ProductosStore] Productos actualizados:', productos.length);
        set({
          productos,
          loading: false,
          lastUpdated: new Date(),
          error: null,
        });
      },
      {
        orderByField: 'orden',
        orderDirection: 'asc',
      },
      (error) => {
        console.error('[ProductosStore] Error en tiempo real:', error);
        set({
          loading: false,
          error: error.message,
        });
      }
    );

    set({ unsubscribe });
  },

  /**
   * Detiene la escucha en tiempo real
   */
  stopRealtime: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      console.log('[ProductosStore] Deteniendo escucha en tiempo real...');
      unsubscribe();
      set({ unsubscribe: null });
    }
  },

  /**
   * Recarga manualmente los productos (útil para forzar refresh)
   */
  refreshProductos: async () => {
    set({ loading: true, error: null });
    try {
      const productos = await productosService.getAll({
        orderByField: 'orden',
        orderDirection: 'asc',
      });
      set({
        productos,
        loading: false,
        lastUpdated: new Date(),
      });
    } catch (error: any) {
      console.error('[ProductosStore] Error refrescando productos:', error);
      set({
        loading: false,
        error: error.message,
      });
    }
  },

  /**
   * Recarga las categorías
   */
  refreshCategorias: async () => {
    try {
      const categorias = await categoriasService.getAll({
        orderByField: 'orden',
        orderDirection: 'asc',
      });
      set({ categorias });
    } catch (error: any) {
      console.error('[ProductosStore] Error cargando categorías:', error);
    }
  },

  // ==========================================================================
  // SELECTORES (funciones de acceso rápido al cache)
  // ==========================================================================

  /**
   * Obtiene un producto por ID (desde cache)
   */
  getProductoById: (id: string) => {
    return get().productos.find((p) => p.id === id);
  },

  /**
   * Obtiene productos por categoría (desde cache)
   */
  getProductosByCategoria: (categoriaId: string) => {
    return get().productos.filter(
      (p) => p.categoriaId === categoriaId && p.disponible && !p.eliminado
    );
  },

  /**
   * Obtiene solo productos disponibles (desde cache)
   */
  getProductosDisponibles: () => {
    return get().productos.filter((p) => p.disponible && !p.eliminado);
  },

  /**
   * Obtiene productos en promoción (desde cache)
   */
  getProductosEnPromocion: () => {
    return get().productos.filter(
      (p) => p.enPromocion && p.disponible && !p.eliminado
    );
  },

  /**
   * Obtiene una categoría por ID (desde cache)
   */
  getCategoriaById: (id: string) => {
    return get().categorias.find((c) => c.id === id);
  },

  /**
   * Obtiene categorías activas (desde cache)
   */
  getCategoriasActivas: () => {
    return get().categorias.filter((c) => c.activa);
  },
}));

// ==========================================================================
// HOOKS AUXILIARES
// ==========================================================================

/**
 * Hook para usar productos con auto-inicialización
 */
export function useProductos() {
  const store = useProductosStore();

  // Auto-inicializar si no hay listener activo
  if (!store.unsubscribe && !store.loading) {
    store.initializeRealtime();
  }

  return {
    productos: store.getProductosDisponibles(),
    loading: store.loading,
    error: store.error,
    lastUpdated: store.lastUpdated,
    refresh: store.refreshProductos,
  };
}

/**
 * Hook para usar categorías
 */
export function useCategorias() {
  const store = useProductosStore();

  return {
    categorias: store.getCategoriasActivas(),
    getCategoriaById: store.getCategoriaById,
    refresh: store.refreshCategorias,
  };
}
