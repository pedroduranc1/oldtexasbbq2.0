/**
 * AsignarRepartidorModal Component
 * Old Texas BBQ - CRM
 *
 * Modal para asignar un repartidor a un pedido que no tiene uno
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Repartidor } from '@/lib/types/firestore';
import { User, Truck, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AsignarRepartidorModalProps {
  open: boolean;
  onClose: () => void;
  onAsignar: (repartidorId: string) => Promise<void>;
  repartidores: Repartidor[];
  numeroPedido: number;
  loading?: boolean;
}

export function AsignarRepartidorModal({
  open,
  onClose,
  onAsignar,
  repartidores,
  numeroPedido,
  loading = false,
}: AsignarRepartidorModalProps) {
  const [repartidorSeleccionado, setRepartidorSeleccionado] = useState<string>('');

  const handleAsignar = async () => {
    if (!repartidorSeleccionado) return;

    await onAsignar(repartidorSeleccionado);
    setRepartidorSeleccionado(''); // Reset
  };

  const handleClose = () => {
    if (!loading) {
      setRepartidorSeleccionado('');
      onClose();
    }
  };

  // Filtrar solo repartidores activos y disponibles
  const repartidoresDisponibles = repartidores.filter(
    (r) => r.activo && r.disponible
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Asignar Repartidor
          </DialogTitle>
          <DialogDescription>
            El pedido <span className="font-semibold">#{numeroPedido}</span> no tiene
            repartidor asignado. Selecciona uno para continuar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alerta informativa */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Los pedidos del formulario web requieren asignación manual de repartidor.
            </AlertDescription>
          </Alert>

          {/* Selector de Repartidor */}
          <div className="space-y-2">
            <Label htmlFor="repartidor">Selecciona un repartidor</Label>
            {repartidoresDisponibles.length > 0 ? (
              <Select
                value={repartidorSeleccionado}
                onValueChange={setRepartidorSeleccionado}
                disabled={loading}
              >
                <SelectTrigger id="repartidor">
                  <SelectValue placeholder="Selecciona un repartidor..." />
                </SelectTrigger>
                <SelectContent>
                  {repartidoresDisponibles.map((repartidor) => (
                    <SelectItem key={repartidor.id} value={repartidor.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>
                          {repartidor.nombre} {repartidor.apellido}
                        </span>
                        {repartidor.disponible && (
                          <span className="text-xs text-green-600">(Disponible)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No hay repartidores disponibles en este momento. Por favor, activa un
                  repartidor desde el panel de gestión.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Info del repartidor seleccionado */}
          {repartidorSeleccionado && (
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="text-sm font-medium">Repartidor seleccionado:</p>
              <p className="text-sm text-muted-foreground">
                {
                  repartidoresDisponibles.find(
                    (r) => r.id === repartidorSeleccionado
                  )?.nombre
                }{' '}
                {
                  repartidoresDisponibles.find(
                    (r) => r.id === repartidorSeleccionado
                  )?.apellido
                }
              </p>
              <p className="text-xs text-muted-foreground">
                Pedidos completados:{' '}
                {
                  repartidoresDisponibles.find(
                    (r) => r.id === repartidorSeleccionado
                  )?.pedidosCompletados
                }
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleAsignar}
            disabled={!repartidorSeleccionado || loading || repartidoresDisponibles.length === 0}
            className="gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Asignando...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4" />
                Asignar y Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
