/**
 * Página de Gestión de Productos
 * Old Texas BBQ - CRM
 *
 * Acceso: Admin y Encargado
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { productosService } from '@/lib/services/productos.service';
import { Producto } from '@/lib/types/firestore';
import { useAuth } from '@/lib/auth/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import ProductosHeader from '@/components/productos/ProductosHeader';
import ProductosFilters from '@/components/productos/ProductosFilters';
import ProductosTable from '@/components/productos/ProductosTable';
import ProductosGrid from '@/components/productos/ProductosGrid';
import { ProductoModal } from '@/components/productos/ProductoModal';
import { ProductoDetalle } from '@/components/productos/ProductoDetalle';
import { ImportExportModal } from '@/components/productos/ImportExportModal';
import { AlertaProductosSinFoto } from '@/components/productos/AlertaProductosSinFoto';

type VistaProductos = 'tabla' | 'grid';

export default function ProductosPage() {
  const { userData } = useAuth();
  const router = useRouter();

  // Estados
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<VistaProductos>('grid');

  // Estado del modal de edición
  const [modalOpen, setModalOpen] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | undefined>(undefined);

  // Estado del modal de detalle
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [productoDetalle, setProductoDetalle] = useState<Producto | null>(null);

  // Estado del modal de Import/Export
  const [importExportOpen, setImportExportOpen] = useState(false);

  // Filtros y búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [disponibilidadFiltro, setDisponibilidadFiltro] = useState<'todos' | 'disponible' | 'agotado'>('todos');
  const [ordenamiento, setOrdenamiento] = useState<'nombre' | 'precio' | 'fecha'>('nombre');

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 12;

  // Verificar permisos
  useEffect(() => {
    if (userData && userData.rol !== 'admin' && userData.rol !== 'encargado') {
      toast.error('No tienes permisos para acceder a esta página');
      router.push('/dashboard');
    }
  }, [userData, router]);

  // Cargar productos en tiempo real
  useEffect(() => {
    setLoading(true);

    const unsubscribe = productosService.onCollectionChange(
      (productosActualizados) => {
        setProductos(productosActualizados);
        setLoading(false);
      },
      {
        orderByField: 'fechaCreacion',
        orderDirection: 'desc',
      },
      (error) => {
        console.error('Error cargando productos:', error);
        toast.error('Error al cargar productos');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Obtener categorías únicas para filtro
  const categorias = useMemo(() => {
    const categoriasSet = new Set(productos.map(p => p.categoriaNombre));
    return Array.from(categoriasSet).sort();
  }, [productos]);

  // Aplicar filtros, búsqueda y ordenamiento
  const productosFiltrados = useMemo(() => {
    let resultado = [...productos];

    // Filtro por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(
        (p) =>
          p.nombre.toLowerCase().includes(termino) ||
          p.descripcion.toLowerCase().includes(termino) ||
          p.categoriaNombre.toLowerCase().includes(termino) ||
          (p.etiquetas && p.etiquetas.some(tag => tag.toLowerCase().includes(termino)))
      );
    }

    // Filtro por categoría
    if (categoriaFiltro !== 'todas') {
      resultado = resultado.filter(p => p.categoriaNombre === categoriaFiltro);
    }

    // Filtro por disponibilidad
    if (disponibilidadFiltro === 'disponible') {
      resultado = resultado.filter(p => p.disponible);
    } else if (disponibilidadFiltro === 'agotado') {
      resultado = resultado.filter(p => !p.disponible);
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      switch (ordenamiento) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre);
        case 'precio':
          return a.precio - b.precio;
        case 'fecha':
          return b.fechaCreacion.toMillis() - a.fechaCreacion.toMillis();
        default:
          return 0;
      }
    });

    return resultado;
  }, [productos, busqueda, categoriaFiltro, disponibilidadFiltro, ordenamiento]);

  // Paginación
  const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
  const productosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    return productosFiltrados.slice(inicio, fin);
  }, [productosFiltrados, paginaActual, productosPorPagina]);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, categoriaFiltro, disponibilidadFiltro, ordenamiento]);

  // Handlers
  const handleToggleVista = () => {
    setVista(vista === 'tabla' ? 'grid' : 'tabla');
  };

  const handleNuevoProducto = () => {
    setProductoEditar(undefined);
    setModalOpen(true);
  };

  const handleEditarProducto = (producto: Producto) => {
    setProductoEditar(producto);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setProductoEditar(undefined);
  };

  const handleModalSuccess = () => {
    // El listener en tiempo real se encargará de actualizar la lista
    setModalOpen(false);
    setProductoEditar(undefined);
  };

  const handleVerDetalle = (producto: Producto) => {
    setProductoDetalle(producto);
    setDetalleOpen(true);
  };

  const handleCloseDetalle = () => {
    setDetalleOpen(false);
    setProductoDetalle(null);
  };

  const handleEditarDesdeDetalle = (producto: Producto) => {
    setDetalleOpen(false);
    setProductoDetalle(null);
    handleEditarProducto(producto);
  };

  const handleToggleDisponibilidad = async (id: string, disponible: boolean) => {
    try {
      await productosService.toggleDisponibilidad(id, disponible);
      toast.success(`Producto ${disponible ? 'activado' : 'desactivado'} correctamente`);
    } catch (error) {
      console.error('Error al cambiar disponibilidad:', error);
      toast.error('Error al cambiar disponibilidad del producto');
    }
  };

  const handleEliminarProducto = async (id: string) => {
    try {
      // Soft delete con verificación de pedidos activos
      const resultado = await productosService.softDelete(
        id,
        userData?.uid || 'unknown',
        userData?.nombre || 'Usuario'
      );

      if (resultado.success) {
        toast.success(resultado.message);
      } else {
        toast.error(resultado.message);
      }
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      toast.error('Error al eliminar producto');
    }
  };

  // Handler para duplicar producto
  const handleDuplicarProducto = async (producto: Producto) => {
    try {
      const nuevoId = await productosService.duplicarProducto(
        producto.id,
        userData?.uid || 'unknown'
      );
      toast.success(`Producto duplicado correctamente`);
      // Abrir modal de edición con el nuevo producto
      const nuevoProducto = await productosService.getById(nuevoId);
      if (nuevoProducto) {
        setProductoEditar(nuevoProducto);
        setModalOpen(true);
      }
    } catch (error: any) {
      console.error('Error al duplicar producto:', error);
      toast.error(error.message || 'Error al duplicar producto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Alerta de productos sin foto */}
      <AlertaProductosSinFoto
        productos={productos}
        onEditarProducto={handleEditarProducto}
      />

      {/* Header */}
      <ProductosHeader
        totalProductos={productos.length}
        productosFiltrados={productosFiltrados.length}
        vista={vista}
        onToggleVista={handleToggleVista}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        onNuevoProducto={handleNuevoProducto}
        onImportExport={() => setImportExportOpen(true)}
      />

      {/* Filtros */}
      <ProductosFilters
        categorias={categorias}
        categoriaSeleccionada={categoriaFiltro}
        onCategoriaChange={setCategoriaFiltro}
        disponibilidadFiltro={disponibilidadFiltro}
        onDisponibilidadChange={setDisponibilidadFiltro}
        ordenamiento={ordenamiento}
        onOrdenamientoChange={setOrdenamiento}
      />

      {/* Vista de productos */}
      {vista === 'tabla' ? (
        <ProductosTable
          productos={productosPaginados}
          onToggleDisponibilidad={handleToggleDisponibilidad}
          onEliminar={handleEliminarProducto}
          onEditar={handleEditarProducto}
          onVerDetalle={handleVerDetalle}
        />
      ) : (
        <ProductosGrid
          productos={productosPaginados}
          onToggleDisponibilidad={handleToggleDisponibilidad}
          onEliminar={handleEliminarProducto}
          onEditar={handleEditarProducto}
          onVerDetalle={handleVerDetalle}
        />
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
            disabled={paginaActual === 1}
            className="px-4 py-2 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
              <button
                key={pagina}
                onClick={() => setPaginaActual(pagina)}
                className={`w-10 h-10 rounded-md border ${
                  paginaActual === pagina
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-background hover:bg-accent'
                }`}
              >
                {pagina}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
            disabled={paginaActual === totalPaginas}
            className="px-4 py-2 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal de Edición */}
      <ProductoModal
        open={modalOpen}
        onClose={handleCloseModal}
        producto={productoEditar}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de Detalle */}
      <ProductoDetalle
        producto={productoDetalle}
        open={detalleOpen}
        onClose={handleCloseDetalle}
        onEdit={handleEditarDesdeDetalle}
        onDuplicar={handleDuplicarProducto}
      />

      {/* Modal de Import/Export */}
      <ImportExportModal
        open={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        productos={productos}
        usuarioId={userData?.uid || 'unknown'}
      />
    </div>
  );
}
