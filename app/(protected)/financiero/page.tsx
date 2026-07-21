'use client';

import { useMemo } from 'react';
import { useTurnosCerrados } from '@/lib/hooks/useCaja';
import { useRolGuard } from '@/lib/hooks/useRolGuard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Users,
  Lock,
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import type { Turno } from '@/lib/types/firestore';

// ── Colores ──────────────────────────────────────────────────────────────────

const COLORS = ['#ed1c24', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const fmtShort = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

// ── Lógica de analíticas ─────────────────────────────────────────────────────

function buildAnalytics(turnos: Turno[]) {
  const cerrados = turnos.filter((t) => t.estado === 'cerrado' && t.corte);
  if (!cerrados.length) return null;

  // ── 1. Cierres por persona ─────────────────────────────────────────────────
  const cierresPorPersona: Record<string, { nombre: string; cierres: number; sobrante: number; faltante: number; cruzados: number }> = {};

  for (const t of cerrados) {
    const nombre = t.corte!.cerradoPorNombre ?? t.cajeroNombre ?? 'Desconocido';
    if (!cierresPorPersona[nombre]) {
      cierresPorPersona[nombre] = { nombre, cierres: 0, sobrante: 0, faltante: 0, cruzados: 0 };
    }
    const p = cierresPorPersona[nombre];
    p.cierres++;
    const diff = t.corte!.diferencia ?? 0;
    if (diff > 0) p.sobrante += diff;
    if (diff < 0) p.faltante += Math.abs(diff);

    const esCruzado =
      t.corte?.cerradoPorNombre &&
      t.cajeroNombre &&
      t.corte.cerradoPorNombre.trim().toLowerCase() !== t.cajeroNombre.trim().toLowerCase();
    if (esCruzado) p.cruzados++;
  }

  const cierresPorPersonaArr = Object.values(cierresPorPersona).sort(
    (a, b) => b.cierres - a.cierres
  );

  // ── 2. Descuadres por cajero (quien ABRIÓ) ────────────────────────────────
  const descuadresPorCajero: Record<string, { nombre: string; total: number; count: number }> = {};

  for (const t of cerrados) {
    const nombre = t.cajeroNombre ?? 'Desconocido';
    if (!descuadresPorCajero[nombre]) {
      descuadresPorCajero[nombre] = { nombre, total: 0, count: 0 };
    }
    const diff = Math.abs(t.corte!.diferencia ?? 0);
    if (diff >= 50) {
      descuadresPorCajero[nombre].total += diff;
      descuadresPorCajero[nombre].count++;
    }
  }

  const descuadresPorCajeroArr = Object.values(descuadresPorCajero)
    .filter((d) => d.count > 0)
    .sort((a, b) => b.total - a.total);

  // ── 3. Evolución de diferencias (últimos 20 turnos, cronológico) ───────────
  const ultimos20 = [...cerrados]
    .sort((a, b) => (a.fecha > b.fecha ? 1 : -1))
    .slice(-20);

  const evolucionDiferencia = ultimos20.map((t) => ({
    fecha: format(new Date(t.fecha), 'dd/MM', { locale: es }),
    tipo: t.tipo === 'matutino' ? 'M' : t.tipo === 'vespertino' ? 'V' : 'N',
    diferencia: t.corte!.diferencia ?? 0,
    cajero: t.cajeroNombre,
  }));

  // ── 4. Distribución de métodos de pago (suma de todos los turnos) ──────────
  const metodos = { efectivo: 0, tarjeta: 0, transferencia: 0, uber: 0, didi: 0 };
  for (const t of cerrados) {
    metodos.efectivo += t.resumen.efectivo;
    metodos.tarjeta += t.resumen.tarjeta;
    metodos.transferencia += t.resumen.transferencia;
    metodos.uber += t.resumen.uber;
    metodos.didi += t.resumen.didi;
  }
  const metodosArr = [
    { name: 'Efectivo', value: metodos.efectivo },
    { name: 'Tarjeta', value: metodos.tarjeta },
    { name: 'Transferencia', value: metodos.transferencia },
    { name: 'Uber Eats', value: metodos.uber },
    { name: 'Didi Food', value: metodos.didi },
  ].filter((m) => m.value > 0);

  // ── 5. Ventas por tipo de turno ────────────────────────────────────────────
  const ventasPorTipo: Record<string, { name: string; ventas: number; count: number }> = {
    matutino: { name: 'Matutino', ventas: 0, count: 0 },
    vespertino: { name: 'Vespertino', ventas: 0, count: 0 },
    nocturno: { name: 'Nocturno', ventas: 0, count: 0 },
  };
  for (const t of cerrados) {
    if (ventasPorTipo[t.tipo]) {
      ventasPorTipo[t.tipo].ventas += t.resumen.totalVentas;
      ventasPorTipo[t.tipo].count++;
    }
  }
  const ventasPorTipoArr = Object.values(ventasPorTipo)
    .filter((v) => v.count > 0)
    .map((v) => ({ ...v, promedio: v.count ? v.ventas / v.count : 0 }));

  // ── 6. KPIs globales ───────────────────────────────────────────────────────
  const totalTurnos = cerrados.length;
  const totalVentas = cerrados.reduce((a, t) => a + t.resumen.totalVentas, 0);
  const totalDescuadre = cerrados.reduce((a, t) => a + (t.corte!.diferencia ?? 0), 0);
  const turnosConDescuadre = cerrados.filter((t) => Math.abs(t.corte!.diferencia ?? 0) >= 50).length;
  const tasaDescuadre = Math.round((turnosConDescuadre / totalTurnos) * 100);
  const turnosCruzados = cerrados.filter(
    (t) =>
      t.corte?.cerradoPorNombre &&
      t.cajeroNombre &&
      t.corte.cerradoPorNombre.trim().toLowerCase() !== t.cajeroNombre.trim().toLowerCase()
  ).length;

  return {
    cierresPorPersonaArr,
    descuadresPorCajeroArr,
    evolucionDiferencia,
    metodosArr,
    ventasPorTipoArr,
    kpis: { totalTurnos, totalVentas, totalDescuadre, tasaDescuadre, turnosCruzados, turnosConDescuadre },
  };
}

// ── Tooltip custom ────────────────────────────────────────────────────────────

function TooltipMoneda({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card shadow-md p-3 text-xs space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

function TooltipDiferencia({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border bg-card shadow-md p-3 text-xs space-y-1">
      <p className="font-semibold">{label} · {payload[0]?.payload?.tipo} · {payload[0]?.payload?.cajero}</p>
      <p className={val >= 0 ? 'text-blue-600' : 'text-destructive'}>
        Diferencia: {fmt(val)}
      </p>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function FinancieroPage() {
  const { allowed, isLoading: loadingRol } = useRolGuard(['admin', 'encargado']);
  const { data: turnos = [], isLoading: loadingTurnos } = useTurnosCerrados();

  const analytics = useMemo(() => buildAnalytics(turnos as Turno[]), [turnos]);

  if (loadingRol || loadingTurnos) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="container mx-auto p-6 flex items-center gap-3 text-muted-foreground">
        <Lock className="h-5 w-5" />
        <p className="text-sm">Solo administradores y encargados pueden ver esta sección.</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <h1 className="text-3xl font-bold">Financiero</h1>
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            Sin turnos cerrados todavía. Las analíticas aparecerán aquí una vez que se registren y cierren turnos.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { kpis, cierresPorPersonaArr, descuadresPorCajeroArr, evolucionDiferencia, metodosArr, ventasPorTipoArr } = analytics;

  return (
    <div className="container mx-auto p-6 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financiero</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Analíticas del módulo de Caja · {kpis.totalTurnos} turnos cerrados
          </p>
        </div>
        <Link href="/financiero/flujo">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-dashed w-full sm:w-auto">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Flujo semanal</p>
                <p className="text-xs text-muted-foreground">Lunes a domingo</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Turnos cerrados</p>
            <p className="text-2xl font-bold mt-1">{kpis.totalTurnos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Total ventas</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{fmtShort(kpis.totalVentas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Descuadre neto</p>
            <div className="flex items-center gap-1 mt-1">
              {kpis.totalDescuadre === 0
                ? <Minus className="h-4 w-4 text-muted-foreground" />
                : kpis.totalDescuadre > 0
                ? <TrendingUp className="h-4 w-4 text-blue-600" />
                : <TrendingDown className="h-4 w-4 text-destructive" />}
              <p className={`text-2xl font-bold ${kpis.totalDescuadre === 0 ? '' : kpis.totalDescuadre > 0 ? 'text-blue-600' : 'text-destructive'}`}>
                {fmtShort(kpis.totalDescuadre)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Tasa de descuadre</p>
            <p className={`text-2xl font-bold mt-1 ${kpis.tasaDescuadre > 30 ? 'text-destructive' : kpis.tasaDescuadre > 15 ? 'text-amber-600' : 'text-green-600'}`}>
              {kpis.tasaDescuadre}%
            </p>
            <p className="text-[10px] text-muted-foreground">{kpis.turnosConDescuadre} con dif ≥ $50</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Turnos cruzados</p>
            <div className="flex items-center gap-1 mt-1">
              {kpis.turnosCruzados > 0
                ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                : <CheckCircle2 className="h-4 w-4 text-green-600" />}
              <p className={`text-2xl font-bold ${kpis.turnosCruzados > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {kpis.turnosCruzados}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas fila 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Cierres por persona */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Cierres de turno por persona
            </CardTitle>
            <p className="text-xs text-muted-foreground">Quién cierra más turnos y cuánto descuadra</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={cierresPorPersonaArr} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<TooltipMoneda />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cierres" name="Cierres" fill="#ed1c24" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cruzados" name="Turnos cruzados" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Descuadres por cajero */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Descuadres ≥ $50 por cajero
            </CardTitle>
            <p className="text-xs text-muted-foreground">Total acumulado de diferencias significativas por quien abrió el turno</p>
          </CardHeader>
          <CardContent>
            {descuadresPorCajeroArr.length === 0 ? (
              <div className="h-60 flex items-center justify-center">
                <div className="text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  Sin descuadres significativos
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={descuadresPorCajeroArr} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                  <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    formatter={(v: any) => [fmt(v), 'Total descuadre']}
                    labelFormatter={(l) => `Cajero: ${l}`}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="total" name="Total descuadre" fill="#eab308" radius={[0, 4, 4, 0]}>
                    {descuadresPorCajeroArr.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficas fila 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Evolución de diferencias */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              Evolución de diferencias — últimos {evolucionDiferencia.length} turnos
            </CardTitle>
            <p className="text-xs text-muted-foreground">Positivo = sobrante · Negativo = faltante</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evolucionDiferencia} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                <Tooltip content={<TooltipDiferencia />} />
                {/* Línea en 0 */}
                <Line
                  type="monotone"
                  dataKey="diferencia"
                  stroke="#ed1c24"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const val = props.payload?.diferencia ?? 0;
                    const color = val > 0 ? '#3b82f6' : val < 0 ? '#ef4444' : '#22c55e';
                    return <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={color} stroke="white" strokeWidth={1.5} />;
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Métodos de pago */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Distribución por método de pago
            </CardTitle>
            <p className="text-xs text-muted-foreground">Suma de todos los turnos cerrados</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={metodosArr}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {metodosArr.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [fmt(v), 'Monto']} contentStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ventas por tipo de turno */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Ventas y promedio por tipo de turno
          </CardTitle>
          <p className="text-xs text-muted-foreground">Comparativa entre turno matutino, vespertino y nocturno</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ventasPorTipoArr} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
              <Tooltip content={<TooltipMoneda />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ventas" name="Total ventas" fill="#ed1c24" radius={[4, 4, 0, 0]} />
              <Bar dataKey="promedio" name="Promedio por turno" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla ranking de descuadres */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ranking de descuadre por cajero</CardTitle>
          <p className="text-xs text-muted-foreground">Quién acumula más diferencias y cuántos turnos los generó</p>
        </CardHeader>
        <CardContent>
          {descuadresPorCajeroArr.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Todos los cajeros dentro del umbral aceptable
            </div>
          ) : (
            <div className="space-y-3">
              {descuadresPorCajeroArr.map((c, i) => {
                const pct = (c.total / descuadresPorCajeroArr[0].total) * 100;
                return (
                  <div key={c.nombre} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs w-5 ${i === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          #{i + 1}
                        </span>
                        <span className="font-medium">{c.nombre}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {c.count} descuadre{c.count > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <span className={`font-semibold ${i === 0 ? 'text-destructive' : 'text-amber-600'}`}>
                        {fmt(c.total)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${i === 0 ? 'bg-destructive' : 'bg-amber-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
