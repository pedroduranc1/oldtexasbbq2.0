'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Download, Filter, Upload, TrendingDown, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Turno, TipoTurno } from '@/lib/types/firestore';
import { turnosService } from '@/lib/services/turnos.service';
import { TIPOS_TURNO } from '@/lib/utils/constants';
import { ImportarCSV } from '@/components/caja/ImportarCSV';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DetallesTurnoModal } from './DetallesTurnoModal';
import { exportarCortePDF } from '@/lib/utils/pdf-export';
import { useJustificarDescuadre } from '@/lib/hooks/useCaja';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export function CorteCaja() {
  const { userData } = useAuthStore();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [turnosFiltrados, setTurnosFiltrados] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Modal de justificación
  const [turnoAJustificar, setTurnoAJustificar] = useState<Turno | null>(null);
  const [textoJustificacion, setTextoJustificacion] = useState('');
  const { mutate: justificar, isPending: justificando } = useJustificarDescuadre();

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [tipoTurno, setTipoTurno] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarImport, setMostrarImport] = useState(false);

  // Cargar turnos cerrados
  useEffect(() => {
    cargarTurnos();
  }, []);

  const cargarTurnos = async () => {
    try {
      setLoading(true);
      // Obtener todos los turnos cerrados
      const turnosCerrados = await turnosService.search([
        { field: 'estado', operator: '==', value: 'cerrado' },
      ]);

      // Ordenar por fecha descendente (más recientes primero)
      turnosCerrados.sort((a, b) => {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });

      setTurnos(turnosCerrados);
      setTurnosFiltrados(turnosCerrados);
    } catch (error) {
      console.error('Error cargando turnos:', error);
      toast.error('Error al cargar los turnos cerrados');
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  useEffect(() => {
    let resultado = [...turnos];

    // Filtro por fecha desde
    if (fechaDesde) {
      resultado = resultado.filter((t) => t.fecha >= fechaDesde);
    }

    // Filtro por fecha hasta
    if (fechaHasta) {
      resultado = resultado.filter((t) => t.fecha <= fechaHasta);
    }

    // Filtro por tipo de turno
    if (tipoTurno !== 'todos') {
      resultado = resultado.filter((t) => t.tipo === tipoTurno);
    }

    // Búsqueda por cajero
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      resultado = resultado.filter(
        (t) =>
          t.cajeroNombre.toLowerCase().includes(busquedaLower) ||
          t.corte?.cerradoPorNombre?.toLowerCase().includes(busquedaLower)
      );
    }

    setTurnosFiltrados(resultado);
  }, [fechaDesde, fechaHasta, tipoTurno, busqueda, turnos]);

  const handleJustificar = () => {
    if (!turnoAJustificar || !userData) return;
    if (!textoJustificacion.trim()) {
      toast.error('La justificación no puede estar vacía');
      return;
    }
    justificar(
      {
        turnoId: turnoAJustificar.id,
        justificacion: textoJustificacion.trim(),
        justificadoPor: `${userData.nombre} ${userData.apellido}`,
      },
      {
        onSuccess: () => {
          toast.success('Justificación guardada');
          setTurnoAJustificar(null);
          setTextoJustificacion('');
          cargarTurnos(); // refrescar la lista
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Error al guardar'),
      }
    );
  };

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setTipoTurno('todos');
    setBusqueda('');
  };

  // Atajos de rango de fecha — el caso de uso más frecuente de esta pantalla
  // es "hoy", "esta semana" o "este mes", no elegir dos fechas a mano.
  const aplicarRango = (desde: Date, hasta: Date) => {
    setFechaDesde(format(desde, 'yyyy-MM-dd'));
    setFechaHasta(format(hasta, 'yyyy-MM-dd'));
  };
  const rangoHoy = () => aplicarRango(new Date(), new Date());
  const rangoAyer = () => aplicarRango(subDays(new Date(), 1), subDays(new Date(), 1));
  const rangoEstaSemana = () =>
    aplicarRango(startOfWeek(new Date(), { weekStartsOn: 1 }), endOfWeek(new Date(), { weekStartsOn: 1 }));
  const rangoEsteMes = () => aplicarRango(startOfMonth(new Date()), endOfMonth(new Date()));

  const verDetalles = (turno: Turno) => {
    setTurnoSeleccionado(turno);
    setModalAbierto(true);
  };

  const exportarPDF = async (turno: Turno) => {
    try {
      await exportarCortePDF(turno);
      toast.success('PDF exportado correctamente');
    } catch (error) {
      console.error('Error exportando PDF:', error);
      toast.error('Error al exportar PDF');
    }
  };

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(monto);
  };

  const formatearFecha = (fecha: string) => {
    return format(new Date(fecha), "dd 'de' MMMM, yyyy", { locale: es });
  };

  const formatearHora = (timestamp: any) => {
    if (!timestamp) return '-';
    const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(fecha, 'HH:mm', { locale: es });
  };

  // ── Estadísticas del periodo filtrado ────────────────────────────────────
  const totalVentas = turnosFiltrados.reduce((s, t) => s + (t.resumen.totalVentas ?? 0), 0);
  const totalFaltantes = turnosFiltrados.reduce((s, t) => {
    const d = t.corte?.diferencia ?? 0;
    return d < 0 ? s + Math.abs(d) : s;
  }, 0);
  const totalSobrantes = turnosFiltrados.reduce((s, t) => {
    const d = t.corte?.diferencia ?? 0;
    return d > 0 ? s + d : s;
  }, 0);
  const perdidaNeta = totalSobrantes - totalFaltantes;
  const turnosConDescuadre = turnosFiltrados.filter((t) => Math.abs(t.corte?.diferencia ?? 0) >= 50).length;
  const tasaDescuadre = turnosFiltrados.length > 0
    ? Math.round((turnosConDescuadre / turnosFiltrados.length) * 100)
    : 0;

  // Descuadre por cajero (quién cierra)
  const descuadrePorCajero: Record<string, { turnos: number; faltante: number; sobrante: number }> = {};
  turnosFiltrados.forEach((t) => {
    const nombre = t.corte?.cerradoPorNombre ?? t.cajeroNombre ?? 'Desconocido';
    if (!descuadrePorCajero[nombre]) descuadrePorCajero[nombre] = { turnos: 0, faltante: 0, sobrante: 0 };
    descuadrePorCajero[nombre].turnos++;
    const d = t.corte?.diferencia ?? 0;
    if (d < 0) descuadrePorCajero[nombre].faltante += Math.abs(d);
    else if (d > 0) descuadrePorCajero[nombre].sobrante += d;
  });

  return (
    <div className="space-y-6">
      {/* Botón importar CSV */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMostrarImport((v) => !v)}
        >
          <Upload className="h-4 w-4 mr-2" />
          {mostrarImport ? 'Ocultar importador' : 'Importar CSV de Loyverse'}
        </Button>
      </div>

      {/* Importador CSV — visible cuando se abre */}
      {mostrarImport && <ImportarCSV />}

      {/* Filtros */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Filtros</h3>
          </div>

          {/* Atajos de rango — cubren el caso de uso más común sin tocar los date pickers */}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={rangoHoy}>Hoy</Button>
            <Button variant="secondary" size="sm" onClick={rangoAyer}>Ayer</Button>
            <Button variant="secondary" size="sm" onClick={rangoEstaSemana}>Esta semana</Button>
            <Button variant="secondary" size="sm" onClick={rangoEsteMes}>Este mes</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Fecha Desde */}
            <div className="space-y-2">
              <Label htmlFor="fecha-desde">Desde</Label>
              <Input
                id="fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            {/* Fecha Hasta */}
            <div className="space-y-2">
              <Label htmlFor="fecha-hasta">Hasta</Label>
              <Input
                id="fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>

            {/* Tipo de Turno */}
            <div className="space-y-2">
              <Label htmlFor="tipo-turno">Tipo de Turno</Label>
              <Select value={tipoTurno} onValueChange={setTipoTurno}>
                <SelectTrigger id="tipo-turno">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="matutino">Matutino</SelectItem>
                  <SelectItem value="vespertino">Vespertino</SelectItem>
                  <SelectItem value="nocturno">Nocturno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Búsqueda */}
            <div className="space-y-2">
              <Label htmlFor="busqueda">Buscar Cajero</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="busqueda"
                  placeholder="Nombre del cajero..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={limpiarFiltros}>
              Limpiar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Tarjeta resumen del periodo */}
      {turnosFiltrados.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Turnos</p>
            <p className="text-2xl font-bold mt-1">{turnosFiltrados.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Ventas totales</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatearMoneda(totalVentas)}</p>
          </Card>
          <Card className={`p-4 ${perdidaNeta < 0 ? 'border-destructive/40' : ''}`}>
            <p className="text-xs text-muted-foreground">Pérdida / ganancia neta</p>
            <p className={`text-2xl font-bold mt-1 ${perdidaNeta < 0 ? 'text-destructive' : perdidaNeta > 0 ? 'text-blue-600' : 'text-green-600'}`}>
              {perdidaNeta > 0 ? '+' : ''}{formatearMoneda(perdidaNeta)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Faltantes {formatearMoneda(totalFaltantes)} · Sobrantes {formatearMoneda(totalSobrantes)}
            </p>
          </Card>
          <Card className={`p-4 ${tasaDescuadre > 30 ? 'border-amber-500/40' : ''}`}>
            <p className="text-xs text-muted-foreground">Tasa de descuadre</p>
            <p className={`text-2xl font-bold mt-1 ${tasaDescuadre > 30 ? 'text-amber-600' : 'text-green-600'}`}>
              {tasaDescuadre}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {turnosConDescuadre} de {turnosFiltrados.length} turnos ≥ $50
            </p>
          </Card>
        </div>
      )}

      {/* Resumen por cajero */}
      {turnosFiltrados.length > 0 && Object.keys(descuadrePorCajero).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Descuadre por cajero (quién cierra)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(descuadrePorCajero).map(([nombre, stats]) => (
                <div key={nombre} className="flex flex-col gap-0.5 p-3 rounded-lg bg-muted/50 text-sm min-w-40">
                  <span className="font-medium truncate">{nombre}</span>
                  <span className="text-xs text-muted-foreground">{stats.turnos} turno(s)</span>
                  {stats.faltante > 0 && (
                    <span className="text-xs text-destructive">Faltante: {formatearMoneda(stats.faltante)}</span>
                  )}
                  {stats.sobrante > 0 && (
                    <span className="text-xs text-blue-600">Sobrante: {formatearMoneda(stats.sobrante)}</span>
                  )}
                  {stats.faltante === 0 && stats.sobrante === 0 && (
                    <span className="text-xs text-green-600">Sin descuadres</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Turnos */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Turnos Cerrados</h3>
            <p className="text-sm text-muted-foreground">
              {turnosFiltrados.length} turnos encontrados
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : turnosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron turnos cerrados con los filtros seleccionados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Abierto por</TableHead>
                  <TableHead>Cerrado por</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Ventas</TableHead>
                  <TableHead>Diferencia</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnosFiltrados.map((turno) => {
                  const diferencia = turno.corte?.diferencia ?? 0;
                  const esDescuadre = Math.abs(diferencia) >= 50;
                  const cerradoPorNombre = turno.corte?.cerradoPorNombre;
                  const turnoCruzado = !!cerradoPorNombre &&
                    cerradoPorNombre.trim().toLowerCase() !== turno.cajeroNombre?.trim().toLowerCase();

                  return (
                  <TableRow
                    key={turno.id}
                    className={esDescuadre ? 'bg-destructive/5 hover:bg-destructive/10' : ''}
                  >
                    <TableCell className="font-medium text-sm">
                      {formatearFecha(turno.fecha)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={turno.tipo === 'matutino' ? 'default' : turno.tipo === 'nocturno' ? 'outline' : 'secondary'}>
                        {TIPOS_TURNO[turno.tipo].icon} {TIPOS_TURNO[turno.tipo].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{turno.cajeroNombre}</TableCell>
                    <TableCell className="text-sm">
                      {cerradoPorNombre ? (
                        <span className={turnoCruzado ? 'text-amber-600 font-medium' : ''}>
                          {cerradoPorNombre}
                          {turnoCruzado && (
                            <AlertTriangle className="inline h-3 w-3 ml-1 text-amber-500" />
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Sin registrar</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatearHora(turno.horaInicio)} – {formatearHora(turno.horaFin)}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {formatearMoneda(turno.resumen.totalVentas)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          {diferencia === 0 ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          ) : diferencia > 0 ? (
                            <TrendingUp className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-destructive shrink-0" />
                          )}
                          <Badge
                            variant={
                              diferencia === 0
                                ? 'default'
                                : diferencia > 0
                                ? 'outline'
                                : 'destructive'
                            }
                            className={diferencia > 0 ? 'text-blue-600 border-blue-300' : ''}
                          >
                            {diferencia > 0 ? '+' : ''}{formatearMoneda(diferencia)}
                          </Badge>
                        </div>
                        {turno.corte?.justificacion && (
                          <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                            <MessageSquare className="h-2.5 w-2.5" />
                            Justificado
                          </span>
                        )}
                        {!turno.corte?.justificacion && Math.abs(diferencia) >= 50 && (
                          <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Sin justificar
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verDetalles(turno)}
                      >
                        Ver Detalles
                      </Button>
                      {/* Botón justificar — solo en turnos con descuadre */}
                      {Math.abs(turno.corte?.diferencia ?? 0) >= 50 && (
                        <Button
                          variant={turno.corte?.justificacion ? 'ghost' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setTurnoAJustificar(turno);
                            setTextoJustificacion(turno.corte?.justificacion ?? '');
                          }}
                          title={turno.corte?.justificacion ? 'Ver / editar justificación' : 'Justificar descuadre'}
                          className={turno.corte?.justificacion ? 'text-green-600' : 'text-amber-600 border-amber-300'}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportarPDF(turno)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Modal de justificación de descuadre */}
      <Dialog
        open={!!turnoAJustificar}
        onOpenChange={(open) => { if (!open) { setTurnoAJustificar(null); setTextoJustificacion(''); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-500" />
              Justificar Descuadre
            </DialogTitle>
            <DialogDescription>
              {turnoAJustificar && (
                <>
                  Turno del <strong>{turnoAJustificar.fecha}</strong> ·{' '}
                  Diferencia:{' '}
                  <span className={`font-semibold ${(turnoAJustificar.corte?.diferencia ?? 0) < 0 ? 'text-destructive' : 'text-blue-600'}`}>
                    {(turnoAJustificar.corte?.diferencia ?? 0) > 0 ? '+' : ''}
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(turnoAJustificar.corte?.diferencia ?? 0)}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {turnoAJustificar?.corte?.justificacion && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Justificación anterior:</p>
              <p className="text-green-700 dark:text-green-400">{turnoAJustificar.corte.justificacion}</p>
              {turnoAJustificar.corte.justificadoPor && (
                <p className="text-xs text-muted-foreground mt-1">— {turnoAJustificar.corte.justificadoPor}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="justificacion">
              Motivo del descuadre <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="justificacion"
              rows={3}
              placeholder="Ej: error de cambio en venta #120, billete de $500 contado dos veces…"
              value={textoJustificacion}
              onChange={(e) => setTextoJustificacion(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setTurnoAJustificar(null); setTextoJustificacion(''); }}
              disabled={justificando}
            >
              Cancelar
            </Button>
            <Button onClick={handleJustificar} disabled={justificando || !textoJustificacion.trim()}>
              {justificando ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando…</>
              ) : (
                'Guardar Justificación'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalles */}
      {turnoSeleccionado && (
        <DetallesTurnoModal
          turno={turnoSeleccionado}
          open={modalAbierto}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}
