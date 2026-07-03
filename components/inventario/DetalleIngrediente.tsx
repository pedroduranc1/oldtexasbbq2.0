/**
 * DetalleIngrediente Component
 * Old Texas BBQ - CRM
 *
 * Modal con información completa de un ingrediente:
 * - Datos del ingrediente
 * - Gráfica de movimientos recientes (7 días)
 * - Historial de compras
 * - Consumo promedio y proyección de stock
 * - Registro rápido de movimiento
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Ingrediente, MovimientoInventario, TipoMovimiento } from '@/lib/types';
import { movimientosService } from '@/lib/services/movimientos.service';
import { useAuth } from '@/lib/auth/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingDown,
  TrendingUp,
  Package2,
  Calendar,
  MapPin,
  Tag,
  DollarSign,
  AlertTriangle,
  Clock,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

interface DetalleIngredienteProps {
  open: boolean;
  ingrediente: Ingrediente | null;
  onClose: () => void;
  onEdit?: (ingrediente: Ingrediente) => void;
}

type TipoMovimientoRapido = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'MERMA';

const COLORES_TIPO: Record<TipoMovimiento, string> = {
  ENTRADA: 'bg-green-100 text-green-800',
  SALIDA: 'bg-red-100 text-red-800',
  AJUSTE: 'bg-blue-100 text-blue-800',
  MERMA: 'bg-orange-100 text-orange-800',
  TRASPASO: 'bg-purple-100 text-purple-800',
  VENTA: 'bg-gray-100 text-gray-800',
};

export function DetalleIngrediente({
  open,
  ingrediente,
  onClose,
  onEdit,
}: DetalleIngredienteProps) {
  const { userData } = useAuth();

  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [consumo, setConsumo] = useState<{
    consumoTotal: number;
    consumoPromedioDiario: number;
    movimientosAnalizados: number;
  } | null>(null);
  const [proyeccion, setProyeccion] = useState<{
    diasRestantes: number;
    stockActual: number;
    consumoPromedioDiario: number;
  } | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Estado formulario de movimiento rápido
  const [tipoMov, setTipoMov] = useState<TipoMovimientoRapido>('ENTRADA');
  const [cantidad, setCantidad] = useState('');
  const [nuevoStock, setNuevoStock] = useState('');
  const [motivo, setMotivo] = useState('');
  const [costoUnitario, setCostoUnitario] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !ingrediente) return;

    const cargarDatos = async () => {
      setLoadingData(true);
      try {
        const [movs, cons, proy] = await Promise.all([
          movimientosService.getMovimientosByIngrediente(ingrediente.id),
          movimientosService.calcularConsumoPromedio(ingrediente.id, 30),
          movimientosService.proyectarDiasStock(ingrediente.id),
        ]);
        setMovimientos(movs.slice(0, 30));
        setConsumo(cons);
        setProyeccion(proy);
      } catch {
        // silencioso — los datos son opcionales
      } finally {
        setLoadingData(false);
      }
    };

    cargarDatos();
  }, [open, ingrediente]);

  // Gráfica: últimos 7 días de movimientos
  const chartData = useMemo(() => {
    const days: Record<string, { fecha: string; Entradas: number; Salidas: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = {
        fecha: `${d.getDate()}/${d.getMonth() + 1}`,
        Entradas: 0,
        Salidas: 0,
      };
    }
    movimientos.forEach((mov) => {
      const key =
        mov.fecha instanceof Date
          ? mov.fecha.toISOString().split('T')[0]
          : '';
      if (days[key]) {
        if (mov.tipo === 'ENTRADA') {
          days[key].Entradas += mov.cantidad;
        } else if (['SALIDA', 'VENTA', 'MERMA'].includes(mov.tipo)) {
          days[key].Salidas += mov.cantidad;
        }
      }
    });
    return Object.values(days);
  }, [movimientos]);

  // Historial de compras
  const historialCompras = useMemo(
    () => movimientos.filter((m) => m.tipo === 'ENTRADA').slice(0, 5),
    [movimientos]
  );

  const resetForm = () => {
    setCantidad('');
    setNuevoStock('');
    setMotivo('');
    setCostoUnitario(0);
    setTipoMov('ENTRADA');
  };

  const handleMovimientoRapido = async () => {
    if (!ingrediente || !userData) return;

    const datosBase = {
      motivo: motivo || `${tipoMov} rápido`,
      usuarioId: userData.id,
      usuarioNombre: userData.nombre,
    };

    try {
      setSubmitting(true);

      if (tipoMov === 'AJUSTE') {
        const ns = parseFloat(nuevoStock);
        if (isNaN(ns) || ns < 0) {
          toast.error('Ingresa un stock válido');
          return;
        }
        await movimientosService.registrarAjuste(ingrediente.id, ns, datosBase);
      } else {
        const cant = parseFloat(cantidad);
        if (isNaN(cant) || cant <= 0) {
          toast.error('Ingresa una cantidad válida');
          return;
        }

        if (tipoMov === 'ENTRADA') {
          await movimientosService.registrarEntrada(ingrediente.id, cant, {
            ...datosBase,
            costoUnitario: costoUnitario > 0 ? costoUnitario : undefined,
          });
        } else if (tipoMov === 'SALIDA') {
          await movimientosService.registrarSalida(ingrediente.id, cant, datosBase);
        } else if (tipoMov === 'MERMA') {
          await movimientosService.registrarMerma(ingrediente.id, cant, datosBase);
        }
      }

      toast.success('Movimiento registrado correctamente');
      resetForm();

      // Recargar datos
      const [movs, cons, proy] = await Promise.all([
        movimientosService.getMovimientosByIngrediente(ingrediente.id),
        movimientosService.calcularConsumoPromedio(ingrediente.id, 30),
        movimientosService.proyectarDiasStock(ingrediente.id),
      ]);
      setMovimientos(movs.slice(0, 30));
      setConsumo(cons);
      setProyeccion(proy);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar movimiento';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!ingrediente) return null;

  const estadoStock =
    ingrediente.stockActual === 0
      ? 'sin_stock'
      : ingrediente.stockActual < ingrediente.stockMinimo
      ? 'bajo'
      : 'ok';

  const diasRestantes = proyeccion?.diasRestantes;
  const alertaDias = diasRestantes !== undefined && diasRestantes < 7;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-xl">{ingrediente.nombre}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {ingrediente.categoria}
                </Badge>
                {estadoStock === 'sin_stock' && (
                  <Badge variant="destructive" className="text-xs">
                    Sin stock
                  </Badge>
                )}
                {estadoStock === 'bajo' && (
                  <Badge className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100">
                    Stock bajo
                  </Badge>
                )}
              </div>
            </div>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(ingrediente)}
              >
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
            <TabsTrigger value="analisis">Análisis</TabsTrigger>
          </TabsList>

          {/* ---- TAB: INFORMACIÓN ---- */}
          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Grid de stats principales */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Stock Actual</p>
                <p
                  className={`text-xl font-bold ${
                    estadoStock === 'sin_stock'
                      ? 'text-destructive'
                      : estadoStock === 'bajo'
                      ? 'text-amber-600'
                      : 'text-green-600'
                  }`}
                >
                  {ingrediente.stockActual}
                  <span className="text-sm font-normal ml-1">
                    {ingrediente.unidadMedida}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Stock Mínimo</p>
                <p className="text-xl font-bold">
                  {ingrediente.stockMinimo}
                  <span className="text-sm font-normal ml-1">
                    {ingrediente.unidadMedida}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Precio / Unidad</p>
                <p className="text-xl font-bold text-primary">
                  ${ingrediente.precioPorUnidad.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Detalles */}
            <div className="space-y-2 text-sm">
              {ingrediente.proveedor && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Proveedor:</strong> {ingrediente.proveedor.nombre}
                  </span>
                </div>
              )}
              {ingrediente.ubicacion && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Ubicación:</strong> {ingrediente.ubicacion}
                  </span>
                </div>
              )}
              {ingrediente.lote && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Lote:</strong> {ingrediente.lote}
                  </span>
                </div>
              )}
              {ingrediente.fechaVencimiento && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Vencimiento:</strong>{' '}
                    {new Date(ingrediente.fechaVencimiento).toLocaleDateString('es-MX')}
                  </span>
                </div>
              )}
              {ingrediente.ultimaCompra && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Última compra:</strong>{' '}
                    {ingrediente.ultimaCompra.cantidad} {ingrediente.unidadMedida} —{' '}
                    {new Date(ingrediente.ultimaCompra.fecha).toLocaleDateString('es-MX')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Actualizado:</strong>{' '}
                  {ingrediente.ultimaActualizacion
                    ? new Date(ingrediente.ultimaActualizacion).toLocaleDateString('es-MX')
                    : '—'}
                </span>
              </div>
            </div>

            {/* Registrar movimiento rápido */}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-semibold">Registrar movimiento rápido</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={tipoMov}
                    onValueChange={(v) => {
                      setTipoMov(v as TipoMovimientoRapido);
                      setCantidad('');
                      setNuevoStock('');
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENTRADA">Entrada</SelectItem>
                      <SelectItem value="SALIDA">Salida</SelectItem>
                      <SelectItem value="AJUSTE">Ajuste de stock</SelectItem>
                      <SelectItem value="MERMA">Merma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {tipoMov === 'AJUSTE' ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Nuevo stock ({ingrediente.unidadMedida})</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Stock real"
                      className="h-8 text-xs"
                      value={nuevoStock}
                      onChange={(e) => setNuevoStock(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs">Cantidad ({ingrediente.unidadMedida})</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0"
                      className="h-8 text-xs"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Motivo</Label>
                  <Input
                    placeholder="Motivo del movimiento"
                    className="h-8 text-xs"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                </div>
                {tipoMov === 'ENTRADA' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Costo unitario (opcional)</Label>
                    <CurrencyInput
                      className="h-8 text-xs"
                      value={costoUnitario}
                      onValueChange={setCostoUnitario}
                    />
                  </div>
                )}
              </div>

              <Button
                size="sm"
                className="w-full"
                onClick={handleMovimientoRapido}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Spinner className="h-3 w-3 mr-2" />
                    Registrando...
                  </>
                ) : (
                  'Registrar movimiento'
                )}
              </Button>
            </div>
          </TabsContent>

          {/* ---- TAB: MOVIMIENTOS ---- */}
          <TabsContent value="movimientos" className="space-y-4 mt-4">
            {loadingData ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-6 w-6" />
              </div>
            ) : (
              <>
                {/* Gráfica últimos 7 días */}
                <div>
                  <p className="text-sm font-medium mb-2">Últimos 7 días</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="Entradas" fill="#22c55e" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Salidas" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla historial */}
                <div>
                  <p className="text-sm font-medium mb-2">Historial reciente</p>
                  {movimientos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sin movimientos registrados
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {movimientos.slice(0, 10).map((mov) => (
                        <div
                          key={mov.id}
                          className="flex items-center justify-between text-xs py-1.5 border-b last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-xs px-1.5 py-0 ${COLORES_TIPO[mov.tipo]}`}
                              variant="outline"
                            >
                              {mov.tipo}
                            </Badge>
                            <span className="text-muted-foreground">{mov.motivo}</span>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <span
                              className={
                                ['SALIDA', 'MERMA', 'VENTA'].includes(mov.tipo)
                                  ? 'text-destructive'
                                  : 'text-green-600'
                              }
                            >
                              {['SALIDA', 'MERMA', 'VENTA'].includes(mov.tipo) ? '-' : '+'}
                              {mov.cantidad} {mov.unidadMedida}
                            </span>
                            <span className="text-muted-foreground w-16">
                              {mov.fecha instanceof Date
                                ? mov.fecha.toLocaleDateString('es-MX', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })
                                : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* ---- TAB: ANÁLISIS ---- */}
          <TabsContent value="analisis" className="space-y-4 mt-4">
            {loadingData ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-6 w-6" />
              </div>
            ) : (
              <>
                {/* Consumo promedio */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Consumo mensual</p>
                    </div>
                    <p className="text-lg font-bold">
                      {consumo?.consumoTotal.toFixed(1) ?? '—'}
                      <span className="text-sm font-normal ml-1">
                        {ingrediente.unidadMedida}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {consumo?.movimientosAnalizados ?? 0} movimientos analizados
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Consumo diario</p>
                    </div>
                    <p className="text-lg font-bold">
                      {consumo?.consumoPromedioDiario.toFixed(2) ?? '—'}
                      <span className="text-sm font-normal ml-1">
                        {ingrediente.unidadMedida}/día
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">Promedio últimos 30 días</p>
                  </div>
                </div>

                {/* Proyección */}
                <div
                  className={`rounded-lg border p-4 ${
                    alertaDias
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {alertaDias && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    <p className="text-sm font-semibold">Proyección de stock</p>
                  </div>

                  {proyeccion ? (
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>Días restantes:</strong>{' '}
                        <span
                          className={
                            alertaDias ? 'text-amber-600 font-bold' : 'font-bold'
                          }
                        >
                          {proyeccion.diasRestantes >= 999
                            ? 'Sin consumo registrado'
                            : `${proyeccion.diasRestantes} días`}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Con el consumo promedio actual de{' '}
                        {proyeccion.consumoPromedioDiario.toFixed(2)}{' '}
                        {ingrediente.unidadMedida}/día
                      </p>
                      {alertaDias && (
                        <p className="text-amber-600 text-xs mt-1">
                          ⚠️ Considera hacer un pedido pronto
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hay suficiente historial para calcular proyección
                    </p>
                  )}
                </div>

                {/* Historial de compras */}
                <div>
                  <p className="text-sm font-semibold mb-2">Historial de compras</p>
                  {historialCompras.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin compras registradas
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {historialCompras.map((mov) => (
                        <div
                          key={mov.id}
                          className="flex items-center justify-between text-xs py-1.5 border-b last:border-0"
                        >
                          <div>
                            <p className="font-medium">
                              +{mov.cantidad} {mov.unidadMedida}
                            </p>
                            {mov.proveedor && (
                              <p className="text-muted-foreground">{mov.proveedor.nombre}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {mov.costoUnitario && (
                              <p className="font-medium">
                                ${(mov.costoUnitario * mov.cantidad).toFixed(2)}
                              </p>
                            )}
                            <p className="text-muted-foreground">
                              {mov.fecha instanceof Date
                                ? mov.fecha.toLocaleDateString('es-MX')
                                : '—'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
