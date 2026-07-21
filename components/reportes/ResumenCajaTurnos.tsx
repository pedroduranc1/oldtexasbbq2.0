'use client';

import { DollarSign, TrendingDown, TrendingUp, Package, Truck } from 'lucide-react';
import type { Turno } from '@/lib/types/firestore';

interface Props {
  turnos: Turno[];
  isLoading?: boolean;
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ResumenCajaTurnos({ turnos, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="h-72 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (turnos.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Resumen de Caja</h3>
        <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
          Sin turnos para este día
        </div>
      </div>
    );
  }

  // Totales del día sumando todos los turnos
  const totalVentas      = turnos.reduce((s, t) => s + (t.resumen?.totalVentas ?? 0), 0);
  const totalEnvios      = turnos.reduce((s, t) => s + (t.resumen?.totalEnvios ?? 0), 0);
  const totalDescuentos  = turnos.reduce((s, t) => s + (t.resumen?.totalDescuentos ?? 0), 0);
  const totalComisiones  = turnos.reduce((s, t) => s + (t.resumen?.totalComisionesRepartidores ?? 0), 0);
  const totalEfectivo    = turnos.reduce((s, t) => s + (t.resumen?.efectivo ?? 0), 0);
  const totalFondo       = turnos.reduce((s, t) => s + (t.fondoInicial ?? 0), 0);
  const netoEfectivo     = totalFondo + totalEfectivo - totalComisiones;

  // Cortes registrados
  const turnosCerrados = turnos.filter((t) => t.estado === 'cerrado' && t.corte);
  const diferenciaCaja = turnosCerrados.reduce((s, t) => s + (t.corte?.diferencia ?? 0), 0);

  const kpis = [
    { label: 'Ventas brutas',       value: totalVentas,     icon: TrendingUp,    color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total envíos',         value: totalEnvios,     icon: Truck,          color: 'text-blue-600',  bg: 'bg-blue-50' },
    { label: 'Descuentos aplicados', value: totalDescuentos, icon: TrendingDown,   color: 'text-red-600',   bg: 'bg-red-50' },
    { label: 'Comisiones reparto',   value: totalComisiones, icon: Package,        color: 'text-orange-600',bg: 'bg-orange-50' },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Resumen de Caja</h3>
        <DollarSign className="h-5 w-5 text-primary" />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-lg border border-border p-3 ${k.bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <k.icon className={`h-4 w-4 ${k.color}`} />
              <span className="text-xs text-muted-foreground">{k.label}</span>
            </div>
            <p className={`text-base font-bold ${k.color}`}>${fmt(k.value)}</p>
          </div>
        ))}
      </div>

      {/* Efectivo en caja */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 mb-4">
        <p className="text-xs text-muted-foreground mb-2">Efectivo en caja estimado</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fondo inicial</span>
            <span className="font-medium">${fmt(totalFondo)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">+ Ventas efectivo</span>
            <span className="font-medium text-green-600">+${fmt(totalEfectivo)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">- Comisiones</span>
            <span className="font-medium text-red-600">-${fmt(totalComisiones)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 mt-1">
            <span className="font-semibold text-foreground">Total esperado</span>
            <span className="font-bold text-foreground">${fmt(netoEfectivo)}</span>
          </div>
        </div>
      </div>

      {/* Descuadre si hay corte */}
      {turnosCerrados.length > 0 && (
        <div className={`rounded-lg border px-4 py-3 flex justify-between items-center ${
          Math.abs(diferenciaCaja) < 1
            ? 'border-green-200 bg-green-50'
            : diferenciaCaja > 0
            ? 'border-green-200 bg-green-50'
            : 'border-red-200 bg-red-50'
        }`}>
          <span className="text-sm font-medium text-foreground">Diferencia de caja</span>
          <span className={`text-base font-bold ${
            Math.abs(diferenciaCaja) < 1 ? 'text-green-600' : diferenciaCaja > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {diferenciaCaja >= 0 ? '+' : ''}{fmt(diferenciaCaja)}
          </span>
        </div>
      )}
    </div>
  );
}
