'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Download, Clock, User, DollarSign, TrendingUp } from 'lucide-react';
import { Turno, TransaccionTurno } from '@/lib/types/firestore';
import { turnosService } from '@/lib/services/turnos.service';
import { TIPOS_TURNO } from '@/lib/utils/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { exportarCortePDF } from '@/lib/utils/pdf-export';
import { toast } from 'sonner';

interface DetallesTurnoModalProps {
  turno: Turno;
  open: boolean;
  onClose: () => void;
}

export function DetallesTurnoModal({ turno, open, onClose }: DetallesTurnoModalProps) {
  const [transacciones, setTransacciones] = useState<TransaccionTurno[]>([]);
  const [loadingTransacciones, setLoadingTransacciones] = useState(false);

  useEffect(() => {
    if (open && turno) {
      cargarTransacciones();
    }
  }, [open, turno]);

  const cargarTransacciones = async () => {
    try {
      setLoadingTransacciones(true);
      const txs = await turnosService.getTransacciones(turno.id);
      setTransacciones(txs);
    } catch (error) {
      console.error('Error cargando transacciones:', error);
      toast.error('Error al cargar transacciones');
    } finally {
      setLoadingTransacciones(false);
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
    return format(fecha, 'HH:mm:ss', { locale: es });
  };

  const exportarPDF = async () => {
    try {
      await exportarCortePDF(turno);
      toast.success('PDF exportado correctamente');
    } catch (error) {
      console.error('Error exportando PDF:', error);
      toast.error('Error al exportar PDF');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Detalles del Turno - {formatearFecha(turno.fecha)}
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={exportarPDF}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información General */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Información General
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Turno</p>
                <Badge variant={turno.tipo === 'matutino' ? 'default' : 'secondary'}>
                  {TIPOS_TURNO[turno.tipo].icon} {TIPOS_TURNO[turno.tipo].label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Abierto por</p>
                <p className="font-medium">{turno.cajeroNombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cerrado por</p>
                <p className="font-medium">
                  {turno.corte?.cerradoPorNombre ?? (
                    <span className="text-muted-foreground italic">Sin registrar</span>
                  )}
                </p>
              </div>
              {turno.encargadoNombre && (
                <div>
                  <p className="text-sm text-muted-foreground">Encargado</p>
                  <p className="font-medium">{turno.encargadoNombre}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Horario</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatearHora(turno.horaInicio)} - {formatearHora(turno.horaFin)}
                </p>
              </div>
            </div>
          </Card>

          {/* Resumen de Ventas */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resumen de Ventas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Pedidos</p>
                <p className="text-2xl font-bold">{turno.resumen.totalPedidos}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Ventas</p>
                <p className="text-2xl font-bold">
                  {formatearMoneda(turno.resumen.totalVentas)}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Envíos</p>
                <p className="text-2xl font-bold">
                  {formatearMoneda(turno.resumen.totalEnvios)}
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <h4 className="font-medium mb-3">Desglose por Método de Pago</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2 border rounded">
                <p className="text-xs text-muted-foreground">Efectivo</p>
                <p className="font-semibold">{formatearMoneda(turno.resumen.efectivo)}</p>
              </div>
              <div className="p-2 border rounded">
                <p className="text-xs text-muted-foreground">Tarjeta</p>
                <p className="font-semibold">{formatearMoneda(turno.resumen.tarjeta)}</p>
              </div>
              <div className="p-2 border rounded">
                <p className="text-xs text-muted-foreground">Transferencia</p>
                <p className="font-semibold">
                  {formatearMoneda(turno.resumen.transferencia)}
                </p>
              </div>
              <div className="p-2 border rounded">
                <p className="text-xs text-muted-foreground">Apps (Uber/Didi)</p>
                <p className="font-semibold">
                  {formatearMoneda(turno.resumen.uber + turno.resumen.didi)}
                </p>
              </div>
            </div>

            {turno.resumen.totalDescuentos > 0 && (
              <>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 border rounded">
                    <p className="text-xs text-muted-foreground">Total Descuentos</p>
                    <p className="font-semibold text-destructive">
                      -{formatearMoneda(turno.resumen.totalDescuentos)}
                    </p>
                  </div>
                  <div className="p-2 border rounded">
                    <p className="text-xs text-muted-foreground">Comisiones Repartidores</p>
                    <p className="font-semibold">
                      {formatearMoneda(turno.resumen.totalComisionesRepartidores)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Corte de Caja */}
          {turno.corte && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Corte de Caja
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm">Fondo Inicial</span>
                  <span className="font-semibold">
                    {formatearMoneda(turno.fondoInicial)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm">Efectivo Esperado</span>
                  <span className="font-semibold">
                    {formatearMoneda(turno.corte.efectivoEsperado)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted rounded">
                  <span className="text-sm">Efectivo Real</span>
                  <span className="font-semibold">
                    {formatearMoneda(turno.corte.efectivoReal)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center p-3 rounded bg-primary/10">
                  <span className="font-semibold">Diferencia</span>
                  <Badge
                    variant={
                      turno.corte.diferencia === 0
                        ? 'default'
                        : turno.corte.diferencia > 0
                        ? 'default'
                        : 'destructive'
                    }
                    className="text-base"
                  >
                    {formatearMoneda(turno.corte.diferencia)}
                  </Badge>
                </div>
                {turno.corte.observaciones && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Observaciones</p>
                      <p className="text-sm">{turno.corte.observaciones}</p>
                    </div>
                  </>
                )}
                <div className="text-xs text-muted-foreground">
                  Cerrado por: {turno.corte.cerradoPor} a las{' '}
                  {formatearHora(turno.corte.horaCierre)}
                </div>
              </div>
            </Card>
          )}

          {/* Transacciones */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Transacciones del Turno</h3>
            {loadingTransacciones ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : transacciones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay transacciones registradas
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacciones.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs">
                          {formatearHora(tx.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{tx.descripcion}</TableCell>
                        <TableCell className="text-sm">
                          {tx.metodoPago || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatearMoneda(tx.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
