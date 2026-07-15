'use client';

import { useState } from 'react';
import { TableroComandas } from '@/components/cocina/TableroComandas';
import { RegistroMovimientoInventario } from '@/components/inventario/RegistroMovimientoInventario';
import { ChefHat, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CocinaPage() {
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [dialogMerma, setDialogMerma] = useState(false);

  const togglePantallaCompleta = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setPantallaCompleta(true);
    } else {
      document.exitFullscreen();
      setPantallaCompleta(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Cocina</h1>
            <p className="text-muted-foreground">
              Gestiona las comandas en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Indicador de tiempo real */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Actualizando en tiempo real
          </div>

          {/* Botón merma rápida */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogMerma(true)}
            className="gap-2 border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 className="h-4 w-4" />
            Registrar merma
          </Button>

          {/* Botón pantalla completa */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePantallaCompleta}
            className="gap-2"
          >
            {pantallaCompleta ? (
              <>
                <Minimize2 className="h-4 w-4" />
                Salir
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                Pantalla Completa
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tablero Kanban */}
      <div className="flex-1 overflow-hidden">
        <TableroComandas />
      </div>

      {/* Dialog merma rápida */}
      <RegistroMovimientoInventario
        modo="salida"
        open={dialogMerma}
        onClose={() => setDialogMerma(false)}
      />
    </div>
  );
}
