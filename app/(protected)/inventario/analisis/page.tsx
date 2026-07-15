'use client';

import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalisisInventario } from '@/components/reportes/AnalisisInventario';

export default function AnalisisInventarioPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-8 w-8" />
          Análisis de Inventario
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Rotación, costos, mermas y tendencias del inventario por periodo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Análisis del periodo</CardTitle>
          <CardDescription>
            Selecciona el rango de días para visualizar tendencias, top productos y costos acumulados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnalisisInventario />
        </CardContent>
      </Card>
    </div>
  );
}
