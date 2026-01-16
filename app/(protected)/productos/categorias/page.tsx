/**
 * Página de Gestión de Categorías
 * Old Texas BBQ - CRM
 *
 * Acceso: Admin y Encargado
 * Características:
 * - CRUD completo de categorías
 * - Drag & drop para reordenar
 * - Ver cantidad de productos por categoría
 * - Validación de categorías con productos antes de eliminar
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { useRouter } from 'next/navigation';
import { categoriasService } from '@/lib/services/categorias.service';
import { productosService } from '@/lib/services/productos.service';
import { Categoria } from '@/lib/types/firestore';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CategoriaModal } from '@/components/categorias/CategoriaModal';
import {
  Plus,
  GripVertical,
  Edit,
  Trash2,
  Package,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CategoriaConProductos extends Categoria {
  cantidadProductos: number;
}

// Componente de fila sortable
function CategoriaRow({
  categoria,
  onEdit,
  onDelete,
  onToggleActiva,
}: {
  categoria: CategoriaConProductos;
  onEdit: (categoria: Categoria) => void;
  onDelete: (id: string, nombre: string, cantidadProductos: number) => void;
  onToggleActiva: (id: string, activa: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoria.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:shadow-md transition-all"
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Color */}
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: categoria.color || '#3b82f6' }}
      />

      {/* Información */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{categoria.nombre}</h3>
          <Badge variant="outline" className="gap-1">
            <Package className="h-3 w-3" />
            {categoria.cantidadProductos}
          </Badge>
        </div>
        {categoria.descripcion && (
          <p className="text-sm text-muted-foreground truncate">
            {categoria.descripcion}
          </p>
        )}
      </div>

      {/* Orden */}
      <div className="text-sm text-muted-foreground">
        Orden: {categoria.orden}
      </div>

      {/* Estado */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Activa</span>
        <Switch
          checked={categoria.activa}
          onCheckedChange={(checked) => onToggleActiva(categoria.id, checked)}
        />
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(categoria)}
          title="Editar categoría"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            onDelete(categoria.id, categoria.nombre, categoria.cantidadProductos)
          }
          title="Eliminar categoría"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export default function CategoriasPage() {
  const { userData } = useAuth();
  const router = useRouter();

  const [categorias, setCategorias] = useState<CategoriaConProductos[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [categoriaEditar, setCategoriaEditar] = useState<Categoria | undefined>(
    undefined
  );

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Verificar permisos
  useEffect(() => {
    if (userData && userData.rol !== 'admin' && userData.rol !== 'encargado') {
      toast.error('No tienes permisos para acceder a esta página');
      router.push('/dashboard');
    }
  }, [userData, router]);

  // Cargar categorías y productos
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [categoriasData, productosData] = await Promise.all([
          categoriasService.getAll({
            orderByField: 'orden',
            orderDirection: 'asc',
          }),
          productosService.getAll(),
        ]);

        // Contar productos por categoría
        const categoriasConProductos: CategoriaConProductos[] =
          categoriasData.map((categoria) => ({
            ...categoria,
            cantidadProductos: productosData.filter(
              (p) => p.categoriaId === categoria.id
            ).length,
          }));

        setCategorias(categoriasConProductos);
      } catch (error) {
        console.error('Error cargando datos:', error);
        toast.error('Error al cargar categorías');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Handlers
  const handleNuevaCategoria = () => {
    setCategoriaEditar(undefined);
    setModalOpen(true);
  };

  const handleEditarCategoria = (categoria: Categoria) => {
    setCategoriaEditar(categoria);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setCategoriaEditar(undefined);
  };

  const handleModalSuccess = async () => {
    // Recargar datos
    try {
      const [categoriasData, productosData] = await Promise.all([
        categoriasService.getAll({
          orderByField: 'orden',
          orderDirection: 'asc',
        }),
        productosService.getAll(),
      ]);

      const categoriasConProductos: CategoriaConProductos[] =
        categoriasData.map((categoria) => ({
          ...categoria,
          cantidadProductos: productosData.filter(
            (p) => p.categoriaId === categoria.id
          ).length,
        }));

      setCategorias(categoriasConProductos);
    } catch (error) {
      console.error('Error recargando datos:', error);
    }
  };

  const handleToggleActiva = async (id: string, activa: boolean) => {
    try {
      await categoriasService.toggleActiva(id, activa);
      toast.success(`Categoría ${activa ? 'activada' : 'desactivada'}`);

      // Actualizar estado local
      setCategorias((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, activa } : cat))
      );
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error('Error al cambiar estado de la categoría');
    }
  };

  const handleEliminarCategoria = async (
    id: string,
    nombre: string,
    cantidadProductos: number
  ) => {
    if (cantidadProductos > 0) {
      toast.error(
        `No se puede eliminar la categoría "${nombre}" porque tiene ${cantidadProductos} productos asociados`
      );
      return;
    }

    if (
      !confirm(
        `¿Estás seguro de eliminar la categoría "${nombre}"?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      await categoriasService.delete(id);
      toast.success('Categoría eliminada correctamente');

      // Actualizar estado local
      setCategorias((prev) => prev.filter((cat) => cat.id !== id));
    } catch (error: any) {
      console.error('Error eliminando categoría:', error);
      toast.error(error.message || 'Error al eliminar la categoría');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = categorias.findIndex((cat) => cat.id === active.id);
    const newIndex = categorias.findIndex((cat) => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Actualizar orden local inmediatamente para feedback visual
    const newCategorias = arrayMove(categorias, oldIndex, newIndex);

    // Actualizar orden numérico
    const categoriasConNuevoOrden = newCategorias.map((cat, index) => ({
      ...cat,
      orden: index,
    }));

    setCategorias(categoriasConNuevoOrden);

    // Guardar en Firestore
    try {
      const updates = categoriasConNuevoOrden.map((cat) => ({
        id: cat.id,
        orden: cat.orden,
      }));

      await categoriasService.reordenar(updates);
      toast.success('Orden actualizado correctamente');
    } catch (error) {
      console.error('Error actualizando orden:', error);
      toast.error('Error al actualizar el orden');
      // Recargar para revertir cambios
      handleModalSuccess();
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
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/productos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Gestión de Categorías
            </h1>
            <p className="text-muted-foreground mt-1">
              {categorias.length} categorías en total
            </p>
          </div>
          <Button size="lg" className="gap-2" onClick={handleNuevaCategoria}>
            <Plus className="h-5 w-5" />
            Nueva Categoría
          </Button>
        </div>

        {/* Info */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Arrastra las categorías para reordenarlas.
            El orden afecta cómo se muestran en el selector de productos.
          </p>
        </div>
      </div>

      {/* Lista de categorías con drag & drop */}
      {categorias.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            No hay categorías creadas aún
          </p>
          <Button onClick={handleNuevaCategoria}>
            <Plus className="h-4 w-4 mr-2" />
            Crear primera categoría
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={categorias.map((cat) => cat.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {categorias.map((categoria) => (
                <CategoriaRow
                  key={categoria.id}
                  categoria={categoria}
                  onEdit={handleEditarCategoria}
                  onDelete={handleEliminarCategoria}
                  onToggleActiva={handleToggleActiva}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modal */}
      <CategoriaModal
        open={modalOpen}
        onClose={handleCloseModal}
        categoria={categoriaEditar}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
