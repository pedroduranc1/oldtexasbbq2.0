'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  TrendingUp,
  Clock,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useMovimientosTurno, useTotalesTurno, useEgresosPorConcepto } from '@/lib/hooks/useCaja';
import { TIPOS_TURNO } from '@/lib/utils/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Turno, MovimientoCaja } from '@/lib/types/firestore';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

function fmtHora(ts: any): string {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'HH:mm', { locale: es });
}

interface ResumenCajaProps {
  turno: Turno;
}

export function ResumenCaja({ turno }: ResumenCajaProps) {
  const {
    data: totalesData,
    isLoading: loadingTotales,
    refetch: refetchTotales,
    isFetching,
  } = useTotalesTurno(turno.id);

  const {
    data: movimientos = [],
    isLoading: loadingMovimientos,
  } = useMovimientosTurno(turno.id);

  const { data: egresosPorConcepto = [] } = useEgresosPorConcepto(turno.id);

  const totalIngresos = totalesData?.totalIngresos ?? 0;
  const totalEgresos = totalesData?.totalEgresos ?? 0;
  const saldoNeto = totalesData?.saldoNeto ?? 0;
  const saldoEnCaja = turno.fondoInicial + saldoNeto;

  const UMBRAL_DEPOSITO = 6000;
  const requiereDeposito = saldoEnCaja >= UMBRAL_DEPOSITO;

  return (
    <div className="space-y-4">
      {/* Banner efectivo alto */}
      {requiereDeposito && (
        <div className="flex gap-3 p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Efectivo alto en caja — considera hacer un depósito</p>
            <p className="text-xs mt-0.5 text-amber-600 dark:text-amber-500">
              Hay {fmt(saldoEnCaja)} en caja. Con más de {fmt(UMBRAL_DEPOSITO)} el riesgo operativo aumenta.
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Fondo Inicial</p>
          <p className="text-xl font-bold mt-1">{fmt(turno.fondoInicial)}</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowUpCircle className="h-3.5 w-3.5 text-green-500" />
            Total Ingresos
          </p>
          {loadingTotales ? (
            <Loader2 className="h-5 w-5 animate-spin mt-1 text-muted-foreground" />
          ) : (
            <p className="text-xl font-bold text-green-600 mt-1">{fmt(totalIngresos)}</p>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowDownCircle className="h-3.5 w-3.5 text-destructive" />
            Total Egresos
          </p>
          {loadingTotales ? (
            <Loader2 className="h-5 w-5 animate-spin mt-1 text-muted-foreground" />
          ) : (
            <p className="text-xl font-bold text-destructive mt-1">{fmt(totalEgresos)}</p>
          )}
        </Card>

        <Card className="p-4 border-primary/40">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            Efectivo en Caja
          </p>
          {loadingTotales ? (
            <Loader2 className="h-5 w-5 animate-spin mt-1 text-muted-foreground" />
          ) : (
            <p className="text-xl font-bold text-primary mt-1">{fmt(saldoEnCaja)}</p>
          )}
        </Card>
      </div>

      {/* Info del turno + botón refresh */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Detalle del Turno
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchTotales()}
              disabled={isFetching}
            >
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
              {TIPOS_TURNO[turno.tipo].icon} {TIPOS_TURNO[turno.tipo].label}
            </Badge>
          </div>
          {turno.resumen.totalPedidos > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pedidos</span>
              <span className="font-bold">{turno.resumen.totalPedidos}</span>
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
                    <Badge variant="outline" className="text-xs">
                      {e.cantidad}
                    </Badge>
                    <span className="font-medium text-destructive">{fmt(e.total)}</span>
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
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin movimientos registrados
            </p>
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
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtHora(m.fecha)}
                      </TableCell>
                      <TableCell>
                        {m.tipo === 'ingreso' ? (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            Ingreso
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive border-destructive/30">
                            Egreso
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-[140px] truncate">
                        {m.concepto}
                        {m.descripcion && (
                          <span className="block text-xs text-muted-foreground truncate">
                            {m.descripcion}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          m.tipo === 'ingreso' ? 'text-green-600' : 'text-destructive'
                        }`}
                      >
                        {m.tipo === 'egreso' ? '-' : '+'}{fmt(m.monto)}
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
