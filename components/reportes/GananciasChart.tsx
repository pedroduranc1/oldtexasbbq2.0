'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { MetricasDia } from '@/lib/services/dashboardMetricas.service';

interface GananciasChartProps {
  porDia: MetricasDia[];
  isLoading?: boolean;
}

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-MX')}`;
}

// Tooltip personalizado
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const ganancia = payload[0]?.value ?? 0;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-sm space-y-1 min-w-[160px]">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name}</span>
          <span className="font-mono font-semibold">{fmt(entry.value)}</span>
        </p>
      ))}
      {ganancia < 0 && (
        <p className="text-xs text-destructive font-medium pt-1">Día con pérdida</p>
      )}
    </div>
  );
}

export function GananciasChart({ porDia, isLoading }: GananciasChartProps) {
  const datos = porDia
    .filter((d) => d.ventas > 0 || d.ganancia !== 0)
    .map((d) => ({
      dia: format(new Date(d.fecha), 'EEE dd', { locale: es }),
      Ganancia: Math.round(d.ganancia),
    }));

  const hayPerdida = datos.some((d) => d.Ganancia < 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          Ganancia neta por día
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            Cargando…
          </div>
        ) : datos.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            Sin datos para el periodo seleccionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="gananciaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="perdidaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              {hayPerdida && <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" />}
              <Area
                type="monotone"
                dataKey="Ganancia"
                stroke="#16a34a"
                strokeWidth={2}
                fill="url(#gananciaGrad)"
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  const color = payload.Ganancia < 0 ? '#dc2626' : '#16a34a';
                  return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} stroke="white" strokeWidth={1.5} />;
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
