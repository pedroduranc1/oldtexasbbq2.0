'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { ResumenDiario } from '@/lib/services/reportes.service';

interface Props {
  resumen: ResumenDiario;
  isLoading?: boolean;
}

const METODOS = [
  { key: 'efectivo',      label: 'Efectivo',       color: '#10B981' },
  { key: 'tarjeta',       label: 'Tarjeta',         color: '#3B82F6' },
  { key: 'transferencia', label: 'Transferencia',   color: '#8B5CF6' },
  { key: 'uber',          label: 'Uber Eats',       color: '#000000' },
  { key: 'didi',          label: 'Didi Food',       color: '#FF6600' },
] as const;

export function GraficaMetodosPago({ resumen, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="h-80 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const datos = METODOS
    .map((m) => ({ name: m.label, value: resumen.ventasPorMetodoPago[m.key], color: m.color, key: m.key }))
    .filter((d) => d.value > 0);

  const total = datos.reduce((s, d) => s + d.value, 0);

  if (datos.length === 0 || total === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Ventas por Método de Pago</h3>
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          Sin ventas registradas para este día
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Ventas por Método de Pago</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={datos}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {datos.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
              formatter={(value) => [
                `$${(value as number).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                '',
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex flex-col justify-center gap-2">
          {datos.map((d) => (
            <div key={d.key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-sm font-medium text-foreground">{d.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  ${d.value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((d.value / total) * 100)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3 flex justify-between">
        <span className="text-sm text-muted-foreground">Total cobrado</span>
        <span className="text-base font-bold text-foreground">
          ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
