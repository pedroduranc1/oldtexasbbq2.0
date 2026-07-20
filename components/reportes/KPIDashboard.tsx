'use client';

import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Receipt, Package, XCircle } from 'lucide-react';
import { KpiGrid, type KpiItem } from '@/components/ui/kpi-card';
import type { ResumenMetricas } from '@/lib/services/dashboardMetricas.service';
import { fmtPesos } from '@/lib/utils/formatters';

interface KPIDashboardProps {
  metricas: ResumenMetricas | null;
  isLoading?: boolean;
}

export function KPIDashboard({ metricas, isLoading }: KPIDashboardProps) {
  const kpis: KpiItem[] = [
    {
      label: 'Ventas totales',
      value: metricas ? fmtPesos(metricas.totalVentas) : '—',
      icon: TrendingUp,
      color: 'green',
    },
    {
      label: 'Total egresos',
      value: metricas ? fmtPesos(metricas.totalEgresos) : '—',
      icon: TrendingDown,
      color: 'red',
    },
    {
      label: 'Ganancia neta',
      value: metricas ? fmtPesos(metricas.gananciaNeta) : '—',
      icon: DollarSign,
      color: (metricas?.gananciaNeta ?? 0) >= 0 ? 'green' : 'red',
    },
    {
      label: 'Pedidos',
      value: metricas?.totalPedidos ?? 0,
      icon: ShoppingBag,
      color: 'blue',
    },
    {
      label: 'Ticket promedio',
      value: metricas ? fmtPesos(metricas.ticketPromedio) : '—',
      icon: Receipt,
      color: 'default',
    },
    {
      label: 'Cancelados',
      value: metricas?.pedidosCancelados ?? 0,
      icon: XCircle,
      color: 'orange',
    },
    {
      label: 'Costo inventario',
      value: metricas ? fmtPesos(metricas.costoInventario) : '—',
      icon: Package,
      color: 'default',
    },
  ];

  return <KpiGrid kpis={kpis} isLoading={isLoading} />;
}
