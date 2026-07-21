'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Turno } from '@/lib/types/firestore';

interface Props {
  turnos: Turno[];
  isLoading?: boolean;
}

const TIPO_LABEL: Record<string, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
  nocturno: 'Nocturno',
};

const TIPO_COLOR: Record<string, string> = {
  matutino:  '#F59E0B',
  vespertino: '#3B82F6',
  nocturno:  '#6366F1',
};

export function GraficaComparativaTurnos({ turnos, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="h-80 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const turnosConData = turnos.filter((t) => (t.resumen?.totalVentas ?? 0) > 0);

  if (turnosConData.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Comparativa de Turnos</h3>
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          Sin turnos con ventas para este día
        </div>
      </div>
    );
  }

  const datos = turnosConData.map((t) => ({
    name: TIPO_LABEL[t.tipo] ?? t.tipo,
    tipo: t.tipo,
    Ventas: t.resumen?.totalVentas ?? 0,
    Pedidos: t.resumen?.totalPedidos ?? 0,
    Envíos: t.resumen?.totalEnvios ?? 0,
    Descuentos: t.resumen?.totalDescuentos ?? 0,
  }));

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Comparativa de Turnos</h3>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={datos} barGap={6}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))',
            }}
            formatter={(value, name) => {
              const n = value as number;
              return name === 'Pedidos'
                ? [n, name as string]
                : [`$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, name as string];
            }}
          />
          <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
          <Bar dataKey="Ventas" fill="#10B981" radius={[6, 6, 0, 0]} />
          <Bar dataKey="Envíos" fill="#3B82F6" radius={[6, 6, 0, 0]} />
          <Bar dataKey="Descuentos" fill="#EF4444" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Tabla resumen por turno */}
      <div className="mt-4 border-t border-border pt-4 space-y-2">
        {turnosConData.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: TIPO_COLOR[t.tipo] ?? '#888' }} />
              <div>
                <p className="text-sm font-medium text-foreground">{TIPO_LABEL[t.tipo] ?? t.tipo}</p>
                <p className="text-xs text-muted-foreground">{t.cajeroNombre} · {t.resumen?.totalPedidos ?? 0} pedidos</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">
                ${(t.resumen?.totalVentas ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-xs font-medium ${t.estado === 'abierto' ? 'text-green-600' : 'text-muted-foreground'}`}>
                {t.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
