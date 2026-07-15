'use client';

import { useState } from 'react';
import { Building2, Truck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProveedoresManager } from '@/components/inventario/ProveedoresManager';
import { RecepcionProveedor } from '@/components/inventario/RecepcionProveedor';

export default function ProveedoresPage() {
  const [dialogRecepcion, setDialogRecepcion] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Proveedores
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Directorio de proveedores activos vinculados a entradas de inventario
          </p>
        </div>
        <Button
          onClick={() => setDialogRecepcion(true)}
          className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Truck className="h-4 w-4" />
          Recibir mercancía
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directorio de proveedores</CardTitle>
          <CardDescription>
            Agrega, edita y desactiva proveedores. Los proveedores activos aparecen en el registro de entradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProveedoresManager />
        </CardContent>
      </Card>

      <RecepcionProveedor open={dialogRecepcion} onClose={() => setDialogRecepcion(false)} />
    </div>
  );
}
