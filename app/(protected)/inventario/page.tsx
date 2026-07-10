'use client';

import { useState } from 'react';
import { PackagePlus, PackageMinus, Package2, Building2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockActual } from '@/components/inventario/StockActual';
import { ProveedoresManager } from '@/components/inventario/ProveedoresManager';
import { ProductosMasVendidos } from '@/components/inventario/ProductosMasVendidos';
import { RegistroMovimientoInventario } from '@/components/inventario/RegistroMovimientoInventario';

export default function InventarioPage() {
  const [dialogEntrada, setDialogEntrada] = useState(false);
  const [dialogSalida, setDialogSalida] = useState(false);
  const [tabActiva, setTabActiva] = useState('stock');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground text-sm">
            Stock en tiempo real · Proveedores · Análisis de ventas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={() => setDialogSalida(true)}
          >
            <PackageMinus className="h-4 w-4 mr-1" />
            Registrar salida
          </Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setDialogEntrada(true)}
          >
            <PackagePlus className="h-4 w-4 mr-1" />
            Registrar entrada
          </Button>
        </div>
      </div>

      {/* Tabs principales */}
      <Tabs value={tabActiva} onValueChange={setTabActiva}>
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
          <TabsTrigger value="stock" className="flex items-center gap-1.5">
            <Package2 className="h-4 w-4" />
            Stock actual
          </TabsTrigger>
          <TabsTrigger value="proveedores" className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            Proveedores
          </TabsTrigger>
          <TabsTrigger value="analisis" className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Más vendidos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Stock actual */}
        <TabsContent value="stock" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock actual</CardTitle>
              <CardDescription>
                Actualización en tiempo real. Haz clic en una fila de estado para filtrar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StockActual />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Proveedores */}
        <TabsContent value="proveedores" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Proveedores</CardTitle>
              <CardDescription>
                Gestiona el directorio de proveedores activos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProveedoresManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Más vendidos */}
        <TabsContent value="analisis" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Productos más vendidos</CardTitle>
              <CardDescription>
                Ranking basado en ventas registradas por pedido confirmado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductosMasVendidos />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <RegistroMovimientoInventario
        modo="entrada"
        open={dialogEntrada}
        onClose={() => setDialogEntrada(false)}
      />
      <RegistroMovimientoInventario
        modo="salida"
        open={dialogSalida}
        onClose={() => setDialogSalida(false)}
      />
    </div>
  );
}
