'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Package2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { KpiGrid, type KpiItem } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import {
  getResumenAnalisis,
  type ResumenAnalisis,
} from '@/lib/services/analisisVentas.service';
import { fmtPesosDecimal } from '@/lib/utils/formatters';

const COLORES = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#a3e635'];

export function AnalisisInventario() {
  const [resumen, setResumen] = useState<ResumenAnalisis | null>(null);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState<'7' | '30' | '90'>('30');

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await getResumenAnalisis(Number(periodo));
      setResumen(data);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [periodo]);

  const kpis: KpiItem[] = [
    {
      label: 'Total movimientos',
      value: resumen?.totalMovimientos ?? 0,
      icon: Package2,
      color: 'blue',
    },
    {
      label: 'Costo del periodo',
      value: resumen ? fmtPesosDecimal(resumen.costoTotalPeriodo) : '—',
      icon: TrendingUp,
      color: 'green',
    },
    {
      label: 'Mermas totales',
      value: resumen?.mermasTotales ?? 0,
      icon: TrendingDown,
      color: 'red',
    },
    {
      label: 'Productos analizados',
      value: resumen?.topVendidos.length ?? 0,
      icon: AlertTriangle,
      color: 'orange',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">
          Análisis de rotación, costos y mermas del inventario
        </p>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as typeof periodo)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={cargar} disabled={cargando}>
            <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <KpiGrid kpis={kpis} isLoading={cargando} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top productos más vendidos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Productos más vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cargando ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Cargando…
              </div>
            ) : !resumen || resumen.topVendidos.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Sin datos para el periodo seleccionado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={resumen.topVendidos.map((p) => ({ name: p.nombre.length > 14 ? p.nombre.slice(0, 14) + '…' : p.nombre, vendido: p.totalVendido }))}
                  margin={{ top: 4, right: 8, left: 0, bottom: 40 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v, 'Unidades']} />
                  <Bar dataKey="vendido" radius={[4, 4, 0, 0]}>
                    {resumen.topVendidos.map((_, i) => (
                      <Cell key={i} fill={COLORES[i % COLORES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tendencia de movimientos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-blue-600" />
              Tendencia de movimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cargando ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Cargando…
              </div>
            ) : !resumen || resumen.tendencias.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Sin datos para el periodo seleccionado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={resumen.tendencias}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="totalVentas" name="Unidades" stroke="#3b82f6" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="totalIngresos" name="Costo ($)" stroke="#22c55e" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla ranking */}
      {resumen && resumen.topVendidos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ranking de productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resumen.topVendidos.map((p, i) => (
                <div key={p.productoId} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: COLORES[i % COLORES.length] }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{p.nombre}</span>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {p.totalVendido} uds.
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
