'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2 } from 'lucide-react';
import type { MetricasDia } from '@/lib/services/dashboardMetricas.service';

interface IngresosEgresosChartProps {
  porDia: MetricasDia[];
  isLoading?: boolean;
}

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-MX')}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-sm space-y-1 min-w-[160px]">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name}</span>
          <span className="font-mono font-semibold">{fmt(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function IngresosEgresosChart({ porDia, isLoading }: IngresosEgresosChartProps) {
  const datos = porDia
    .filter((d) => d.ventas > 0 || d.egresos > 0)
    .map((d) => ({
      dia:     format(new Date(d.fecha), 'EEE dd', { locale: es }),
      Ventas:  Math.round(d.ventas),
      Egresos: Math.round(d.egresos),
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-blue-600" />
          Ventas vs Egresos por día
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
            <BarChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 20 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="Ventas"  fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Egresos" fill="#dc2626" radius={[3, 3, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
