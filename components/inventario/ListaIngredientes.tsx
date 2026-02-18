/**
 * ListaIngredientes Component
 * Old Texas BBQ - CRM
 *
 * Tabla completa de ingredientes con:
 * - Filtros por categoría, stock y búsqueda
 * - Ordenamiento por columna
 * - Paginación
 * - Indicadores visuales de stock
 * - Acciones: editar y eliminar
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Ingrediente, CategoriaIngrediente } from '@/lib/types';
import { ingredientesService } from '@/lib/services/ingredientes.service';
import { CATEGORIAS_INGREDIENTES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { FormIngrediente, FormIngredienteData } from './FormIngrediente';
import { DetalleIngrediente } from './DetalleIngrediente';
import {
  Eye,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  PackageX,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/useAuth';

type OrdenCampo = 'nombre' | 'categoria' | 'stockActual' | 'stockMinimo' | 'precioPorUnidad';
type OrdenDireccion = 'asc' | 'desc';
type FiltroStock = 'todos' | 'bajo' | 'sin_stock';

const ITEMS_POR_PAGINA = 10;

interface ListaIngredientesProps {
  onNuevoIngrediente?: () => void;
}

export function ListaIngredientes({ onNuevoIngrediente }: ListaIngredientesProps) {
  const { userData } = useAuth();

  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaIngrediente | 'todas'>('todas');
  const [stockFiltro, setStockFiltro] = useState<FiltroStock>('todos');

  // Ordenamiento
  const [ordenCampo, setOrdenCampo] = useState<OrdenCampo>('nombre');
  const [ordenDireccion, setOrdenDireccion] = useState<OrdenDireccion>('asc');

  // Paginación
  const [pagina, setPagina] = useState(1);

  // Modal detalle
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [ingredienteDetalle, setIngredienteDetalle] = useState<Ingrediente | null>(null);

  // Modal edición
  const [modalOpen, setModalOpen] = useState(false);
  const [ingredienteEditar, setIngredienteEditar] = useState<Ingrediente | undefined>();

  // Confirmación eliminación
  const [alertOpen, setAlertOpen] = useState(false);
  const [ingredienteEliminar, setIngredienteEliminar] = useState<Ingrediente | null>(null);

  // Cargar ingredientes en tiempo real
  useEffect(() => {
    setLoading(true);
    const unsubscribe = ingredientesService.onIngredientesChange((data) => {
      setIngredientes(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtrado y ordenamiento en memoria
  const ingredientesFiltrados = useMemo(() => {
    let resultado = [...ingredientes];

    // Filtro por categoría
    if (categoriaFiltro !== 'todas') {
      resultado = resultado.filter((ing) => ing.categoria === categoriaFiltro);
    }

    // Filtro por stock
    if (stockFiltro === 'sin_stock') {
      resultado = resultado.filter((ing) => ing.stockActual === 0);
    } else if (stockFiltro === 'bajo') {
      resultado = resultado.filter(
        (ing) => ing.stockActual > 0 && ing.stockActual < ing.stockMinimo
      );
    }

    // Filtro por búsqueda
    if (busqueda.trim()) {
      const term = busqueda.toLowerCase();
      resultado = resultado.filter((ing) =>
        ing.nombre.toLowerCase().includes(term) ||
        ing.categoria.toLowerCase().includes(term)
      );
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      const valA = a[ordenCampo];
      const valB = b[ordenCampo];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return ordenDireccion === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return ordenDireccion === 'asc' ? numA - numB : numB - numA;
    });

    return resultado;
  }, [ingredientes, categoriaFiltro, stockFiltro, busqueda, ordenCampo, ordenDireccion]);

  // Paginación
  const totalPaginas = Math.ceil(ingredientesFiltrados.length / ITEMS_POR_PAGINA);
  const ingredientesPagina = ingredientesFiltrados.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA
  );

  // Reset página al cambiar filtros
  useEffect(() => {
    setPagina(1);
  }, [busqueda, categoriaFiltro, stockFiltro]);

  const handleOrden = (campo: OrdenCampo) => {
    if (ordenCampo === campo) {
      setOrdenDireccion((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrdenCampo(campo);
      setOrdenDireccion('asc');
    }
  };

  const IconoOrden = ({ campo }: { campo: OrdenCampo }) => {
    if (ordenCampo !== campo)
      return <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />;
    return ordenDireccion === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  const getEstadoStock = (ing: Ingrediente) => {
    if (ing.stockActual === 0) return 'sin_stock';
    if (ing.stockActual < ing.stockMinimo) return 'bajo';
    return 'ok';
  };

  const handleVerDetalle = (ing: Ingrediente) => {
    setIngredienteDetalle(ing);
    setDetalleOpen(true);
  };

  const handleEditar = (ing: Ingrediente) => {
    setIngredienteEditar(ing);
    setModalOpen(true);
  };

  const handleEliminar = (ing: Ingrediente) => {
    setIngredienteEliminar(ing);
    setAlertOpen(true);
  };

  const confirmarEliminar = async () => {
    if (!ingredienteEliminar) return;
    try {
      await ingredientesService.deleteIngrediente(ingredienteEliminar.id);
      toast.success(`"${ingredienteEliminar.nombre}" eliminado correctamente`);
    } catch {
      toast.error('Error al eliminar el ingrediente');
    } finally {
      setAlertOpen(false);
      setIngredienteEliminar(null);
    }
  };

  const handleSubmitForm = async (data: FormIngredienteData) => {
    try {
      const proveedorId = data.proveedorId && data.proveedorId !== '__none__'
        ? data.proveedorId
        : undefined;
      const proveedorData = proveedorId
        ? { id: proveedorId, nombre: '', contacto: '' }
        : undefined;

      const payload = {
        nombre: data.nombre,
        categoria: data.categoria,
        unidadMedida: data.unidadMedida,
        precioPorUnidad: data.precioPorUnidad,
        stockActual: data.stockActual,
        stockMinimo: data.stockMinimo,
        stockMaximo: data.stockMaximo,
        ubicacion: data.ubicacion,
        lote: data.lote,
        activo: true,
        creadoPor: userData?.nombre ?? 'Sistema',
        proveedor: proveedorData,
      };

      if (ingredienteEditar) {
        await ingredientesService.updateIngrediente(ingredienteEditar.id, payload);
        toast.success('Ingrediente actualizado correctamente');
      } else {
        await ingredientesService.createIngrediente(payload as Parameters<typeof ingredientesService.createIngrediente>[0]);
        toast.success('Ingrediente creado correctamente');
      }
    } catch {
      toast.error('Error al guardar el ingrediente');
      throw new Error('Error al guardar');
    }
  };

  const categorias = Object.values(CATEGORIAS_INGREDIENTES);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Buscar ingrediente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full sm:w-64"
          />

          <Select
            value={categoriaFiltro}
            onValueChange={(val) =>
              setCategoriaFiltro(val as CategoriaIngrediente | 'todas')
            }
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={stockFiltro}
            onValueChange={(val) => setStockFiltro(val as FiltroStock)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo el stock</SelectItem>
              <SelectItem value="bajo">Stock bajo</SelectItem>
              <SelectItem value="sin_stock">Sin stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {ingredientesFiltrados.length} ingrediente
          {ingredientesFiltrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleOrden('nombre')}
              >
                <div className="flex items-center gap-1">
                  Nombre <IconoOrden campo="nombre" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleOrden('categoria')}
              >
                <div className="flex items-center gap-1">
                  Categoría <IconoOrden campo="categoria" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleOrden('stockActual')}
              >
                <div className="flex items-center justify-end gap-1">
                  Stock Actual <IconoOrden campo="stockActual" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleOrden('stockMinimo')}
              >
                <div className="flex items-center justify-end gap-1">
                  Stock Mín. <IconoOrden campo="stockMinimo" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleOrden('precioPorUnidad')}
              >
                <div className="flex items-center justify-end gap-1">
                  Precio <IconoOrden campo="precioPorUnidad" />
                </div>
              </TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredientesPagina.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  {busqueda || categoriaFiltro !== 'todas' || stockFiltro !== 'todos'
                    ? 'No se encontraron ingredientes con los filtros actuales'
                    : 'No hay ingredientes registrados. Crea el primero.'}
                </TableCell>
              </TableRow>
            ) : (
              ingredientesPagina.map((ing) => {
                const estadoStock = getEstadoStock(ing);
                return (
                  <TableRow key={ing.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {estadoStock !== 'ok' && (
                          <span title={estadoStock === 'sin_stock' ? 'Sin stock' : 'Stock bajo'}>
                            {estadoStock === 'sin_stock' ? (
                              <PackageX className="h-4 w-4 text-destructive" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                          </span>
                        )}
                        {ing.nombre}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ing.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          estadoStock === 'sin_stock'
                            ? 'font-semibold text-destructive'
                            : estadoStock === 'bajo'
                            ? 'font-semibold text-amber-600'
                            : ''
                        }
                      >
                        {ing.stockActual}
                      </span>{' '}
                      <span className="text-xs text-muted-foreground">
                        {ing.unidadMedida}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {ing.stockMinimo} {ing.unidadMedida}
                    </TableCell>
                    <TableCell className="text-right">
                      ${ing.precioPorUnidad.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {estadoStock === 'sin_stock' ? (
                        <Badge variant="destructive" className="text-xs">
                          Sin stock
                        </Badge>
                      ) : estadoStock === 'bajo' ? (
                        <Badge
                          className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100"
                          variant="outline"
                        >
                          Stock bajo
                        </Badge>
                      ) : (
                        <Badge
                          className="text-xs bg-green-100 text-green-800 hover:bg-green-100"
                          variant="outline"
                        >
                          OK
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleVerDetalle(ing)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditar(ing)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleEliminar(ing)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagina((p) => p - 1)}
              disabled={pagina === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagina((p) => p + 1)}
              disabled={pagina === totalPaginas}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {ingredienteDetalle && (
        <DetalleIngrediente
          open={detalleOpen}
          ingrediente={ingredienteDetalle}
          onClose={() => {
            setDetalleOpen(false);
            setIngredienteDetalle(null);
          }}
          onEdit={(ing) => {
            setDetalleOpen(false);
            handleEditar(ing);
          }}
        />
      )}

      {/* Modal formulario */}
      <FormIngrediente
        open={modalOpen}
        ingrediente={ingredienteEditar}
        onSubmit={handleSubmitForm}
        onClose={() => {
          setModalOpen(false);
          setIngredienteEditar(undefined);
        }}
      />

      {/* Confirmación de eliminación */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ingrediente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{ingredienteEliminar?.nombre}</strong> del
              catálogo. Esta acción se puede revertir desde la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
