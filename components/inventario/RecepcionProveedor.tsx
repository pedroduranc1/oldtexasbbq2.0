'use client';

import { useState, useEffect } from 'react';
import { Truck, Loader2, Package, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getProveedores, type Proveedor } from '@/lib/services/proveedores.service';
import { ingredientesService } from '@/lib/services/ingredientes.service';
import { registrarEntrada } from '@/lib/services/movimientosInventario.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { Ingrediente } from '@/lib/types';

interface RecepcionProveedorProps {
  open: boolean;
  onClose: () => void;
}

interface LineaRecepcion {
  ingrediente: Ingrediente;
  cantidadRecibida: string;
  costoUnitario: string;
}

export function RecepcionProveedor({ open, onClose }: RecepcionProveedorProps) {
  const { user } = useAuthStore();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>('');
  const [lineas, setLineas] = useState<LineaRecepcion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Cargar proveedores al abrir
  useEffect(() => {
    if (!open) return;
    getProveedores(true).then(setProveedores);
  }, [open]);

  // Al seleccionar proveedor, cargar sus ingredientes
  useEffect(() => {
    if (!proveedorSeleccionado) {
      setLineas([]);
      return;
    }
    setCargando(true);
    ingredientesService.getIngredientes().then((todos) => {
      const filtrados = todos.filter(
        (i) => i.activo && i.proveedor?.id === proveedorSeleccionado
      );
      setLineas(
        filtrados.map((ing) => ({
          ingrediente: ing,
          cantidadRecibida: '',
          costoUnitario: String(ing.precioPorUnidad ?? ''),
        }))
      );
      setCargando(false);
    });
  }, [proveedorSeleccionado]);

  function actualizarLinea(index: number, campo: 'cantidadRecibida' | 'costoUnitario', valor: string) {
    setLineas((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  }

  function handleClose() {
    setProveedorSeleccionado('');
    setLineas([]);
    onClose();
  }

  async function handleGuardar() {
    const lineasConCantidad = lineas.filter((l) => {
      const n = parseFloat(l.cantidadRecibida);
      return !isNaN(n) && n > 0;
    });

    if (lineasConCantidad.length === 0) {
      toast.error('Ingresa al menos una cantidad mayor a 0');
      return;
    }

    const proveedor = proveedores.find((p) => p.id === proveedorSeleccionado);
    setGuardando(true);

    try {
      await Promise.all(
        lineasConCantidad.map((l) =>
          registrarEntrada({
            ingrediente_id: l.ingrediente.id,
            ingredienteNombre: l.ingrediente.nombre,
            stockActual: l.ingrediente.stockActual,
            cantidad: parseFloat(l.cantidadRecibida),
            costo_unitario: l.costoUnitario ? parseFloat(l.costoUnitario) : undefined,
            motivo: `Recepción de proveedor: ${proveedor?.nombre ?? ''}`,
            proveedorId: proveedorSeleccionado,
            proveedorNombre: proveedor?.nombre,
            usuarioId: user?.uid ?? '',
            usuarioNombre: user?.displayName ?? user?.email ?? 'Sistema',
          })
        )
      );

      toast.success(
        `Recepción registrada: ${lineasConCantidad.length} ingrediente${lineasConCantidad.length > 1 ? 's' : ''} actualizado${lineasConCantidad.length > 1 ? 's' : ''}`
      );
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar la recepción');
    } finally {
      setGuardando(false);
    }
  }

  const lineasConCantidad = lineas.filter((l) => {
    const n = parseFloat(l.cantidadRecibida);
    return !isNaN(n) && n > 0;
  }).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-orange-600" />
            Recepción de Proveedor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selector de proveedor */}
          <div className="space-y-1.5">
            <Label>Proveedor</Label>
            <Select value={proveedorSeleccionado} onValueChange={setProveedorSeleccionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un proveedor…" />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lista de ingredientes */}
          {cargando && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!cargando && proveedorSeleccionado && lineas.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
              <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              No hay ingredientes vinculados a este proveedor.
              <br />
              <span className="text-xs">Asigna el proveedor a los ingredientes desde la sección de inventario.</span>
            </div>
          )}

          {!cargando && lineas.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_110px_110px] gap-2 text-xs text-muted-foreground font-medium px-1">
                <span>Ingrediente</span>
                <span className="text-right">Stock actual</span>
                <span className="text-right">Cantidad recibida</span>
              </div>
              {lineas.map((linea, i) => (
                <div
                  key={linea.ingrediente.id}
                  className="grid grid-cols-[1fr_110px_110px] gap-2 items-center border rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{linea.ingrediente.nombre}</p>
                    <p className="text-xs text-muted-foreground">{linea.ingrediente.unidadMedida}</p>
                  </div>
                  <p className="text-sm text-right text-muted-foreground">
                    {linea.ingrediente.stockActual} {linea.ingrediente.unidadMedida}
                  </p>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="text-right h-8 text-sm"
                    value={linea.cantidadRecibida}
                    onChange={(e) => actualizarLinea(i, 'cantidadRecibida', e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={guardando || lineasConCantidad === 0}
            className="gap-2"
          >
            {guardando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {guardando
              ? 'Registrando…'
              : lineasConCantidad > 0
              ? `Confirmar ${lineasConCantidad} entrada${lineasConCantidad > 1 ? 's' : ''}`
              : 'Confirmar recepción'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
