'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Colonia } from '@/lib/types/firestore';
import { coloniasService } from '@/lib/services/colonias.service';
import { useAuth } from '@/lib/auth/useAuth';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ModalColoniaProps {
  open: boolean;
  colonia: Colonia | null; // null = crear, con datos = editar
  onClose: (actualizado: boolean) => void;
}

const ZONAS = ['Norte', 'Sur', 'Centro', 'Este', 'Oeste', 'Otra'];

export function ModalColonia({ open, colonia, onClose }: ModalColoniaProps) {
  const { user } = useAuth();
  const [guardando, setGuardando] = useState(false);

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [zona, setZona] = useState('');
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [activa, setActiva] = useState(true);

  // Cargar datos si es edición
  useEffect(() => {
    if (colonia) {
      setNombre(colonia.nombre);
      setZona(colonia.zona || '');
      setCostoEnvio(colonia.costoEnvio);
      setActiva(colonia.activa);
    } else {
      // Limpiar formulario si es nuevo
      setNombre('');
      setZona('');
      setCostoEnvio(0);
      setActiva(true);
    }
  }, [colonia, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.error('El nombre de la colonia es requerido');
      return;
    }

    const costoNumerico = costoEnvio;
    if (isNaN(costoNumerico) || costoNumerico < 0) {
      toast.error('El costo de envío debe ser un número válido');
      return;
    }

    try {
      setGuardando(true);

      if (colonia) {
        // Actualizar colonia existente
        const updateData: any = {
          nombre: nombre.trim(),
          costoEnvio: costoNumerico,
          activa,
        };

        // Solo agregar zona si tiene valor
        if (zona) {
          updateData.zona = zona;
        }

        await coloniasService.update(colonia.id, updateData);
        toast.success('Colonia actualizada correctamente');
      } else {
        // Crear nueva colonia
        const nuevaColonia: any = {
          nombre: nombre.trim(),
          costoEnvio: costoNumerico,
          activa,
          fechaCreacion: Timestamp.now(),
          fechaActualizacion: Timestamp.now(),
          creadoPor: user?.uid || 'sistema',
        };

        // Solo agregar zona si tiene valor
        if (zona) {
          nuevaColonia.zona = zona;
        }

        await coloniasService.create(nuevaColonia);
        toast.success('Colonia creada correctamente');
      }

      onClose(true); // Cerrar modal e indicar que se actualizó
    } catch (error: any) {
      console.error('Error guardando colonia:', error);
      toast.error(error?.message || 'Error al guardar la colonia');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {colonia ? 'Editar Colonia' : 'Nueva Colonia'}
            </DialogTitle>
            <DialogDescription>
              {colonia
                ? 'Modifica los datos de la colonia'
                : 'Agrega una nueva colonia con servicio a domicilio'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre de la Colonia <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Colonia Centro"
                required
                autoFocus
              />
            </div>

            {/* Zona */}
            <div className="space-y-2">
              <Label htmlFor="zona">Zona (Opcional)</Label>
              <Select
                value={zona === '' ? 'sin_zona' : zona}
                onValueChange={(value) => setZona(value === 'sin_zona' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin_zona">Sin zona</SelectItem>
                  {ZONAS.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Agrupa colonias por zona geográfica
              </p>
            </div>

            {/* Costo de Envío */}
            <div className="space-y-2">
              <Label htmlFor="costoEnvio">
                Costo de Envío ($) <span className="text-red-500">*</span>
              </Label>
              <CurrencyInput
                id="costoEnvio"
                value={costoEnvio}
                onValueChange={setCostoEnvio}
                required
              />
              <p className="text-xs text-muted-foreground">
                Este costo se asignará automáticamente al crear pedidos
              </p>
            </div>

            {/* Estado */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activa"
                checked={activa}
                onChange={(e) => setActiva(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="activa" className="cursor-pointer">
                Colonia activa (disponible en formulario de pedidos)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {colonia ? 'Actualizar' : 'Crear Colonia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
