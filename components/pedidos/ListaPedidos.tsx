'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { pedidosService, repartidoresService } from '@/lib/services';
import type {
  Pedido,
  EstadoPedido,
  CanalVenta,
  Repartidor,
} from '@/lib/types/firestore';
import { Timestamp } from 'firebase/firestore';
import {
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PedidoCard } from './PedidoCard';
import { PedidoDetalleModal } from './PedidoDetalleModal';
import { AsignarRepartidorModal } from './AsignarRepartidorModal';

const ESTADOS: { value: EstadoPedido | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_preparacion', label: 'En Preparación' },
  { value: 'listo', label: 'Listo' },
  { value: 'en_reparto', label: 'En Reparto' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const CANALES: { value: CanalVenta | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos los canales' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'mostrador', label: 'Mostrador' },
  { value: 'uber', label: 'Uber Eats' },
  { value: 'didi', label: 'DiDi Food' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'web', label: 'Web' },
];

const ITEMS_POR_PAGINA = 12;

export function ListaPedidos() {
  // Estados de datos
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState<Pedido[]>([]);
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAccion, setLoadingAccion] = useState(false);

  // Estados de filtros
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: 'todos' as EstadoPedido | 'todos',
    canal: 'todos' as CanalVenta | 'todos',
    repartidor: 'todos',
    fecha: '', // Vacío = todas las fechas
  });

  // Estados de paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const totalPaginas = Math.ceil(pedidosFiltrados.length / ITEMS_POR_PAGINA);

  // Estados del modal
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);

  // Estados del modal de asignar repartidor
  const [pedidoParaAsignar, setPedidoParaAsignar] = useState<Pedido | null>(null);
  const [modalAsignarOpen, setModalAsignarOpen] = useState(false);

  // Cargar datos iniciales y suscripción en tiempo real
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupRealtimeListener = async () => {
      try {
        setLoading(true);

        // Cargar repartidores una vez
        const repartidoresData = await repartidoresService.getActivos();
        setRepartidores(repartidoresData);

        // Suscribirse a cambios en tiempo real de pedidos
        unsubscribe = pedidosService.onCollectionChange(
          (pedidosData) => {
            setPedidos(pedidosData);
            setLoading(false);
          },
          {
            orderByField: 'fechaCreacion',
            orderDirection: 'desc',
            limitCount: 500,
          },
          (error) => {
            console.error('Error en listener de pedidos:', error);
            toast.error('Error al cargar los pedidos en tiempo real');
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error configurando listener:', error);
        toast.error('Error al configurar la actualización en tiempo real');
        setLoading(false);
      }
    };

    setupRealtimeListener();

    // Cleanup: desuscribirse al desmontar
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Aplicar filtros cuando cambian
  useEffect(() => {
    aplicarFiltros();
    setPaginaActual(1); // Reset a página 1 al cambiar filtros
  }, [filtros, pedidos]);

  const loadDatos = async () => {
    // Ya no es necesario recargar manualmente, el listener lo hace automáticamente
    toast.success('Los pedidos se actualizan automáticamente');
  };

  const aplicarFiltros = useCallback(() => {
    let resultados = [...pedidos];

    // Filtro por búsqueda (número de pedido, cliente o teléfono)
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase().trim();
      resultados = resultados.filter(
        (p) =>
          p.numeroPedido.toString().includes(busqueda) ||
          p.id.toLowerCase().includes(busqueda) ||
          p.cliente.nombre.toLowerCase().includes(busqueda) ||
          p.cliente.telefono.includes(busqueda)
      );
    }

    // Filtro por estado
    if (filtros.estado !== 'todos') {
      resultados = resultados.filter((p) => p.estado === filtros.estado);
    }

    // Filtro por canal
    if (filtros.canal !== 'todos') {
      resultados = resultados.filter((p) => p.canal === filtros.canal);
    }

    // Filtro por repartidor
    if (filtros.repartidor !== 'todos') {
      if (filtros.repartidor === 'sin_asignar') {
        resultados = resultados.filter((p) => !p.reparto?.repartidorId);
      } else {
        resultados = resultados.filter(
          (p) => p.reparto?.repartidorId === filtros.repartidor
        );
      }
    }

    // Filtro por fecha
    if (filtros.fecha) {
      resultados = resultados.filter((p) => {
        const fechaPedido = p.fechaCreacion.toDate().toISOString().split('T')[0];
        return fechaPedido === filtros.fecha;
      });
    }

    setPedidosFiltrados(resultados);
  }, [filtros, pedidos]);

  const handleVerDetalles = (pedido: Pedido) => {
    setPedidoSeleccionado(pedido);
    setModalOpen(true);
  };

  const handleCambiarEstado = async (
    pedidoId: string,
    nuevoEstado: EstadoPedido
  ) => {
    try {
      // Si el nuevo estado es "en_reparto", verificar que tenga repartidor asignado
      if (nuevoEstado === 'en_reparto') {
        const pedido = pedidos.find((p) => p.id === pedidoId);

        // Si no tiene repartidor asignado, mostrar modal de asignación
        if (pedido && (!pedido.reparto || !pedido.reparto.repartidorId)) {
          setPedidoParaAsignar(pedido);
          setModalAsignarOpen(true);
          return; // No continuar con el cambio de estado
        }
      }

      setLoadingAccion(true);
      await pedidosService.update(pedidoId, { estado: nuevoEstado });

      // Actualizar estado local
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoId ? { ...p, estado: nuevoEstado } : p
        )
      );

      // Actualizar pedido seleccionado si está abierto el modal
      if (pedidoSeleccionado?.id === pedidoId) {
        setPedidoSeleccionado((prev) =>
          prev ? { ...prev, estado: nuevoEstado } : null
        );
      }

      toast.success(`Pedido actualizado a: ${getEstadoLabel(nuevoEstado)}`);
    } catch (error) {
      console.error('Error actualizando estado:', error);
      toast.error('Error al actualizar el pedido');
    } finally {
      setLoadingAccion(false);
    }
  };

  const handleAsignarRepartidor = async (repartidorId: string) => {
    if (!pedidoParaAsignar) return;

    try {
      setLoadingAccion(true);

      // Obtener información del repartidor
      const repartidor = repartidores.find((r) => r.id === repartidorId);
      if (!repartidor) {
        toast.error('Repartidor no encontrado');
        return;
      }

      // Asignar repartidor usando el método del servicio
      await pedidosService.asignarRepartidor(
        pedidoParaAsignar.id,
        repartidor.id,
        `${repartidor.nombre} ${repartidor.apellido}`,
        repartidor.comisionPorDefecto,
        'sistema', // TODO: Obtener usuarioId del contexto
        'Sistema'  // TODO: Obtener usuarioNombre del contexto
      );

      // Cambiar estado a "en_reparto"
      await pedidosService.update(pedidoParaAsignar.id, {
        estado: 'en_reparto' as const,
      } as any);

      // Actualizar estado local
      const repartoData = {
        repartidorId: repartidor.id,
        repartidorNombre: `${repartidor.nombre} ${repartidor.apellido}`,
        comisionRepartidor: repartidor.comisionPorDefecto,
        estadoReparto: 'asignado' as const,
        horaAsignacion: Timestamp.now(),
        liquidado: false,
      };

      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoParaAsignar.id
            ? {
                ...p,
                estado: 'en_reparto' as const,
                reparto: repartoData,
              }
            : p
        )
      );

      toast.success(
        `Repartidor asignado y pedido enviado a reparto correctamente`
      );

      // Cerrar modal
      setModalAsignarOpen(false);
      setPedidoParaAsignar(null);
    } catch (error) {
      console.error('Error asignando repartidor:', error);
      toast.error('Error al asignar el repartidor');
    } finally {
      setLoadingAccion(false);
    }
  };

  const getEstadoLabel = (estado: EstadoPedido) => {
    const labels: Record<EstadoPedido, string> = {
      pendiente: 'Pendiente',
      en_preparacion: 'En Preparación',
      listo: 'Listo',
      en_reparto: 'En Reparto',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
    };
    return labels[estado];
  };

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      estado: 'todos',
      canal: 'todos',
      repartidor: 'todos',
      fecha: '',
    });
  };

  // Obtener pedidos de la página actual
  const pedidosPaginados = pedidosFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  if (loading) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando pedidos...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <div className="space-y-2 lg:col-span-1">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="# Pedido, ID, cliente..."
                value={filtros.busqueda}
                onChange={(e) =>
                  setFiltros({ ...filtros, busqueda: e.target.value })
                }
                className="pl-10"
              />
            </div>
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={filtros.estado}
              onValueChange={(value) =>
                setFiltros({ ...filtros, estado: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((estado) => (
                  <SelectItem key={estado.value} value={estado.value}>
                    {estado.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Canal */}
          <div className="space-y-2">
            <Label>Canal</Label>
            <Select
              value={filtros.canal}
              onValueChange={(value) =>
                setFiltros({ ...filtros, canal: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANALES.map((canal) => (
                  <SelectItem key={canal.value} value={canal.value}>
                    {canal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Repartidor */}
          <div className="space-y-2">
            <Label>Repartidor</Label>
            <Select
              value={filtros.repartidor}
              onValueChange={(value) =>
                setFiltros({ ...filtros, repartidor: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                {repartidores.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id}>
                    {rep.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={filtros.fecha}
              onChange={(e) =>
                setFiltros({ ...filtros, fecha: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {pedidosFiltrados.length} pedido(s) encontrado(s)
            </p>
            {(filtros.busqueda ||
              filtros.estado !== 'todos' ||
              filtros.canal !== 'todos' ||
              filtros.repartidor !== 'todos' ||
              filtros.fecha) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={limpiarFiltros}
                className="text-muted-foreground"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDatos}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </Card>

      {/* Lista de Pedidos */}
      {pedidosFiltrados.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Package className="h-16 w-16 text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-semibold">No hay pedidos</h3>
              <p className="text-sm text-muted-foreground">
                No se encontraron pedidos con los filtros seleccionados
              </p>
            </div>
            <Button variant="outline" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Grid de pedidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pedidosPaginados.map((pedido) => (
              <PedidoCard
                key={pedido.id}
                pedido={pedido}
                onVerDetalles={handleVerDetalles}
                onCambiarEstado={handleCambiarEstado}
                loadingAccion={loadingAccion}
              />
            ))}
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(paginaActual - 1) * ITEMS_POR_PAGINA + 1} -{' '}
                  {Math.min(paginaActual * ITEMS_POR_PAGINA, pedidosFiltrados.length)} de{' '}
                  {pedidosFiltrados.length} pedidos
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                      let pageNum: number;
                      if (totalPaginas <= 5) {
                        pageNum = i + 1;
                      } else if (paginaActual <= 3) {
                        pageNum = i + 1;
                      } else if (paginaActual >= totalPaginas - 2) {
                        pageNum = totalPaginas - 4 + i;
                      } else {
                        pageNum = paginaActual - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={paginaActual === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPaginaActual(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPaginaActual((p) => Math.min(totalPaginas, p + 1))
                    }
                    disabled={paginaActual === totalPaginas}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal de detalles */}
      <PedidoDetalleModal
        pedido={pedidoSeleccionado}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPedidoSeleccionado(null);
        }}
        onCambiarEstado={handleCambiarEstado}
      />

      {/* Modal de asignar repartidor */}
      {pedidoParaAsignar && (
        <AsignarRepartidorModal
          open={modalAsignarOpen}
          onClose={() => {
            setModalAsignarOpen(false);
            setPedidoParaAsignar(null);
          }}
          onAsignar={handleAsignarRepartidor}
          repartidores={repartidores}
          numeroPedido={pedidoParaAsignar.numeroPedido}
          loading={loadingAccion}
        />
      )}
    </div>
  );
}
