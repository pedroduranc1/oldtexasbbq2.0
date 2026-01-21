/**
 * AlertaProductosSinFoto Component
 * Old Texas BBQ - CRM
 *
 * Muestra una alerta cuando hay productos sin imagen
 */

'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImageOff, AlertTriangle, X, ChevronRight } from 'lucide-react';
import { Producto } from '@/lib/types/firestore';

interface AlertaProductosSinFotoProps {
  productos: Producto[];
  onEditarProducto?: (producto: Producto) => void;
  dismissible?: boolean;
}

export function AlertaProductosSinFoto({
  productos,
  onEditarProducto,
  dismissible = true,
}: AlertaProductosSinFotoProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filtrar productos sin foto
  const productosSinFoto = productos.filter(
    (p) => !p.imagen && p.disponible && !p.eliminado
  );

  // No mostrar si no hay productos sin foto o si fue cerrado
  if (productosSinFoto.length === 0 || dismissed) {
    return null;
  }

  // Mostrar alerta compacta si hay pocos productos
  if (productosSinFoto.length <= 3) {
    return (
      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
        <ImageOff className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          Productos sin imagen
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="flex flex-wrap gap-1">
              {productosSinFoto.map((p) => (
                <Badge
                  key={p.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900"
                  onClick={() => onEditarProducto?.(p)}
                >
                  {p.nombre}
                </Badge>
              ))}
            </div>
            {dismissible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => setDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Mostrar alerta con modal si hay muchos productos
  return (
    <>
      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          {productosSinFoto.length} productos sin imagen
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          <div className="flex items-center justify-between gap-4 mt-1">
            <p className="text-sm">
              Los productos con imagen tienen mayor tasa de conversión.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModal(true)}
                className="gap-1 border-amber-500 text-amber-700 hover:bg-amber-100"
              >
                Ver lista
                <ChevronRight className="h-3 w-3" />
              </Button>
              {dismissible && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setDismissed(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Modal con lista completa */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageOff className="h-5 w-5 text-amber-600" />
              Productos sin imagen
            </DialogTitle>
            <DialogDescription>
              {productosSinFoto.length} productos necesitan una imagen
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {productosSinFoto.map((producto) => (
              <div
                key={producto.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{producto.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {producto.categoriaNombre}
                  </p>
                </div>
                {onEditarProducto && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowModal(false);
                      onEditarProducto(producto);
                    }}
                  >
                    Editar
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Tip: Las imágenes mejoran las ventas hasta un 30%
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
