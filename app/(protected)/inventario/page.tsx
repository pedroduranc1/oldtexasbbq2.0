/**
 * Página Principal de Inventario
 * Dashboard con métricas y acciones rápidas
 */

import { Metadata } from 'next';
import Link from 'next/link';
import {
  PackageOpen,
  PackagePlus,
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Package2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Inventario | Old Texas BBQ',
  description: 'Sistema de gestión de inventario y control de costos',
};

export default function InventarioPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">📦 Inventario</h1>
          <p className="text-muted-foreground">
            Gestión de ingredientes y control de costos
          </p>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/inventario/ingredientes">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ingredientes
              </CardTitle>
              <Package2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Ver catálogo completo
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventario/recetas">
          <Card className="cursor-pointer hover:bg-accent transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recetas</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Costos y disponibilidad
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="cursor-pointer hover:bg-accent transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">-</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$-</div>
            <p className="text-xs text-muted-foreground">
              Inventario actual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones Principales */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Acciones Rápidas</CardTitle>
          <CardDescription>
            Accede rápidamente a las funciones principales del inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/inventario/ingredientes/nuevo">
              <Button className="w-full h-24 flex flex-col gap-2" variant="outline">
                <PackagePlus className="h-8 w-8" />
                <span>Nuevo Ingrediente</span>
              </Button>
            </Link>

            <Link href="/inventario/recetas/nueva">
              <Button className="w-full h-24 flex flex-col gap-2" variant="outline">
                <FileSpreadsheet className="h-8 w-8" />
                <span>Nueva Receta</span>
              </Button>
            </Link>

            <Link href="/inventario/movimientos">
              <Button className="w-full h-24 flex flex-col gap-2" variant="outline">
                <TrendingUp className="h-8 w-8" />
                <span>Registrar Movimiento</span>
              </Button>
            </Link>

            <Link href="/inventario/compras/nueva">
              <Button className="w-full h-24 flex flex-col gap-2" variant="outline">
                <ShoppingCart className="h-8 w-8" />
                <span>Orden de Compra</span>
              </Button>
            </Link>

            <Link href="/inventario/alertas">
              <Button className="w-full h-24 flex flex-col gap-2" variant="outline">
                <AlertTriangle className="h-8 w-8" />
                <span>Ver Alertas</span>
              </Button>
            </Link>

            <Link href="/inventario/reportes">
              <Button className="w-full h-24 flex flex-col gap-2" variant="outline">
                <FileSpreadsheet className="h-8 w-8" />
                <span>Reportes</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Próximos Pasos */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Estado del Sistema</CardTitle>
          <CardDescription>
            El módulo de inventario está en desarrollo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">✅ Completado:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Tipos TypeScript de inventario</li>
              <li>Servicio de ingredientes (CRUD completo)</li>
              <li>Servicio de recetas (CRUD completo)</li>
              <li>Constantes de categorías y unidades</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">⏳ En Desarrollo:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>UI de gestión de ingredientes</li>
              <li>UI de gestión de recetas</li>
              <li>Sistema de alertas de stock</li>
              <li>Integración con pedidos</li>
              <li>Órdenes de compra</li>
              <li>Reportes y analítica</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Para más información, consulta{' '}
              <code className="bg-muted px-1 py-0.5 rounded">docs/INVENTARIO_SISTEMA.md</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
