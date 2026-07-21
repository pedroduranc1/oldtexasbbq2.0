'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, Plus, Lock, Info, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/lib/stores/auth.store';
import {
  getFlujoSemana,
  crearFlujoSemanal,
  cerrarFlujoSemanal,
  calcularResumenFlujo,
} from '@/lib/services/flujoEfectivo.service';
import { formatCurrency } from '@/lib/utils/formatters';

// ─── Semana actual en formato YYYY-MM-DD ──────────────────────────────────────

function luneDeSemana(base: Date): string {
  return format(startOfWeek(base, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

function domingosSemana(lunes: string): string {
  return format(endOfWeek(parseISO(lunes), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

function labelSemana(lunes: string): string {
  const inicio = parseISO(lunes);
  const fin = endOfWeek(inicio, { weekStartsOn: 1 });
  return `${format(inicio, "d 'de' MMM", { locale: es })} — ${format(fin, "d 'de' MMM", { locale: es })}`;
}

// ─── Componente KPI ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  color = 'default',
  sub,
}: {
  label: string;
  value: string;
  color?: 'green' | 'red' | 'blue' | 'default';
  sub?: string;
}) {
  const textColor = {
    green: 'text-green-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
    default: '',
  }[color];

  return (
    <Card>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={`text-xl font-bold ${textColor}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FlujoEfectivoPage() {
  const qc = useQueryClient();
  const { userData } = useAuthStore();

  const [semanaBase, setSemanaBase] = useState(() => luneDeSemana(new Date()));
  const [dialogNuevo, setDialogNuevo] = useState(false);
  const [dialogCerrar, setDialogCerrar] = useState(false);
  const [saldoInicialInput, setSaldoInicialInput] = useState('');
  const [saldoFinalInput, setSaldoFinalInput] = useState('');

  // ─── Queries ────────────────────────────────────────────────────────────────

  const qFlujo = useQuery({
    queryKey: ['flujo', semanaBase],
    queryFn: () => getFlujoSemana(semanaBase),
  });

  const qResumen = useQuery({
    queryKey: ['flujo-resumen', semanaBase],
    queryFn: () => qFlujo.data ? calcularResumenFlujo(qFlujo.data) : null,
    enabled: !!qFlujo.data,
  });

  const flujo = qFlujo.data;
  const resumen = qResumen.data;
  const cargando = qFlujo.isLoading || qResumen.isLoading;

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const mutCrear = useMutation({
    mutationFn: () => {
      if (!userData) throw new Error('Sin sesión');
      const saldo = parseFloat(saldoInicialInput);
      if (isNaN(saldo) || saldo < 0) throw new Error('Ingresa un saldo inicial válido');
      return crearFlujoSemanal(semanaBase, saldo, userData.id, userData.nombre);
    },
    onSuccess: () => {
      toast.success('Flujo semanal creado');
      setDialogNuevo(false);
      setSaldoInicialInput('');
      qc.invalidateQueries({ queryKey: ['flujo', semanaBase] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutCerrar = useMutation({
    mutationFn: () => {
      if (!flujo) throw new Error('Sin flujo');
      const saldo = parseFloat(saldoFinalInput);
      if (isNaN(saldo) || saldo < 0) throw new Error('Ingresa el saldo final real');
      return cerrarFlujoSemanal(flujo.id!, saldo);
    },
    onSuccess: () => {
      toast.success('Semana cerrada');
      setDialogCerrar(false);
      setSaldoFinalInput('');
      qc.invalidateQueries({ queryKey: ['flujo', semanaBase] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Navegación de semana ────────────────────────────────────────────────────

  const irSemanaAnterior = () =>
    setSemanaBase((s) => luneDeSemana(subWeeks(parseISO(s), 1)));
  const irSemanaSiguiente = () =>
    setSemanaBase((s) => luneDeSemana(addWeeks(parseISO(s), 1)));
  const esSemanaActual = semanaBase === luneDeSemana(new Date());

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Flujo de efectivo</h1>
          <p className="text-sm text-muted-foreground">Seguimiento semanal lunes a domingo</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={irSemanaAnterior}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">{labelSemana(semanaBase)}</span>
          <Button variant="outline" size="icon" onClick={irSemanaSiguiente} disabled={esSemanaActual}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Estado del flujo */}
      {cargando ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !flujo ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <Wallet className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Sin flujo registrado para esta semana</p>
              <p className="text-sm text-muted-foreground">Registra el saldo inicial de caja para comenzar el seguimiento.</p>
            </div>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setDialogNuevo(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Iniciar semana
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Badge estado */}
          <div className="flex items-center gap-3">
            <Badge variant={flujo.estado === 'abierto' ? 'default' : 'secondary'}>
              {flujo.estado === 'abierto' ? 'Semana abierta' : 'Semana cerrada'}
            </Badge>
            {flujo.estado === 'abierto' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDialogCerrar(true)}
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                Cerrar semana
              </Button>
            )}
          </div>

          {/* KPIs principales */}
          {resumen && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard label="Saldo inicial" value={formatCurrency(resumen.saldoInicial)} />
                <KpiCard label="Total ventas" value={formatCurrency(resumen.totalVentas)} color="green" />
                <KpiCard label="Total egresos" value={formatCurrency(resumen.totalEgresos)} color="red" />
                <KpiCard
                  label="Saldo efectivo teórico"
                  value={formatCurrency(resumen.efectivoTeorico)}
                  color={resumen.efectivoTeorico >= 0 ? 'green' : 'red'}
                  sub="saldo ini + efectivo − egresos"
                />
              </div>

              {/* Desglose por tipo de ingreso */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Desglose de ingresos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <DesgloseFila label="Efectivo (ventas)" valor={resumen.totalEfectivo} color="green" />
                  <DesgloseFila
                    label="Tarjeta / Clip (bruto)"
                    valor={resumen.totalTarjeta}
                    sub={`Neto D+1: ${formatCurrency(resumen.totalTarjetaNeto)}`}
                    color="blue"
                  />
                  {resumen.totalEnvios > 0 && (
                    <DesgloseFila label="Cobros de envío" valor={resumen.totalEnvios} />
                  )}
                  {resumen.totalAnticipos > 0 && (
                    <DesgloseFila label="Anticipos recibidos (efectivo)" valor={resumen.totalAnticipos} />
                  )}
                  {resumen.totalOtrosIngresos > 0 && (
                    <DesgloseFila label="Otros ingresos" valor={resumen.totalOtrosIngresos} />
                  )}
                  {(resumen.ventasUber > 0 || resumen.ventasDidi > 0) && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex gap-2">
                      <Info className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Canales Uber Eats / Didi Food</p>
                        <p>Uber: {formatCurrency(resumen.ventasUber)} — Didi: {formatCurrency(resumen.ventasDidi)}</p>
                        <p className="text-xs mt-0.5">Los depósitos llegan como transferencia 1-2 días después. Regístralos en caja cuando lleguen.</p>
                      </div>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                    <span>Total egresos</span>
                    <span className="text-red-600">{formatCurrency(resumen.totalEgresos)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span>Saldo final esperado</span>
                    <span className={resumen.saldoFinalEsperado >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(resumen.saldoFinalEsperado)}
                    </span>
                  </div>
                  {flujo.saldoFinal !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Saldo final real (registrado)</span>
                      <span className="font-semibold">{formatCurrency(flujo.saldoFinal)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabla diaria */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Detalle por día</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Día</TableHead>
                          <TableHead className="text-right">Efectivo</TableHead>
                          <TableHead className="text-right">Tarjeta (neto D+1)</TableHead>
                          <TableHead className="text-right">Otros</TableHead>
                          <TableHead className="text-right">Egresos</TableHead>
                          <TableHead className="text-right">Neto día</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resumen.dias.map((d) => {
                          const sinActividad = d.efectivoVentas === 0 && d.tarjetaVentas === 0 && d.egresos === 0 && d.otrosIngresos === 0;
                          return (
                            <TableRow key={d.fecha} className={sinActividad ? 'opacity-40' : ''}>
                              <TableCell className="font-medium">
                                <span className="font-semibold">{d.diaSemana}</span>
                                <span className="text-xs text-muted-foreground ml-2">{format(parseISO(d.fecha), 'd MMM', { locale: es })}</span>
                              </TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(d.efectivoVentas)}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(d.tarjetaNeto)}</TableCell>
                              <TableCell className="text-right text-sm">
                                {formatCurrency(d.anticiposEfectivo + d.otrosIngresos + d.envios)}
                              </TableCell>
                              <TableCell className="text-right text-sm text-red-600">{d.egresos > 0 ? formatCurrency(d.egresos) : '—'}</TableCell>
                              <TableCell className={`text-right font-semibold text-sm ${d.netoDia < 0 ? 'text-red-600' : d.netoDia > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {sinActividad ? '—' : formatCurrency(d.netoDia)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* Dialog: Iniciar semana */}
      <Dialog open={dialogNuevo} onOpenChange={setDialogNuevo}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Iniciar semana</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Semana del <strong>{labelSemana(semanaBase)}</strong>
          </p>
          <div className="space-y-1">
            <Label>Saldo inicial en caja (efectivo físico)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={saldoInicialInput}
              onChange={(e) => setSaldoInicialInput(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Cuenta el efectivo en caja al inicio del lunes.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNuevo(false)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={mutCrear.isPending || !saldoInicialInput}
              onClick={() => mutCrear.mutate()}
            >
              {mutCrear.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cerrar semana */}
      <Dialog open={dialogCerrar} onOpenChange={setDialogCerrar}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cerrar semana</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Registra el saldo real contado en caja al cierre del domingo.
          </p>
          {resumen && (
            <p className="text-sm">
              Saldo esperado: <strong>{formatCurrency(resumen.efectivoTeorico)}</strong>
            </p>
          )}
          <div className="space-y-1">
            <Label>Saldo final real (efectivo contado)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={saldoFinalInput}
              onChange={(e) => setSaldoFinalInput(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCerrar(false)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={mutCerrar.isPending || !saldoFinalInput}
              onClick={() => mutCerrar.mutate()}
            >
              {mutCerrar.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cerrar semana
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Fila de desglose ─────────────────────────────────────────────────────────

function DesgloseFila({
  label,
  valor,
  sub,
  color,
}: {
  label: string;
  valor: number;
  sub?: string;
  color?: 'green' | 'red' | 'blue';
}) {
  const colorMap: Record<string, string> = { green: 'text-green-600', red: 'text-red-600', blue: 'text-blue-600' };
  const textColor = color ? (colorMap[color] ?? '') : '';
  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <span>{label}</span>
        {sub && <span className="ml-2 text-xs text-muted-foreground">{sub}</span>}
      </div>
      <span className={`font-medium ${textColor}`}>{formatCurrency(valor)}</span>
    </div>
  );
}
