'use client';

import Link from 'next/link';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { useMovimientosTurno, useTotalesTurno, useEgresosPorConcepto } from '@/lib/hooks/useCaja';
import { TIPOS_TURNO } from '@/lib/utils/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KpiGrid, type KpiItem } from '@/components/ui/kpi-card';
import { AlertBox } from '@/components/ui/alert-box';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { fmtPesos, fmtHora } from '@/lib/utils/formatters';
import type { Turno, MovimientoCaja } from '@/lib/types/firestore';

const UMBRAL_DEPOSITO = 6000;

interface ResumenCajaProps {
  turno: Turno;
}

export function ResumenCaja({ turno }: ResumenCajaProps) {
  const { data: totalesData, isLoading: loadingTotales, refetch: refetchTotales, isFetching } = useTotalesTurno(turno.id);
  const { data: movimientos = [], isLoading: loadingMovimientos } = useMovimientosTurno(turno.id);
  const { data: egresosPorConcepto = [] } = useEgresosPorConcepto(turno.id);

  const totalIngresos = totalesData?.totalIngresos ?? 0;
  const totalEgresos  = totalesData?.totalEgresos  ?? 0;
  const saldoNeto     = totalesData?.saldoNeto     ?? 0;
  const saldoEnCaja   = turno.fondoInicial + saldoNeto;

  const kpis: KpiItem[] = [
    { label: 'Fondo Inicial',    value: fmtPesos(turno.fondoInicial), icon: Wallet,          color: 'default' },
    { label: 'Total Ingresos',   value: loadingTotales ? '…' : fmtPesos(totalIngresos),     icon: ArrowUpCircle,   color: 'green'  },
    { label: 'Total Egresos',    value: loadingTotales ? '…' : fmtPesos(totalEgresos),      icon: ArrowDownCircle, color: 'red'    },
    { label: 'Efectivo en Caja', value: loadingTotales ? '…' : fmtPesos(saldoEnCaja),       icon: Wallet,          color: 'blue'   },
  ];

  return (
    <div className="space-y-4">
      {saldoEnCaja >= UMBRAL_DEPOSITO && (
        <AlertBox
          level="warning"
          message={`Hay ${fmtPesos(saldoEnCaja)} en caja — considera hacer un depósito. Con más de ${fmtPesos(UMBRAL_DEPOSITO)} el riesgo operativo aumenta.`}
        />
      )}

      <KpiGrid kpis={kpis} isLoading={loadingTotales} />

      {/* Info del turno */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Detalle del Turno
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetchTotales()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Apertura
            </span>
            <span className="font-medium">{fmtHora(turno.horaInicio)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cajero(a)</span>
            <span className="font-medium">{turno.cajeroNombre}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tipo</span>
            <Badge variant={turno.tipo === 'matutino' ? 'default' : 'secondary'}>
              {TIPOS_TURNO[turno.tipo]?.icon ?? '🕐'} {TIPOS_TURNO[turno.tipo]?.label ?? turno.tipo ?? 'Sin tipo'}
            </Badge>
          </div>
          {(turno.resumen?.totalPedidos ?? 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pedidos</span>
              <span className="font-bold">{turno.resumen?.totalPedidos ?? 0}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Egresos por concepto */}
      {egresosPorConcepto.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Egresos por Concepto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {egresosPorConcepto.map((e) => (
                <div key={e.concepto} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[60%]">{e.concepto}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{e.cantidad}</Badge>
                    <span className="font-medium text-destructive">{fmtPesos(e.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Últimos movimientos */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Últimos Movimientos</CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link href="/caja/movimientos">Ver todos</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMovimientos ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : movimientos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.slice(0, 10).map((m: MovimientoCaja) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground">{fmtHora(m.fecha)}</TableCell>
                      <TableCell>
                        {m.tipo === 'ingreso' ? (
                          <Badge variant="outline" className="text-green-600 border-green-300">Ingreso</Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive border-destructive/30">Egreso</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-[140px] truncate">
                        {m.concepto}
                        {m.descripcion && (
                          <span className="block text-xs text-muted-foreground truncate">{m.descripcion}</span>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${m.tipo === 'ingreso' ? 'text-green-600' : 'text-destructive'}`}>
                        {m.tipo === 'egreso' ? '-' : '+'}{fmtPesos(m.monto)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {movimientos.length > 10 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Mostrando 10 de {movimientos.length} movimientos
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
